import mongoose from "mongoose";

const rateChartSchema = new mongoose.Schema(
  {
    milkType: {
      type: String,
      enum: ["cow", "buffalo", "mix"],
      required: true,
      // unique: true,
    },
    fats: {
      type: [Number],
      required: true,
    },
    snfs: {
      type: [Number],
      required: true,
    },
    fatMin: { type: Number, required: true },
    fatMax: { type: Number, required: true },
    fatStep: { type: Number, required: true },

    snfMin: { type: Number, required: true },
    snfMax: { type: Number, required: true },
    snfStep: { type: Number, required: true },

    // rates: {
    //   type: [[[Number]]],
    //   required: true,
    // },
    rates: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    baseRate: {
      type: Number,
      required: true,
    },
    // fatFactor: {
    //   type: Number,
    //   required: true,
    // },
    // snfFactor: {
    //   type: Number,
    //   required: true,
    // },
    updatedAt: {
      type: String,
    },
    effectiveFrom: {
      type: String, // YYYY-MM-DD
      required: true,
      default: () => new Date().toISOString().slice(0, 10),
    },
    fatSlabs: {
      type: [
        {
          from: { type: Number, required: true },
          to: { type: Number, required: true },
          rate: { type: Number, required: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);
rateChartSchema.index({ milkType: 1, effectiveFrom: 1 }, { unique: true });

export default mongoose.model("RateChart", rateChartSchema);
