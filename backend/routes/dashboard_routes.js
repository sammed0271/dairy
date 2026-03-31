import express from "express";
import { protect } from "../middleware/auth_middleware.js";
import {
  getGlobalDashboardStats,
  getTodayDashboardStats,
  getMonthlyDashboardStats,
  getTopFarmers,
} from "../controllers/dashboard_controller.js";
import { requireRoles } from "../middleware/adminOnly.js";

const router = express.Router();

router.use(protect);

router.get("/today", getTodayDashboardStats);
router.get("/month", getMonthlyDashboardStats);
router.get("/top-farmers", getTopFarmers);
router.get("/global", requireRoles("superadmin"), getGlobalDashboardStats);

export default router;
