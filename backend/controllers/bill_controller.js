import Bill from "../models/Bill.js";
import Milk from "../models/Milk.js";
import Deduction from "../models/Deduction.js";
import Bonus from "../models/Bonus.js";
import InventoryTransaction from "../models/InventoryTransaction.js";

export const getBills = async (req, res) => {
  try {
    const bills = await Bill.find({ centerId: req.user.centerId, })
      .populate("farmerId", "name code")
      .sort({ createdAt: -1 });

    const formatted = bills.map((b, index) => {
      const farmer = b.farmerId; // may be null

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
    const { farmerId, periodFrom, periodTo } = req.body;

    // 🚫 Prevent overlapping periods
    const fromDate = new Date(periodFrom);
    const toDate = new Date(periodTo);

    const overlappingBill = await Bill.findOne({
      farmerId,
      periodFrom: { $lte: toDate },
      periodTo: { $gte: fromDate },
    });

    if (overlappingBill) {
      return res.status(400).json({
        message: `Bill already exists for overlapping period (${overlappingBill.periodFrom} → ${overlappingBill.periodTo})`,
      });
    }
    const milkList = await Milk.find({
      farmerId,
      date: { $gte: periodFrom, $lte: periodTo },
    });

    const deductionList = await Deduction.find({
      farmerId,
      // date: { $gte: periodFrom, $lte: periodTo },
      date: { $gte: periodFrom, $lte: periodTo },
    });

    const bonusList = await Bonus.find({
      farmerId,
      // date: { $gte: periodFrom, $lte: periodTo },
      date: { $gte: periodFrom, $lte: periodTo },
    });

    const inventoryList = await InventoryTransaction.find({
      farmerId,
      remainingAmount: { $gt: 0 },
      paymentMethod: { $ne: "Cash" },
      isAdjustedInBill: false,
      date: { $lte: new Date(periodTo) },
    });

    const totalLiters = milkList.reduce((s, m) => s + m.quantity, 0);
    const totalMilkAmount = milkList.reduce((s, m) => s + m.totalAmount, 0);

    const totalBonus = bonusList.reduce((s, b) => s + b.amount, 0);

    const normalDeduction = deductionList.reduce((s, d) => s + d.amount, 0);

    const inventoryDeduction = inventoryList.reduce(
      (s, i) => s + i.remainingAmount,
      0,
    );

    const totalDeduction = normalDeduction + inventoryDeduction;

    let netPayable = totalMilkAmount + totalBonus - totalDeduction;

    // Get last unpaid bill
    const lastUnpaidBill = await Bill.findOne({
      farmerId,
      status: "Pending",
      periodTo: { $lt: periodFrom }, // only older bills
    }).sort({ periodTo: -1 });

    let carryForwardAmount = 0;

    if (lastUnpaidBill) {
      carryForwardAmount = lastUnpaidBill.netPayable;
    }

    // 🔥 Add previous unpaid amount
    netPayable += carryForwardAmount;

    const bill = await Bill.create({
      centerId: req.user.centerId,
      farmerId,
      periodFrom,
      periodTo,

      // billMonth: normalizedPeriodFrom.slice(0, 7),
      totalLiters,
      totalMilkAmount,
      totalDeduction,
      totalBonus,
      netPayable,
      status: "Pending",
    });

    await InventoryTransaction.updateMany(
      {
        centerId: req.user.centerId,
        farmerId,
        remainingAmount: { $gt: 0 },
        paymentMethod: { $ne: "Cash" },
        isAdjustedInBill: false,
      },
      { isAdjustedInBill: true },
    );

    res.json(bill);
  } catch (err) {
    // Duplicate protection
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Bill already generated for this farmer and period",
      });
    }

    res.status(500).json({ message: err.message });
  }
};

