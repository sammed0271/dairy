import express from "express";
import {
  registerUser,
  loginUser,
  getCurrentUser,
} from "../controllers/auth_controller.js";
import { protect } from "../middleware/auth_middleware.js";


const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getCurrentUser);

export default router;
