import { Router } from "express";
import { prisma } from "../../config/prisma.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { authenticate, authorize } from "../auth/auth.middleware.js";

export const rolesRouter = Router();

rolesRouter.use(authenticate);

rolesRouter.get(
  "/",
  authorize("usuarios.crear"),
  asyncHandler(async (_req, res) => {
    const roles = await prisma.rol.findMany({
      select: { id: true, nombre: true, descripcion: true },
      orderBy: { id: "asc" },
    });
    res.json({ roles });
  }),
);
