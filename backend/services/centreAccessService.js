import { isSuperadmin } from "../utils/access.js";

export const requireAssignedCentre = (req) => {
  if (!isSuperadmin(req) && !req.user?.centreId) {
    const error = new Error("Admin user must be assigned to a centre");
    error.statusCode = 400;
    throw error;
  }
};

export const resolveOperationalCentreId = (req, requestedCentreId = null) => {
  if (isSuperadmin(req)) {
    return requestedCentreId || null;
  }

  requireAssignedCentre(req);
  return req.user.centreId;
};
