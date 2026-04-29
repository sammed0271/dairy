import mongoose from "mongoose";

const billSchema = new mongoose.Schema(
  {
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      required: true,
      index: true,
    },
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farmer",
      required: true,
    },
    totalMilkAmount: {
      type: Number,
      default: 0,
    },
    totalDeduction: {
      type: Number,
      default: 0,
    },
    totalBonus: {
      type: Number,
      default: 0,
    },
    netPayable: {
      type: Number,
      default: 0,
    },
    totalLiters: {
      type: Number,
      default: 0,
    },
    periodFrom: {
      type: Date, // YYYY-MM-DD
      required: true,
    },
    periodTo: {
      type: Date, // YYYY-MM-DD
      required: true,
    },
    // billMonth: {
    //   type: String, // YYYY-MM
    //   required: true,
    //   index: true,
    // },
    status: {
      type: String,
      enum: ["Pending", "Paid"],
      default: "Pending",
      index: true,
    },
  },
  { timestamps: true },
);

// billSchema.index({ farmerId: 1, periodFrom: 1, periodTo: 1 }, { unique: true });
billSchema.index({ farmerId: 1, periodFrom: 1, periodTo: 1 }, { unique: true });

export default mongoose.model("Bill", billSchema);
