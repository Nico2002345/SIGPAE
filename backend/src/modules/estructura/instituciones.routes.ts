import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import * as institucionesService from "./instituciones.service.js";

export const institucionesRouter = Router();

institucionesRouter.use(authenticate);

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

const crearInstitucionSchema = z.object({
  nombre: z.string().min(1),
  codigoDane: z.string().min(1),
  zonaId: z.number().int().positive(),
});

institucionesRouter.post(
  "/",
  authorize("instituciones.crear"),
  asyncHandler(async (req, res) => {
    const body = crearInstitucionSchema.parse(req.body);
    const institucion = await institucionesService.crearInstitucion(body);
    res.status(201).json({ institucion });
  }),
);

const listarInstitucionesSchema = z.object({
  zonaId: z.coerce.number().int().positive().optional(),
  estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
});

institucionesRouter.get(
  "/",
  authorize("instituciones.ver"),
  asyncHandler(async (req, res) => {
    const query = listarInstitucionesSchema.parse(req.query);
    const instituciones = await institucionesService.listarInstituciones(query);
    res.json({ instituciones });
  }),
);

const editarInstitucionSchema = z.object({
  nombre: z.string().min(1).optional(),
  zonaId: z.number().int().positive().optional(),
  estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
});

institucionesRouter.patch(
  "/:id",
  authorize("instituciones.editar"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const body = editarInstitucionSchema.parse(req.body);
    const institucion = await institucionesService.editarInstitucion(id, body);
    res.json({ institucion });
  }),
);
