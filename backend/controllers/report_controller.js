import Milk from "../models/Milk.js";
import Bill from "../models/Bill.js";
import Inventory from "../models/Inventory.js";

/* ===============================
   1. DAILY MILK COLLECTION REPORT
================================ */
export const dailyMilkReport = async (req, res) => {
  try {
    const { date } = req.query;

    const entries = await Milk.find({ date: this.date, centerId: req.user.centerId, })
      .populate("farmerId", "name mobile")
      .sort({ shift: 1 });

    let totalLiters = 0;
    let totalAmount = 0;
    let cowLiters = 0;
    let buffaloLiters = 0;

    entries.forEach((e) => {
      totalLiters += e.quantity;
      totalAmount += e.totalAmount;
      if (e.milkType === "cow") cowLiters += e.quantity;
      if (e.milkType === "buffalo") buffaloLiters += e.quantity;
    });

    res.json({
      date,
      totalLiters,
      totalAmount,
      cowLiters,
      buffaloLiters,
      entries,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ===============================
   2. COW / BUFFALO YIELD REPORT
================================ */
export const milkTypeReport = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: "From and To required" });
    }

    const data = await Milk.aggregate([
      {
        $match: {
          centerId: req.user.centerId,
          date: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: "$milkType",
          totalLiters: { $sum: "$quantity" },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    const result = {
      cow: { liters: 0, amount: 0 },
      buffalo: { liters: 0, amount: 0 },
      mix: { liters: 0, amount: 0 },
    };

    data.forEach((d) => {
      result[d._id] = {
        liters: d.totalLiters,
        amount: d.totalAmount,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ===============================
   3. BILLING REPORT
================================ */

export const getBillingReportByRange = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: "From and To dates required" });
    }

    const bills = await Bill.find({
      centerId: req.user.centerId,
      periodFrom: { $lte: to },
      periodTo: { $gte: from },
    })
      .populate("farmerId", "name mobile")
      .lean();

    const safeBills = bills.map((b) => ({
      ...b,
      farmerId: b.farmerId ?? { name: "Deleted Farmer", mobile: "-" },
    }));

    let totals = {
      totalMilkAmount: 0,
      totalDeduction: 0,
      totalBonus: 0,
      netPayable: 0,
      totalLiters: 0,
    };

    bills.forEach((b) => {
      totals.totalMilkAmount += b.totalMilkAmount;
      totals.totalDeduction += b.totalDeduction;
      totals.totalBonus += b.totalBonus;
      totals.netPayable += b.netPayable;
      totals.totalLiters += b.totalLiters;
    });

    res.json({
      from,
      to,
      billCount: bills.length,
      ...totals,
      rows: safeBills,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Billing report failed" });
  }
};

/* ===============================
   4. INVENTORY REPORT
================================ */
export const inventoryReport = async (req, res) => {
  try {
    const items = await Inventory.find({ centerId: req.user.centerId, });

    const summary = items.reduce(
      (acc, i) => {
        acc.totalItems += 1;
        acc.stockValue += i.currentStock * (i.purchaseRate || 0);
        if (i.currentStock <= 0) acc.outOfStock += 1;
        else if (i.currentStock < i.minStock) acc.lowStock += 1;
        return acc;
      },
      { totalItems: 0, lowStock: 0, outOfStock: 0, stockValue: 0 },
    );

    res.json({ summary, items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ===============================
   5. MONTHLY MILK COLLECTION REPORT
================================ */

export const milkReportByRange = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: "From and To required" });
    }

    const entries = await Milk.find({
      centerId: req.user.centerId,
      date: { $gte: from, $lte: to },
    }).populate("farmerId", "code name");

    let totalLiters = 0;
    let totalAmount = 0;
    let cowLiters = 0;
    let buffaloLiters = 0;

    const dayMap = new Map();
    const farmerMap = new Map();

    entries.forEach((e) => {
      totalLiters += e.quantity;
      totalAmount += e.totalAmount;

      if (e.milkType === "cow") cowLiters += e.quantity;
      if (e.milkType === "buffalo") buffaloLiters += e.quantity;

      // per day
      if (!dayMap.has(e.date)) {
        dayMap.set(e.date, { date: e.date, liters: 0, amount: 0 });
      }
      dayMap.get(e.date).liters += e.quantity;
      dayMap.get(e.date).amount += e.totalAmount;

      // per farmer
      if (!e.farmerId) return;

      const fId = e.farmerId._id.toString();

      if (!farmerMap.has(fId)) {
        farmerMap.set(fId, {
          farmerId: fId,
          farmerCode: e.farmerId.code ?? "N/A",
          farmerName: e.farmerId.name ?? "Deleted Farmer",
          liters: 0,
          amount: 0,
        });
      }

      farmerMap.get(fId).liters += e.quantity;
      farmerMap.get(fId).amount += e.totalAmount;
    });

    res.json({
      from,
      to,
      totalLiters,
      totalAmount,
      cowLiters,
      buffaloLiters,
      dayCount: dayMap.size,
      farmerCount: farmerMap.size,
      entryCount: entries.length,
      entries, // 👈 ADD THIS LINE
      dayRows: Array.from(dayMap.values()).sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
      farmerRows: Array.from(farmerMap.values()).sort((a, b) =>
        a.farmerName.localeCompare(b.farmerName),
      ),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
