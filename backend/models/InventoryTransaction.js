import mongoose from "mongoose";

const inventoryTransactionSchema = new mongoose.Schema(
  {
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      required: true,
    },
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farmer",
      required: true
    },

    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true
    },

    quantity: Number,
    rate: Number,
    totalAmount: Number,

    paymentMethod: {
      type: String,
      enum: ["Cash", "Bill", "Installment"],
      required: true
    },

    paidAmount: {
      type: Number,
      default: 0
    },

    remainingAmount: {
      type: Number,
      default: 0
    },

    note: String,

    date: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

export default mongoose.model("InventoryTransaction", inventoryTransactionSchema);
