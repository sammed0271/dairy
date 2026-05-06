import express from "express";

import { getUsers, assignCenterToUser, createUser, updateUser } from "../controllers/userController.js";

const router = express.Router();

router.get("/", getUsers);
router.put("/", createUser);
router.put("/:id", updateUser);
router.patch("/:userId/center", assignCenterToUser);

export default router;