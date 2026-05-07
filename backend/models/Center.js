import mongoose from "mongoose";

const centerSchema = new mongoose.Schema(
  {
    // 🔹 Basic Details
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^C\d{3}$/, "Code must be like C001"],
    },


    ownerName: {
      type: String,
      required: true,
      trim: true,
    },

    mobile: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{10}$/, "Mobile must be 10 digits"],
    },

    // 🔹 Location
    village: { type: String, trim: true },
    taluka: { type: String, trim: true },
    district: { type: String, trim: true },
    state: { type: String, trim: true },
    address: { type: String, trim: true },
    pincode: {
      type: String,
      match: [/^\d{6}$/, "Invalid pincode"],
    },

    latitude: Number,
    longitude: Number,

    // 🔹 Login


    status: {
      type: String,
      enum: ["Active", "Suspended"],
      default: "Active",

    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // 🔹 Business Config
    milkType: {
      type: [String],
      enum: ["cow", "buffalo", "mix"],
      required: true,
    },

    rateType: {
      type: String,
      enum: ["fixed", "fat_snf"],
      required: true,
    },

    unit: {
      type: String,
      enum: ["liter", "kg"],
      default: "liter",
    },

    defaultRate: {
      type: Number,
      min: 0,
    },

    shift: {
      type: String,
      enum: ["Morning", "Evening", "both"], // 🔥 fixed
      default: "both",
    },

    // 🔹 Payment
    paymentCycle: {
      type: String,
      enum: ["daily", "weekly", "monthly", "10days"],
      default: "weekly",
    },

    paymentMode: {
      type: String,
      enum: ["cash", "upi", "bank"],
      default: "cash",
    },

    commission: {
      type: Number,
      min: 0,
    },

    // 🔹 System
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// 🔥 Indexes for performance

centerSchema.index({ name: 1 });


export default mongoose.model("Center", centerSchema);