export const previewBill = async (req, res) => {
  const { farmerId, periodFrom, periodTo } = req.body;

  //  normalize
  // const normalizedPeriodFrom = periodFrom.slice(0, 7) + "-01";

  const milkList = await Milk.find({
    farmerId,
    date: { $gte: periodFrom, $lte: periodTo },
  });

  const deductionList = await Deduction.find({
    farmerId,
    date: { $gte: periodFrom, $lte: periodTo },
  });

  const bonusList = await Bonus.find({
    farmerId,
    date: { $gte: periodFrom, $lte: periodTo },
  });

  const inventoryList = await InventoryTransaction.find({
    farmerId,
    remainingAmount: { $gt: 0 },
    paymentMethod: { $ne: "Cash" },
    $or: [
      { isAdjustedInBill: false },
      { isAdjustedInBill: { $exists: false } },
    ],
  });

  const totalLiters = milkList.reduce((s, m) => s + m.quantity, 0);
  const milkAmount = milkList.reduce((s, m) => s + m.totalAmount, 0);
  const bonusAmount = bonusList.reduce((s, b) => s + b.amount, 0);

  const normalDeduction = deductionList.reduce((s, d) => s + d.amount, 0);

  const inventoryDeduction = inventoryList.reduce(
    (s, i) => s + i.remainingAmount,
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
};

export const deleteBill = async (req, res) => {
  try {
    const { id } = req.params;

    const bill = await Bill.findById(id);

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    // Do not allow deleting paid bills
    if (bill.status === "Paid") {
      return res.status(400).json({
        message: "Paid bills cannot be deleted",
      });
    }

    await bill.deleteOne();

    res.json({ message: "Bill deleted successfully" });
  } catch (err) {
    console.error("deleteBill error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const markBillAsPaid = async (req, res) => {
  try {
    const { id } = req.params;

    const bill = await Bill.findById(id);

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    if (bill.status === "Paid") {
      return res.status(400).json({ message: "Bill already marked as Paid" });
    }

    bill.status = "Paid";
    await bill.save();

    res.json({ message: "Bill marked as Paid" });
  } catch (err) {
    console.error("markBillAsPaid error:", err);
    res.status(500).json({ message: err.message });
  }
};

// In your backend controller (e.g., controllers/billController.js)
export const getBillDetails = async (req, res) => {
  try {
    const { farmerId, periodFrom, periodTo } = req.body;

    // 1. Fetch Milk Entries
    const milkEntries = await Milk.find({
      farmerId,
      date: { $gte: periodFrom, $lte: periodTo },
    }).sort({ date: 1 });

    const morning = [];
    const evening = [];

    milkEntries.forEach((m) => {
      const row = {
        date: m.date,
        liters: m.quantity,
        fat: m.fat,
        rate: m.rate,
        amount: m.totalAmount,
      };
      if (m.shift === "Morning") morning.push(row);
      else evening.push(row);
    });

    // 2. Fetch Detailed Deductions (Cash Advances, etc.)
    const deductionList = await Deduction.find({
      farmerId,
      date: { $gte: periodFrom, $lte: periodTo },
    });

    // 3. Fetch Inventory Deductions (Animal Feed, etc.)
    const inventoryList = await InventoryTransaction.find({
      farmerId,
      remainingAmount: { $gt: 0 },
      paymentMethod: { $ne: "Cash" },
      date: { $lte: new Date(periodTo) },
    });

    // 4. Fetch Bonuses
    const bonusList = await Bonus.find({
      farmerId,
      date: { $gte: periodFrom, $lte: periodTo },
    });

    // Combine all deductions into a single array of objects
    const formattedDeductions = [
      ...deductionList.map((d) => ({
        reason: d.reason || "कपात",
        amount: d.amount,
      })),
      ...inventoryList.map((i) => ({
        reason: i.itemName || "पशुखाद्य",
        amount: i.remainingAmount,
      })),
    ];

    res.json({
      morning,
      evening,
      deductions: formattedDeductions,
      bonuses: bonusList.map((b) => ({
        type: b.type || "बोनस",
        amount: b.amount,
      })),
    });
  } catch (err) {
    console.error("getBillDetails error:", err);
    res.status(500).json({ message: err.message });
  }
};
