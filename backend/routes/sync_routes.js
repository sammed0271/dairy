import express from "express";
import {
  getSyncStatus,
  pullSyncData,
  pushSyncData,
} from "../controllers/sync_controller.js";
import { protect } from "../middleware/auth_middleware.js";

const router = express.Router();

router.use(protect);

router.get("/status", getSyncStatus);
router.get("/pull", pullSyncData);
router.post("/push", pushSyncData);

export default router;
