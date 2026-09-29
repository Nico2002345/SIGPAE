import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import * as sedesService from "./sedes.service.js";

export const sedesRouter = Router();

sedesRouter.use(authenticate);

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

const crearSedeSchema = z.object({
  nombre: z.string().min(1),
  codigoDaneSede: z.string().min(1),
  institucionId: z.number().int().positive(),
});

sedesRouter.post(
  "/",
  authorize("sedes.crear"),
  asyncHandler(async (req, res) => {
    const body = crearSedeSchema.parse(req.body);
    const sede = await sedesService.crearSede(body);
    res.status(201).json({ sede });
  }),
);

const listarSedesSchema = z.object({
  institucionId: z.coerce.number().int().positive().optional(),
  estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
});

sedesRouter.get(
  "/",
  authorize("sedes.ver"),
  asyncHandler(async (req, res) => {
    const query = listarSedesSchema.parse(req.query);
    const sedes = await sedesService.listarSedes(query);
    res.json({ sedes });
  }),
);

const editarSedeSchema = z.object({
  nombre: z.string().min(1).optional(),
  institucionId: z.number().int().positive().optional(),
  estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
});

sedesRouter.patch(
  "/:id",
  authorize("sedes.editar"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const body = editarSedeSchema.parse(req.body);
    const sede = await sedesService.editarSede(id, body);
    res.json({ sede });
  }),
);
