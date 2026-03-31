import express from "express";
import {
  createAdmin,
  getAdminById,
  listAdmins,
  updateAdmin,
} from "../controllers/admin_controller.js";
import { protect } from "../middleware/auth_middleware.js";
import { requireRoles } from "../middleware/adminOnly.js";

const router = express.Router();

router.use(protect, requireRoles("superadmin"));

router.get("/", listAdmins);
router.get("/:id", getAdminById);
router.post("/", createAdmin);
router.put("/:id", updateAdmin);

export default router;
