import express from "express";
import { getQualityDashboard } from "../controllers/superadmin_quality_controller.js";
import { protect } from "../middleware/auth_middleware.js";

const router = express.Router();

router.use(protect);

// GET /api/superadmin/quality?from=&to=&centerId=
router.get("/", getQualityDashboard);

export default router;