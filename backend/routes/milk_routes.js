import express from "express";

import { addMilkEntry, getMilkEntries, deleteMilkEntry, updateMilkEntry } from "../controllers/milk_controller.js";

const router = express.Router();

router.post("/", addMilkEntry);
router.get("/", getMilkEntries);
router.delete("/:id", deleteMilkEntry);
router.put("/:id", updateMilkEntry);

export default router;
