import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

export interface AccessTokenPayload {
  sub: string;
  rol: string;
  permisos: string[];
}

export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}

export function generateRefreshToken(usuarioId: string): string {
  // jti evita colisiones si el mismo usuario inicia sesión más de una vez
  // dentro del mismo segundo (iat tiene resolución de 1s en JWT).
  return jwt.sign({ sub: usuarioId, jti: crypto.randomUUID() }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, env.jwtRefreshSecret) as { sub: string };
}

export function tokenExpiryDate(token: string): Date {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (!decoded?.exp) {
    throw new Error("El token no tiene fecha de expiración");
  }
  return new Date(decoded.exp * 1000);
}
