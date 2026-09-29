import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import * as qrService from "./qr.service.js";

export const qrRouter = Router();

qrRouter.use(authenticate);

const estudianteIdParamSchema = z.object({ estudianteId: z.string().uuid() });

qrRouter.post(
  "/estudiantes/:estudianteId",
  authorize("qr.generar"),
  asyncHandler(async (req, res) => {
    const { estudianteId } = estudianteIdParamSchema.parse(req.params);
    const qr = await qrService.generarQr(estudianteId, { usuarioId: req.usuario!.id, ip: req.ip });
    res.status(201).json({ qr });
  }),
);

qrRouter.post(
  "/estudiantes/:estudianteId/reemitir",
  authorize("qr.generar"),
  asyncHandler(async (req, res) => {
    const { estudianteId } = estudianteIdParamSchema.parse(req.params);
    const qr = await qrService.reemitirQr(estudianteId, { usuarioId: req.usuario!.id, ip: req.ip });
    res.json({ qr });
  }),
);

qrRouter.post(
  "/estudiantes/:estudianteId/revocar",
  authorize("qr.generar"),
  asyncHandler(async (req, res) => {
    const { estudianteId } = estudianteIdParamSchema.parse(req.params);
    const qr = await qrService.revocarQr(estudianteId, { usuarioId: req.usuario!.id, ip: req.ip });
    res.json({ qr });
  }),
);

qrRouter.get(
  "/estudiantes/:estudianteId",
  authorize("qr.ver"),
  asyncHandler(async (req, res) => {
    const { estudianteId } = estudianteIdParamSchema.parse(req.params);
    const qr = await qrService.obtenerQrDeEstudiante(estudianteId);
    res.json({ qr });
  }),
);

qrRouter.get(
  "/estudiantes/:estudianteId/imagen",
  authorize("qr.ver"),
  asyncHandler(async (req, res) => {
    const { estudianteId } = estudianteIdParamSchema.parse(req.params);
    const imagenDataUrl = await qrService.generarImagenQr(estudianteId);
    res.json({ imagenDataUrl });
  }),
);

const resolverQuerySchema = z.object({ token: z.string().min(1) });

qrRouter.get(
  "/resolver",
  authorize("qr.escanear"),
  asyncHandler(async (req, res) => {
    const { token } = resolverQuerySchema.parse(req.query);
    const estudiante = await qrService.resolverToken(token);
    res.json({ estudiante });
  }),
);
