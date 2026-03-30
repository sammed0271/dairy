import mongoose from "mongoose";

const centreSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    village: {
      type: String,
      default: "",
      trim: true,
    },
    taluka: {
      type: String,
      default: "",
      trim: true,
    },
    district: {
      type: String,
      default: "",
      trim: true,
    },
    state: {
      type: String,
      default: "",
      trim: true,
    },
    address: {
      type: String,
      default: "",
      trim: true,
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    paymentCycle: {
      type: String,
      default: "10-day",
      trim: true,
    },
    rateType: {
      type: String,
      default: "standard",
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true },
);

centreSchema.index({ name: 1 });

export default mongoose.model("Centre", centreSchema);
