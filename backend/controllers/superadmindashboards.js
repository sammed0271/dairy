import Center from "../models/Center.js";
import Farmer from "../models/Farmer.js";
import Milk from "../models/Milk.js";

/**
 * GET /api/superadmin/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * NOTE: Milk.date is stored as a "YYYY-MM-DD" string, not ISODate.
 * All date comparisons use string $gte/$lte — this works correctly
 * because ISO date strings sort lexicographically identical to chronologically.
 */
export const getSuperadminDashboard = async (req, res) => {
  try {
    /* ── Date range (keep as YYYY-MM-DD strings to match DB) ─── */
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const fromStr = req.query.from ?? thirtyDaysAgo; // e.g. "2026-04-02"
    const toStr = req.query.to ?? today;          // e.g. "2026-05-02"

    /* ── 1. Centers ───────────────────────────────────────────── */
    const centers = await Center.find({}).lean();
    const centerIds = centers.map((c) => c._id);

    /* ── 2. Farmer counts per center ──────────────────────────── */
    const farmerAgg = await Farmer.aggregate([
      { $match: { centerId: { $in: centerIds } } },
      { $group: { _id: "$centerId", count: { $sum: 1 } } },
    ]);
    const farmerCountMap = Object.fromEntries(
      farmerAgg.map((r) => [r._id.toString(), r.count]),
    );

    /* ── 3. Per-center performance ────────────────────────────── */
    const perfAgg = await Milk.aggregate([
      {
        $match: {
          centerId: { $in: centerIds },
          date: { $gte: fromStr, $lte: toStr }, // string comparison
        },
      },
      {
        $group: {
          _id: "$centerId",
          totalLiters: { $sum: "$quantity" },
          totalAmount: { $sum: "$totalAmount" },
          cowLiters: { $sum: { $cond: [{ $eq: ["$milkType", "cow"] }, "$quantity", 0] } },
          buffaloLiters: { $sum: { $cond: [{ $eq: ["$milkType", "buffalo"] }, "$quantity", 0] } },
          mixLiters: { $sum: { $cond: [{ $eq: ["$milkType", "mix"] }, "$quantity", 0] } },
          avgFat: { $avg: "$fat" },
          avgSnf: { $avg: "$snf" },
        },
      },
    ]);
    const perfMap = Object.fromEntries(
      perfAgg.map((r) => [r._id.toString(), r]),
    );

    /* ── 4. Daily milk trend ──────────────────────────────────── */
    const dailyTrend = await Milk.aggregate([
      {
        $match: {
          centerId: { $in: centerIds },
          date: { $gte: fromStr, $lte: toStr },
        },
      },
      {
        $group: {
          _id: "$date", // already "YYYY-MM-DD" — no $dateToString needed
          totalLiters: { $sum: "$quantity" },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          totalLiters: { $round: ["$totalLiters", 2] },
          totalAmount: { $round: ["$totalAmount", 2] },
        },
      },
    ]);

    /* ── 5. Fat / SNF daily trend ─────────────────────────────── */
    const fatSnfTrend = await Milk.aggregate([
      {
        $match: {
          centerId: { $in: centerIds },
          date: { $gte: fromStr, $lte: toStr },
        },
      },
      {
        $group: {
          _id: "$date",
          avgFat: { $avg: "$fat" },
          avgSnf: { $avg: "$snf" },
          // Cow averages (case-insensitive check, adjust if your DB strictly uses "Cow")
          cowFat: { $avg: { $cond: [{ $eq: [{ $toLower: "$milkType" }, "cow"] }, "$fat", null] } },
          cowSnf: { $avg: { $cond: [{ $eq: [{ $toLower: "$milkType" }, "cow"] }, "$snf", null] } },

          // Buffalo averages
          buffaloFat: { $avg: { $cond: [{ $eq: [{ $toLower: "$milkType" }, "buffalo"] }, "$fat", null] } },
          buffaloSnf: { $avg: { $cond: [{ $eq: [{ $toLower: "$milkType" }, "buffalo"] }, "$snf", null] } },

          // Mix averages
          mixFat: { $avg: { $cond: [{ $eq: [{ $toLower: "$milkType" }, "mix"] }, "$fat", null] } },
          mixSnf: { $avg: { $cond: [{ $eq: [{ $toLower: "$milkType" }, "mix"] }, "$snf", null] } },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          avgFat: { $round: ["$avgFat", 2] },
          avgSnf: { $round: ["$avgSnf", 2] },
          cowFat: { $round: ["$cowFat", 2] },
          cowSnf: { $round: ["$cowSnf", 2] },
          buffaloFat: { $round: ["$buffaloFat", 2] },
          buffaloSnf: { $round: ["$buffaloSnf", 2] },
          mixFat: { $round: ["$mixFat", 2] },
          mixSnf: { $round: ["$mixSnf", 2] },
        },
      },
    ]);

    /* ── 6. Milk-type breakdown ───────────────────────────────── */
    const milkTypeBreakdown = await Milk.aggregate([
      {
        $match: {
          centerId: { $in: centerIds },
          date: { $gte: fromStr, $lte: toStr },
        },
      },
      {
        $group: {
          _id: "$milkType",
          liters: { $sum: "$quantity" },
          amount: { $sum: "$totalAmount" },
        },
      },
    ]);
    const milkTypeMap = Object.fromEntries(
      milkTypeBreakdown.map((r) => [
        r._id,
        {
          liters: Math.round(r.liters * 100) / 100,
          amount: Math.round(r.amount * 100) / 100,
        },
      ]),
    );

    /* ── Assemble per-center objects ──────────────────────────── */
    const enrichedCenters = centers.map((c) => {
      const id = c._id.toString();
      const perf = perfMap[id] ?? {};
      return {
        _id: c._id,
        name: c.name,
        location: c.location,
        status: c.status,
        farmerCount: farmerCountMap[id] ?? 0,
        totalLiters: Math.round((perf.totalLiters ?? 0) * 100) / 100,
        totalRevenue: Math.round((perf.totalAmount ?? 0) * 100) / 100,
        cowLiters: Math.round((perf.cowLiters ?? 0) * 100) / 100,
        buffaloLiters: Math.round((perf.buffaloLiters ?? 0) * 100) / 100,
        mixLiters: Math.round((perf.mixLiters ?? 0) * 100) / 100,
        avgFat: perf.avgFat != null ? Math.round(perf.avgFat * 100) / 100 : null,
        avgSnf: perf.avgSnf != null ? Math.round(perf.avgSnf * 100) / 100 : null,
      };
    });

    /* ── Global summary ───────────────────────────────────────── */
    const summary = {
      totalCenters: centers.length,
      activeCenters: centers.filter((c) => c.status === "Active").length,
      totalFarmers: Object.values(farmerCountMap).reduce((s, n) => s + n, 0),
      totalLiters:
        Math.round(enrichedCenters.reduce((s, c) => s + c.totalLiters, 0) * 100) / 100,
      totalRevenue:
        Math.round(enrichedCenters.reduce((s, c) => s + c.totalRevenue, 0) * 100) / 100,
      cowLiters: milkTypeMap.cow?.liters ?? 0,
      buffaloLiters: milkTypeMap.buffalo?.liters ?? 0,
      mixLiters: milkTypeMap.mix?.liters ?? 0,
      avgFat:
        fatSnfTrend.length > 0
          ? Math.round(
            (fatSnfTrend.reduce((s, d) => s + d.avgFat, 0) / fatSnfTrend.length) * 100,
          ) / 100
          : null,
      avgSnf:
        fatSnfTrend.length > 0
          ? Math.round(
            (fatSnfTrend.reduce((s, d) => s + d.avgSnf, 0) / fatSnfTrend.length) * 100,
          ) / 100
          : null,
    };

    return res.json({
      summary,
      centers: enrichedCenters,
      dailyTrend,
      fatSnfTrend,
      milkTypeBreakdown: milkTypeMap,
      meta: { from: fromStr, to: toStr },
    });
  } catch (err) {
    console.error("getSuperadminDashboard error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};