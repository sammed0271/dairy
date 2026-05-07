import mongoose, { mongo } from "mongoose";

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
    mobile: {
      type: String,


    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["superadmin", "admin"],
      default: "admin"
    },
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
    },
  },
  { timestamps: true },
);



const User = mongoose.model("user", userSchema);
export default User;
