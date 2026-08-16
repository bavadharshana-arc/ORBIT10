import { Router } from "express";
import { getDbHealth } from "../controllers/healthController";

const router = Router();

router.get("/db-health", getDbHealth);

export default router;
