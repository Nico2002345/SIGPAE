import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import * as estudiantesService from "./estudiantes.service.js";

export const estudiantesRouter = Router();

estudiantesRouter.use(authenticate);

const idParamSchema = z.object({ id: z.string().uuid() });
const estadoEstudianteSchema = z.enum(["ACTIVO", "RETIRADO", "TRASLADADO", "PROVISIONAL_PENDIENTE", "VINCULADO"]);

const ubicacionSchema = {
  sedeId: z.number().int().positive(),
  institucionId: z.number().int().positive(),
  gradoId: z.number().int().positive().optional(),
  grupoId: z.number().int().positive().optional(),
};

const datosPersonalesSchema = {
  nombres: z.string().min(1),
  apellidos: z.string().min(1),
  fechaNacimiento: z.coerce.date().optional(),
  genero: z.string().min(1).optional(),
};

const crearOficialSchema = z.object({
  idPae: z.string().regex(/^PAE-\d{4}-\d{6}$/, "El id_pae debe tener el formato PAE-AAAA-NNNNNN"),
  documentoTipo: z.string().min(1).optional(),
  documentoNumero: z.string().min(1).optional(),
  ...datosPersonalesSchema,
  ...ubicacionSchema,
});

estudiantesRouter.post(
  "/",
  authorize("estudiantes.crear"),
  asyncHandler(async (req, res) => {
    const body = crearOficialSchema.parse(req.body);
    const estudiante = await estudiantesService.crearEstudianteOficial(body);
    res.status(201).json({ estudiante });
  }),
);

const crearProvisionalSchema = z.object({
  ...datosPersonalesSchema,
  ...ubicacionSchema,
});

estudiantesRouter.post(
  "/provisionales",
  authorize("estudiantes.crear_provisional"),
  asyncHandler(async (req, res) => {
    const body = crearProvisionalSchema.parse(req.body);
    const estudiante = await estudiantesService.crearEstudianteProvisional(body);
    res.status(201).json({ estudiante });
  }),
);

const listarEstudiantesSchema = z.object({
  sedeId: z.coerce.number().int().positive().optional(),
  institucionId: z.coerce.number().int().positive().optional(),
  gradoId: z.coerce.number().int().positive().optional(),
  grupoId: z.coerce.number().int().positive().optional(),
  estado: estadoEstudianteSchema.optional(),
  busqueda: z.string().min(1).optional(),
});

estudiantesRouter.get(
  "/",
  authorize("estudiantes.ver"),
  asyncHandler(async (req, res) => {
    const query = listarEstudiantesSchema.parse(req.query);
    const estudiantes = await estudiantesService.listarEstudiantes(query);
    res.json({ estudiantes });
  }),
);

estudiantesRouter.get(
  "/:id",
  authorize("estudiantes.ver"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const estudiante = await estudiantesService.obtenerDetalleEstudiante(id);
    res.json({ estudiante });
  }),
);

const editarEstudianteSchema = z.object({
  nombres: z.string().min(1).optional(),
  apellidos: z.string().min(1).optional(),
  fechaNacimiento: z.coerce.date().optional(),
  documentoTipo: z.string().min(1).optional(),
  documentoNumero: z.string().min(1).optional(),
  genero: z.string().min(1).optional(),
  gradoId: z.number().int().positive().nullable().optional(),
  grupoId: z.number().int().positive().nullable().optional(),
});

estudiantesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const permisos = req.usuario!.permisos;
    const puedeEditarTodo = permisos.includes("estudiantes.editar");
    const puedeEditarProvisional = permisos.includes("estudiantes.editar_provisional");
    if (!puedeEditarTodo && !puedeEditarProvisional) {
      throw new HttpError(403, "No tiene permiso para editar estudiantes");
    }

    const { id } = idParamSchema.parse(req.params);
    const body = editarEstudianteSchema.parse(req.body);
    const estudiante = await estudiantesService.editarEstudiante(id, req.usuario!.id, body, {
      soloProvisional: !puedeEditarTodo,
    });
    res.json({ estudiante });
  }),
);

const retirarEstudianteSchema = z.object({
  descripcion: z.string().min(1),
});

estudiantesRouter.post(
  "/:id/retirar",
  authorize("estudiantes.retirar"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const body = retirarEstudianteSchema.parse(req.body);
    const estudiante = await estudiantesService.retirarEstudiante(id, req.usuario!.id, body.descripcion);
    res.json({ estudiante });
  }),
);

const vincularSchema = z.object({
  estudianteOficialId: z.string().uuid(),
});

estudiantesRouter.post(
  "/:id/vincular-oficial",
  authorize("estudiantes.vincular"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const body = vincularSchema.parse(req.body);
    const vinculacion = await estudiantesService.vincularProvisionalConOficial(
      id,
      body.estudianteOficialId,
      req.usuario!.id,
    );
    res.status(201).json({ vinculacion });
  }),
);
