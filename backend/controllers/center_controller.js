import Center from "../models/Center.js";
import Farmer from "../models/Farmer.js";
import Milk from "../models/Milk.js";
import mongoose from "mongoose";

/* ================= GET ALL CENTERS ================= */
export const getCenters = async (req, res) => {
  try {
    const centers = await Center.find().lean();

    const enriched = await Promise.all(
      centers.map(async (c) => {
        const farmers = await Farmer.countDocuments({ centerId: c._id });

        const milk = await Milk.aggregate([
          { $match: { centerId: c._id } },
          {
            $group: {
              _id: null,
              totalLiters: { $sum: "$quantity" },
              totalAmount: { $sum: "$totalAmount" },
              avgFat: { $avg: "$fat" },
              avgSnf: { $avg: "$snf" },
            },
          },
        ]);

        return {
          ...c,
          farmers,
          totalLiters: milk[0]?.totalLiters || 0,
          totalAmount: milk[0]?.totalAmount || 0,
          avgFat: milk[0]?.avgFat || 0,
          avgSnf: milk[0]?.avgSnf || 0,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= GET CENTER BY ID ================= */

export const getCenterById = async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to, shift, milkType } = req.query;

    let match = {
      centerId: new mongoose.Types.ObjectId(id),
    };

    // 📅 Date filter
    if (from && to) {
      match.date = { $gte: from, $lte: to };
    }

    // 🌅 Shift filter
    if (shift && shift !== "all") {
      match.shift = shift;
    }

    // 🐄 Milk type filter
    if (milkType && milkType !== "all") {
      match.milkType = milkType;
    }

    const center = await Center.findById(id).lean();
    if (!center) {
      return res.status(404).json({ message: "Center not found" });
    }

    const farmers = await Farmer.find({ centerId: id });

    const milkStats = await Milk.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalLiters: { $sum: "$quantity" },
          totalAmount: { $sum: "$totalAmount" },
          avgFat: { $avg: "$fat" },
          avgSnf: { $avg: "$snf" },
        },
      },
    ]);

    res.json({
      ...center,
      farmersCount: farmers.length,
      farmers,
      stats: milkStats[0] || {
        totalLiters: 0,
        totalAmount: 0,
        avgFat: 0,
        avgSnf: 0,
      },
    });
  } catch (err) {
    console.error("Error fetching center details:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ================= CREATE CENTER ================= */
export const createCenter = async (req, res) => {
  try {
    const center = await Center.create({
      ...req.body,
      createdBy: req.user?.id,
    });

    res.status(201).json(center);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        message: "Center code already exists",
      });
    }
    console.log("error message : ", err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ================= TOGGLE STATUS ================= */
export const toggleCenter = async (req, res) => {
  try {
    const { id } = req.params;

    const center = await Center.findById(id);

    if (!center) {
      return res.status(404).json({ message: "Center not found" });
    }

    const updatedCenter = await Center.findByIdAndUpdate(
      id,
      {
        isActive: !center.isActive,
        status: !center.isActive ? "Active" : "Inactive", // keep in sync (if needed)
      },
      { new: true }
    );

    res.json(updatedCenter);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getDailyMilkTrend = async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to, shift, milkType } = req.query;

    let match = {
      centerId: new mongoose.Types.ObjectId(id),
    };

    // 📅 Date filter
    if (from && to) {
      match.date = { $gte: from, $lte: to };
    }

    // 🌅 Shift filter
    if (shift && shift !== "all") {
      match.shift = shift;
    }

    // 🐄 Milk type filter
    if (milkType && milkType !== "all") {
      match.milkType = milkType;
    }

    const data = await Milk.aggregate([
      {
        $match: match
      },
      {
        $group: {
          _id: "$date",
          totalLiters: { $sum: "$quantity" },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getFatSnfStats = async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to, shift, milkType } = req.query;
    let match = {
      centerId: new mongoose.Types.ObjectId(id),
    };

    // 📅 Date filter
    if (from && to) {
      match.date = { $gte: from, $lte: to };
    }

    // 🌅 Shift filter
    if (shift && shift !== "all") {
      match.shift = shift;
    }

    // 🐄 Milk type filter
    if (milkType && milkType !== "all") {
      match.milkType = milkType;
    }

    const data = await Milk.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$date",
          avgFat: { $avg: "$fat" },
          avgSnf: { $avg: "$snf" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getCenterPerformance = async (req, res) => {
  try {
    const { from, to, shift, milkType } = req.query;


    let match = {};
    // 📅 Date filter
    if (from && to) {
      match.date = { $gte: from, $lte: to };
    }

    // 🌅 Shift filter
    if (shift && shift !== "all") {
      match.shift = shift;
    }

    // 🐄 Milk type filter
    if (milkType && milkType !== "all") {
      match.milkType = milkType;
    }
    const data = await Milk.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$centerId",
          totalLiters: { $sum: "$quantity" },
        },
      },
      {
        $lookup: {
          from: "centers",
          localField: "_id",
          foreignField: "_id",
          as: "center",
        },
      },
      { $unwind: "$center" },
      {
        $project: {
          name: "$center.name",
          totalLiters: 1,
        },
      },
      { $sort: { totalLiters: -1 } },
    ]);

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};