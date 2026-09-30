import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import * as sincronizacionService from "./sincronizacion.service.js";

export const sincronizacionRouter = Router();

sincronizacionRouter.use(authenticate);

const cambioSchema = z.object({
  entidad: z.string().min(1),
  entidadId: z.string().min(1),
  operacion: z.enum(["INSERT", "UPDATE"]),
  payload: z.unknown(),
  timestampLocal: z.coerce.date(),
});

const dispositivoOrigenSchema = z.union([
  z.object({ id: z.string().uuid() }),
  z.object({
    identificadorUnico: z.string().min(1),
    tipo: z.enum(["ANDROID", "WINDOWS", "WEB"]),
    usuarioId: z.string().uuid(),
    nombre: z.string().min(1).optional(),
  }),
]);

const procesarLoteSchema = z
  .object({
    dispositivoId: z.string().uuid(),
    tipo: z.enum(["INTERNET", "BLUETOOTH"]),
    dispositivoOrigen: dispositivoOrigenSchema.optional(),
    cambios: z.array(cambioSchema).min(1).max(500),
  })
  .refine((data) => data.tipo !== "BLUETOOTH" || data.dispositivoOrigen !== undefined, {
    message: "dispositivoOrigen es obligatorio cuando tipo es BLUETOOTH",
    path: ["dispositivoOrigen"],
  });

sincronizacionRouter.post(
  "/lote",
  authorize("sincronizacion.registrar"),
  asyncHandler(async (req, res) => {
    const body = procesarLoteSchema.parse(req.body);
    const resultado = await sincronizacionService.procesarLote({ ...body, usuarioId: req.usuario!.id });
    res.status(201).json(resultado);
  }),
);

const listarSincronizacionesSchema = z.object({
  dispositivoId: z.string().uuid().optional(),
  usuarioId: z.string().uuid().optional(),
});

sincronizacionRouter.get(
  "/",
  authorize("sincronizacion.ver"),
  asyncHandler(async (req, res) => {
    const query = listarSincronizacionesSchema.parse(req.query);
    const sincronizaciones = await sincronizacionService.listarSincronizaciones(query);
    res.json({ sincronizaciones });
  }),
);
