import mongoose from "mongoose";

const inventoryTransactionSchema = new mongoose.Schema(
{
  centreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Centre",
    default: null,
    index: true
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
  itemName: {
    type: String,
    default: ""
  },
  itemCode: {
    type: String,
    default: ""
  },

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
  isAdjustedInBill: {
    type: Boolean,
    default: false,
    index: true
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
