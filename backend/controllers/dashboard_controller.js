import Milk from "../models/Milk.js";
import Bill from "../models/Bill.js";
import Centre from "../models/Centre.js";
import Farmer from "../models/Farmer.js";
import User from "../models/User.js";
import { getScopedFilter } from "../utils/access.js";

export const getTodayDashboardStats = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const collections = await Milk.find(getScopedFilter(req, { date: today }));

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

    collections.forEach((entry) => {
      const shift = entry.shift === "evening" ? "evening" : "morning";

      result[shift].totalLiters += entry.quantity || 0;
      result[shift].amount += entry.totalAmount || 0;
      farmerSet.add(entry.farmerId?.toString());

      if (entry.milkType === "cow") result[shift].cow += entry.quantity || 0;
      if (entry.milkType === "buffalo") {
        result[shift].buffalo += entry.quantity || 0;
      }
      if (entry.milkType === "mix") result[shift].mix += entry.quantity || 0;
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

export const getMonthlyDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);

    const collections = await Milk.find(
      getScopedFilter(req, { date: { $gte: start } }),
    );

    let totalLiters = 0;
    let cowLiters = 0;
    let buffaloLiters = 0;
    let mixLiters = 0;
    let amount = 0;

    collections.forEach((entry) => {
      totalLiters += entry.quantity;
      amount += entry.totalAmount;

      if (entry.milkType === "cow") cowLiters += entry.quantity;
      if (entry.milkType === "buffalo") buffaloLiters += entry.quantity;
      if (entry.milkType === "mix") mixLiters += entry.quantity;
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

export const getTopFarmers = async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);

    const result = await Milk.aggregate([
      { $match: getScopedFilter(req, { date: { $gte: start } }) },
      {
        $group: {
          _id: "$farmerId",
          liters: { $sum: "$quantity" },
          amount: { $sum: "$totalAmount" },
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

export const getGlobalDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);

    const [
      totalCentres,
      activeCentres,
      totalAdmins,
      totalFarmers,
      todayCollections,
      monthCollections,
      generatedBills,
      paidBills,
    ] = await Promise.all([
      Centre.countDocuments(),
      Centre.countDocuments({ status: "active" }),
      User.countDocuments({ role: { $in: ["admin", "superadmin"] } }),
      Farmer.countDocuments(),
      Milk.aggregate([
        { $match: { date: today } },
        {
          $group: {
            _id: null,
            totalLiters: { $sum: "$quantity" },
            amount: { $sum: "$totalAmount" },
          },
        },
      ]),
      Milk.aggregate([
        { $match: { date: { $gte: monthStart } } },
        {
          $group: {
            _id: null,
            totalLiters: { $sum: "$quantity" },
            amount: { $sum: "$totalAmount" },
          },
        },
      ]),
      Bill.countDocuments({ periodFrom: { $gte: monthStart } }),
      Bill.countDocuments({ periodFrom: { $gte: monthStart }, status: "paid" }),
    ]);

    res.json({
      centres: {
        total: totalCentres,
        active: activeCentres,
        disabled: Math.max(totalCentres - activeCentres, 0),
      },
      admins: {
        total: totalAdmins,
      },
      farmers: {
        total: totalFarmers,
      },
      today: todayCollections[0] || {
        totalLiters: 0,
        amount: 0,
      },
      month: monthCollections[0] || {
        totalLiters: 0,
        amount: 0,
      },
      bills: {
        generated: generatedBills,
        paid: paidBills,
        pending: Math.max(generatedBills - paidBills, 0),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
