import express from "express";
import {
  dailyMilkReport,
  monthlyMilkReport,
  milkTypeReport,
  inventoryReport,
  getBillingReportByRange,
  milkReportByRange,
  farmerPaymentReport,
  milkQualityAnalysisReport,
  auditTrailReport,
} from "../controllers/report_controller.js";
import { protect } from "../middleware/auth_middleware.js";

const router = express.Router();

router.use(protect);

router.get("/daily-milk", dailyMilkReport);
router.get("/monthly-milk", monthlyMilkReport);
router.get("/milk-type", milkTypeReport);
router.get("/inventory", inventoryReport);
router.get("/milk-range", milkReportByRange);
router.get("/billing", getBillingReportByRange);
router.get("/farmer-payments", farmerPaymentReport);
router.get("/milk-quality", milkQualityAnalysisReport);
router.get("/audit-trail", auditTrailReport);

export default router;
