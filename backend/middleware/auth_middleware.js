import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, token missing" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    if (user.role === "superadmin") {
      req.user = {
        id: user._id,
        role: user.role
      };
    }
    else {
      req.user = {
        id: user._id,
        role: user.role,
        centerId: user.centerId,
      };
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalid" });
  }
};
