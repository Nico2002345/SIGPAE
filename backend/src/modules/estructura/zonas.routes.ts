import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import * as zonasService from "./zonas.service.js";

export const zonasRouter = Router();

zonasRouter.use(authenticate);

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

const crearZonaSchema = z.object({
  nombre: z.string().min(1),
});

zonasRouter.post(
  "/",
  authorize("zonas.crear"),
  asyncHandler(async (req, res) => {
    const body = crearZonaSchema.parse(req.body);
    const zona = await zonasService.crearZona(body);
    res.status(201).json({ zona });
  }),
);

const listarZonasSchema = z.object({
  estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
});

zonasRouter.get(
  "/",
  authorize("zonas.ver"),
  asyncHandler(async (req, res) => {
    const query = listarZonasSchema.parse(req.query);
    const zonas = await zonasService.listarZonas(query);
    res.json({ zonas });
  }),
);

const editarZonaSchema = z.object({
  nombre: z.string().min(1).optional(),
  estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
});

zonasRouter.patch(
  "/:id",
  authorize("zonas.editar"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const body = editarZonaSchema.parse(req.body);
    const zona = await zonasService.editarZona(id, body);
    res.json({ zona });
  }),
);
