import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getDbHealth = async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", database: "disconnected" });
  }
};
