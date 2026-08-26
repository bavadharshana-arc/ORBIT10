import { Router } from "express";
import { forgotPassword, login, register, resetPassword } from "../controllers/auth.controller";
import { forgotPasswordLimiter, loginLimiter } from "../middleware/rateLimit.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", loginLimiter, login);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
