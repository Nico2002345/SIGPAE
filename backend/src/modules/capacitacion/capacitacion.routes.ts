import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import * as capacitacionService from "./capacitacion.service.js";

export const capacitacionRouter = Router();

capacitacionRouter.use(authenticate);

const generarEntornoSchema = z.object({
  cantidadEstudiantes: z.number().int().positive().max(100).optional(),
});

capacitacionRouter.post(
  "/entorno",
  authorize("capacitacion.gestionar"),
  asyncHandler(async (req, res) => {
    const body = generarEntornoSchema.parse(req.body);
    const entorno = await capacitacionService.generarEntorno(req.usuario!.id, body.cantidadEstudiantes);
    res.status(201).json({ entorno });
  }),
);

const institucionIdParamSchema = z.object({ institucionId: z.coerce.number().int().positive() });

capacitacionRouter.delete(
  "/entorno/:institucionId",
  authorize("capacitacion.gestionar"),
  asyncHandler(async (req, res) => {
    const { institucionId } = institucionIdParamSchema.parse(req.params);
    await capacitacionService.purgarEntorno(institucionId);
    res.status(204).send();
  }),
);

const crearEscenarioSchema = z.object({
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  descripcion: z.string().min(1).optional(),
});

capacitacionRouter.post(
  "/escenarios",
  authorize("capacitacion.gestionar"),
  asyncHandler(async (req, res) => {
    const body = crearEscenarioSchema.parse(req.body);
    const escenario = await capacitacionService.crearEscenario(body);
    res.status(201).json({ escenario });
  }),
);

const listarEscenariosSchema = z.object({
  estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
});

capacitacionRouter.get(
  "/escenarios",
  authorize("capacitacion.ver"),
  asyncHandler(async (req, res) => {
    const query = listarEscenariosSchema.parse(req.query);
    const escenarios = await capacitacionService.listarEscenarios(query);
    res.json({ escenarios });
  }),
);

const registrarEvaluacionSchema = z.object({
  escenarioId: z.number().int().positive(),
  usuarioId: z.string().uuid(),
  resultado: z.enum(["APROBADO", "REPROBADO"]),
  observaciones: z.string().min(1).optional(),
});

capacitacionRouter.post(
  "/evaluaciones",
  authorize("capacitacion.evaluar"),
  asyncHandler(async (req, res) => {
    const body = registrarEvaluacionSchema.parse(req.body);
    const evaluacion = await capacitacionService.registrarEvaluacion(body);
    res.status(201).json({ evaluacion });
  }),
);

const listarEvaluacionesSchema = z.object({
  usuarioId: z.string().uuid().optional(),
  escenarioId: z.coerce.number().int().positive().optional(),
});

capacitacionRouter.get(
  "/evaluaciones",
  authorize("capacitacion.ver"),
  asyncHandler(async (req, res) => {
    const query = listarEvaluacionesSchema.parse(req.query);
    const evaluaciones = await capacitacionService.listarEvaluaciones(query);
    res.json({ evaluaciones });
  }),
);
