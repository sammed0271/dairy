import express from "express";

import { getUsers, assignCenterToUser, createUser } from "../controllers/userController.js";

const router = express.Router();

router.get("/", getUsers);
router.put("/", createUser);
router.patch("/:userId/center", assignCenterToUser);

export default router;