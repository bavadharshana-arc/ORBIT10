import type { Request, Response } from "express";
import { createUser, loginUser } from "../services/user.service";
import { signToken } from "../utils/jwt";

export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required" });
  }

  try {
    const user = await createUser(name, email, password);

    return res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Email already registered") {
      return res.status(409).json({ error: error.message });
    }

    console.error("[auth.register] Unhandled error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  try {
    const user = await loginUser(email, password);
    const token = signToken(user.id);

    return res.status(200).json({
      token,
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid email or password") {
      return res.status(401).json({ error: error.message });
    }

    console.error("[auth.login] Unhandled error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
