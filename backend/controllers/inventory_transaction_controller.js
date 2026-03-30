import Inventory from "../models/Inventory.js";
import InventoryTransaction from "../models/InventoryTransaction.js";
import Farmer from "../models/Farmer.js";
import { logAudit } from "../services/auditService.js";
import { getScopedFilter } from "../utils/access.js";

export const sellInventoryToFarmer = async (req, res) => {
  try {
    const { farmerId, itemId, quantity, paymentMethod, paidAmount, note } = req.body;

    const [item, farmer] = await Promise.all([
      Inventory.findOne(getScopedFilter(req, { _id: itemId })),
      Farmer.findOne(getScopedFilter(req, { _id: farmerId })),
    ]);

    if (!item) return res.status(404).json({ message: "Item not found" });
    if (!farmer) return res.status(404).json({ message: "Farmer not found" });

    if (item.currentStock < quantity)
      return res.status(400).json({ message: "Insufficient stock" });

    const totalAmount = quantity * item.sellingRate;

    const remainingAmount = totalAmount - (paidAmount || 0);

    // reduce stock
    item.currentStock -= quantity;
    await item.save();

    const transaction = await InventoryTransaction.create({
      centreId: item.centreId ?? farmer.centreId ?? req.user?.centreId ?? null,
      farmerId,
      itemId,
      itemName: item.name,
      itemCode: item.code,
      quantity,
      rate: item.sellingRate,
      totalAmount,
      paymentMethod,
      paidAmount: paidAmount || 0,
      remainingAmount,
      note: note || "",
    });

    await logAudit({
      req,
      centreId: transaction.centreId,
      action: "inventory_sold",
      entityType: "InventoryTransaction",
      entityId: transaction._id,
      details: { farmerId, itemId, quantity, paymentMethod },
    });

    res.status(201).json(transaction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getInventoryTransactions = async (req, res) => {
  try {
    const data = await InventoryTransaction.find(getScopedFilter(req))
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

    const trx = await InventoryTransaction.findOne(
      getScopedFilter(req, { _id: transactionId }),
    );

    if (!trx) return res.status(404).json({ message: "Transaction not found" });

    trx.paidAmount += amount;
    trx.remainingAmount -= amount;

    if (trx.remainingAmount < 0) trx.remainingAmount = 0;

    await trx.save();

    await logAudit({
      req,
      centreId: trx.centreId,
      action: "inventory_installment_paid",
      entityType: "InventoryTransaction",
      entityId: trx._id,
      details: { amount },
    });

    res.json(trx);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
