import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  clearAll,
  createNotification,
  deleteNotification,
  listNotifications,
  markAllRead,
  updateNotification,
} from "../controllers/notification.controller";

// Mounted at /api/users/me/notifications. Unlike every other domain route,
// this is recipient-scoped rather than workspace/project-scoped — the only
// gate is authMiddleware, and every read/update service call filters by
// req.userId server-side (mirrors GET /api/users/me, the one existing
// precedent for a "current user" scoped route). Stage 4 (Real
// Notifications): POST may target a different real recipient (an optional
// body field, defaulting to the caller), but only when they share a
// workspace with the caller — verified server-side in
// notification.service.ts, never trusted from the client.
const router = Router();

router.post("/", authMiddleware, createNotification);
router.get("/", authMiddleware, listNotifications);
router.patch("/:notificationId", authMiddleware, updateNotification);
router.post("/read-all", authMiddleware, markAllRead);
router.delete("/:notificationId", authMiddleware, deleteNotification);
router.delete("/", authMiddleware, clearAll);

export default router;
