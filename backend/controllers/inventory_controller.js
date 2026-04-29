import Inventory from "../models/Inventory.js";

export const addInventory = async (req, res) => {
  try {
    const last = await Inventory.findOne({ centerId: req.user.centerId, }).sort({ createdAt: -1 });

    const nextNumber = last ? parseInt(last.code.replace("I", ""), 10) + 1 : 1;

    const code = `I${String(nextNumber).padStart(3, "0")}`;

    const item = await Inventory.create({
      code,
      name: req.body.name,
      category: req.body.category,
      unit: req.body.unit,
      currentStock: req.body.openingStock ?? 0,
      minStock: req.body.minStock ?? 0,
      purchaseRate: req.body.purchaseRate ?? 0,
      sellingRate: req.body.sellingRate ?? 0,
      centerId: req.user.centerId,
    });

    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const getInventory = async (req, res) => {
  try {
    const items = await Inventory.find({ centerId: req.user.centerId }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteInventory = async (req, res) => {
  try {
    await Inventory.findByIdAndDelete(req.params.id);
    res.json({ message: "Inventory item deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// export const updateInventory = async (req, res) => {
//   try {
//     const item = await Inventory.findByIdAndUpdate(
//       req.params.id,
//       {
//         itemName: req.body.name,
//         quantity: req.body.currentStock,
//         unit: req.body.unit,
//         price: req.body.purchaseRate,
//       },
//       { new: true },
//     );

//     if (!item) {
//       return res.status(404).json({ message: "Item not found" });
//     }

//     res.json({
//       _id: item._id,
//       code: `I${String(item._id).slice(-3)}`,
//       name: item.itemName,
//       category: "Other",
//       unit: item.unit,
//       currentStock: item.quantity,
//       minStock: 0,
//       purchaseRate: item.price,
//       sellingRate: null,
//       lastUpdated: item.updatedAt.toISOString().slice(0, 10),
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

export const updateInventory = async (req, res) => {
  try {
    const updated = await Inventory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getInventoryReport = async (req, res) => {
  try {
    const items = await Inventory.find({ centerId: req.user.centerId, });

    let totalValue = 0;
    let lowStock = 0;
    let outOfStock = 0;

    const report = items.map((i) => {
      const stock = i.currentStock ?? 0;
      const min = i.minStock ?? 0;
      const value = stock * (i.purchaseRate ?? 0);

      totalValue += value;

      if (stock <= 0) outOfStock += 1;
      else if (stock < min) lowStock += 1;

      return {
        _id: i._id,
        code: i.code,
        name: i.name,
        category: i.category,
        unit: i.unit,
        currentStock: stock,
        minStock: min,
        purchaseRate: i.purchaseRate,
        stockValue: value,
        status:
          stock <= 0
            ? "Out of Stock"
            : stock < min
              ? "Low Stock"
              : "In Stock",
        updatedAt: i.updatedAt,
      };
    });

    res.json({
      summary: {
        totalItems: items.length,
        totalValue,
        lowStock,
        outOfStock,
      },
      data: report,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
