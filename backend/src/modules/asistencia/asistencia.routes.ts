import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import * as asistenciaService from "./asistencia.service.js";

export const asistenciaRouter = Router();

asistenciaRouter.use(authenticate);

const idParamSchema = z.object({ id: z.string().uuid() });
const estadoAsistenciaSchema = z.enum(["ASISTIO", "NO_ASISTIO"]);

const registrarAsistenciaSchema = z.object({
  jornadaId: z.string().uuid(),
  estudianteId: z.string().uuid(),
  estado: estadoAsistenciaSchema,
  dispositivoId: z.string().uuid().optional(),
});

asistenciaRouter.post(
  "/",
  authorize("asistencia.registrar"),
  asyncHandler(async (req, res) => {
    const body = registrarAsistenciaSchema.parse(req.body);
    const asistencia = await asistenciaService.registrarAsistencia({ ...body, usuarioId: req.usuario!.id });
    res.status(201).json({ asistencia });
  }),
);

asistenciaRouter.get(
  "/jornada/:id",
  authorize("asistencia.ver"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const asistencias = await asistenciaService.listarAsistenciaPorJornada(id);
    res.json({ asistencias });
  }),
);

asistenciaRouter.get(
  "/estudiante/:id",
  authorize("asistencia.ver"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const asistencias = await asistenciaService.listarAsistenciaPorEstudiante(id);
    res.json({ asistencias });
  }),
);

const solicitarModificacionSchema = z.object({
  valorPropuesto: estadoAsistenciaSchema,
  motivo: z.string().min(1),
});

asistenciaRouter.post(
  "/:id/solicitudes",
  authorize("asistencia.solicitar_modificacion"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const body = solicitarModificacionSchema.parse(req.body);
    const solicitud = await asistenciaService.solicitarModificacion({
      asistenciaId: id,
      valorPropuesto: body.valorPropuesto,
      motivo: body.motivo,
      usuarioSolicitanteId: req.usuario!.id,
    });
    res.status(201).json({ solicitud });
  }),
);

const listarSolicitudesSchema = z.object({
  estado: z.enum(["PENDIENTE", "APROBADA", "RECHAZADA"]).optional(),
});

asistenciaRouter.get(
  "/solicitudes",
  authorize("asistencia.autorizar_modificacion"),
  asyncHandler(async (req, res) => {
    const query = listarSolicitudesSchema.parse(req.query);
    const solicitudes = await asistenciaService.listarSolicitudes(query);
    res.json({ solicitudes });
  }),
);

const resolverSolicitudSchema = z.object({
  aprobar: z.boolean(),
});

asistenciaRouter.post(
  "/solicitudes/:id/resolver",
  authorize("asistencia.autorizar_modificacion"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const body = resolverSolicitudSchema.parse(req.body);
    const solicitud = await asistenciaService.resolverSolicitud(id, body.aprobar, req.usuario!.id);
    res.json({ solicitud });
  }),
);
