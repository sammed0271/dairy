import mongoose from "mongoose";

const farmerSchema = new mongoose.Schema(
  {
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      required: true
    },
    code: {
      type: String,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      match: /^\d{10}$/,
    },
    milkType: {
      type: [String],
      enum: ["cow", "buffalo", "mix"],
      required: true,
    },
    address: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    joinDate: {
      type: String,
      default: () => new Date().toISOString().split("T")[0], // yyyy-mm-dd
    },
  },
  { timestamps: true },
);

// Index centerId for faster queries by center
farmerSchema.index({ centerId: 1 });
/*  Auto-generate farmer code */
farmerSchema.pre("save", async function () {
  if (this.code) return;

  const lastFarmer = await mongoose
    .model("Farmer")
    .findOne()
    .sort({ createdAt: -1 });

  const lastNumber = lastFarmer?.code ? parseInt(lastFarmer.code.slice(1)) : 0;

  this.code = `F${String(lastNumber + 1).padStart(4, "0")}`;
});

export default mongoose.model("Farmer", farmerSchema);
