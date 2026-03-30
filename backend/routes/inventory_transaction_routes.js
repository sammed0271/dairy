import express from "express";
import { getInventoryTransactions, payInstallment, sellInventoryToFarmer } from "../controllers/inventory_transaction_controller.js";
import { protect } from "../middleware/auth_middleware.js";

const router = express.Router();

router.use(protect);

router.post("/sell", sellInventoryToFarmer);
router.get("/", getInventoryTransactions);
router.post("/installment", payInstallment);

export default router;
