import mongoose from "mongoose";
const deductionSchema = new mongoose.Schema(
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
    date: {
      type: String,
      required: true,
    },
    // type: {
    //   type: String,
    //   required: true,
    // },
    category: {
      type: String,
      required: true,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
    },
    remainingAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Partial", "Cleared"],
      default: "Pending",
    },
    autoAdjusted: {
      type: Boolean,
      default: false,
    },

    note: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Deduction", deductionSchema);
