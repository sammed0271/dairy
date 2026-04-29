import express from "express";
import { getInventoryTransactions, payInstallment, sellInventoryToFarmer } from "../controllers/inventory_transaction_controller.js";


const router = express.Router();

router.post("/sell", sellInventoryToFarmer);
router.get("/", getInventoryTransactions);
router.post("/installment", payInstallment);

export default router;
