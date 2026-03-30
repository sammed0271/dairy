// controllers/bonus_controller.js
import Bonus from "../models/Bonus.js";
import Milk from "../models/Milk.js";
import Farmer from "../models/Farmer.js";
import { logAudit } from "../services/auditService.js";
import { getScopedFilter } from "../utils/access.js";

export const previewBonus = async (req, res) => {
  try {
    const { periodFrom, periodTo, rule } = req.body;

    if (!periodFrom || !periodTo) {
      return res.status(400).json({ message: "Period is required" });
    }

    if (!rule || !rule.type || !rule.value) {
      return res.status(400).json({ message: "Bonus rule is required" });
    }

    const milkList = await Milk.find({
      ...getScopedFilter(req),
      date: { $gte: periodFrom, $lte: periodTo },
    }).populate("farmerId", "name code");

    const map = {};

    milkList.forEach((m) => {
      if (!m.farmerId) return;

      const id = m.farmerId._id.toString();

      if (!map[id]) {
        map[id] = {
          farmerId: id,
          farmerCode: m.farmerId.code,
          farmerName: m.farmerId.name,
          liters: 0,
          amount: 0,
        };
      }

      map[id].liters += m.quantity;
      map[id].amount += m.totalAmount;
    });

    const rows = Object.values(map).map((r) => {
      let bonus = 0;

      if (rule.type === "Percentage") {
        bonus = (r.amount * Number(rule.value)) / 100;
      } else if (rule.type === "Fixed") {
        bonus = Number(rule.value);
      } else if (rule.type === "PerAmount") {
        bonus =
          Math.floor(r.amount / Number(rule.perAmount)) * Number(rule.value);
      } else if (rule.type === "PerLiter") {
        bonus = r.liters * Number(rule.value);
      }

      return {
        ...r,
        bonus: Math.round(bonus * 100) / 100,
      };
    });

    res.json(rows);
  } catch (err) {
    console.error("previewBonus error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const addBonus = async (req, res) => {
  try {
    const farmer = await Farmer.findOne(
      getScopedFilter(req, { _id: req.body.farmerId }),
    );

    if (!farmer) {
      return res.status(404).json({ message: "Farmer not found" });
    }

    const bonus = await Bonus.create({
      ...req.body,
      centreId: farmer.centreId ?? req.user?.centreId ?? null,
    });

    await logAudit({
      req,
      centreId: bonus.centreId,
      action: "bonus_created",
      entityType: "Bonus",
      entityId: bonus._id,
      details: { farmerId: bonus.farmerId, amount: bonus.amount },
    });

    res.status(201).json(bonus);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getBonus = async (req, res) => {
  try {
    const { farmerId } = req.query;
    let filter = getScopedFilter(req);
    if (farmerId) filter.farmerId = farmerId;

    const bonuses = await Bonus.find(filter)
      .populate("farmerId", "name mobile")
      .sort({ createdAt: -1 });

    res.json(bonuses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteBonus = async (req, res) => {
  try {
    const deleted = await Bonus.findOneAndDelete(
      getScopedFilter(req, { _id: req.params.id }),
    );

    if (!deleted) {
      return res.status(404).json({ message: "Bonus not found" });
    }

    await logAudit({
      req,
      centreId: deleted.centreId,
      action: "bonus_deleted",
      entityType: "Bonus",
      entityId: deleted._id,
    });

    res.json({ message: "Bonus deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
