import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { changeMyPassword, deleteMe, getMe, updateMe } from "../controllers/user.controller";

const router = Router();

router.get("/me", authMiddleware, getMe);
router.patch("/me", authMiddleware, updateMe);
router.patch("/me/password", authMiddleware, changeMyPassword);
router.delete("/me", authMiddleware, deleteMe);

export default router;
