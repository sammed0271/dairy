// controllers/bonus_controller.js
import Bonus from "../models/Bonus.js";
import Milk from "../models/Milk.js";

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
      centerId: req.user.centerId,
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
    const bonus = await Bonus.create({ ...req.body, centerId: req.user.centerId });
    res.status(201).json(bonus);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getBonus = async (req, res) => {
  try {
    const { farmerId } = req.query;
    let filter = {};
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
    await Bonus.findByIdAndDelete(req.params.id);
    res.json({ message: "Bonus deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
