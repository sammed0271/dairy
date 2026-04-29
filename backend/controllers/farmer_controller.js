import Farmer from "../models/Farmer.js";

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

    req.body.centerId = req.user.centerId;

    const farmer = await Farmer.create(req.body);

    res.status(201).json(farmer);
  } catch (err) {
    console.error("ADD FARMER ERROR 👉", err);
    res.status(500).json({ message: "Failed to add farmer" });
  }
};

export const getFarmers = async (req, res) => {
  try {
    const farmers = await Farmer.find({ centerId: req.user.centerId }).sort({ createdAt: -1 });

    res.json(farmers);
  } catch (err) {
    console.error("GET FARMERS ERROR 👉", err); // 🔥 VERY IMPORTANT
    res.status(500).json({ message: "Failed to fetch farmers" });
  }
};

export const deleteFarmer = async (req, res) => {
  try {
    const { id } = req.params;

    const farmer = await Farmer.findById(id);
    if (!farmer) {
      return res.status(404).json({ message: "Farmer not found" });
    }

    await Farmer.findByIdAndDelete(id);

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
    req.body.centerId = req.user.centerId;

    const farmer = await Farmer.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!farmer) {
      return res.status(404).json({ message: "Farmer not found" });
    }

    res.json(farmer);
  } catch (err) {
    console.error("Update farmer failed:", err);
    res.status(500).json({ message: "Failed to update farmer" });
  }
};
