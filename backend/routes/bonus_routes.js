import express from "express";
import { addBonus, getBonus, deleteBonus, previewBonus } from "../controllers/bonus_controller.js";

const router = express.Router();

router.post("/", addBonus);
router.get("/", getBonus);
router.delete("/:id", deleteBonus);
router.post("/preview", previewBonus);

export default router;
