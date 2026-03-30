import express from "express";
import { protect } from "../middleware/auth_middleware.js";
import {
  deleteBill,
  generateBill,
  getBillDetails,
  getBills,
  markBillAsPaid,
  previewBill,
} from "../controllers/bill_controller.js";

const router = express.Router();

router.use(protect);

router.post("/generate", generateBill);
router.get("/", getBills);
router.post("/preview", previewBill);
router.delete("/:id", deleteBill); 
router.put("/:id/pay", markBillAsPaid); 
router.post("/details", getBillDetails);

export default router;
