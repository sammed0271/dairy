import AuditLog from "../models/AuditLog.js";

export const logAudit = async ({
  req,
  userId,
  centreId,
  action,
  entityType,
  entityId,
  details = {},
}) => {
  try {
    await AuditLog.create({
      userId: userId ?? req?.user?.id ?? null,
      centreId: centreId ?? req?.user?.centreId ?? null,
      action,
      entityType,
      entityId: String(entityId),
      details,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Audit log failed:", error.message);
  }
};
