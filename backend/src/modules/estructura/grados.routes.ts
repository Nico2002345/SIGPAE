import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import * as gradosService from "./grados.service.js";

export const gradosRouter = Router();

gradosRouter.use(authenticate);

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

const crearGradoSchema = z.object({
  nombre: z.string().min(1),
  nivel: z.number().int(),
});

gradosRouter.post(
  "/",
  authorize("grados.crear"),
  asyncHandler(async (req, res) => {
    const body = crearGradoSchema.parse(req.body);
    const grado = await gradosService.crearGrado(body);
    res.status(201).json({ grado });
  }),
);

const listarGradosSchema = z.object({
  estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
});

gradosRouter.get(
  "/",
  authorize("grados.ver"),
  asyncHandler(async (req, res) => {
    const query = listarGradosSchema.parse(req.query);
    const grados = await gradosService.listarGrados(query);
    res.json({ grados });
  }),
);

const editarGradoSchema = z.object({
  nombre: z.string().min(1).optional(),
  nivel: z.number().int().optional(),
  estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
});

gradosRouter.patch(
  "/:id",
  authorize("grados.editar"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const body = editarGradoSchema.parse(req.body);
    const grado = await gradosService.editarGrado(id, body);
    res.json({ grado });
  }),
);
