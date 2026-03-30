import Bill from "../models/Bill.js";
import Milk from "../models/Milk.js";
import Deduction from "../models/Deduction.js";
import Bonus from "../models/Bonus.js";
import InventoryTransaction from "../models/InventoryTransaction.js";
import Farmer from "../models/Farmer.js";
import { logAudit } from "../services/auditService.js";
import { getScopedFilter } from "../utils/access.js";

const getAccessibleFarmer = (req, farmerId) =>
  Farmer.findOne(getScopedFilter(req, { _id: farmerId }));

export const getBills = async (req, res) => {
  try {
    const bills = await Bill.find(getScopedFilter(req))
      .populate("farmerId", "name code")
      .sort({ createdAt: -1 });

    const formatted = bills.map((b, index) => {
      const farmer = b.farmerId;

      return {
        _id: b._id,
        billNo: `BILL-${String(index + 1).padStart(4, "0")}`,
        farmerId: farmer?._id ?? null,
        farmerName: farmer?.name ?? "Deleted Farmer",
        farmerCode: farmer?.code ?? "-",
        periodFrom: b.periodFrom,
        periodTo: b.periodTo,
        totalLiters: b.totalLiters ?? 0,
        milkAmount: b.totalMilkAmount ?? 0,
        bonusAmount: b.totalBonus ?? 0,
        deductionAmount: b.totalDeduction ?? 0,
        netAmount: b.netPayable ?? 0,
        status: b.status ?? "Pending",
        createdAt: b.createdAt,
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error("getBills error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const generateBill = async (req, res) => {
  try {
    const { farmerId, periodFrom, periodTo, clientGeneratedId } = req.body;
    const farmer = await getAccessibleFarmer(req, farmerId);

    if (!farmer) {
      return res.status(404).json({ message: "Farmer not found" });
    }

    const centreId = farmer.centreId ?? req.user?.centreId ?? null;
    const fromDate = new Date(periodFrom);
    const toDate = new Date(periodTo);

    const overlappingBill = await Bill.findOne({
      centreId,
      farmerId,
      periodFrom: { $lte: toDate },
      periodTo: { $gte: fromDate },
    });

    if (overlappingBill) {
      return res.status(400).json({
        message: `Bill already exists for overlapping period (${overlappingBill.periodFrom} to ${overlappingBill.periodTo})`,
      });
    }

    const [milkList, deductionList, bonusList, inventoryList] =
      await Promise.all([
        Milk.find({
          centreId,
          farmerId,
          date: { $gte: periodFrom, $lte: periodTo },
        }),
        Deduction.find({
          centreId,
          farmerId,
          date: { $gte: periodFrom, $lte: periodTo },
        }),
        Bonus.find({
          centreId,
          farmerId,
          date: { $gte: periodFrom, $lte: periodTo },
        }),
        InventoryTransaction.find({
          centreId,
          farmerId,
          remainingAmount: { $gt: 0 },
          paymentMethod: { $ne: "Cash" },
          isAdjustedInBill: false,
          date: { $lte: new Date(periodTo) },
        }),
      ]);

    const totalLiters = milkList.reduce((sum, item) => sum + item.quantity, 0);
    const totalMilkAmount = milkList.reduce(
      (sum, item) => sum + item.totalAmount,
      0,
    );
    const totalBonus = bonusList.reduce((sum, item) => sum + item.amount, 0);
    const normalDeduction = deductionList.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const inventoryDeduction = inventoryList.reduce(
      (sum, item) => sum + item.remainingAmount,
      0,
    );
    const totalDeduction = normalDeduction + inventoryDeduction;

    let netPayable = totalMilkAmount + totalBonus - totalDeduction;

    const lastUnpaidBill = await Bill.findOne({
      centreId,
      farmerId,
      status: "Pending",
      periodTo: { $lt: periodFrom },
    }).sort({ periodTo: -1 });

    if (lastUnpaidBill) {
      netPayable += lastUnpaidBill.netPayable;
    }

    const bill = await Bill.create({
      centreId,
      farmerId,
      periodFrom,
      periodTo,
      totalLiters,
      totalMilkAmount,
      totalDeduction,
      totalBonus,
      netPayable,
      status: "Pending",
      clientGeneratedId: clientGeneratedId || null,
    });

    await InventoryTransaction.updateMany(
      {
        centreId,
        farmerId,
        remainingAmount: { $gt: 0 },
        paymentMethod: { $ne: "Cash" },
        isAdjustedInBill: false,
      },
      { isAdjustedInBill: true },
    );

    await logAudit({
      req,
      centreId,
      action: "bill_generated",
      entityType: "Bill",
      entityId: bill._id,
      details: { farmerId, periodFrom, periodTo, netPayable },
    });

    res.json(bill);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Bill already generated for this farmer and period",
      });
    }

    res.status(500).json({ message: err.message });
  }
};

export const previewBill = async (req, res) => {
  try {
    const { farmerId, periodFrom, periodTo } = req.body;
    const farmer = await getAccessibleFarmer(req, farmerId);

    if (!farmer) {
      return res.status(404).json({ message: "Farmer not found" });
    }

    const centreId = farmer.centreId ?? req.user?.centreId ?? null;

    const [milkList, deductionList, bonusList, inventoryList] =
      await Promise.all([
        Milk.find({
          centreId,
          farmerId,
          date: { $gte: periodFrom, $lte: periodTo },
        }),
        Deduction.find({
          centreId,
          farmerId,
          date: { $gte: periodFrom, $lte: periodTo },
        }),
        Bonus.find({
          centreId,
          farmerId,
          date: { $gte: periodFrom, $lte: periodTo },
        }),
        InventoryTransaction.find({
          centreId,
          farmerId,
          remainingAmount: { $gt: 0 },
          paymentMethod: { $ne: "Cash" },
          $or: [
            { isAdjustedInBill: false },
            { isAdjustedInBill: { $exists: false } },
          ],
        }),
      ]);

    const totalLiters = milkList.reduce((sum, item) => sum + item.quantity, 0);
    const milkAmount = milkList.reduce((sum, item) => sum + item.totalAmount, 0);
    const bonusAmount = bonusList.reduce((sum, item) => sum + item.amount, 0);
    const normalDeduction = deductionList.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const inventoryDeduction = inventoryList.reduce(
      (sum, item) => sum + item.remainingAmount,
      0,
    );
    const deductionAmount = normalDeduction + inventoryDeduction;

    res.json({
      totalLiters,
      milkAmount,
      deductionAmount,
      bonusAmount,
      netAmount: milkAmount + bonusAmount - deductionAmount,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteBill = async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await Bill.findOne(getScopedFilter(req, { _id: id }));

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    if (bill.status === "Paid") {
      return res.status(400).json({
        message: "Paid bills cannot be deleted",
      });
    }

    await bill.deleteOne();

    await logAudit({
      req,
      centreId: bill.centreId,
      action: "bill_deleted",
      entityType: "Bill",
      entityId: id,
    });

    res.json({ message: "Bill deleted successfully" });
  } catch (err) {
    console.error("deleteBill error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const markBillAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await Bill.findOne(getScopedFilter(req, { _id: id }));

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    if (bill.status === "Paid") {
      return res.status(400).json({ message: "Bill already marked as Paid" });
    }

    bill.status = "Paid";
    await bill.save();

    await logAudit({
      req,
      centreId: bill.centreId,
      action: "bill_marked_paid",
      entityType: "Bill",
      entityId: id,
    });

    res.json({ message: "Bill marked as Paid" });
  } catch (err) {
    console.error("markBillAsPaid error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getBillDetails = async (req, res) => {
  try {
    const { farmerId, periodFrom, periodTo } = req.body;
    const farmer = await getAccessibleFarmer(req, farmerId);

    if (!farmer) {
      return res.status(404).json({ message: "Farmer not found" });
    }

    const centreId = farmer.centreId ?? req.user?.centreId ?? null;

    const [milkEntries, deductionList, inventoryList, bonusList] =
      await Promise.all([
        Milk.find({
          centreId,
          farmerId,
          date: { $gte: periodFrom, $lte: periodTo },
        }).sort({ date: 1 }),
        Deduction.find({
          centreId,
          farmerId,
          date: { $gte: periodFrom, $lte: periodTo },
        }),
        InventoryTransaction.find({
          centreId,
          farmerId,
          remainingAmount: { $gt: 0 },
          paymentMethod: { $ne: "Cash" },
          date: { $lte: new Date(periodTo) },
        }),
        Bonus.find({
          centreId,
          farmerId,
          date: { $gte: periodFrom, $lte: periodTo },
        }),
      ]);

    const morning = [];
    const evening = [];

    milkEntries.forEach((entry) => {
      const row = {
        date: entry.date,
        liters: entry.quantity,
        fat: entry.fat,
        snf: entry.snf,
        rate: entry.rate,
        amount: entry.totalAmount,
      };

      if (String(entry.shift).toLowerCase() === "morning") {
        morning.push(row);
      } else {
        evening.push(row);
      }
    });

    const formattedDeductions = [
      ...deductionList.map((item) => ({
        reason: item.category || item.note || "Deduction",
        amount:
          item.remainingAmount > 0 ? item.remainingAmount : item.amount,
      })),
      ...inventoryList.map((item) => ({
        reason: item.itemName || "Inventory",
        amount: item.remainingAmount,
      })),
    ];

    res.json({
      morning,
      evening,
      deductions: formattedDeductions,
      bonuses: bonusList.map((item) => ({
        type: item.reason || "Bonus",
        amount: item.amount,
      })),
    });
  } catch (err) {
    console.error("getBillDetails error:", err);
    res.status(500).json({ message: err.message });
  }
};
