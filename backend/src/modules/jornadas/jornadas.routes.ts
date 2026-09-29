import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import * as jornadasService from "./jornadas.service.js";

export const jornadasRouter = Router();

jornadasRouter.use(authenticate);

const idParamSchema = z.object({ id: z.string().uuid() });

const abrirJornadaSchema = z.object({
  sedeId: z.number().int().positive(),
  fecha: z.coerce.date(),
});

jornadasRouter.post(
  "/abrir",
  authorize("jornadas.gestionar"),
  asyncHandler(async (req, res) => {
    const body = abrirJornadaSchema.parse(req.body);
    const jornada = await jornadasService.abrirJornada(body.sedeId, body.fecha, req.usuario!.id);
    res.status(201).json({ jornada });
  }),
);

jornadasRouter.post(
  "/:id/iniciar-entrega",
  authorize("jornadas.gestionar"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const jornada = await jornadasService.iniciarEntrega(id);
    res.json({ jornada });
  }),
);

jornadasRouter.post(
  "/:id/cerrar",
  authorize("jornadas.gestionar"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const jornada = await jornadasService.cerrarJornada(id, req.usuario!.id);
    res.json({ jornada });
  }),
);

const listarJornadasSchema = z.object({
  sedeId: z.coerce.number().int().positive().optional(),
  fecha: z.coerce.date().optional(),
  estado: z.enum(["NO_INICIADA", "ABIERTA", "EN_ENTREGA", "CERRADA", "SINCRONIZANDO", "SINCRONIZADA"]).optional(),
  esCapacitacion: z.coerce.boolean().optional(),
});

jornadasRouter.get(
  "/",
  authorize("jornadas.ver"),
  asyncHandler(async (req, res) => {
    const query = listarJornadasSchema.parse(req.query);
    const jornadas = await jornadasService.listarJornadas(query);
    res.json({ jornadas });
  }),
);

jornadasRouter.get(
  "/:id",
  authorize("jornadas.ver"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const jornada = await jornadasService.obtenerJornadaOFallar(id);
    res.json({ jornada });
  }),
);
