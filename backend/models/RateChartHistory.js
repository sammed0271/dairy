import mongoose from "mongoose";

const rateChartHistorySchema = new mongoose.Schema(
  {
    milkType: { type: String, enum: ["cow", "buffalo","mix"], required: true },
    effectiveFrom: { type: String, required: true },

    fats: [Number],
    snfs: [Number],
    rates: [[Number]],
    baseRate: Number,
    // fatFactor: Number,
    // snfFactor: Number,

    savedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.model("RateChartHistory", rateChartHistorySchema);
