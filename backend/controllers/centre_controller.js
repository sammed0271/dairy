import Centre from "../models/Centre.js";
import Bill from "../models/Bill.js";
import Bonus from "../models/Bonus.js";
import Deduction from "../models/Deduction.js";
import Farmer from "../models/Farmer.js";
import Inventory from "../models/Inventory.js";
import InventoryTransaction from "../models/InventoryTransaction.js";
import Milk from "../models/Milk.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import { logAudit } from "../services/auditService.js";

const normalizeCentrePayload = (payload = {}) => ({
  name: payload.name?.trim(),
  code: payload.code?.trim()?.toUpperCase(),
  village: payload.village?.trim() || "",
  taluka: payload.taluka?.trim() || "",
  district: payload.district?.trim() || "",
  state: payload.state?.trim() || "",
  address: payload.address?.trim() || "",
  latitude:
    payload.latitude === "" || payload.latitude == null
      ? null
      : Number(payload.latitude),
  longitude:
    payload.longitude === "" || payload.longitude == null
      ? null
      : Number(payload.longitude),
  paymentCycle: payload.paymentCycle?.trim() || "10-day",
  rateType: payload.rateType?.trim() || "standard",
  status: payload.status || "active",
});

const attachCentreMetrics = async (centres) =>
  Promise.all(
    centres.map(async (centre) => {
      const centreId = centre._id;
      const [adminCount, farmerCount, milkEntryCount] = await Promise.all([
        User.countDocuments({
          centreId,
          status: "active",
          role: { $in: ["admin", "superadmin"] },
        }),
        Farmer.countDocuments({ centreId }),
        Milk.countDocuments({ centreId }),
      ]);

      return {
        ...centre.toObject(),
        metrics: {
          adminCount,
          farmerCount,
          milkEntryCount,
        },
      };
    }),
  );

export const listCentres = async (req, res) => {
  try {
    const filter = {};

    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }

    const centres = await Centre.find(filter).sort({ createdAt: -1 });
    const data = await attachCentreMetrics(centres);

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCentreById = async (req, res) => {
  try {
    const centre = await Centre.findById(req.params.id);

    if (!centre) {
      return res.status(404).json({ message: "Centre not found" });
    }

    const [data] = await attachCentreMetrics([centre]);
    return res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createCentre = async (req, res) => {
  try {
    const payload = normalizeCentrePayload(req.body);

    if (!payload.name || !payload.code) {
      return res
        .status(400)
        .json({ message: "Centre name and code are required" });
    }

    const existingCentre = await Centre.findOne({ code: payload.code });
    if (existingCentre) {
      return res.status(400).json({ message: "Centre code already exists" });
    }

    const centre = await Centre.create(payload);

    await logAudit({
      req,
      centreId: centre._id,
      action: "centre.create",
      entityType: "Centre",
      entityId: centre._id,
      details: {
        name: centre.name,
        code: centre.code,
        status: centre.status,
      },
    });

    res.status(201).json(centre);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCentre = async (req, res) => {
  try {
    const centre = await Centre.findById(req.params.id);

    if (!centre) {
      return res.status(404).json({ message: "Centre not found" });
    }

    const payload = normalizeCentrePayload({
      ...centre.toObject(),
      ...req.body,
    });

    if (!payload.name || !payload.code) {
      return res
        .status(400)
        .json({ message: "Centre name and code are required" });
    }

    const duplicate = await Centre.findOne({
      code: payload.code,
      _id: { $ne: centre._id },
    });

    if (duplicate) {
      return res.status(400).json({ message: "Centre code already exists" });
    }

    Object.assign(centre, payload);
    await centre.save();

    await logAudit({
      req,
      centreId: centre._id,
      action: "centre.update",
      entityType: "Centre",
      entityId: centre._id,
      details: {
        name: centre.name,
        code: centre.code,
        status: centre.status,
      },
    });

    res.json(centre);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrCreateBackfillCentre = async (requestedCentreId = null) => {
  if (requestedCentreId) {
    const requestedCentre = await Centre.findById(requestedCentreId);

    if (!requestedCentre) {
      const error = new Error("Selected backfill centre was not found");
      error.statusCode = 404;
      throw error;
    }

    return requestedCentre;
  }

  const existingCentre =
    (await Centre.findOne({ status: "active" }).sort({ createdAt: 1 })) ||
    (await Centre.create({
      name: "Primary Centre",
      code: "MAIN",
      district: "Default",
      state: "Default",
      paymentCycle: "10-day",
      rateType: "standard",
      status: "active",
    }));

  return existingCentre;
};

const nullCentreFilter = {
  $or: [{ centreId: null }, { centreId: { $exists: false } }],
};

export const backfillCentreAssignments = async (req, res) => {
  try {
    const targetCentre = await getOrCreateBackfillCentre(req.body?.centreId);

    const operations = [
      ["farmers", Farmer, nullCentreFilter],
      ["milkEntries", Milk, nullCentreFilter],
      ["inventoryItems", Inventory, nullCentreFilter],
      ["bills", Bill, nullCentreFilter],
      ["bonuses", Bonus, nullCentreFilter],
      ["deductions", Deduction, nullCentreFilter],
      ["inventoryTransactions", InventoryTransaction, nullCentreFilter],
      ["payments", Payment, nullCentreFilter],
      [
        "admins",
        User,
        {
          role: "admin",
          ...nullCentreFilter,
        },
      ],
    ];

    const updated = {};

    for (const [key, model, filter] of operations) {
      const result = await model.updateMany(filter, {
        $set: { centreId: targetCentre._id },
      });
      updated[key] = result.modifiedCount ?? 0;
    }

    await logAudit({
      req,
      centreId: targetCentre._id,
      action: "centre.backfill",
      entityType: "Centre",
      entityId: targetCentre._id,
      details: {
        updated,
      },
    });

    res.json({
      message: "Unassigned records backfilled successfully",
      centre: targetCentre,
      updated,
    });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to backfill centre data" });
  }
};
