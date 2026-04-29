import Milk from "../models/Milk.js";

/* ================= TODAY ================= */
export const getTodayDashboardStats = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const collections = await Milk.find({ centerId: req.user.centerId, date: today });

    const result = {
      morning: {
        totalLiters: 0,
        cow: 0,
        buffalo: 0,
        mix: 0,
        amount: 0,
      },
      evening: {
        totalLiters: 0,
        cow: 0,
        buffalo: 0,
        mix: 0,
        amount: 0,
      },
    };

    const farmerSet = new Set();

    collections.forEach((c) => {
      const shift = c.shift === "evening" ? "evening" : "morning";

      result[shift].totalLiters += c.quantity || 0;
      result[shift].amount += c.totalAmount || 0;

      farmerSet.add(c.farmerId?.toString());

      if (c.milkType === "cow") result[shift].cow += c.quantity || 0;
      if (c.milkType === "buffalo") result[shift].buffalo += c.quantity || 0;
      if (c.milkType === "mix") result[shift].mix += c.quantity || 0;
    });

    res.json({
      morning: result.morning,
      evening: result.evening,
      farmersToday: farmerSet.size,
      totalLiters: result.morning.totalLiters + result.evening.totalLiters,
      amountToday: result.morning.amount + result.evening.amount,
    });
  } catch (err) {
    console.error("Today dashboard error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ================= MONTH ================= */
export const getMonthlyDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);

    const collections = await Milk.find({ centerId: req.user.centerId, date: { $gte: start } });

    let totalLiters = 0;
    let cowLiters = 0;
    let buffaloLiters = 0;
    let mixLiters = 0;

    let amount = 0;

    collections.forEach((c) => {
      totalLiters += c.quantity;
      amount += c.totalAmount;

      if (c.milkType === "cow") cowLiters += c.quantity;
      if (c.milkType === "buffalo") buffaloLiters += c.quantity;
      if (c.milkType === "mix") mixLiters += c.quantity;
    });

    res.json({
      totalLiters,
      amount,
      cowPercent: totalLiters ? Math.round((cowLiters / totalLiters) * 100) : 0,
      buffaloPercent: totalLiters
        ? Math.round((buffaloLiters / totalLiters) * 100)
        : 0,
      mixPercent: totalLiters ? Math.round((mixLiters / totalLiters) * 100) : 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= TOP FARMERS ================= */
export const getTopFarmers = async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);

    const result = await Milk.aggregate([
      { $match: { centerId: req.user.centerId, date: { $gte: start } } },
      {
        $group: {
          _id: "$farmerId",
          liters: { $sum: "$quantity" }, // ✅ FIX
          amount: { $sum: "$totalAmount" }, // ✅ FIX
        },
      },
      { $sort: { liters: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "farmers",
          localField: "_id",
          foreignField: "_id",
          as: "farmer",
        },
      },
      { $unwind: "$farmer" },
      {
        $project: {
          _id: 0,
          code: "$farmer.code",
          name: "$farmer.name",
          liters: 1,
          amount: 1,
        },
      },
    ]);

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
