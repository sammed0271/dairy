import Farmer from "../models/Farmer.js";
import Milk from "../models/Milk.js";
import RateChart from "../models/RateChart.js";

const roundToStep = (value, step) =>
  +(Math.round(Number(value) / step) * step).toFixed(1);

export const createMilkEntry = async ({ req, payload }) => {
  const {
    farmerId,
    date,
    shift,
    quantity,
    fat,
    snf,
    milkType,
    clientGeneratedId = null,
  } = payload;

  if (
    !farmerId ||
    !date ||
    !shift ||
    quantity === undefined ||
    fat === undefined ||
    snf === undefined
  ) {
    const error = new Error("Missing required fields");
    error.statusCode = 400;
    throw error;
  }

  const scopedFarmerFilter = req.user?.role === "superadmin" || !req.user?.centreId
    ? { _id: farmerId }
    : { _id: farmerId, centreId: req.user.centreId };

  const farmer = await Farmer.findOne(scopedFarmerFilter);
  if (!farmer) {
    const error = new Error("Invalid farmer");
    error.statusCode = 400;
    throw error;
  }

  if (!farmer.milkType.includes(milkType)) {
    const error = new Error("Selected milk type not allowed for this farmer");
    error.statusCode = 400;
    throw error;
  }

  if (clientGeneratedId) {
    const existing = await Milk.findOne({
      clientGeneratedId,
      centreId: farmer.centreId ?? req.user?.centreId ?? null,
    });

    if (existing) {
      return { milk: existing, created: false };
    }
  }

  const chart = await RateChart.findOne({
    milkType,
    effectiveFrom: { $lte: date },
  }).sort({ effectiveFrom: -1 });

  if (!chart) {
    const error = new Error("No rate chart found for this date");
    error.statusCode = 400;
    throw error;
  }

  const fatRounded = roundToStep(fat, 0.1);
  const snfRounded = roundToStep(snf, 0.1);
  const fatIndex = chart.fats.indexOf(fatRounded);
  const snfIndex = chart.snfs.indexOf(snfRounded);

  if (fatIndex === -1 || snfIndex === -1) {
    const error = new Error("Rate not defined for this FAT/SNF");
    error.statusCode = 400;
    throw error;
  }

  const rate = chart.rates[fatIndex][snfIndex];
  const totalAmount = Number(quantity) * rate;

  const milk = await Milk.create({
    centreId: farmer.centreId ?? req.user?.centreId ?? null,
    farmerId,
    date,
    shift,
    milkType,
    quantity,
    fat: fatRounded,
    snf: snfRounded,
    rate,
    totalAmount,
    clientGeneratedId: clientGeneratedId || null,
  });

  return { milk, created: true };
};
