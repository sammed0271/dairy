import express from "express";
import { getSuperadminDashboard } from "../controllers/superadmindashboards.js";
import { protect } from "../middleware/auth_middleware.js";
import { adminOnly } from "../middleware/adminOnly.js";

const router = express.Router();

// GET /api/superadmin/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/", getSuperadminDashboard);

export default router;
