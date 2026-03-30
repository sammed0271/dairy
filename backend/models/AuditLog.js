import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
      index: true,
    },
    centreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Centre",
      default: null,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { versionKey: false },
);

auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
