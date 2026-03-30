import express from "express";
import {
  getFarmerPayments,
  getPayments,
  payAllBills,
  payBill,
  razorpayWebhook,
} from "../controllers/paymentController.js";
import { protect } from "../middleware/auth_middleware.js";
const router = express.Router();

router.post("/webhook/razorpay", razorpayWebhook);
router.use(protect);

router.get("/", getPayments);
router.get("/farmer/:farmerId", getFarmerPayments);
router.post("/pay-bill", payBill);
router.post("/pay-all", payAllBills);


export default router;
