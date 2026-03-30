export const isSuperadmin = (req) => req.user?.role === "superadmin";

export const getScopedFilter = (req, extra = {}) => {
  if (isSuperadmin(req) || !req.user?.centreId) {
    return { ...extra };
  }


  return {
    ...extra,
    centreId: req.user.centreId,
  };
};

export const canAccessCentre = (req, centreId) => {
  if (isSuperadmin(req) || !req.user?.centreId || !centreId) {
    return true;
  }

  return String(req.user.centreId) === String(centreId);
};

export const ensureCentreAccess = (req, centreId) => {
  if (!canAccessCentre(req, centreId)) {
    const error = new Error("Not authorized for this centre");
    error.statusCode = 403;
    throw error;
  }
};

export const buildTokenPayload = (user) => ({
  id: user._id,
  role: user.role,
  centreId: user.centreId ?? null,
});
