import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { buildTokenPayload } from "../utils/access.js";

const signToken = (user) =>
  jwt.sign(buildTokenPayload(user), process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, centreId } = req.body;
    const totalUsers = await User.countDocuments();

    if (!name || !email || !password) {
      return res.json({ message: "Missing data" });
    }

    if (totalUsers > 0) {
      return res.status(403).json({
        message:
          "Bootstrap registration is closed. Create users from the admin management module.",
      });
    }

    const exist = await User.findOne({ email });
    if (exist) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashed,
      role: totalUsers === 0 ? "superadmin" : "admin",
      centreId: centreId || null,
    });

    const token = signToken(user);

    return res.status(201).json({
      message: "Registered Successfully",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        centreId: user.centreId,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid password" });

    if (user.status === "disabled") {
      return res.status(403).json({ message: "User is disabled" });
    }

    const token = signToken(user);

    return res.status(200).json({
      message: "Login Successfully",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        centreId: user.centreId,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("_id name email role centreId status createdAt updatedAt")
      .populate("centreId", "name code status district village")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    const emailOwner = await User.findOne({
      email,
      _id: { $ne: user._id },
    }).select("_id");

    if (emailOwner) {
      return res.status(400).json({ message: "Email is already in use" });
    }

    user.name = name;
    user.email = email;
    await user.save();

    const updatedUser = await User.findById(user._id)
      .select("_id name email role centreId status createdAt updatedAt")
      .populate("centreId", "name code status district village")
      .lean();

    return res.status(200).json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const changeCurrentUserPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};