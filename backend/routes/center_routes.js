import express from "express";
import {
  createCenter,
  getCenters,
  getCenterById,
  updateCenter,
  toggleCenterStatus,
  getCenterFullDetails,
} from "../controllers/center_controller.js";

import { protect } from "../middleware/auth_middleware.js";

const router = express.Router();

// 🔐 Superadmin routes
router.post("/", createCenter);
router.get("/", getCenters);
router.get("/:id", getCenterById);
router.put("/:id", updateCenter);
router.patch("/:id/toggle", toggleCenterStatus);
router.get("/:centerId/full", getCenterFullDetails);

export default router;