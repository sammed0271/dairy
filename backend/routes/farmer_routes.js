import express from "express";
import { addFarmer, deleteFarmer, getFarmers, updateFarmer } from "../controllers/farmer_controller.js";
import { protect } from "../middleware/auth_middleware.js";

const router = express.Router();

router.use(protect);

router.post("/",  addFarmer);
router.get("/",  getFarmers);
router.delete("/:id", deleteFarmer);
router.put("/:id", updateFarmer);

export default router;
