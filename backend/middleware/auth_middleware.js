import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, token missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id)
      .select("_id name email role centreId status")
      .lean();

    if (!user || user.status === "disabled") {
      return res.status(401).json({ message: "User not authorized" });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      centreId: user.centreId ? user.centreId.toString() : null,
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalid" });
  }
};
