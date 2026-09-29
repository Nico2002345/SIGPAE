import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import * as usuariosService from "./usuarios.service.js";

export const usuariosRouter = Router();

usuariosRouter.use(authenticate);

const crearUsuarioSchema = z.object({
  nombreCompleto: z.string().min(1),
  documento: z.string().min(1).optional(),
  usuarioLogin: z.string().min(3),
  password: z.string().min(8),
  rolId: z.number().int().positive(),
});

usuariosRouter.post(
  "/",
  authorize("usuarios.crear"),
  asyncHandler(async (req, res) => {
    const body = crearUsuarioSchema.parse(req.body);
    const usuario = await usuariosService.crearUsuario(body, { usuarioId: req.usuario!.id, ip: req.ip });
    res.status(201).json({ usuario });
  }),
);

usuariosRouter.get(
  "/",
  authorize("usuarios.ver"),
  asyncHandler(async (_req, res) => {
    const usuarios = await usuariosService.listarUsuarios();
    res.json({ usuarios });
  }),
);

const editarUsuarioSchema = z.object({
  nombreCompleto: z.string().min(1).optional(),
  documento: z.string().min(1).optional(),
});

usuariosRouter.patch(
  "/:id",
  authorize("usuarios.editar"),
  asyncHandler(async (req, res) => {
    const body = editarUsuarioSchema.parse(req.body);
    const usuario = await usuariosService.editarUsuario(req.params.id, body, {
      usuarioId: req.usuario!.id,
      ip: req.ip,
    });
    res.json({ usuario });
  }),
);

const estadoSchema = z.object({
  estado: z.enum(["ACTIVO", "INACTIVO"]),
});

usuariosRouter.patch(
  "/:id/estado",
  authorize("usuarios.desactivar"),
  asyncHandler(async (req, res) => {
    const body = estadoSchema.parse(req.body);
    const usuario = await usuariosService.cambiarEstadoUsuario(req.params.id, body.estado, {
      usuarioId: req.usuario!.id,
      ip: req.ip,
    });
    res.json({ usuario });
  }),
);

const permisoExtraSchema = z.object({
  permisoId: z.number().int().positive(),
  tipo: z.enum(["OTORGADO", "DENEGADO"]),
});

usuariosRouter.put(
  "/:id/permisos-extra",
  authorize("roles.administrar"),
  asyncHandler(async (req, res) => {
    const body = permisoExtraSchema.parse(req.body);
    const permisoExtra = await usuariosService.establecerPermisoExtra(
      req.params.id,
      body.permisoId,
      body.tipo,
      { usuarioId: req.usuario!.id, ip: req.ip },
    );
    res.json({ permisoExtra });
  }),
);
