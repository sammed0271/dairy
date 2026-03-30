import express from "express";
import {
  dailyMilkReport,
  milkTypeReport,
  inventoryReport,
  getBillingReportByRange,
  milkReportByRange,
} from "../controllers/report_controller.js";
import { protect } from "../middleware/auth_middleware.js";

const router = express.Router();

router.use(protect);

router.get("/daily-milk", dailyMilkReport);
router.get("/milk-type", milkTypeReport);
router.get("/inventory", inventoryReport);
router.get("/milk-range", milkReportByRange);
router.get("/billing", getBillingReportByRange);

export default router;
