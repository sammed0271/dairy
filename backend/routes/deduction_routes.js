import express from "express";
import { protect } from "../middleware/auth_middleware.js";
import { addDeduction, getDeductions, deleteDeduction, adjustDeduction, clearDeduction } from "../controllers/deduction_controller.js";

const router = express.Router();

router.use(protect);

router.post("/", addDeduction);
router.get("/", getDeductions);
router.delete("/:id", deleteDeduction);

router.patch("/:id", adjustDeduction);
router.patch("/clear/:id", clearDeduction);

export default router;
