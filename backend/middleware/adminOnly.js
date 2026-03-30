export const adminOnly = (req, res, next) => {
  if (!["admin", "superadmin"].includes(req.user?.role)) {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};

export const requireRoles =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
