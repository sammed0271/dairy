import Bill from "../models/Bill.js";
import AuditLog from "../models/AuditLog.js";
import Farmer from "../models/Farmer.js";
import Inventory from "../models/Inventory.js";
import Milk from "../models/Milk.js";
import Payment from "../models/Payment.js";
import { getScopedFilter, isSuperadmin } from "../utils/access.js";
import { applyMilkReportFilters } from "../utils/reportFilters.js";

const withCentreFilter = (req, base = {}) => {
  if (req.query.centreId && isSuperadmin(req)) {
    return { ...base, centreId: req.query.centreId };
  }

  return getScopedFilter(req, base);
};

const applyMilkFilters = (req, base = {}) => {
  return applyMilkReportFilters(withCentreFilter(req, base), req.query);
};

const sumMilkEntries = (entries) =>
  entries.reduce(
    (acc, entry) => {
      acc.totalLiters += entry.quantity || 0;
      acc.totalAmount += entry.totalAmount || 0;

      if (entry.milkType === "cow") acc.cowLiters += entry.quantity || 0;
      if (entry.milkType === "buffalo") acc.buffaloLiters += entry.quantity || 0;
      if (entry.milkType === "mix") acc.mixLiters += entry.quantity || 0;

      return acc;
    },
    {
      totalLiters: 0,
      totalAmount: 0,
      cowLiters: 0,
      buffaloLiters: 0,
      mixLiters: 0,
    },
  );

const normalizeDateRange = (req) => {
  const { from, to } = req.query;

  if (!from || !to) {
    const error = new Error("From and To required");
    error.statusCode = 400;
    throw error;
  }

  return {
    from: String(from),
    to: String(to),
  };
};

const normalizeOptionalDateRange = (req) => {
  const filter = {};
  const { from, to } = req.query;

  if (from || to) {
    filter.timestamp = {};

    if (from) {
      filter.timestamp.$gte = new Date(`${from}T00:00:00.000Z`);
    }

    if (to) {
      filter.timestamp.$lte = new Date(`${to}T23:59:59.999Z`);
    }
  }

  return {
    from: from ? String(from) : null,
    to: to ? String(to) : null,
    filter,
  };
};

