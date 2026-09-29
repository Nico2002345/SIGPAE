import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
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

  app.use(errorHandler);

  return app;
}
