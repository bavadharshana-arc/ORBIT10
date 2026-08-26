import type { Request, Response } from "express";
import * as notificationService from "../services/notification.service";
import { logError } from "../lib/logger";

export const createNotification = async (req: Request, res: Response) => {
  const { type, title, message, actionHref, recipientId } = req.body ?? {};

  if (!notificationService.isNotificationType(type)) {
    return res.status(400).json({
      error: `type must be one of ${notificationService.NOTIFICATION_TYPES.join(", ")}`,
    });
  }

  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "title is required" });
  }

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message is required" });
  }

  if (actionHref !== undefined && actionHref !== null && typeof actionHref !== "string") {
    return res.status(400).json({ error: "actionHref must be a string or null" });
  }

  if (recipientId !== undefined && (typeof recipientId !== "string" || !recipientId.trim())) {
    return res.status(400).json({ error: "recipientId must be a string" });
  }

  try {
    const notification = await notificationService.createNotification(
      req.userId!,
      {
        type,
        title: title.trim(),
        message: message.trim(),
        actionHref: actionHref ?? null,
      },
      recipientId,
    );
    return res.status(201).json(notification);
  } catch (error) {
    if (error instanceof Error && error.message === "Recipient must share a workspace with you") {
      return res.status(403).json({ error: error.message });
    }
    logError("notification.createNotification", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const listNotifications = async (req: Request, res: Response) => {
  try {
    const notifications = await notificationService.listNotificationsForUser(req.userId!);
    return res.status(200).json(notifications);
  } catch (error) {
    logError("notification.listNotifications", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateNotification = async (req: Request, res: Response) => {
  const notificationId = req.params.notificationId as string;
  const { read } = req.body ?? {};

  if (typeof read !== "boolean") {
    return res.status(400).json({ error: "read must be a boolean" });
  }

  try {
    const notification = await notificationService.markAsRead(req.userId!, notificationId, read);
    return res.status(200).json(notification);
  } catch (error) {
    if (error instanceof Error && error.message === "Notification not found") {
      return res.status(404).json({ error: error.message });
    }
    logError("notification.updateNotification", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const markAllRead = async (req: Request, res: Response) => {
  try {
    await notificationService.markAllAsRead(req.userId!);
    return res.status(204).send();
  } catch (error) {
    logError("notification.markAllRead", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  const notificationId = req.params.notificationId as string;

  try {
    await notificationService.deleteNotification(req.userId!, notificationId);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === "Notification not found") {
      return res.status(404).json({ error: error.message });
    }
    logError("notification.deleteNotification", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const clearAll = async (req: Request, res: Response) => {
  try {
    await notificationService.clearAllNotifications(req.userId!);
    return res.status(204).send();
  } catch (error) {
    logError("notification.clearAll", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
