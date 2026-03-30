import express from "express";
import {
  getRateCharts,
  getRateForMilk,
  updateRateChart,
} from "../controllers/rateChart_controller.js";
import { protect } from "../middleware/auth_middleware.js";
import { adminOnly } from "../middleware/adminOnly.js";

const router = express.Router();

router.use(protect);

router.get("/", getRateCharts);
router.get("/rate", getRateForMilk);
router.put("/:milkType", adminOnly, updateRateChart);

export default router;
