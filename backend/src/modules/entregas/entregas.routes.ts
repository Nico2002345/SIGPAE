import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import * as entregasService from "./entregas.service.js";

export const entregasRouter = Router();

entregasRouter.use(authenticate);

const idParamSchema = z.object({ id: z.string().uuid() });

const registrarEntregaSchema = z.object({
  token: z.string().min(1),
  jornadaId: z.string().uuid(),
  tipo: z.enum(["NORMAL", "REDISTRIBUCION"]).default("NORMAL"),
  dispositivoId: z.string().uuid().optional(),
});

entregasRouter.post(
  "/",
  authorize("entregas.registrar"),
  asyncHandler(async (req, res) => {
    const body = registrarEntregaSchema.parse(req.body);
    const entrega = await entregasService.registrarEntrega({ ...body, usuarioId: req.usuario!.id });
    res.status(201).json({ entrega });
  }),
);

entregasRouter.get(
  "/jornada/:id",
  authorize("entregas.ver"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const entregas = await entregasService.listarEntregasPorJornada(id);
    res.json({ entregas });
  }),
);

entregasRouter.get(
  "/jornada/:id/resumen",
  authorize("entregas.ver"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const resumen = await entregasService.resumenJornada(id);
    res.json({ resumen });
  }),
);

entregasRouter.get(
  "/estudiante/:id",
  authorize("entregas.ver"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const entregas = await entregasService.listarEntregasPorEstudiante(id);
    res.json({ entregas });
  }),
);
