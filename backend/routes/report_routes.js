import express from "express";
import {
  dailyMilkReport,
  milkTypeReport,
  inventoryReport,
  getBillingReportByRange,
  milkReportByRange,
} from "../controllers/report_controller.js";


const router = express.Router();

router.get("/daily-milk", dailyMilkReport);
router.get("/milk-type", milkTypeReport);
router.get("/inventory", inventoryReport);
router.get("/milk-range", milkReportByRange);
router.get("/billing", getBillingReportByRange);

export default router;
