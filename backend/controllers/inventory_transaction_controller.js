import Inventory from "../models/Inventory.js";
import InventoryTransaction from "../models/InventoryTransaction.js";

export const sellInventoryToFarmer = async (req, res) => {
  try {
    const { farmerId, itemId, quantity, paymentMethod, paidAmount } = req.body;

    const item = await Inventory.findById({ _id: itemId, centerID: req.user.centerId, });

    if (!item) return res.status(404).json({ message: "Item not found" });

    if (item.currentStock < quantity)
      return res.status(400).json({ message: "Insufficient stock" });

    const totalAmount = quantity * item.sellingRate;

    const remainingAmount = totalAmount - (paidAmount || 0);

    // reduce stock
    item.currentStock -= quantity;
    await item.save();

    const transaction = await InventoryTransaction.create({
      centerId: req.user.centerId,

      farmerId,
      itemId,
      quantity,
      rate: item.sellingRate,
      totalAmount,
      paymentMethod,
      paidAmount: paidAmount || 0,
      remainingAmount
    });

    res.status(201).json(transaction);
  } catch (err) {
    console.error("sellInventoryToFarmer error:", err);

    res.status(500).json({ message: err.message });
  }
};

export const getInventoryTransactions = async (req, res) => {
  try {
    const data = await InventoryTransaction.find({ centerId: req.user.centerId, })
      .populate("farmerId", "name")
      .populate("itemId", "name code")
      .sort({ createdAt: -1 });

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const payInstallment = async (req, res) => {
  try {
    const { transactionId, amount } = req.body;

    const trx = await InventoryTransaction.findById(transactionId);

    if (!trx) return res.status(404).json({ message: "Transaction not found" });

    trx.paidAmount += amount;
    trx.remainingAmount -= amount;

    if (trx.remainingAmount < 0) trx.remainingAmount = 0;

    await trx.save();

    res.json(trx);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
