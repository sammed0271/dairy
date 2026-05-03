import mongoose from "mongoose";
import Milk from "../models/Milk.js";
import Farmer from "../models/Farmer.js";
import Center from "../models/Center.js";

export const getQualityDashboard = async (req, res) => {
  try {
    /* ── date range ─────────────────────────────────────────
       Store dates as YYYY-MM-DD strings to match however the
       Milk.date field is stored (string OR Date both work with
       string comparison because ISO format sorts lexicographically).
    ───────────────────────────────────────────────────────── */
    const toStr = req.query.to
      ? req.query.to                                        // "2026-05-03"
      : new Date().toISOString().slice(0, 10);
    const fromStr = req.query.from
      ? req.query.from
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

    // Also keep Date objects for pipelines that use $dateToString
    const fromDate = new Date(fromStr + "T00:00:00.000Z");
    const toDate = new Date(toStr + "T23:59:59.999Z");

    /* ── centerId: cast to ObjectId if provided ─────────────
       req.query gives strings; MongoDB stores ObjectIds.
       We support both flavours just in case.
    ───────────────────────────────────────────────────────── */
    let centerIdFilter = {};
    if (req.query.centerId) {
      try {
        centerIdFilter = {
          centerId: new mongoose.Types.ObjectId(req.query.centerId),
        };
      } catch {
        // invalid id — ignore filter
      }
    }

    /* ── milkType filter: cow | buffalo | mix | "" (all) ──── */
    const milkTypeFilter =
      req.query.milkType && ["cow", "buffalo", "mix"].includes(req.query.milkType)
        ? { milkType: req.query.milkType }
        : {};

    /* ── date filter: match both string-stored and Date-stored fields ──
       We use $expr so we can compare the stringified date value,
       which works regardless of storage type.
    ───────────────────────────────────────────────────────── */
    const dateFilter = {
      $expr: {
        $and: [
          {
            $gte: [
              { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$date" } } },
              fromStr,
            ],
          },
          {
            $lte: [
              { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$date" } } },
              toStr,
            ],
          },
        ],
      },
    };

    const baseMatch = { ...centerIdFilter, ...milkTypeFilter, ...dateFilter };

    const thresholds = {
      excellent: { fat: 4.0, snf: 8.5 },
      good: { fat: 3.5, snf: 8.0 },
      average: { fat: 3.0, snf: 7.5 },
      riskDeviationPct: 20,
      minFat: 3.0,
      minSnf: 7.5,
    };

    /* ── 1. Per-farmer averages ──────────────────────────── */
    const farmerAvgs = await Milk.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: { farmerId: "$farmerId", centerId: "$centerId" },
          avgFat: { $avg: "$fat" },
          avgSnf: { $avg: "$snf" },
          totalLiters: { $sum: "$quantity" },
          entryCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "farmers",
          localField: "_id.farmerId",
          foreignField: "_id",
          as: "farmer",
        },
      },
      {
        $unwind: { path: "$farmer", preserveNullAndEmptyArrays: true },
      },
    ]);

    /* ── 2. Per-center tank averages ─────────────────────── */
    const centerAvgs = await Milk.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: "$centerId",
          tankAvgFat: { $avg: "$fat" },
          tankAvgSnf: { $avg: "$snf" },
          totalLiters: { $sum: "$quantity" },
        },
      },
    ]);

    const centerAvgMap = Object.fromEntries(
      centerAvgs.map((c) => [
        c._id?.toString() ?? "unknown",
        {
          tankAvgFat: Math.round((c.tankAvgFat ?? 0) * 100) / 100,
          tankAvgSnf: Math.round((c.tankAvgSnf ?? 0) * 100) / 100,
          totalLiters: Math.round((c.totalLiters ?? 0) * 100) / 100,
        },
      ]),
    );

    /* ── 3. Quality buckets + risk farmers ───────────────── */
    let excellent = 0, good = 0, average = 0, risk = 0;
    const riskFarmers = [];

    for (const fa of farmerAvgs) {
      const fat = fa.avgFat ?? 0;
      const snf = fa.avgSnf ?? 0;
      const cid = fa._id.centerId?.toString() ?? "";
      const centerTankFat = centerAvgMap[cid]?.tankAvgFat ?? fat;

      if (fat >= thresholds.excellent.fat && snf >= thresholds.excellent.snf) excellent++;
      else if (fat >= thresholds.good.fat && snf >= thresholds.good.snf) good++;
      else if (fat >= thresholds.average.fat && snf >= thresholds.average.snf) average++;
      else risk++;

      const deviationPct =
        centerTankFat > 0 ? ((fat - centerTankFat) / centerTankFat) * 100 : 0;

      if (
        fat < thresholds.minFat ||
        snf < thresholds.minSnf ||
        deviationPct < -thresholds.riskDeviationPct
      ) {
        riskFarmers.push({
          farmerId: fa._id.farmerId,
          farmerCode: fa.farmer?.code ?? "—",
          farmerName: fa.farmer?.name ?? "Unknown",
          centerId: fa._id.centerId,
          avgFat: Math.round(fat * 100) / 100,
          avgSnf: Math.round(snf * 100) / 100,
          expectedFat: Math.round(centerTankFat * 100) / 100,
          expectedSnf: Math.round((centerAvgMap[cid]?.tankAvgSnf ?? snf) * 100) / 100,
          deviationPct: Math.round(deviationPct * 10) / 10,
          issue:
            fat < thresholds.minFat || snf < thresholds.minSnf
              ? "Water Suspected"
              : "Low Quality",
          riskLevel:
            deviationPct < -35 || fat < 2.8 ? "Critical" : "High Risk",
          totalLiters: Math.round((fa.totalLiters ?? 0) * 100) / 100,
        });
      }
    }

    const totalFarmers = farmerAvgs.length;

    /* ── 4. Center comparison ────────────────────────────── */
    const centerFarmerAvgMap = {};
    for (const fa of farmerAvgs) {
      const cid = fa._id.centerId?.toString() ?? "";
      if (!centerFarmerAvgMap[cid])
        centerFarmerAvgMap[cid] = { sum: 0, count: 0 };
      centerFarmerAvgMap[cid].sum += fa.avgFat ?? 0;
      centerFarmerAvgMap[cid].count += 1;
    }

    const centerQuery = req.query.centerId
      ? { _id: new mongoose.Types.ObjectId(req.query.centerId) }
      : {};
    const centers = await Center.find(centerQuery).lean();

    const centerComparison = centers
      .filter((c) => centerAvgMap[c._id.toString()])
      .map((c) => {
        const cid = c._id.toString();
        const tank = centerAvgMap[cid] ?? {};
        const fa = centerFarmerAvgMap[cid] ?? { sum: 0, count: 1 };
        const farmerAvgFat = Math.round((fa.sum / fa.count) * 100) / 100;
        const tankFat = tank.tankAvgFat ?? 0;
        const deviationPct =
          farmerAvgFat > 0
            ? Math.round(((tankFat - farmerAvgFat) / farmerAvgFat) * 1000) / 10
            : 0;

        return {
          centerId: c._id,
          centerName: c.name,
          location: c.location ?? "",
          farmerAvgFat,
          tankAvgFat: tankFat,
          tankAvgSnf: tank.tankAvgSnf ?? 0,
          deviation: Math.round((tankFat - farmerAvgFat) * 100) / 100,
          deviationPct,
          totalLiters: tank.totalLiters ?? 0,
          status:
            Math.abs(deviationPct) <= 5 ? "normal"
              : Math.abs(deviationPct) <= 15 ? "warning"
                : "critical",
        };
      });

    /* ── 5. Daily FAT/SNF trend ──────────────────────────── */
    const fatSnfTrend = await Milk.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: { $toDate: "$date" },
            },
          },
          avgFat: { $avg: "$fat" },
          avgSnf: { $avg: "$snf" },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          avgFat: { $round: ["$avgFat", 2] },
          avgSnf: { $round: ["$avgSnf", 2] },
        },
      },
    ]);

    /* ── 6. Overall summary ──────────────────────────────── */
    const overallStats = await Milk.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          avgFat: { $avg: "$fat" },
          avgSnf: { $avg: "$snf" },
          totalLiters: { $sum: "$quantity" },
        },
      },
    ]);
    const overall = overallStats[0] ?? {};

    return res.json({
      meta: {
        from: fromStr,
        to: toStr,
        milkType: req.query.milkType || "all",
        thresholds,
      },
      summary: {
        totalFarmers,
        excellent,
        good,
        average,
        risk,
        avgFat: Math.round((overall.avgFat ?? 0) * 100) / 100,
        avgSnf: Math.round((overall.avgSnf ?? 0) * 100) / 100,
        totalLiters: Math.round((overall.totalLiters ?? 0) * 100) / 100,
        qualityAlerts: risk,
      },
      centerComparison,
      fatSnfTrend,
      highRiskFarmers: riskFarmers.sort((a, b) => a.deviationPct - b.deviationPct),
    });
  } catch (err) {
    console.error("getQualityDashboard:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};