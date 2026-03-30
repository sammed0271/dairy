import Milk from "../models/Milk.js";
import Farmer from "../models/Farmer.js";
import RateChart from "../models/RateChart.js";
import { logAudit } from "../services/auditService.js";
import { getScopedFilter } from "../utils/access.js";

export const addMilkEntry = async (req, res) => {
  try {
    const { farmerId, date, shift, quantity, fat, snf, milkType, clientGeneratedId } = req.body;

    if (
      !farmerId ||
      !date ||
      !shift ||
      quantity === undefined ||
      fat === undefined ||
      snf === undefined
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const farmer = await Farmer.findOne(getScopedFilter(req, { _id: farmerId }));
    if (!farmer) {
      return res.status(400).json({ message: "Invalid farmer" });
    }

    // const milkType = farmer.milkType.toLowerCase();
    if (!farmer.milkType.includes(milkType)) {
      return res.status(400).json({
        message: "Selected milk type not allowed for this farmer",
      });
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
    const fatIndex = chart.fats.indexOf(Number(fat));
    const snfIndex = chart.snfs.indexOf(Number(snf));

    if (fatIndex === -1 || snfIndex === -1) {
      return res.status(400).json({
        message: "Rate not defined for this FAT/SNF",
      });
    }

    const rate = chart.rates[fatIndex][snfIndex];
    const totalAmount = Number(quantity) * rate;

    // 3. Save milk entry
    const milk = await Milk.create({
      centreId: farmer.centreId ?? req.user?.centreId ?? null,
      farmerId,
      date,
      shift,
      milkType,
      quantity,
      fat,
      snf,
      rate,
      totalAmount,
      clientGeneratedId: clientGeneratedId || null,
    });

    await logAudit({
      req,
      centreId: milk.centreId,
      action: "milk_entry_created",
      entityType: "Milk",
      entityId: milk._id,
      details: { farmerId, date, shift, milkType },
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
    if (date) filter.date = date;
    if (farmerId) filter.farmerId = farmerId;
    filter = getScopedFilter(req, filter);

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
      }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteMilkEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Milk.findOneAndDelete(getScopedFilter(req, { _id: id }));
    if (!deleted) {
      return res.status(404).json({ message: "Milk entry not found" });
    }

    await logAudit({
      req,
      centreId: deleted.centreId,
      action: "milk_entry_deleted",
      entityType: "Milk",
      entityId: id,
      details: { farmerId: deleted.farmerId, date: deleted.date, shift: deleted.shift },
    });

    res.json({ message: "Milk entry deleted successfully" });
  } catch (err) {
    console.error("Delete milk entry failed:", err);
    res.status(500).json({ message: "Failed to delete milk entry" });
  }
};
