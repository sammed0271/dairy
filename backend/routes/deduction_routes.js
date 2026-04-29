import express from "express";
import { addDeduction, getDeductions, deleteDeduction, adjustDeduction, clearDeduction } from "../controllers/deduction_controller.js";

const router = express.Router();

router.post("/", addDeduction);
router.get("/", getDeductions);
router.delete("/:id", deleteDeduction);

router.patch("/:id", adjustDeduction);
router.patch("/clear/:id", clearDeduction);

export default router;
