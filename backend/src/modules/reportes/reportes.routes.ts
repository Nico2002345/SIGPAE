import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import { enviarComoExcel } from "./excel.js";
import * as reportesService from "./reportes.service.js";

export const reportesRouter = Router();

reportesRouter.use(authenticate, authorize("reportes.ver"));

const formatoSchema = z.object({ formato: z.enum(["json", "excel"]).default("json") });

async function responder(
  res: Parameters<typeof enviarComoExcel>[0],
  nombreReporte: string,
  formato: "json" | "excel",
  filas: Record<string, unknown>[],
) {
  if (formato === "excel") {
    await enviarComoExcel(res, nombreReporte, filas);
    return;
  }
  res.json({ [nombreReporte]: filas });
}

const jornadaQuerySchema = z.object({ jornadaId: z.string().uuid() }).merge(formatoSchema);

reportesRouter.get(
  "/asistencia-diaria",
  asyncHandler(async (req, res) => {
    const { jornadaId, formato } = jornadaQuerySchema.parse(req.query);
    const filas = await reportesService.reporteAsistenciaDiaria(jornadaId);
    await responder(res, "asistencia_diaria", formato, filas);
  }),
);

reportesRouter.get(
  "/inasistencias",
  asyncHandler(async (req, res) => {
    const { jornadaId, formato } = jornadaQuerySchema.parse(req.query);
    const filas = await reportesService.reporteInasistencias(jornadaId);
    await responder(res, "inasistencias", formato, filas);
  }),
);

reportesRouter.get(
  "/entregas",
  asyncHandler(async (req, res) => {
    const { jornadaId, formato } = jornadaQuerySchema.parse(req.query);
    const filas = await reportesService.reporteEntregas(jornadaId);
    await responder(res, "entregas", formato, filas);
  }),
);

reportesRouter.get(
  "/redistribuciones",
  asyncHandler(async (req, res) => {
    const { jornadaId, formato } = jornadaQuerySchema.parse(req.query);
    const filas = await reportesService.reporteRedistribuciones(jornadaId);
    await responder(res, "redistribuciones", formato, filas);
  }),
);

reportesRouter.get(
  "/intentos-rechazados",
  asyncHandler(async (req, res) => {
    const { jornadaId, formato } = jornadaQuerySchema.parse(req.query);
    const filas = await reportesService.reporteIntentosRechazados(jornadaId);
    await responder(res, "intentos_rechazados", formato, filas);
  }),
);

const provisionalesQuerySchema = z
  .object({
    sedeId: z.coerce.number().int().positive().optional(),
    institucionId: z.coerce.number().int().positive().optional(),
    estado: z.enum(["ACTIVO", "RETIRADO", "TRASLADADO", "PROVISIONAL_PENDIENTE", "VINCULADO"]).optional(),
  })
  .merge(formatoSchema);

reportesRouter.get(
  "/estudiantes-provisionales",
  asyncHandler(async (req, res) => {
    const { formato, ...filtros } = provisionalesQuerySchema.parse(req.query);
    const filas = await reportesService.reporteEstudiantesProvisionales(filtros);
    await responder(res, "estudiantes_provisionales", formato, filas);
  }),
);

const trasladosQuerySchema = z
  .object({
    estado: z.enum(["PENDIENTE", "CONFIRMADO"]).optional(),
    institucionId: z.coerce.number().int().positive().optional(),
  })
  .merge(formatoSchema);

reportesRouter.get(
  "/traslados",
  asyncHandler(async (req, res) => {
    const { formato, ...filtros } = trasladosQuerySchema.parse(req.query);
    const filas = await reportesService.reporteTraslados(filtros);
    await responder(res, "traslados", formato, filas);
  }),
);

const novedadesQuerySchema = z
  .object({
    sedeId: z.coerce.number().int().positive().optional(),
    tipo: z.enum(["RETIRO", "TRASLADO_REPORTADO", "OTRO"]).optional(),
    estado: z.enum(["ABIERTA", "CERRADA"]).optional(),
  })
  .merge(formatoSchema);

reportesRouter.get(
  "/novedades",
  asyncHandler(async (req, res) => {
    const { formato, ...filtros } = novedadesQuerySchema.parse(req.query);
    const filas = await reportesService.reporteNovedades(filtros);
    await responder(res, "novedades", formato, filas);
  }),
);

const consolidadoQuerySchema = z
  .object({
    fechaInicio: z.coerce.date().optional(),
    fechaFin: z.coerce.date().optional(),
    sedeId: z.coerce.number().int().positive().optional(),
    institucionId: z.coerce.number().int().positive().optional(),
    zonaId: z.coerce.number().int().positive().optional(),
  })
  .merge(formatoSchema);

reportesRouter.get(
  "/consolidado/sede",
  asyncHandler(async (req, res) => {
    const { formato, ...filtros } = consolidadoQuerySchema.parse(req.query);
    const filas = await reportesService.consolidadoPorSede(filtros);
    await responder(res, "consolidado_por_sede", formato, filas);
  }),
);

reportesRouter.get(
  "/consolidado/institucion",
  asyncHandler(async (req, res) => {
    const { formato, ...filtros } = consolidadoQuerySchema.parse(req.query);
    const filas = await reportesService.consolidadoPorInstitucion(filtros);
    await responder(res, "consolidado_por_institucion", formato, filas);
  }),
);

reportesRouter.get(
  "/consolidado/zona",
  asyncHandler(async (req, res) => {
    const { formato, ...filtros } = consolidadoQuerySchema.parse(req.query);
    const filas = await reportesService.consolidadoPorZona(filtros);
    await responder(res, "consolidado_por_zona", formato, filas);
  }),
);

reportesRouter.get(
  "/consolidado/periodo",
  asyncHandler(async (req, res) => {
    const { formato, ...filtros } = consolidadoQuerySchema.parse(req.query);
    const filas = await reportesService.consolidadoPorPeriodo(filtros);
    await responder(res, "consolidado_por_periodo", formato, filas);
  }),
);
