import Milk from "../models/Milk.js";
import Farmer from "../models/Farmer.js";
import RateChart from "../models/RateChart.js";

export const addMilkEntry = async (req, res) => {
  try {
    const { farmerId, date, shift, quantity, fat, snf, milkType, mode } =
      req.body;

    if (
      !farmerId ||
      !date ||
      !shift ||
      quantity === undefined ||
      (mode !== "AUTO" && (fat === undefined || snf === undefined))
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const farmer = await Farmer.findById(farmerId);
    if (!farmer) {
      return res.status(400).json({ message: "Invalid farmer" });
    }


    // const milkType = farmer.milkType.toLowerCase();
    if (!farmer.milkType.includes(milkType)) {
      return res.status(400).json({
        message: "Selected milk type not allowed for this farmer",
      });
    }

    // 🔥 AUTO / MANUAL logic
    let finalFat = fat;
    let finalSnf = snf;
    const entryMode = mode || "MANUAL";
    if (entryMode === "AUTO") {
      if (milkType === "cow") {
        finalFat = +(Math.random() * 1 + 3.5).toFixed(1);
        finalSnf = +(Math.random() * 1 + 8).toFixed(1);
      } else if (milkType === "buffalo") {
        finalFat = +(Math.random() * 2 + 5).toFixed(1);
        finalSnf = +(Math.random() * 1 + 9).toFixed(1);
      }
    }

    // 1. Find applicable rate chart by date
    const chart = await RateChart.findOne({
      milkType,
      effectiveFrom: { $lte: date },
    }).sort({ effectiveFrom: -1 });

    if (!chart) {
      return res.status(400).json({
        message: "No rate chart found for this date",
      });
    }

    // 2. Find rate from FAT/SNF matrix
    const findClosestIndex = (arr, value) => {
      return arr.findIndex((v) => Math.abs(v - value) < 0.05);
    };

    const fatIndex = findClosestIndex(chart.fats, Number(finalFat));
    const snfIndex = findClosestIndex(chart.snfs, Number(finalSnf));

    if (fatIndex === -1 || snfIndex === -1) {
      return res.status(400).json({
        message: "Rate not defined for this FAT/SNF",
      });
    }

    const rate = chart.rates[fatIndex][snfIndex];
    const totalAmount = Number(quantity) * rate;

    // 3. Save milk entry
    const milk = await Milk.create({
      centerId: req.user.centerId,
      farmerId,
      date,
      shift,
      milkType,
      quantity,
      fat: finalFat,
      snf: finalSnf,
      mode: entryMode,
      rate,
      totalAmount,
    });

    res.status(201).json(milk);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Milk entry already exists for this farmer, date and shift",
      });
    }

    console.error("Add milk failed:", err);
    res.status(500).json({ message: "Failed to save milk entry" });
  }
};

export const getMilkEntries = async (req, res) => {
  try {
    const { date, farmerId } = req.query;

    let filter = {};
    filter.centerId = req.user.centerId;
    if (date) filter.date = date;
    if (farmerId) filter.farmerId = farmerId;

    const milkEntries = await Milk.find(filter)
      .populate("farmerId", "name code")
      .sort({ createdAt: -1 });

    const formatted = milkEntries
      .filter((m) => m.farmerId) //  avoid null populate
      .map((m) => ({
        _id: m._id,
        date: m.date,
        shift: m.shift,
        farmerId: m.farmerId._id,
        farmerName: m.farmerId.name,
        farmerCode: m.farmerId.code,
        // milkType: m.milkType === "cow" ? "Cow" : "Buffalo",
        milkType: m.milkType,
        liters: m.quantity,
        fat: m.fat,
        snf: m.snf,
        rate: m.rate,
        amount: m.totalAmount,
        mode: m.mode
      }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteMilkEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Milk.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Milk entry not found" });
    }

    res.json({ message: "Milk entry deleted successfully" });
  } catch (err) {
    console.error("Delete milk entry failed:", err);
    res.status(500).json({ message: "Failed to delete milk entry" });
  }
};

export const updateMilkEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await Milk.findById(id);

    if (!entry) {
      return res.status(404).json({ message: "Entry not found" });
    }

    const entryDate = new Date(entry.date);
    const now = new Date();

    const today = new Date().toLocaleDateString("en-CA");

    if (today === entry.date) {
      return res.status(403).json({
        message: "Edit allowed only on next day",
      });
    }
    req.body.centerId = req.user.centerId;

    const updated = await Milk.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    res.json(updated);
  } catch (err) {
    console.error("Update failed:", err);
    res.status(500).json({ message: "Update failed" });
  }
};
