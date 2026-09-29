import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import * as authService from "./auth.service.js";
import { authenticate } from "./auth.middleware.js";

export const authRouter = Router();

const loginSchema = z.object({
  usuarioLogin: z.string().min(1),
  password: z.string().min(1),
  dispositivoId: z.string().uuid().optional(),
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const resultado = await authService.login(body.usuarioLogin, body.password, body.dispositivoId);
    res.json(resultado);
  }),
);

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const body = refreshSchema.parse(req.body);
    const resultado = await authService.refresh(body.refreshToken);
    res.json(resultado);
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const body = refreshSchema.parse(req.body);
    await authService.logout(body.refreshToken);
    res.status(204).send();
  }),
);

authRouter.get("/me", authenticate, (req, res) => {
  res.json({ usuario: req.usuario });
});
