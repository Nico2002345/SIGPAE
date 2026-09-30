import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import * as dispositivosService from "./dispositivos.service.js";

export const dispositivosRouter = Router();

dispositivosRouter.use(authenticate);

const registrarDispositivoSchema = z.object({
  identificadorUnico: z.string().min(1),
  tipo: z.enum(["ANDROID", "WINDOWS", "WEB"]),
  nombre: z.string().min(1).optional(),
});

dispositivosRouter.post(
  "/registrar",
  asyncHandler(async (req, res) => {
    const body = registrarDispositivoSchema.parse(req.body);
    const dispositivo = await dispositivosService.registrarDispositivo({ ...body, usuarioId: req.usuario!.id });
    res.status(201).json({ dispositivo });
  }),
);

const listarDispositivosSchema = z.object({
  usuarioId: z.string().uuid().optional(),
});

dispositivosRouter.get(
  "/",
  authorize("dispositivos.ver"),
  asyncHandler(async (req, res) => {
    const query = listarDispositivosSchema.parse(req.query);
    const dispositivos = await dispositivosService.listarDispositivos(query);
    res.json({ dispositivos });
  }),
);
