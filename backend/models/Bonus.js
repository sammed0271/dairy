import mongoose from "mongoose";

const bonusSchema = new mongoose.Schema(
  {
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      required: true,
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
    amount: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Bonus", bonusSchema);
