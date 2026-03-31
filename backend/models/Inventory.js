import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    centreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Centre",
      default: null,
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      required: true,
    },
    currentStock: {
      type: Number,
      default: 0,
    },
    minStock: {
      type: Number,
      default: 0,
    },
    purchaseRate: {
      type: Number,
      default: 0,
    },
    sellingRate: {
      type: Number,
      default: 0,
    },
    clientGeneratedId: {
      type: String,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

inventorySchema.index({ centreId: 1, createdAt: -1 });
inventorySchema.index({ centreId: 1, clientGeneratedId: 1 });

export default mongoose.model("Inventory", inventorySchema);
