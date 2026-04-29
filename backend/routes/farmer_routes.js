import express from "express";
import { addFarmer, deleteFarmer, getFarmers, updateFarmer } from "../controllers/farmer_controller.js";

const router = express.Router();

router.post("/", addFarmer);
router.get("/", getFarmers);
router.delete("/:id", deleteFarmer);
router.put("/:id", updateFarmer);

export default router;
