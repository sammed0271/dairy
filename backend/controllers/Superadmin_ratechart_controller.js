import RateChart from "../models/RateChart.js";
import RateChartHistory from "../models/RateChartHistory.js";
import Center from "../models/Center.js";
import User from "../models/User.js";

// ─── exact same helpers as rateChart_controller.js ────────────────────────────

function generateRange(min, max, step) {
  const arr = [];
  let v = min;
  while (v <= max + 0.0001) {
    arr.push(Number(v.toFixed(2)));
    v = Number((v + step).toFixed(2));
  }
  return arr;
}

function calculateFatAmount(fat, slabs = []) {
  let total = 0;
  slabs.forEach((slab) => {
    if (fat > slab.from) {
      const usableFat = Math.min(fat, slab.to) - slab.from;
      if (usableFat > 0) total += usableFat * 10 * slab.rate;
    }
  });
  return Math.round(total * 100) / 100;
}

function calculateSnfAmount(snf, slabs = []) {
  let total = 0;
  slabs.forEach((slab) => {
    if (snf > slab.from) {
      const usableSnf = Math.min(snf, slab.to) - slab.from;
      if (usableSnf > 0) total += usableSnf * 10 * slab.rate;
    }
  });
  return Math.round(total * 100) / 100;
}

function formulaRate(baseRate, fat, snf, fatSlabs, snfSlabs) {
  return (
    Math.round(
      (baseRate +
        calculateFatAmount(fat, fatSlabs) +
        calculateSnfAmount(snf, snfSlabs)) *
      100,
    ) / 100
  );
}

function generateMatrix({ fats, snfs, baseRate, fatSlabs, snfSlabs }) {
  return fats.map((fat) =>
    snfs.map((snf) => formulaRate(baseRate, fat, snf, fatSlabs, snfSlabs)),
  );
}

function buildDefaultChart(milkType, centerId) {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const baseRate = milkType === "cow" ? 20 : milkType === "buffalo" ? 30 : 25;
  const fatMin = 3.0, fatMax = 5.0, fatStep = 0.1;
  const snfMin = 7.0, snfMax = 9.0, snfStep = 0.1;
  const fats = generateRange(fatMin, fatMax, fatStep);
  const snfs = generateRange(snfMin, snfMax, snfStep);
  const fatSlabs = [{ from: fatMin, to: fatMin + 1, rate: 0.1 }];
  const snfSlabs = [{ from: snfMin, to: snfMin + 1, rate: 0.1 }];
  return {
    centerId,
    milkType,
    baseRate,
    fatSlabs,
    snfSlabs,
    fatMin, fatMax, fatStep,
    snfMin, snfMax, snfStep,
    fats, snfs,
    rates: generateMatrix({ fats, snfs, baseRate, fatSlabs, snfSlabs }),
    effectiveFrom: today,
    updatedAt: now,
  };
}

function ensureOneSlab(chart) {
  return {
    ...chart,
    fatSlabs:
      chart.fatSlabs && chart.fatSlabs.length > 0
        ? chart.fatSlabs
        : [{ from: chart.fatMin, to: chart.fatMin + 1, rate: 0.1 }],
    snfSlabs:
      chart.snfSlabs && chart.snfSlabs.length > 0
        ? chart.snfSlabs
        : [{ from: chart.snfMin, to: chart.snfMin + 1, rate: 0.1 }],
  };
}

// ─── controllers ──────────────────────────────────────────────────────────────

