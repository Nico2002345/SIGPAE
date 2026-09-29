import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import * as gruposService from "./grupos.service.js";

export const gruposRouter = Router();

gruposRouter.use(authenticate);

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
const jornadaEscolarSchema = z.enum(["MANANA", "TARDE", "UNICA", "NOCHE", "FIN_DE_SEMANA"]);

const crearGrupoSchema = z.object({
  sedeId: z.number().int().positive(),
  gradoId: z.number().int().positive(),
  nombre: z.string().min(1),
  jornadaEscolar: jornadaEscolarSchema,
  anioLectivo: z.number().int().min(2000).max(2100),
});

gruposRouter.post(
  "/",
  authorize("grupos.crear"),
  asyncHandler(async (req, res) => {
    const body = crearGrupoSchema.parse(req.body);
    const grupo = await gruposService.crearGrupo(body);
    res.status(201).json({ grupo });
  }),
);

const listarGruposSchema = z.object({
  sedeId: z.coerce.number().int().positive().optional(),
  gradoId: z.coerce.number().int().positive().optional(),
  anioLectivo: z.coerce.number().int().optional(),
  estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
});

gruposRouter.get(
  "/",
  authorize("grupos.ver"),
  asyncHandler(async (req, res) => {
    const query = listarGruposSchema.parse(req.query);
    const grupos = await gruposService.listarGrupos(query);
    res.json({ grupos });
  }),
);

const editarGrupoSchema = z.object({
  nombre: z.string().min(1).optional(),
  jornadaEscolar: jornadaEscolarSchema.optional(),
  estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
});

gruposRouter.patch(
  "/:id",
  authorize("grupos.editar"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const body = editarGrupoSchema.parse(req.body);
    const grupo = await gruposService.editarGrupo(id, body);
    res.json({ grupo });
  }),
);
