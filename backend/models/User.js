import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["superadmin", "admin"],
      default: "admin",
      index: true,
    },
    centreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Centre",
      default: null,
      index: true,
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

const User = mongoose.model("user", userSchema);
export default User;
