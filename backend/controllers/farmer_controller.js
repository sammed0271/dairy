import Centre from "../models/Centre.js";
import Farmer from "../models/Farmer.js";
import FarmerTransfer from "../models/FarmerTransfer.js";
import {
  requireAssignedCentre,
  resolveOperationalCentreId,
} from "../services/centreAccessService.js";
import { logAudit } from "../services/auditService.js";
import { ensureCentreAccess, getScopedFilter, isSuperadmin } from "../utils/access.js";
import { validateFarmerTransferTargets } from "../utils/farmerTransfer.js";

const validateMilkTypes = (milkType = []) => {
  if (!Array.isArray(milkType) || milkType.length === 0) {
    const error = new Error("Milk type required");
    error.statusCode = 400;
    throw error;
  }

  if (
    milkType.includes("mix") &&
    (milkType.includes("cow") || milkType.includes("buffalo"))
  ) {
    const error = new Error("Mix cannot combine with cow/buffalo");
    error.statusCode = 400;
    throw error;
  }
};

const ensureActiveCentre = async (centreId) => {
  if (!centreId) {
    const error = new Error("Centre assignment is required");
    error.statusCode = 400;
    throw error;
  }

  const centre = await Centre.findOne({ _id: centreId, status: "active" });
  if (!centre) {
    const error = new Error("Assigned centre was not found or is disabled");
    error.statusCode = 400;
    throw error;
  }

  return centre;
};

export const addFarmer = async (req, res) => {
  try {
    const { milkType } = req.body;

    validateMilkTypes(milkType);

    const centreId = resolveOperationalCentreId(req, req.body.centreId);
    await ensureActiveCentre(centreId);

    const farmer = await Farmer.create({
      ...req.body,
      centreId,
    });

    await logAudit({
      req,
      centreId,
      action: "farmer_created",
      entityType: "Farmer",
      entityId: farmer._id,
      details: { code: farmer.code, name: farmer.name },
    });

    res.status(201).json(farmer);
  } catch (err) {
    console.error("Add farmer failed:", err);
    res
      .status(err.statusCode || 500)
      .json({ message: err.message || "Failed to add farmer" });
  }
};

export const getFarmers = async (req, res) => {
  try {
    if (!isSuperadmin(req)) {
      requireAssignedCentre(req);
    }

    const filter = getScopedFilter(req);
    if (isSuperadmin(req) && req.query.centreId) {
      filter.centreId = req.query.centreId;
    }

    const farmers = await Farmer.find(filter)
      .populate("centreId", "name code status")
      .sort({ createdAt: -1 });

    res.json(farmers);
  } catch (err) {
    console.error("Get farmers failed:", err);
    res
      .status(err.statusCode || 500)
      .json({ message: err.message || "Failed to fetch farmers" });
  }
};

export const deleteFarmer = async (req, res) => {
  try {
    const { id } = req.params;

    const farmer = await Farmer.findOne(getScopedFilter(req, { _id: id }));
    if (!farmer) {
      return res.status(404).json({ message: "Farmer not found" });
    }

    await Farmer.deleteOne({ _id: id });

    await logAudit({
      req,
      centreId: farmer.centreId,
      action: "farmer_deleted",
      entityType: "Farmer",
      entityId: id,
      details: { code: farmer.code, name: farmer.name },
    });

    res.json({ message: "Farmer deleted successfully" });
  } catch (err) {
    console.error("Delete farmer failed:", err);
    res.status(500).json({ message: "Failed to delete farmer" });
  }
};

export const updateFarmer = async (req, res) => {
  try {
    const { id } = req.params;
    let { milkType } = req.body;

    // ---- normalize milkType ----
    if (milkType === "both") {
      milkType = ["cow", "buffalo"];
    }

    if (Array.isArray(milkType)) {
      validateMilkTypes(milkType);

      // remove duplicates
      milkType = [...new Set(milkType)];

      // if both selected individually -> keep as cow + buffalo
      if (milkType.includes("cow") && milkType.includes("buffalo")) {
        milkType = ["cow", "buffalo"];
      }
    }

    req.body.milkType = milkType;
    delete req.body.centreId;

    const farmer = await Farmer.findOneAndUpdate(
      getScopedFilter(req, { _id: id }),
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!farmer) {
      return res.status(404).json({ message: "Farmer not found" });
    }

    await logAudit({
      req,
      centreId: farmer.centreId,
      action: "farmer_updated",
      entityType: "Farmer",
      entityId: id,
      details: { updatedFields: Object.keys(req.body) },
    });

    res.json(farmer);
  } catch (err) {
    console.error("Update farmer failed:", err);
    res
      .status(err.statusCode || 500)
      .json({ message: err.message || "Failed to update farmer" });
  }
};

export const transferFarmer = async (req, res) => {
  try {
    const { id } = req.params;
    const { toCentreId, note = "" } = req.body;

    const farmer = await Farmer.findById(id);
    if (!farmer) {
      return res.status(404).json({ message: "Farmer not found" });
    }

    validateFarmerTransferTargets({
      currentCentreId: farmer.centreId,
      targetCentreId: toCentreId,
    });

    ensureCentreAccess(req, farmer.centreId);

    const [fromCentre, toCentre] = await Promise.all([
      Centre.findById(farmer.centreId),
      Centre.findOne({ _id: toCentreId, status: "active" }),
    ]);

    if (!fromCentre) {
      return res.status(400).json({ message: "Source centre not found" });
    }

    if (!toCentre) {
      return res
        .status(400)
        .json({ message: "Target centre not found or is disabled" });
    }

    const transfer = await FarmerTransfer.create({
      farmerId: farmer._id,
      fromCentreId: fromCentre._id,
      toCentreId: toCentre._id,
      transferredBy: req.user.id,
      note: note.trim(),
    });

    farmer.centreId = toCentre._id;
    await farmer.save();

    await logAudit({
      req,
      centreId: toCentre._id,
      action: "farmer_transferred",
      entityType: "Farmer",
      entityId: farmer._id,
      details: {
        farmerCode: farmer.code,
        farmerName: farmer.name,
        fromCentreId: fromCentre._id,
        toCentreId: toCentre._id,
        note: note.trim(),
        transferId: transfer._id,
      },
    });

    const updatedFarmer = await Farmer.findById(farmer._id).populate(
      "centreId",
      "name code status",
    );

    res.json({
      message: "Farmer transferred successfully",
      farmer: updatedFarmer,
      transfer,
    });
  } catch (err) {
    console.error("Transfer farmer failed:", err);
    res
      .status(err.statusCode || 500)
      .json({ message: err.message || "Failed to transfer farmer" });
  }
};

export const getFarmerTransferHistory = async (req, res) => {
  try {
    const farmer = await Farmer.findById(req.params.id).select("_id centreId");
    if (!farmer) {
      return res.status(404).json({ message: "Farmer not found" });
    }

    if (farmer.centreId) {
      ensureCentreAccess(req, farmer.centreId);
    }

    const history = await FarmerTransfer.find({ farmerId: req.params.id })
      .populate("fromCentreId", "name code")
      .populate("toCentreId", "name code")
      .populate("transferredBy", "name email")
      .sort({ createdAt: -1 });

    res.json(history);
  } catch (err) {
    console.error("Get farmer transfer history failed:", err);
    res
      .status(err.statusCode || 500)
      .json({ message: err.message || "Failed to fetch transfer history" });
  }
};
