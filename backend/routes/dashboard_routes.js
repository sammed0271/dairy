import express from "express";
import {
  getTodayDashboardStats,
  getMonthlyDashboardStats,
  getTopFarmers,
} from "../controllers/dashboard_controller.js";

const router = express.Router();

router.get("/today", getTodayDashboardStats);
router.get("/month", getMonthlyDashboardStats);
router.get("/top-farmers", getTopFarmers);

export default router;
