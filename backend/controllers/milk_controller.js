import Milk from "../models/Milk.js";
import { logAudit } from "../services/auditService.js";
import { createMilkEntry } from "../services/milkEntryService.js";
import { getScopedFilter } from "../utils/access.js";

export const addMilkEntry = async (req, res) => {
  try {
    const { milk, created } = await createMilkEntry({
      req,
      payload: req.body,
    });

    if (created) {
      await logAudit({
        req,
        centreId: milk.centreId,
        action: "milk_entry_created",
        entityType: "Milk",
        entityId: milk._id,
        details: {
          farmerId: req.body.farmerId,
          date: req.body.date,
          shift: req.body.shift,
          milkType: req.body.milkType,
          clientGeneratedId: req.body.clientGeneratedId || null,
        },
      });
    }

    res.status(created ? 201 : 200).json(milk);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Milk entry already exists for this farmer, date and shift",
      });
    }

    console.error("Add milk failed:", err);
    res
      .status(err.statusCode || 500)
      .json({ message: err.message || "Failed to save milk entry" });
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
