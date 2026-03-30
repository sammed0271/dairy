import Milk from "../models/Milk.js";
import Bill from "../models/Bill.js";
import Inventory from "../models/Inventory.js";
import { getScopedFilter, isSuperadmin } from "../utils/access.js";

const withCentreFilter = (req, base = {}) => {
  if (req.query.centreId && isSuperadmin(req)) {
    return { ...base, centreId: req.query.centreId };
  }

  return getScopedFilter(req, base);
};

export const dailyMilkReport = async (req, res) => {
  try {
    const { date, shift, milkType } = req.query;
    const filter = withCentreFilter(req, { date });

    if (shift) filter.shift = shift;
    if (milkType) filter.milkType = milkType;

    const entries = await Milk.find(filter)
      .populate("farmerId", "name mobile")
      .sort({ shift: 1 });

    let totalLiters = 0;
    let totalAmount = 0;
    let cowLiters = 0;
    let buffaloLiters = 0;
    let mixLiters = 0;

    entries.forEach((entry) => {
      totalLiters += entry.quantity;
      totalAmount += entry.totalAmount;
      if (entry.milkType === "cow") cowLiters += entry.quantity;
      if (entry.milkType === "buffalo") buffaloLiters += entry.quantity;
      if (entry.milkType === "mix") mixLiters += entry.quantity;
    });

    res.json({
      date,
      totalLiters,
      totalAmount,
      cowLiters,
      buffaloLiters,
      mixLiters,
      entries,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const milkTypeReport = async (req, res) => {
  try {
    const { from, to, shift } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: "From and To required" });
    }

    const match = withCentreFilter(req, {
      date: { $gte: from, $lte: to },
    });

    if (shift) match.shift = shift;

    const data = await Milk.aggregate([
      { $match: match },
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

    data.forEach((item) => {
      result[item._id] = {
        liters: item.totalLiters,
        amount: item.totalAmount,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getBillingReportByRange = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: "From and To dates required" });
    }

    const bills = await Bill.find({
      ...withCentreFilter(req),
      periodFrom: { $lte: to },
      periodTo: { $gte: from },
    })
      .populate("farmerId", "name mobile")
      .lean();

    const safeBills = bills.map((bill) => ({
      ...bill,
      farmerId: bill.farmerId ?? { name: "Deleted Farmer", mobile: "-" },
    }));

    const totals = bills.reduce(
      (acc, item) => {
        acc.totalMilkAmount += item.totalMilkAmount;
        acc.totalDeduction += item.totalDeduction;
        acc.totalBonus += item.totalBonus;
        acc.netPayable += item.netPayable;
        acc.totalLiters += item.totalLiters;
        return acc;
      },
      {
        totalMilkAmount: 0,
        totalDeduction: 0,
        totalBonus: 0,
        netPayable: 0,
        totalLiters: 0,
      },
    );

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

export const inventoryReport = async (req, res) => {
  try {
    const items = await Inventory.find(withCentreFilter(req));

    const summary = items.reduce(
      (acc, item) => {
        acc.totalItems += 1;
        acc.stockValue += item.currentStock * (item.purchaseRate || 0);
        if (item.currentStock <= 0) acc.outOfStock += 1;
        else if (item.currentStock < item.minStock) acc.lowStock += 1;
        return acc;
      },
      { totalItems: 0, lowStock: 0, outOfStock: 0, stockValue: 0 },
    );

    res.json({ summary, items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const milkReportByRange = async (req, res) => {
  try {
    const { from, to, shift, milkType } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: "From and To required" });
    }

    const filter = withCentreFilter(req, {
      date: { $gte: from, $lte: to },
    });

    if (shift) filter.shift = shift;
    if (milkType) filter.milkType = milkType;

    const entries = await Milk.find(filter).populate("farmerId", "code name");

    let totalLiters = 0;
    let totalAmount = 0;
    let cowLiters = 0;
    let buffaloLiters = 0;
    let mixLiters = 0;

    const dayMap = new Map();
    const farmerMap = new Map();

    entries.forEach((entry) => {
      totalLiters += entry.quantity;
      totalAmount += entry.totalAmount;

      if (entry.milkType === "cow") cowLiters += entry.quantity;
      if (entry.milkType === "buffalo") buffaloLiters += entry.quantity;
      if (entry.milkType === "mix") mixLiters += entry.quantity;

      if (!dayMap.has(entry.date)) {
        dayMap.set(entry.date, { date: entry.date, liters: 0, amount: 0 });
      }
      dayMap.get(entry.date).liters += entry.quantity;
      dayMap.get(entry.date).amount += entry.totalAmount;

      if (!entry.farmerId) return;

      const farmerKey = entry.farmerId._id.toString();

      if (!farmerMap.has(farmerKey)) {
        farmerMap.set(farmerKey, {
          farmerId: farmerKey,
          farmerCode: entry.farmerId.code ?? "N/A",
          farmerName: entry.farmerId.name ?? "Deleted Farmer",
          liters: 0,
          amount: 0,
        });
      }

      farmerMap.get(farmerKey).liters += entry.quantity;
      farmerMap.get(farmerKey).amount += entry.totalAmount;
    });

    res.json({
      from,
      to,
      totalLiters,
      totalAmount,
      cowLiters,
      buffaloLiters,
      mixLiters,
      dayCount: dayMap.size,
      farmerCount: farmerMap.size,
      entryCount: entries.length,
      entries,
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
