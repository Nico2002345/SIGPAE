import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../../middleware/errorHandler.js";
import { verifyAccessToken } from "./tokens.js";

export interface UsuarioAutenticado {
  id: string;
  rol: string;
  permisos: string[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new HttpError(401, "Token de acceso requerido");
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.usuario = { id: payload.sub, rol: payload.rol, permisos: payload.permisos };
    next();
  } catch {
    throw new HttpError(401, "Token de acceso inválido o expirado");
  }
}

export function authorize(permisoRequerido: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.usuario?.permisos.includes(permisoRequerido)) {
      throw new HttpError(403, "No tiene permiso para realizar esta acción");
    }
    next();
  };
}
