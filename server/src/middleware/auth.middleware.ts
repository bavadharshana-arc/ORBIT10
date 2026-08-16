import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const payload = verifyToken(token);

    if (typeof payload === "string" || !("userId" in payload)) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.userId = payload.userId as string;

    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
