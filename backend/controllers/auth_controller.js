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

    if (!name || !email || !password) {
      return res.json({ message: "Missing data" });
    }

    const exist = await User.findOne({ email });
    if (exist) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const totalUsers = await User.countDocuments();

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
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
