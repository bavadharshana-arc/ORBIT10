import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { getMe, updateMe } from "../controllers/user.controller";

const router = Router();

router.get("/me", authMiddleware, getMe);
router.patch("/me", authMiddleware, updateMe);

export default router;
