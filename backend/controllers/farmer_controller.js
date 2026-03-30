import Farmer from "../models/Farmer.js";
import { logAudit } from "../services/auditService.js";
import { getScopedFilter, isSuperadmin } from "../utils/access.js";

export const addFarmer = async (req, res) => {
  try {
    let { milkType } = req.body;

    if (!Array.isArray(milkType) || milkType.length === 0) {
      return res.status(400).json({ message: "Milk type required" });
    }

    if (
      milkType.includes("mix") &&
      (milkType.includes("cow") || milkType.includes("buffalo"))
    ) {
      return res
        .status(400)
        .json({ message: "Mix cannot combine with cow/buffalo" });
    }

    const centreId = isSuperadmin(req)
      ? req.body.centreId || null
      : req.user?.centreId || null;

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
    res.status(500).json({ message: "Failed to add farmer" });
  }
};

export const getFarmers = async (req, res) => {
  const farmers = await Farmer.find(getScopedFilter(req)).sort({ createdAt: -1 });
  res.json(farmers);
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
      // remove duplicates
      milkType = [...new Set(milkType)];

      // if both selected individually -> keep as cow + buffalo
      if (milkType.includes("cow") && milkType.includes("buffalo")) {
        milkType = ["cow", "buffalo"];
      }
    }

    req.body.milkType = milkType;
    if (!isSuperadmin(req)) {
      delete req.body.centreId;
    }

    const farmer = await Farmer.findOneAndUpdate(getScopedFilter(req, { _id: id }), req.body, {
      new: true,
      runValidators: true,
    });

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
    res.status(500).json({ message: "Failed to update farmer" });
  }
};
