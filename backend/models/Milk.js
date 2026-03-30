import mongoose from "mongoose";

const milkSchema = new mongoose.Schema(
  {
    centreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Centre",
      default: null,
      index: true,
    },
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farmer",
      required: true,
    },
    // "YYYY-MM-DD"
    date: {
      type: String,
      required: true,
    },
    shift: {
      type: String,
      enum: ["morning", "evening"],
      required: true,
    },
    // liters
    quantity: {
      type: Number,
      required: true,
    },
    fat: {
      type: Number,
      default: 0,
    },
    snf: {
      type: Number,
      default: 0,
    },

    rate: {
      type: Number,
      required: true,
    },
    milkType: {
      type: String,
      enum: ["cow", "buffalo", "mix"],
      required: true,
    },

    // quantity * rate
    totalAmount: {
      type: Number,
      required: true,
    },
    clientGeneratedId: {
      type: String,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

// Avoid duplicate entry for same farmer + same date + shift
milkSchema.index(
  { farmerId: 1, date: 1, shift: 1, milkType: 1 },
  { unique: true },
);
milkSchema.index({ centreId: 1, date: 1 });

export default mongoose.model("Milk", milkSchema);
