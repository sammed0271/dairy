import User from "../models/User.js";
import Center from "../models/Center.js"
import mongoose from "mongoose";
import bcrypt from "bcrypt"

export const createUser = async (req, res) => {
  try {
    const data = req.body;


    if (!data.name || !data.email || !data.password || !data.role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(data.password, salt);

    const user = await User.create({
      name: data.name,
      email: data.email,
      password: hashed,
      centerId: data.centerId,
    });

    res.status(201).json(user);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        message: "User already exists",
      });
    }
    console.log("error message : ", err.message);
    res.status(500).json({ message: err.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .lean();

    const centerIds = users
      .filter((u) => u.role === "admin" && u.centerId)
      .map((u) => u.centerId);

    const centers = await Center.find({ _id: { $in: centerIds } })
      .select("-password")
      .lean();

    const centerMap = {};
    centers.forEach((c) => {
      centerMap[c._id.toString()] = c;
    });

    const enrichedUsers = users.map((user) => {
      if (user.role === "admin" && user.centerId) {
        return {
          ...user,
          center: centerMap[user.centerId.toString()] || null,
        };
      }
      return {
        ...user,
        center: null,
      };
    });

    res.json(enrichedUsers);
  } catch (error) {
    console.log("error : : : ", err.message);
    res.status(500).json({ message: err.message });
  }
};

export const assignCenterToUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { centerId } = req.body; // ✅ use body, not query

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "superadmin") {
      return res.status(403).json({
        message: "Superadmin cannot have a center",
      });
    }

    if (!centerId) {
      user.centerId = null;
      await user.save();

      return res.json({
        message: "Center removed",
        user: {
          ...user.toObject(),
          center: null,
        },
      });
    }

    if (!mongoose.Types.ObjectId.isValid(centerId)) {
      return res.status(400).json({ message: "Invalid centerId" });
    }
    const center = await Center.findById(centerId).lean();
    if (!center) {
      return res.status(404).json({ message: "Center not found" });
    }

    user.centerId = centerId;
    await user.save();

    res.json({
      message: "Center assigned successfully5",
      user: {
        ...user.toObject(),
        center,
      },
    });
  } catch (err) {
    console.log("message    :", err.message);
    res.status(500).json({ message: err.message });
  }
};