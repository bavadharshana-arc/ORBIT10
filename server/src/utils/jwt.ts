import jwt from "jsonwebtoken";

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  return secret;
};

export const signToken = (userId: string): string => {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: "7d" });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, getJwtSecret());
};
