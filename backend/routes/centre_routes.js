import express from "express";
import {
  backfillCentreAssignments,
  createCentre,
  getCentreById,
  listCentres,
  updateCentre,
} from "../controllers/centre_controller.js";
import { protect } from "../middleware/auth_middleware.js";
import { requireRoles } from "../middleware/adminOnly.js";

const router = express.Router();

router.use(protect, requireRoles("superadmin"));

router.get("/", listCentres);
router.post("/backfill", backfillCentreAssignments);
router.get("/:id", getCentreById);
router.post("/", createCentre);
router.put("/:id", updateCentre);

export default router;
