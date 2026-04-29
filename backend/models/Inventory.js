import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      required: true,
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
  },
  { timestamps: true },
);

export default mongoose.model("Inventory", inventorySchema);
