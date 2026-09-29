import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { asistenciaRouter } from "./modules/asistencia/asistencia.routes.js";
import { auditoriaRouter } from "./modules/auditoria/auditoria.routes.js";
import { capacitacionRouter } from "./modules/capacitacion/capacitacion.routes.js";
import { entregasRouter } from "./modules/entregas/entregas.routes.js";
import { estudiantesRouter } from "./modules/estudiantes/estudiantes.routes.js";
import { gradosRouter } from "./modules/estructura/grados.routes.js";
import { jornadasRouter } from "./modules/jornadas/jornadas.routes.js";
import { gruposRouter } from "./modules/estructura/grupos.routes.js";
import { institucionesRouter } from "./modules/estructura/instituciones.routes.js";
import { sedesRouter } from "./modules/estructura/sedes.routes.js";
import { zonasRouter } from "./modules/estructura/zonas.routes.js";
import { qrRouter } from "./modules/qr/qr.routes.js";
import { reportesRouter } from "./modules/reportes/reportes.routes.js";
import { usuariosRouter } from "./modules/usuarios/usuarios.routes.js";

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRouter);
  app.use("/usuarios", usuariosRouter);
  app.use("/zonas", zonasRouter);
  app.use("/instituciones", institucionesRouter);
  app.use("/sedes", sedesRouter);
  app.use("/grados", gradosRouter);
  app.use("/grupos", gruposRouter);
  app.use("/estudiantes", estudiantesRouter);
  app.use("/qr", qrRouter);
  app.use("/jornadas", jornadasRouter);
  app.use("/asistencia", asistenciaRouter);
  app.use("/entregas", entregasRouter);
  app.use("/reportes", reportesRouter);
  app.use("/auditoria", auditoriaRouter);
  app.use("/capacitacion", capacitacionRouter);

  app.use(errorHandler);

  return app;
}
