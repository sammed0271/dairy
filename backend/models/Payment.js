import mongoose from "mongoose";

// const paymentSchema = new mongoose.Schema({
//   farmerId: mongoose.Schema.Types.ObjectId,
//   billId: mongoose.Schema.Types.ObjectId,
//   amount: Number,
//   accountNumber: String,
//   ifsc: String,
//   accountHolderName: String,
//   transactionId: String,
//   status: String,
//   createdAt: { type: Date, default: Date.now },
// });

const paymentSchema = new mongoose.Schema({
  centreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Centre",
    default: null,
    index: true,
  },
  farmerId: mongoose.Schema.Types.ObjectId,
  billId: mongoose.Schema.Types.ObjectId,

  amount: Number,

  accountNumber: String,
  ifsc: String,
  accountHolderName: String,

  razorpayContactId: String,
  razorpayFundAccountId: String,
  razorpayPayoutId: String,
  transactionId: String,

  status: {
    type: String,
    enum: ["initiated", "processing", "processed", "failed"],
    default: "initiated",
  },

  failureReason: String,

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("payment", paymentSchema);
