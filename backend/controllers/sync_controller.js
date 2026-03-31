import Farmer from "../models/Farmer.js";
import Inventory from "../models/Inventory.js";
import InventoryTransaction from "../models/InventoryTransaction.js";
import Milk from "../models/Milk.js";
import { logAudit } from "../services/auditService.js";
import { createMilkEntry } from "../services/milkEntryService.js";
import { getScopedFilter, isSuperadmin } from "../utils/access.js";
import { sortSyncQueueItems } from "../utils/syncQueue.js";

const parseUpdatedAfter = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const generateNextInventoryCode = async (req) => {
  const scope = getScopedFilter(req);
  const last = await Inventory.findOne(scope).sort({ createdAt: -1 });
  const nextNumber = last ? parseInt(last.code.replace("I", ""), 10) + 1 : 1;
  return `I${String(nextNumber).padStart(3, "0")}`;
};

export const getSyncStatus = async (req, res) => {
  try {
    const [farmers, inventory, milkEntries] = await Promise.all([
      Farmer.countDocuments(getScopedFilter(req)),
      Inventory.countDocuments(getScopedFilter(req)),
      Milk.countDocuments(getScopedFilter(req)),
    ]);

    res.json({
      serverTime: new Date().toISOString(),
      scope: {
        role: req.user.role,
        centreId: req.user.centreId ?? null,
      },
      counts: {
        farmers,
        inventory,
        milkEntries,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const pullSyncData = async (req, res) => {
  try {
    const updatedAfter = parseUpdatedAfter(req.query.updatedAfter);
    const syncFilter = updatedAfter ? { updatedAt: { $gt: updatedAfter } } : {};

    const farmerFilter = getScopedFilter(req, syncFilter);
    const inventoryFilter = getScopedFilter(req, syncFilter);
    const milkFilter = getScopedFilter(req, syncFilter);

    const [farmers, inventory, milkEntries] = await Promise.all([
      Farmer.find(farmerFilter).sort({ updatedAt: -1 }).lean(),
      Inventory.find(inventoryFilter).sort({ updatedAt: -1 }).lean(),
      Milk.find(milkFilter)
        .sort({ updatedAt: -1 })
        .limit(300)
        .populate("farmerId", "name code")
        .lean(),
    ]);

    res.json({
      serverTime: new Date().toISOString(),
      updatedAfter: updatedAfter?.toISOString() ?? null,
      scope: {
        role: req.user.role,
        centreId: req.user.centreId ?? null,
      },
      data: {
        farmers,
        inventory,
        milkEntries: milkEntries.map((entry) => ({
          _id: entry._id,
          date: entry.date,
          shift: entry.shift,
          farmerId: entry.farmerId?._id ?? entry.farmerId,
          farmerName: entry.farmerId?.name ?? "Deleted Farmer",
          farmerCode: entry.farmerId?.code ?? "N/A",
          milkType: entry.milkType,
          liters: entry.quantity,
          fat: entry.fat,
          snf: entry.snf,
          rate: entry.rate,
          amount: entry.totalAmount,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          clientGeneratedId: entry.clientGeneratedId ?? null,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const pushSyncData = async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items)
      ? sortSyncQueueItems(req.body.items)
      : [];

    if (items.length === 0) {
      return res.status(400).json({ message: "Sync items are required" });
    }

    const results = [];

    for (const item of items) {
      const { id, entityType, action, payload } = item;

      try {
        if (entityType === "milkEntry" && action === "create") {
          const { milk, created } = await createMilkEntry({
            req,
            payload,
          });

          if (created) {
            await logAudit({
              req,
              centreId: milk.centreId,
              action: "milk_entry_synced",
              entityType: "Milk",
              entityId: milk._id,
              details: {
                queueId: id || null,
                clientGeneratedId: payload?.clientGeneratedId || null,
              },
            });
          }

          results.push({
            id,
            status: "synced",
            entityType,
            action,
            serverId: String(milk._id),
            created,
          });
          continue;
        }

        if (entityType === "inventoryItem" && action === "create") {
          const existing = payload?.clientGeneratedId
            ? await Inventory.findOne(
                getScopedFilter(req, {
                  clientGeneratedId: payload.clientGeneratedId,
                }),
              )
            : null;

          const item =
            existing ??
            (await Inventory.create({
              centreId: req.user?.centreId ?? null,
              clientGeneratedId: payload.clientGeneratedId ?? null,
              code: await generateNextInventoryCode(req),
              name: payload.name,
              category: payload.category,
              unit: payload.unit,
              currentStock: payload.openingStock ?? 0,
              minStock: payload.minStock ?? 0,
              purchaseRate: payload.purchaseRate ?? 0,
              sellingRate: payload.sellingRate ?? 0,
            }));

          if (!existing) {
            await logAudit({
              req,
              centreId: item.centreId,
              action: "inventory_created",
              entityType: "Inventory",
              entityId: item._id,
              details: {
                queueId: id || null,
                clientGeneratedId: payload?.clientGeneratedId || null,
                code: item.code,
                name: item.name,
              },
            });
          }

          results.push({
            id,
            status: "synced",
            entityType,
            action,
            serverId: String(item._id),
            created: !existing,
          });
          continue;
        }

        if (entityType === "inventoryItem" && action === "update") {
          const updated = await Inventory.findOneAndUpdate(
            getScopedFilter(req, { _id: payload.id }),
            payload.fields,
            { new: true },
          );

          if (!updated) {
            throw new Error("Inventory item not found");
          }

          await logAudit({
            req,
            centreId: updated.centreId,
            action: "inventory_updated",
            entityType: "Inventory",
            entityId: updated._id,
            details: {
              queueId: id || null,
              updatedFields: Object.keys(payload.fields || {}),
            },
          });

          results.push({
            id,
            status: "synced",
            entityType,
            action,
            serverId: String(updated._id),
            created: false,
          });
          continue;
        }

        if (entityType === "inventoryItem" && action === "delete") {
          const deleted = await Inventory.findOneAndDelete(
            getScopedFilter(req, { _id: payload.id }),
          );

          if (!deleted) {
            throw new Error("Inventory item not found");
          }

          await logAudit({
            req,
            centreId: deleted.centreId,
            action: "inventory_deleted",
            entityType: "Inventory",
            entityId: deleted._id,
            details: {
              queueId: id || null,
            },
          });

          results.push({
            id,
            status: "synced",
            entityType,
            action,
            serverId: String(deleted._id),
            created: false,
          });
          continue;
        }

        if (entityType === "inventoryTransaction" && action === "sell") {
          const [item, farmer] = await Promise.all([
            Inventory.findOne(getScopedFilter(req, { _id: payload.itemId })),
            Farmer.findOne(getScopedFilter(req, { _id: payload.farmerId })),
          ]);

          if (!item) {
            throw new Error("Item not found");
          }

          if (!farmer) {
            throw new Error("Farmer not found");
          }

          if ((item.currentStock || 0) < payload.quantity) {
            throw new Error("Insufficient stock");
          }

          const totalAmount = payload.quantity * (item.sellingRate || 0);
          const remainingAmount = totalAmount - (payload.paidAmount || 0);

          item.currentStock -= payload.quantity;
          await item.save();

          const transaction = await InventoryTransaction.create({
            centreId: item.centreId ?? farmer.centreId ?? req.user?.centreId ?? null,
            farmerId: payload.farmerId,
            itemId: payload.itemId,
            itemName: item.name,
            itemCode: item.code,
            quantity: payload.quantity,
            rate: item.sellingRate,
            totalAmount,
            paymentMethod: payload.paymentMethod,
            paidAmount: payload.paidAmount || 0,
            remainingAmount,
            note: payload.note || "",
          });

          await logAudit({
            req,
            centreId: transaction.centreId,
            action: "inventory_sold",
            entityType: "InventoryTransaction",
            entityId: transaction._id,
            details: {
              queueId: id || null,
              farmerId: payload.farmerId,
              itemId: payload.itemId,
              quantity: payload.quantity,
              paymentMethod: payload.paymentMethod,
            },
          });

          results.push({
            id,
            status: "synced",
            entityType,
            action,
            serverId: String(transaction._id),
            created: true,
          });
          continue;
        }

        results.push({
          id,
          status: "skipped",
          entityType,
          action,
          message: "Unsupported sync item",
        });
      } catch (error) {
        results.push({
          id,
          status: "failed",
          entityType,
          action,
          message: error.message || "Failed to sync item",
        });
      }
    }

    res.json({
      serverTime: new Date().toISOString(),
      scope: {
        role: req.user.role,
        centreId: req.user.centreId ?? null,
        global: isSuperadmin(req),
      },
      results,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
