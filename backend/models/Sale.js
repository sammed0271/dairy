// models/Sale.js

import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
  {
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["MILK", "PRODUCT"],
      required: true,
    },

    // // for milk
    // farmer: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Farmer",
    // },
    collectorName: String, // like Gokul

    // for product
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
    },

    quantity: {
      type: Number,
      required: true,
    },

    rate: Number,

    total: Number,

    paymentStatus: {
      type: String,
      enum: ["PAID", "PENDING"],
      default: "PAID",
    },

    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Sale", saleSchema);