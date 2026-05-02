import express from "express";
import {
  createCenter,
  getCenters,
  getCenterById,
  // updateCenter,
  toggleCenter,
  // getCenterFullDetails,
  getDailyMilkTrend,
  getFatSnfStats,
  getCenterPerformance,
} from "../controllers/center_controller.js";

import { protect } from "../middleware/auth_middleware.js";

const router = express.Router();

// 🔐 Superadmin routes
router.get("/", getCenters);
router.post("/", createCenter);
router.put("/:id/toggle", toggleCenter);
router.get("/:id", getCenterById);

router.get("/:id/daily-milk-trend", getDailyMilkTrend);
router.get("/:id/fat-snf-stats", getFatSnfStats);
router.get("/:id/performance", getCenterPerformance);


// router.put("/:id", updateCenter);
// router.get("/:centerId/full", getCenterFullDetails);

export default router;