import RateChart from "../models/RateChart.js";
import RateChartHistory from "../models/RateChartHistory.js";
import { logAudit } from "../services/auditService.js";

const DEFAULT_FATS = [3.0, 3.5, 4.0, 4.5, 5.0];
const DEFAULT_SNFS = [7.0, 7.5, 8.0, 8.5, 9.0];

// FAT slab calculation (per 0.1 fat)
const calculateFatAmount = (fat, slabs = []) => {
  if (!slabs.length) return 0;

  let total = 0;

  for (const slab of slabs) {
    if (fat > slab.from) {
      const usableFat = Math.min(fat, slab.to) - slab.from;

      if (usableFat > 0) {
        total += usableFat * 10 * slab.rate;
      }
    }
  }

  return +total.toFixed(2);
};

const generateRates = (baseRate) => {
  return DEFAULT_FATS.map((fat) =>
    DEFAULT_SNFS.map((snf) => +(baseRate + fat + snf).toFixed(2)),
  );
};

const defaultRateChart = (milkType) => {
  // const baseRate = milkType === "cow" ? 20 : 30;
  // const fatFactor = milkType === "cow" ? 4 : 5;
  let baseRate;

  if (milkType === "cow") {
    baseRate = 20;
    // fatFactor = 1;
  } else if (milkType === "buffalo") {
    baseRate = 30;
    // fatFactor = 1;
  } else {
    baseRate = 25; // MIX default
    // fatFactor = 1; // MIX default
  }

  // const snfFactor = 1;

  const fatMin = 3.0;
  const fatMax = 5.0;
  const fatStep = 0.1;

  const snfMin = 7.0;
  const snfMax = 9.0;
  const snfStep = 0.1;

  const fats = generateRange(fatMin, fatMax, fatStep);
  const snfs = generateRange(snfMin, snfMax, snfStep);

  return {
    milkType,
    fatMin,
    fatMax,
    fatStep,
    snfMin,
    snfMax,
    snfStep,
    fats,
    snfs,
    fatSlabs: defaultFatSlabs,
    snfSlabs: defaultSnfSlabs,

    rates: generateRatesFromRange(
      baseRate,
      fats,
      snfs,
      defaultFatSlabs,
      defaultSnfSlabs,
    ),

    baseRate,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString(),
  };
};

const generateRange = (min, max, step) => {
  const arr = [];
  let v = min;

  while (v <= max + 0.0001) {
    arr.push(+v.toFixed(2));
    v = +(v + step).toFixed(2);
  }

  return arr;
};

const calculateSnfAmount = (snf, slabs = []) => {
  let total = 0;

  for (const slab of slabs) {
    if (snf > slab.from) {
      const usable = Math.min(snf, slab.to) - slab.from;
      if (usable > 0) total += usable * 10 * slab.rate;
    }
  }

  return +total.toFixed(2);
};

const generateRatesFromRange = (
  baseRate,
  fats,
  snfs,
  fatSlabs = [],
  snfSlabs = [],
) => {
  return fats.map((fat) => {
    const fatAmount = calculateFatAmount(fat, fatSlabs);

    return snfs.map((snf) => {
      const snfAmount = calculateSnfAmount(snf, snfSlabs);

      return +(baseRate + fatAmount + snfAmount).toFixed(2);
    });
  });
};

/**
 * GET /rate-chart
 * Fetch Cow + Buffalo rate charts
 */
export const getRateCharts = async (req, res) => {
  try {
    let cow = await RateChart.findOne({ milkType: "cow" }).sort({
      effectiveFrom: -1,
    });

    let buffalo = await RateChart.findOne({ milkType: "buffalo" }).sort({
      effectiveFrom: -1,
    });

    if (!cow) {
      cow = await RateChart.create(defaultRateChart("cow"));
    }

    if (!buffalo) {
      buffalo = await RateChart.create(defaultRateChart("buffalo"));
    }
    let mix = await RateChart.findOne({ milkType: "mix" }).sort({
      effectiveFrom: -1,
    });

    if (!mix) {
      mix = await RateChart.create(defaultRateChart("mix"));
    }

    const clean = (doc) => (doc.toObject ? doc.toObject() : doc);

    res.json({
      cow: clean(cow),
      buffalo: clean(buffalo),
      mix: clean(mix),
    });

    // res.json({ cow, buffalo, mix });
  } catch (err) {
    console.error("RateChart error:", err);
    res.status(500).json({ message: "Failed to fetch rate charts" });
  }
};

/**
 * PUT /rate-chart/:milkType
 * Update Cow or Buffalo chart
 */

export const updateRateChart = async (req, res) => {
  try {
    const { milkType } = req.params;

    if (!["cow", "buffalo", "mix"].includes(milkType)) {
      return res.status(400).json({ message: "Invalid milk type" });
    }

    const effectiveFrom =
      req.body.effectiveFrom || new Date().toISOString().slice(0, 10);

    // ✅ REMOVE _id BEFORE SAVING HISTORY
    const { _id, ...historyData } = req.body;

    await RateChartHistory.create({
      ...historyData,
      milkType,
      effectiveFrom,
      savedBy: req.user?.id || null,
      createdAt: new Date(),
    });

    const updated = await RateChart.findOneAndUpdate(
      { milkType },
      {
        ...historyData,
        milkType,
        effectiveFrom,
        updatedAt: new Date().toISOString(),
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      },
    );

    await logAudit({
      req,
      action: "rate_chart_updated",
      entityType: "RateChart",
      entityId: updated._id,
      details: { milkType, effectiveFrom },
    });

    res.json(updated);
  } catch (err) {
    console.error("Rate chart update failed:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getRateForMilk = async (req, res) => {
  try {
    const { milkType, fat, snf, date } = req.query;

    if (!milkType || !fat || !snf || !date) {
      return res.status(400).json({ message: "Missing parameters" });
    }

    const chart = await RateChart.findOne({
      milkType,
      effectiveFrom: { $lte: date },
    }).sort({ effectiveFrom: -1 });

    if (!chart) {
      return res.status(404).json({ message: "Rate chart not found" });
    }

    const fatValue = Number(fat);
    const snfValue = Number(snf);

    const fatAmount = calculateFatAmount(fatValue, chart.fatSlabs);
    const snfAmount = calculateSnfAmount(snfValue, chart.snfSlabs);

    const rate = chart.baseRate + fatAmount + snfAmount;
    res.json({ rate: +rate.toFixed(2) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

const defaultFatSlabs = [
  { from: 3, to: 4, rate: 0.1 },
  { from: 4, to: 5, rate: 0.1 },
  { from: 5, to: 6, rate: 0.1 },
  { from: 6, to: 7, rate: 0.1 },
  { from: 7, to: 10, rate: 0.1 },
];

const defaultSnfSlabs = [
  { from: 7, to: 8, rate: 0.1 },
  { from: 8, to: 9, rate: 0.1 },
  { from: 9, to: 10, rate: 0.1 },
];
