import mongoose from "mongoose";

const farmerTransferSchema = new mongoose.Schema(
  {
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farmer",
      required: true,
      index: true,
    },
    fromCentreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Centre",
      required: true,
    },
    toCentreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Centre",
      required: true,
    },
    transferredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true },
);

farmerTransferSchema.index({ farmerId: 1, createdAt: -1 });

export default mongoose.model("FarmerTransfer", farmerTransferSchema);
