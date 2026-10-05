import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import * as importacionSimatService from "./importacionSimat.service.js";

export const importacionesSimatRouter = Router();

importacionesSimatRouter.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

importacionesSimatRouter.post(
  "/",
  authorize("estudiantes.importar"),
  upload.single("archivo"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new HttpError(400, "Debe adjuntar el archivo .xlsx en el campo 'archivo' (multipart/form-data)");
    }
    const importacion = await importacionSimatService.procesarArchivo(req.file.buffer, req.file.originalname, {
      usuarioId: req.usuario!.id,
      ip: req.ip,
    });
    res.status(201).json({ importacion });
  }),
);

importacionesSimatRouter.get(
  "/",
  authorize("estudiantes.importar"),
  asyncHandler(async (_req, res) => {
    const importaciones = await importacionSimatService.listarImportaciones();
    res.json({ importaciones });
  }),
);

const detalleQuerySchema = z.object({
  tipoCambio: z.enum(["NUEVO", "ACTUALIZADO", "RETIRADO", "TRASLADADO", "SIN_CAMBIO", "ERROR"]).optional(),
  limit: z.coerce.number().int().positive().max(500).default(100),
  offset: z.coerce.number().int().nonnegative().default(0),
});

importacionesSimatRouter.get(
  "/:id",
  authorize("estudiantes.importar"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const filtros = detalleQuerySchema.parse(req.query);
    const resultado = await importacionSimatService.obtenerDetalleImportacion(id, filtros);
    res.json(resultado);
  }),
);

importacionesSimatRouter.post(
  "/:id/aplicar",
  authorize("estudiantes.importar"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const importacion = await importacionSimatService.aplicarImportacion(id, {
      usuarioId: req.usuario!.id,
      ip: req.ip,
    });
    res.json({ importacion });
  }),
);

importacionesSimatRouter.post(
  "/:id/descartar",
  authorize("estudiantes.importar"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const importacion = await importacionSimatService.descartarImportacion(id, {
      usuarioId: req.usuario!.id,
      ip: req.ip,
    });
    res.json({ importacion });
  }),
);
