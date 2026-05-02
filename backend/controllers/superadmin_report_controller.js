import mongoose from "mongoose";
import Milk from "../models/Milk.js";
import Bill from "../models/Bill.js";
import Center from "../models/Center.js";

// ─── Shared helper ────────────────────────────────────────────────────────────

/**
 * If centerId query param is present, filter to that center only.
 * Otherwise return all center ObjectIds.
 */
async function resolveCenterIds(queryCenterId) {
  if (queryCenterId) {
    return [new mongoose.Types.ObjectId(queryCenterId)];
  }
  const centers = await Center.find({}).select("_id").lean();
  return centers.map((c) => c._id);
}

// ─── 1. Daily Report ──────────────────────────────────────────────────────────

/**
 * GET /api/superadmin/reports/daily?date=YYYY-MM-DD&centerId=optional
 */
export const superadminDailyReport = async (req, res) => {
  try {
    const { date, centerId } = req.query;
    if (!date) return res.status(400).json({ message: "date is required" });

    const centerIds = await resolveCenterIds(centerId);

    const entries = await Milk.find({
      centerId: { $in: centerIds },
      date,
    })
      .populate("farmerId", "name mobile")
      .populate("centerId", "name")
      .sort({ shift: 1 })
      .lean();

    let totalLiters = 0, totalAmount = 0, cowLiters = 0, buffaloLiters = 0;
    let morningLiters = 0, eveningLiters = 0;
    const farmers = new Set();
    const activeCenters = new Set();

    entries.forEach((e) => {
      totalLiters += e.quantity;
      totalAmount += e.totalAmount;
      if (e.milkType === "cow") cowLiters += e.quantity;
      if (e.milkType === "buffalo") buffaloLiters += e.quantity;
      if (e.shift?.toLowerCase() === "morning") morningLiters += e.quantity;
      if (e.shift?.toLowerCase() === "evening") eveningLiters += e.quantity;
      if (e.farmerId?._id) farmers.add(e.farmerId._id.toString());
      if (e.centerId?._id) activeCenters.add(e.centerId._id.toString());
    });

    return res.json({
      date,
      totalLiters: Math.round(totalLiters * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      cowLiters: Math.round(cowLiters * 100) / 100,
      buffaloLiters: Math.round(buffaloLiters * 100) / 100,
      morningLiters: Math.round(morningLiters * 100) / 100,
      eveningLiters: Math.round(eveningLiters * 100) / 100,
      farmerCount: farmers.size,
      centerCount: activeCenters.size,
      entries,
    });
  } catch (err) {
    console.error("superadminDailyReport error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// ─── 2. Range (Monthly) Report ────────────────────────────────────────────────

/**
 * GET /api/superadmin/reports/range?from=YYYY-MM-DD&to=YYYY-MM-DD&centerId=optional
 */
export const superadminRangeReport = async (req, res) => {
  try {
    const { from, to, centerId } = req.query;
    if (!from || !to) return res.status(400).json({ message: "from and to are required" });

    const centerIds = await resolveCenterIds(centerId);

    const entries = await Milk.find({
      centerId: { $in: centerIds },
      date: { $gte: from, $lte: to },
    })
      .populate("farmerId", "code name")
      .populate("centerId", "name")
      .lean();

    let totalLiters = 0, totalAmount = 0;
    let cowLiters = 0, buffaloLiters = 0, mixLiters = 0;

    const dayMap = new Map();
    const farmerMap = new Map();
    const centerMap = new Map();
    const farmers = new Set();

    entries.forEach((e) => {
      totalLiters += e.quantity;
      totalAmount += e.totalAmount;
      if (e.milkType === "cow") cowLiters += e.quantity;
      if (e.milkType === "buffalo") buffaloLiters += e.quantity;
      if (e.milkType === "mix") mixLiters += e.quantity;

      // per day
      if (!dayMap.has(e.date)) dayMap.set(e.date, { date: e.date, liters: 0, amount: 0 });
      dayMap.get(e.date).liters += e.quantity;
      dayMap.get(e.date).amount += e.totalAmount;

      // per center
      const cId = e.centerId?._id?.toString() ?? "unknown";
      const cName = e.centerId?.name ?? "Unknown";
      if (!centerMap.has(cId)) centerMap.set(cId, { centerId: cId, centerName: cName, liters: 0, amount: 0 });
      centerMap.get(cId).liters += e.quantity;
      centerMap.get(cId).amount += e.totalAmount;

      // per farmer
      if (!e.farmerId) return;
      const fId = e.farmerId._id.toString();
      farmers.add(fId);
      if (!farmerMap.has(fId)) {
        farmerMap.set(fId, {
          farmerId: fId,
          farmerCode: e.farmerId.code ?? "N/A",
          farmerName: e.farmerId.name ?? "Deleted Farmer",
          centerName: e.centerId?.name ?? "—",
          liters: 0,
          amount: 0,
        });
      }
      farmerMap.get(fId).liters += e.quantity;
      farmerMap.get(fId).amount += e.totalAmount;
    });

    return res.json({
      from,
      to,
      totalLiters: Math.round(totalLiters * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      cowLiters: Math.round(cowLiters * 100) / 100,
      buffaloLiters: Math.round(buffaloLiters * 100) / 100,
      mixLiters: Math.round(mixLiters * 100) / 100,
      dayCount: dayMap.size,
      farmerCount: farmers.size,
      entryCount: entries.length,
      centerCount: centerMap.size,
      dayRows: Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
      farmerRows: Array.from(farmerMap.values()).sort((a, b) => a.farmerName.localeCompare(b.farmerName)),
      centerRows: Array.from(centerMap.values()).sort((a, b) => b.liters - a.liters),
    });
  } catch (err) {
    console.error("superadminRangeReport error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// ─── 3. Milk Yield (type breakdown) ──────────────────────────────────────────

/**
 * GET /api/superadmin/reports/milk-yield?from=YYYY-MM-DD&to=YYYY-MM-DD&centerId=optional
 */
export const superadminMilkYield = async (req, res) => {
  try {
    const { from, to, centerId } = req.query;
    if (!from || !to) return res.status(400).json({ message: "from and to are required" });

    const centerIds = await resolveCenterIds(centerId);

    const data = await Milk.aggregate([
      { $match: { centerId: { $in: centerIds }, date: { $gte: from, $lte: to } } },
      { $group: { _id: "$milkType", totalLiters: { $sum: "$quantity" }, totalAmount: { $sum: "$totalAmount" } } },
    ]);

    const result = {
      cow: { liters: 0, amount: 0 },
      buffalo: { liters: 0, amount: 0 },
      mix: { liters: 0, amount: 0 },
    };
    data.forEach((d) => {
      if (result[d._id]) {
        result[d._id] = {
          liters: Math.round(d.totalLiters * 100) / 100,
          amount: Math.round(d.totalAmount * 100) / 100,
        };
      }
    });

    return res.json(result);
  } catch (err) {
    console.error("superadminMilkYield error:", err);
    return res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/superadmin/reports/milk-entries?from=YYYY-MM-DD&to=YYYY-MM-DD&centerId=optional
 */
export const superadminMilkEntries = async (req, res) => {
  try {
    const { from, to, centerId } = req.query;
    if (!from || !to) return res.status(400).json({ message: "from and to are required" });

    const centerIds = await resolveCenterIds(centerId);

    const entries = await Milk.find({
      centerId: { $in: centerIds },
      date: { $gte: from, $lte: to },
    })
      .populate("farmerId", "name")
      .populate("centerId", "name")
      .sort({ date: 1, shift: 1 })
      .lean();

    return res.json({ entries });
  } catch (err) {
    console.error("superadminMilkEntries error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// ─── 4. Billing Report ────────────────────────────────────────────────────────

/**
 * GET /api/superadmin/reports/billing?from=YYYY-MM-DD&to=YYYY-MM-DD&centerId=optional
 */
export const superadminBillingReport = async (req, res) => {
  try {
    const { from, to, centerId } = req.query;
    if (!from || !to) return res.status(400).json({ message: "from and to are required" });

    const centerIds = await resolveCenterIds(centerId);

    const bills = await Bill.find({
      centerId: { $in: centerIds },
      periodFrom: { $lte: to },
      periodTo: { $gte: from },
    })
      .populate("farmerId", "name mobile")
      .populate("centerId", "name")
      .lean();

    let totalMilkAmount = 0, totalDeduction = 0, totalBonus = 0, netPayable = 0, totalLiters = 0;

    const safeBills = bills.map((b) => {
      totalMilkAmount += b.totalMilkAmount;
      totalDeduction += b.totalDeduction;
      totalBonus += b.totalBonus;
      netPayable += b.netPayable;
      totalLiters += b.totalLiters;
      return {
        ...b,
        farmerId: b.farmerId ?? { name: "Deleted Farmer", mobile: "-" },
      };
    });

    return res.json({
      from,
      to,
      billCount: bills.length,
      totalLiters: Math.round(totalLiters * 100) / 100,
      totalMilkAmount: Math.round(totalMilkAmount * 100) / 100,
      totalDeduction: Math.round(totalDeduction * 100) / 100,
      totalBonus: Math.round(totalBonus * 100) / 100,
      netPayable: Math.round(netPayable * 100) / 100,
      rows: safeBills,
    });
  } catch (err) {
    console.error("superadminBillingReport error:", err);
    return res.status(500).json({ message: err.message });
  }
};