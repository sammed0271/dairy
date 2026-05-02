import express from "express";
import { protect } from "../middleware/auth_middleware.js";
import {
  superadminDailyReport,
  superadminRangeReport,
  superadminMilkYield,
  superadminMilkEntries,
  superadminBillingReport,
} from "../controllers/superadmin_report_controller.js";

const router = express.Router();

// All routes require superadmin auth (protect handles role check)
router.get("/daily", protect, superadminDailyReport);
router.get("/range", protect, superadminRangeReport);
router.get("/milk-yield", protect, superadminMilkYield);
router.get("/milk-entries", protect, superadminMilkEntries);
router.get("/billing", protect, superadminBillingReport);

export default router;
// Mount in server.js as:
// app.use("/api/superadmin/reports", superadminReportRoutes);