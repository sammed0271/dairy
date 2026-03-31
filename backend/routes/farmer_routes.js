import express from "express";
import {
  addFarmer,
  deleteFarmer,
  getFarmerTransferHistory,
  getFarmers,
  transferFarmer,
  updateFarmer,
} from "../controllers/farmer_controller.js";
import { protect } from "../middleware/auth_middleware.js";
import { requireRoles } from "../middleware/adminOnly.js";

const router = express.Router();

router.use(protect);

router.post("/", addFarmer);
router.get("/", getFarmers);
router.get("/:id/transfers", requireRoles("superadmin"), getFarmerTransferHistory);
router.post("/:id/transfer", requireRoles("superadmin"), transferFarmer);
router.delete("/:id", deleteFarmer);
router.put("/:id", updateFarmer);

export default router;
