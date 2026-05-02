import express from "express";
import {
  getAllCentersRateChartSummary,
  getRateChartsForCenter,
  updateRateChartForCenter,
  getRateChartHistory,
} from "../controllers/superadmin_rateChart_controller.js";
import { protect } from "../middleware/auth_middleware.js";

const router = express.Router();

router.use(protect);

// GET  /api/superadmin/rate-charts
router.get("/", getAllCentersRateChartSummary);

// GET  /api/superadmin/rate-charts/:centerId
router.get("/:centerId", getRateChartsForCenter);

// GET  /api/superadmin/rate-charts/:centerId/history?milkType=cow
router.get("/:centerId/history", getRateChartHistory);

// PUT  /api/superadmin/rate-charts/:centerId/:milkType
router.put("/:centerId/:milkType", updateRateChartForCenter);

export default router;