import type { EstadoUsuario, TipoOverridePermiso } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { hashPassword } from "../auth/password.js";

const usuarioSelect = {
  id: true,
  nombreCompleto: true,
  documento: true,
  usuarioLogin: true,
  estado: true,
  createdAt: true,
  rol: { select: { id: true, nombre: true } },
} as const;

export async function crearUsuario(data: {
  nombreCompleto: string;
  documento?: string;
  usuarioLogin: string;
  password: string;
  rolId: number;
}) {
  const existente = await prisma.usuario.findUnique({ where: { usuarioLogin: data.usuarioLogin } });
  if (existente) {
    throw new HttpError(409, "Ya existe un usuario con ese usuarioLogin");
  }

  const passwordHash = await hashPassword(data.password);

  return prisma.usuario.create({
    data: {
      nombreCompleto: data.nombreCompleto,
      documento: data.documento,
      usuarioLogin: data.usuarioLogin,
      passwordHash,
      rolId: data.rolId,
    },
    select: usuarioSelect,
  });
}

export async function listarUsuarios() {
  return prisma.usuario.findMany({
    select: usuarioSelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function editarUsuario(
  usuarioId: string,
  data: { nombreCompleto?: string; documento?: string },
) {
  return prisma.usuario.update({
    where: { id: usuarioId },
    data,
    select: usuarioSelect,
  });
}

export async function cambiarEstadoUsuario(usuarioId: string, estado: EstadoUsuario) {
  return prisma.usuario.update({
    where: { id: usuarioId },
    data: { estado },
    select: usuarioSelect,
  });
}

export async function establecerPermisoExtra(
  usuarioId: string,
  permisoId: number,
  tipo: TipoOverridePermiso,
) {
  return prisma.usuarioPermisoExtra.upsert({
    where: { usuarioId_permisoId: { usuarioId, permisoId } },
    create: { usuarioId, permisoId, tipo },
    update: { tipo },
  });
}