/** GET /api/superadmin/rate-charts/:centerId */
export const getRateChartsForCenter = async (req, res) => {
  try {
    const { centerId } = req.params;

    const center = await Center.findById(centerId).lean();
    if (!center) return res.status(404).json({ message: "Center not found" });

    const results = {};

    for (const milkType of ["cow", "buffalo", "mix"]) {
      let doc = await RateChart.findOne({ centerId, milkType }).lean();

      if (!doc) {
        const created = await RateChart.create(
          buildDefaultChart(milkType, centerId),
        );
        doc = created.toObject();
      }

      // Same normalisation as admin load
      const chart = {
        ...doc,
        fatMin: doc.fatMin ?? 3.0,
        fatMax: doc.fatMax ?? 5.0,
        fatStep: doc.fatStep ?? 0.1,
        snfMin: doc.snfMin ?? 7.0,
        snfMax: doc.snfMax ?? 9.0,
        snfStep: doc.snfStep ?? 0.1,
        effectiveFrom:
          doc.effectiveFrom ?? new Date().toISOString().slice(0, 10),
      };

      results[milkType] = ensureOneSlab(chart);
    }

    return res.json({ center, charts: results });
  } catch (err) {
    console.error("getRateChartsForCenter:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

/** PUT /api/superadmin/rate-charts/:centerId/:milkType */
export const updateRateChartForCenter = async (req, res) => {
  try {
    const { centerId, milkType } = req.params;

    if (!["cow", "buffalo", "mix"].includes(milkType))
      return res.status(400).json({ message: "Invalid milkType" });

    const center = await Center.findById(centerId).lean();
    if (!center) return res.status(404).json({ message: "Center not found" });

    // Archive current version — matches RateChartHistory schema fields
    const existing = await RateChart.findOne({ centerId, milkType }).lean();
    if (existing) {
      await RateChartHistory.create({
        centerId,
        milkType,
        effectiveFrom: existing.effectiveFrom,
        fats: existing.fats,
        snfs: existing.snfs,
        rates: existing.rates,
        baseRate: existing.baseRate,
        savedBy: req.user?.id ?? null,
      });
    }

    const body = req.body;

    const chart = await RateChart.findOneAndUpdate(
      { centerId, milkType },
      {
        $set: {
          centerId,
          milkType,
          baseRate: body.baseRate,
          fatSlabs: body.fatSlabs ?? [],
          snfSlabs: body.snfSlabs ?? [],
          fatMin: body.fatMin,
          fatMax: body.fatMax,
          fatStep: body.fatStep,
          snfMin: body.snfMin,
          snfMax: body.snfMax,
          snfStep: body.snfStep,
          fats: body.fats,
          snfs: body.snfs,
          rates: body.rates,
          effectiveFrom:
            body.effectiveFrom ?? new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString(),
        },
      },
      { new: true, upsert: true },
    );

    return res.json({ message: `${milkType} rate chart saved`, chart });
  } catch (err) {
    console.error("updateRateChartForCenter:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

/** GET /api/superadmin/rate-charts/:centerId/history?milkType=cow&limit=20 */
export const getRateChartHistory = async (req, res) => {
  try {
    const { centerId } = req.params;
    const { milkType, limit = 20, page = 1 } = req.query;

    const query = { centerId };
    if (milkType) query.milkType = milkType;

    // Safely parse pagination variables
    const parsedLimit = parseInt(limit, 10) || 20;
    const parsedPage = parseInt(page, 10) || 1;
    const skipAmount = (parsedPage - 1) * parsedLimit;


    const history = await RateChartHistory.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate("savedBy", "name email")
      .lean();

    return res.json({ history });
  } catch (err) {
    console.error("getRateChartHistory:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

/** GET /api/superadmin/rate-charts — lightweight summary for all centers */
export const getAllCentersRateChartSummary = async (req, res) => {
  try {
    const centers = await Center.find({}).lean();
    const charts = await RateChart.find({
      centerId: { $in: centers.map((c) => c._id) },
    })
      .select("centerId milkType baseRate effectiveFrom updatedAt")
      .lean();

    const map = {};
    for (const c of centers)
      map[c._id.toString()] = { center: c, charts: {} };
    for (const ch of charts) {
      const id = ch.centerId.toString();
      if (map[id]) map[id].charts[ch.milkType] = ch;
    }

    return res.json({ summary: Object.values(map) });
  } catch (err) {
    console.error("getAllCentersRateChartSummary:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};