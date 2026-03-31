import bcrypt from "bcrypt";
import Centre from "../models/Centre.js";
import User from "../models/User.js";
import { logAudit } from "../services/auditService.js";

const sanitizeAdmin = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  centreId: user.centreId,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const ensureValidCentreAssignment = async ({ centreId, role }) => {
  if (role === "superadmin") {
    return null;
  }

  if (!centreId) {
    const error = new Error("Admin users must be assigned to a centre");
    error.statusCode = 400;
    throw error;
  }

  const centre = await Centre.findOne({ _id: centreId, status: "active" });
  if (!centre) {
    const error = new Error("Assigned centre was not found or is disabled");
    error.statusCode = 400;
    throw error;
  }

  return centre;
};

const ensureLastSuperadminSafety = async ({ targetUser, nextRole, nextStatus }) => {
  const isCurrentlyActiveSuperadmin =
    targetUser.role === "superadmin" && targetUser.status === "active";
  const remainsActiveSuperadmin =
    nextRole === "superadmin" && nextStatus === "active";

  if (!isCurrentlyActiveSuperadmin || remainsActiveSuperadmin) {
    return;
  }

  const activeSuperadmins = await User.countDocuments({
    role: "superadmin",
    status: "active",
  });

  if (activeSuperadmins <= 1) {
    const error = new Error("At least one active superadmin is required");
    error.statusCode = 400;
    throw error;
  }
};

export const listAdmins = async (req, res) => {
  try {
    const filter = {};

    if (req.query.role && req.query.role !== "all") {
      filter.role = req.query.role;
    } else {
      filter.role = { $in: ["admin", "superadmin"] };
    }

    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }

    if (req.query.centreId) {
      filter.centreId = req.query.centreId;
    }

    const users = await User.find(filter)
      .select("_id name email role status centreId createdAt updatedAt")
      .populate("centreId", "name code status district")
      .sort({ createdAt: -1 });

    res.json(users.map(sanitizeAdmin));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdminById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("_id name email role status centreId createdAt updatedAt")
      .populate("centreId", "name code status district");

    if (!user) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json(sanitizeAdmin(user));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createAdmin = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = "admin",
      centreId = null,
      status = "active",
    } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email and password are required" });
    }

    if (!["admin", "superadmin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role selected" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const assignedCentre = await ensureValidCentreAssignment({
      centreId,
      role,
    });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role,
      centreId: role === "superadmin" ? null : assignedCentre?._id,
      status,
    });

    const responseUser = await User.findById(user._id)
      .select("_id name email role status centreId createdAt updatedAt")
      .populate("centreId", "name code status district");

    await logAudit({
      req,
      centreId: responseUser.centreId?._id ?? null,
      action: "admin.create",
      entityType: "User",
      entityId: user._id,
      details: {
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });

    res.status(201).json(sanitizeAdmin(responseUser));
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to create admin" });
  }
};

export const updateAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const nextRole = req.body.role || user.role;
    const nextStatus = req.body.status || user.status;
    const requestedCentreId =
      Object.prototype.hasOwnProperty.call(req.body, "centreId")
        ? req.body.centreId || null
        : user.centreId;

    if (!["admin", "superadmin"].includes(nextRole)) {
      return res.status(400).json({ message: "Invalid role selected" });
    }

    if (!["active", "disabled"].includes(nextStatus)) {
      return res.status(400).json({ message: "Invalid status selected" });
    }

    if (String(user._id) === String(req.user.id)) {
      if (nextStatus === "disabled") {
        return res
          .status(400)
          .json({ message: "You cannot disable your own account" });
      }

      if (nextRole !== user.role) {
        return res
          .status(400)
          .json({ message: "You cannot change your own role" });
      }
    }

    await ensureLastSuperadminSafety({ targetUser: user, nextRole, nextStatus });

    const duplicateEmail = req.body.email
      ? await User.findOne({
          email: req.body.email.trim().toLowerCase(),
          _id: { $ne: user._id },
        })
      : null;

    if (duplicateEmail) {
      return res.status(400).json({ message: "Email is already in use" });
    }

    const assignedCentre = await ensureValidCentreAssignment({
      centreId: requestedCentreId,
      role: nextRole,
    });

    if (req.body.name) {
      user.name = req.body.name.trim();
    }

    if (req.body.email) {
      user.email = req.body.email.trim().toLowerCase();
    }

    user.role = nextRole;
    user.status = nextStatus;
    user.centreId = nextRole === "superadmin" ? null : assignedCentre?._id;

    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(req.body.password, salt);
    }

    await user.save();

    const responseUser = await User.findById(user._id)
      .select("_id name email role status centreId createdAt updatedAt")
      .populate("centreId", "name code status district");

    await logAudit({
      req,
      centreId: responseUser.centreId?._id ?? null,
      action: "admin.update",
      entityType: "User",
      entityId: user._id,
      details: {
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });

    res.json(sanitizeAdmin(responseUser));
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to update admin" });
  }
};
