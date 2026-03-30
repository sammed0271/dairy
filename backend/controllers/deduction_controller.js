import Deduction from "../models/Deduction.js";
import Farmer from "../models/Farmer.js";
import Milk from "../models/Milk.js";
import { logAudit } from "../services/auditService.js";
import { getScopedFilter } from "../utils/access.js";

export const addDeduction = async (req, res) => {
  try {
    const { farmerId, date, category, amount, description } = req.body;

    if (!farmerId || !date || !category || !amount) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const farmer = await Farmer.findOne(getScopedFilter(req, { _id: farmerId }));
    if (!farmer) {
      return res.status(404).json({ message: "Farmer not found" });
    }

    const deduction = await Deduction.create({
      centreId: farmer.centreId ?? req.user?.centreId ?? null,
      farmerId,
      date,
      category,
      amount,
      remainingAmount: amount, 
      note: description || "",
      status: "Pending",
    });

    await logAudit({
      req,
      centreId: deduction.centreId,
      action: "deduction_created",
      entityType: "Deduction",
      entityId: deduction._id,
      details: { farmerId, category, amount },
    });

    res.status(201).json(deduction);
  } catch (err) {
    console.error("Add deduction failed:", err);
    res.status(500).json({ message: "Failed to add deduction" });
  }
};

export const deleteDeduction = async (req, res) => {
  try {
    const deleted = await Deduction.findOneAndDelete(
      getScopedFilter(req, { _id: req.params.id }),
    );

    if (!deleted) {
      return res.status(404).json({ message: "Deduction not found" });
    }

    await logAudit({
      req,
      centreId: deleted.centreId,
      action: "deduction_deleted",
      entityType: "Deduction",
      entityId: deleted._id,
    });

    res.json({ message: "Deduction deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const adjustDeduction = async (req, res) => {
  try {
    const { id } = req.params;
    const { remainingAmount, status } = req.body;

    const deduction = await Deduction.findOneAndUpdate(
      getScopedFilter(req, { _id: id }),
      { remainingAmount, status },
      { new: true },
    );

    if (!deduction) {
      return res.status(404).json({ message: "Deduction not found" });
    }

    await logAudit({
      req,
      centreId: deduction.centreId,
      action: "deduction_adjusted",
      entityType: "Deduction",
      entityId: id,
      details: { remainingAmount, status },
    });

    res.json(deduction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const clearDeduction = async (req, res) => {
  try {
    const deduction = await Deduction.findOne(
      getScopedFilter(req, { _id: req.params.id }),
    );
    if (!deduction) {
      return res.status(404).json({ message: "Deduction not found" });
    }

    deduction.remainingAmount = 0;
    deduction.status = "Cleared";

    await deduction.save();

    await logAudit({
      req,
      centreId: deduction.centreId,
      action: "deduction_cleared",
      entityType: "Deduction",
      entityId: deduction._id,
    });

    res.json(deduction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getDeductions = async (req, res) => {
  try {
    const deductions = await Deduction.find(getScopedFilter(req)).populate(
      "farmerId",
      "name code",
    );

    const formatted = await Promise.all(
      deductions.map(async (d) => {
        let remaining = d.remainingAmount;
        let status = d.status;

        // AUTO-DEDUCT MILK ONLY ONCE
        if (!d.autoAdjusted) {
          const milkAgg = await Milk.aggregate([
            {
              $match: {
                farmerId: d.farmerId._id,
                ...(d.centreId ? { centreId: d.centreId } : {}),
                date: { $lte: d.date }, // STRING comparison OK (YYYY-MM-DD)
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$totalAmount" },
              },
            },
          ]);

          const milkAmount = milkAgg[0]?.total || 0;

          remaining = Math.max(d.amount - milkAmount, 0);
          status =
            remaining === 0
              ? "Cleared"
              : remaining < d.amount
                ? "Partial"
                : "Pending";

          await Deduction.findByIdAndUpdate(d._id, {
            remainingAmount: remaining,
            status,
            autoAdjusted: true,
          });
        }

        return {
          _id: d._id,
          date: d.date,
          category: d.category,
          amount: d.amount,
          remainingAmount: remaining,
          status,
          description: d.note,
          farmerName: d.farmerId.name,
          farmerCode: d.farmerId.code,
        };
      }),
    );

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
