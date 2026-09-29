import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import * as auditoriaService from "./auditoria.service.js";

export const auditoriaRouter = Router();

auditoriaRouter.use(authenticate, authorize("auditoria.ver"));

const listarAuditoriaSchema = z.object({
  entidad: z.string().min(1).optional(),
  entidadId: z.string().min(1).optional(),
  usuarioId: z.string().uuid().optional(),
  accion: z.string().min(1).optional(),
  fechaInicio: z.coerce.date().optional(),
  fechaFin: z.coerce.date().optional(),
  limite: z.coerce.number().int().positive().max(500).optional(),
});

auditoriaRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = listarAuditoriaSchema.parse(req.query);
    const auditoria = await auditoriaService.listarAuditoria(query);
    res.json({ auditoria });
  }),
);