export const dailyMilkReport = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const filter = applyMilkFilters(req, { date: String(date) });
    const entries = await Milk.find(filter)
      .populate("farmerId", "name mobile code")
      .sort({ shift: 1, createdAt: 1 });

    const totals = sumMilkEntries(entries);

    res.json({
      date,
      shift: req.query.shift ?? "all",
      milkType: req.query.milkType ?? "all",
      ...totals,
      entryCount: entries.length,
      entries,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const monthlyMilkReport = async (req, res) => {
  try {
    const { from, to } = normalizeDateRange(req);
    const filter = applyMilkFilters(req, {
      date: { $gte: from, $lte: to },
    });

    const entries = await Milk.find(filter)
      .populate("farmerId", "code name mobile")
      .sort({ date: 1, shift: 1, createdAt: 1 });

    const totals = sumMilkEntries(entries);
    const dayMap = new Map();
    const farmerMap = new Map();

    entries.forEach((entry) => {
      if (!dayMap.has(entry.date)) {
        dayMap.set(entry.date, { date: entry.date, liters: 0, amount: 0 });
      }

      dayMap.get(entry.date).liters += entry.quantity || 0;
      dayMap.get(entry.date).amount += entry.totalAmount || 0;

      if (!entry.farmerId) return;

      const farmerKey = entry.farmerId._id.toString();
      if (!farmerMap.has(farmerKey)) {
        farmerMap.set(farmerKey, {
          farmerId: farmerKey,
          farmerCode: entry.farmerId.code ?? "N/A",
          farmerName: entry.farmerId.name ?? "Deleted Farmer",
          mobile: entry.farmerId.mobile ?? "-",
          liters: 0,
          amount: 0,
        });
      }

      farmerMap.get(farmerKey).liters += entry.quantity || 0;
      farmerMap.get(farmerKey).amount += entry.totalAmount || 0;
    });

    res.json({
      from,
      to,
      shift: req.query.shift ?? "all",
      milkType: req.query.milkType ?? "all",
      ...totals,
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
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const milkTypeReport = async (req, res) => {
  try {
    const { from, to } = normalizeDateRange(req);
    const match = applyMilkFilters(req, {
      date: { $gte: from, $lte: to },
    });

    const data = await Milk.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$milkType",
          totalLiters: { $sum: "$quantity" },
          totalAmount: { $sum: "$totalAmount" },
          averageFat: { $avg: "$fat" },
          averageSnf: { $avg: "$snf" },
        },
      },
    ]);

    const result = {
      cow: { liters: 0, amount: 0, averageFat: 0, averageSnf: 0 },
      buffalo: { liters: 0, amount: 0, averageFat: 0, averageSnf: 0 },
      mix: { liters: 0, amount: 0, averageFat: 0, averageSnf: 0 },
    };

    data.forEach((item) => {
      result[item._id] = {
        liters: item.totalLiters || 0,
        amount: item.totalAmount || 0,
        averageFat: Number(item.averageFat || 0),
        averageSnf: Number(item.averageSnf || 0),
      };
    });

    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const milkQualityAnalysisReport = async (req, res) => {
  try {
    const { from, to } = normalizeDateRange(req);
    const match = applyMilkFilters(req, {
      date: { $gte: from, $lte: to },
    });

    const entries = await Milk.find(match)
      .populate("farmerId", "code name")
      .sort({ date: 1, shift: 1, createdAt: 1 });

    const summary = entries.reduce(
      (acc, entry) => {
        acc.entryCount += 1;
        acc.totalLiters += entry.quantity || 0;
        acc.totalAmount += entry.totalAmount || 0;
        acc.totalFat += entry.fat || 0;
        acc.totalSnf += entry.snf || 0;
        acc.totalRate += entry.rate || 0;
        return acc;
      },
      {
        entryCount: 0,
        totalLiters: 0,
        totalAmount: 0,
        totalFat: 0,
        totalSnf: 0,
        totalRate: 0,
      },
    );

    const milkTypeBreakdown = await Milk.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$milkType",
          averageFat: { $avg: "$fat" },
          averageSnf: { $avg: "$snf" },
          averageRate: { $avg: "$rate" },
          liters: { $sum: "$quantity" },
          amount: { $sum: "$totalAmount" },
          entries: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dayRows = await Milk.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$date",
          averageFat: { $avg: "$fat" },
          averageSnf: { $avg: "$snf" },
          averageRate: { $avg: "$rate" },
          liters: { $sum: "$quantity" },
          amount: { $sum: "$totalAmount" },
          entries: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          averageFat: 1,
          averageSnf: 1,
          averageRate: 1,
          liters: 1,
          amount: 1,
          entries: 1,
        },
      },
    ]);

    const farmerRows = await Milk.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$farmerId",
          averageFat: { $avg: "$fat" },
          averageSnf: { $avg: "$snf" },
          averageRate: { $avg: "$rate" },
          liters: { $sum: "$quantity" },
          amount: { $sum: "$totalAmount" },
          entries: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "farmers",
          localField: "_id",
          foreignField: "_id",
          as: "farmer",
        },
      },
      {
        $project: {
          _id: 0,
          farmerId: "$_id",
          farmerCode: {
            $ifNull: [{ $arrayElemAt: ["$farmer.code", 0] }, "N/A"],
          },
          farmerName: {
            $ifNull: [{ $arrayElemAt: ["$farmer.name", 0] }, "Deleted Farmer"],
          },
          averageFat: 1,
          averageSnf: 1,
          averageRate: 1,
          liters: 1,
          amount: 1,
          entries: 1,
        },
      },
      { $sort: { farmerName: 1 } },
    ]);

    res.json({
      from,
      to,
      shift: req.query.shift ?? "all",
      milkType: req.query.milkType ?? "all",
      summary: {
        entryCount: summary.entryCount,
        totalLiters: summary.totalLiters,
        totalAmount: summary.totalAmount,
        averageFat: summary.entryCount ? summary.totalFat / summary.entryCount : 0,
        averageSnf: summary.entryCount ? summary.totalSnf / summary.entryCount : 0,
        averageRate: summary.entryCount ? summary.totalRate / summary.entryCount : 0,
      },
      milkTypeBreakdown,
      dayRows,
      farmerRows,
      entries,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const farmerPaymentReport = async (req, res) => {
  try {
    const { from, to } = normalizeDateRange(req);
    const billMatch = withCentreFilter(req, {
      periodFrom: { $lte: new Date(to) },
      periodTo: { $gte: new Date(from) },
    });

    const paymentMatch = withCentreFilter(req, {
      createdAt: {
        $gte: new Date(`${from}T00:00:00.000Z`),
        $lte: new Date(`${to}T23:59:59.999Z`),
      },
    });

    const [billRows, paymentRows] = await Promise.all([
      Bill.find(billMatch).populate("farmerId", "code name mobile centreId").lean(),
      Payment.find(paymentMatch).lean(),
    ]);

    const paymentByFarmer = new Map();
    paymentRows.forEach((payment) => {
      const key = String(payment.farmerId || "");
      if (!key) return;

      if (!paymentByFarmer.has(key)) {
        paymentByFarmer.set(key, {
          totalPaidAmount: 0,
          paymentCount: 0,
          latestPaymentDate: null,
        });
      }

      const bucket = paymentByFarmer.get(key);
      bucket.totalPaidAmount += payment.amount || 0;
      bucket.paymentCount += 1;

      if (
        payment.createdAt &&
        (!bucket.latestPaymentDate ||
          new Date(payment.createdAt) > new Date(bucket.latestPaymentDate))
      ) {
        bucket.latestPaymentDate = payment.createdAt;
      }
    });

    const rows = billRows.map((bill) => {
      const farmer = bill.farmerId || {};
      const paymentMeta = paymentByFarmer.get(String(farmer._id || "")) || {
        totalPaidAmount: 0,
        paymentCount: 0,
        latestPaymentDate: null,
      };

      return {
        billId: bill._id,
        farmerId: farmer._id || null,
        farmerCode: farmer.code ?? "N/A",
        farmerName: farmer.name ?? "Deleted Farmer",
        mobile: farmer.mobile ?? "-",
        periodFrom: bill.periodFrom,
        periodTo: bill.periodTo,
        totalLiters: bill.totalLiters || 0,
        totalMilkAmount: bill.totalMilkAmount || 0,
        totalDeduction: bill.totalDeduction || 0,
        totalBonus: bill.totalBonus || 0,
        netPayable: bill.netPayable || 0,
        billStatus: bill.status,
        totalPaidAmount: paymentMeta.totalPaidAmount,
        pendingAmount: Math.max((bill.netPayable || 0) - paymentMeta.totalPaidAmount, 0),
        paymentCount: paymentMeta.paymentCount,
        latestPaymentDate: paymentMeta.latestPaymentDate,
      };
    });

    const summary = rows.reduce(
      (acc, row) => {
        acc.billCount += 1;
        acc.totalLiters += row.totalLiters;
        acc.totalMilkAmount += row.totalMilkAmount;
        acc.totalDeduction += row.totalDeduction;
        acc.totalBonus += row.totalBonus;
        acc.netPayable += row.netPayable;
        acc.totalPaidAmount += row.totalPaidAmount;
        acc.pendingAmount += row.pendingAmount;
        return acc;
      },
      {
        billCount: 0,
        totalLiters: 0,
        totalMilkAmount: 0,
        totalDeduction: 0,
        totalBonus: 0,
        netPayable: 0,
        totalPaidAmount: 0,
        pendingAmount: 0,
      },
    );

    res.json({
      from,
      to,
      summary,
      rows,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const auditTrailReport = async (req, res) => {
  try {
    const { from, to, filter: dateFilter } = normalizeOptionalDateRange(req);
    const match = withCentreFilter(req, { ...dateFilter });

    if (req.query.action && req.query.action !== "all") {
      match.action = String(req.query.action);
    }

    if (req.query.entityType && req.query.entityType !== "all") {
      match.entityType = String(req.query.entityType);
    }

    const limit = Math.min(Number(req.query.limit) || 200, 500);

    const rows = await AuditLog.find(match)
      .populate("userId", "name email")
      .populate("centreId", "name code")
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    const actionMap = new Map();
    const entityMap = new Map();
    const userIds = new Set();

    rows.forEach((row) => {
      actionMap.set(row.action, (actionMap.get(row.action) || 0) + 1);
      entityMap.set(row.entityType, (entityMap.get(row.entityType) || 0) + 1);

      if (row.userId?._id) {
        userIds.add(String(row.userId._id));
      }
    });

    res.json({
      from,
      to,
      summary: {
        totalActions: rows.length,
        uniqueUsers: userIds.size,
        uniqueEntities: new Set(rows.map((row) => `${row.entityType}:${row.entityId}`))
          .size,
        latestActionAt: rows[0]?.timestamp ?? null,
      },
      actionBreakdown: Array.from(actionMap.entries())
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count),
      entityBreakdown: Array.from(entityMap.entries())
        .map(([entityType, count]) => ({ entityType, count }))
        .sort((a, b) => b.count - a.count),
      rows,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const getBillingReportByRange = async (req, res) => {
  try {
    const { from, to } = normalizeDateRange(req);

    const bills = await Bill.find({
      ...withCentreFilter(req),
      periodFrom: { $lte: new Date(to) },
      periodTo: { $gte: new Date(from) },
    })
      .populate("farmerId", "name mobile")
      .lean();

    const safeBills = bills.map((bill) => ({
      ...bill,
      farmerId: bill.farmerId ?? { name: "Deleted Farmer", mobile: "-" },
    }));

    const totals = bills.reduce(
      (acc, item) => {
        acc.totalMilkAmount += item.totalMilkAmount || 0;
        acc.totalDeduction += item.totalDeduction || 0;
        acc.totalBonus += item.totalBonus || 0;
        acc.netPayable += item.netPayable || 0;
        acc.totalLiters += item.totalLiters || 0;
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
    const { from, to } = req.query;
    const filter = withCentreFilter(req);

    if (from || to) {
      filter.updatedAt = {};
      if (from) filter.updatedAt.$gte = new Date(`${from}T00:00:00.000Z`);
      if (to) filter.updatedAt.$lte = new Date(`${to}T23:59:59.999Z`);
    }

    const items = await Inventory.find(filter);

    const summary = items.reduce(
      (acc, item) => {
        acc.totalItems += 1;
        acc.stockValue += (item.currentStock || 0) * (item.purchaseRate || 0);
        if ((item.currentStock || 0) <= 0) acc.outOfStock += 1;
        else if ((item.currentStock || 0) < (item.minStock || 0)) acc.lowStock += 1;
        return acc;
      },
      { totalItems: 0, lowStock: 0, outOfStock: 0, stockValue: 0 },
    );

    res.json({ summary, items, from: from ?? null, to: to ?? null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const milkReportByRange = monthlyMilkReport;
