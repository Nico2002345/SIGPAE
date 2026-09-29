import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Datos inválidos", detalles: err.issues });
    return;
  }

  const status = err instanceof HttpError ? err.status : 500;
  const message = err instanceof Error ? err.message : "Error interno del servidor";

  if (status === 500) {
    console.error(err);
  }

  res.status(status).json({ error: message });
}
