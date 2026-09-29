import type { EstadoUsuario, TipoOverridePermiso } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import type { ContextoActor } from "../auditoria/auditoria.service.js";
import { registrarAuditoria } from "../auditoria/auditoria.service.js";
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

export async function crearUsuario(
  data: {
    nombreCompleto: string;
    documento?: string;
    usuarioLogin: string;
    password: string;
    rolId: number;
  },
  actor: ContextoActor,
) {
  const existente = await prisma.usuario.findUnique({ where: { usuarioLogin: data.usuarioLogin } });
  if (existente) {
    throw new HttpError(409, "Ya existe un usuario con ese usuarioLogin");
  }

  const passwordHash = await hashPassword(data.password);

  const usuario = await prisma.usuario.create({
    data: {
      nombreCompleto: data.nombreCompleto,
      documento: data.documento,
      usuarioLogin: data.usuarioLogin,
      passwordHash,
      rolId: data.rolId,
    },
    select: usuarioSelect,
  });

  // Nunca se registra passwordHash en la auditoría: valorNuevo solo incluye
  // los campos no sensibles del usuario creado.
  await registrarAuditoria({
    accion: "usuario.crear",
    entidad: "Usuario",
    entidadId: usuario.id,
    valorNuevo: { ...usuario, createdAt: usuario.createdAt.toISOString() },
    actor,
  });

  return usuario;
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
  actor: ContextoActor,
) {
  const anterior = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: usuarioSelect });
  if (!anterior) {
    throw new HttpError(404, "Usuario no encontrado");
  }

  const usuario = await prisma.usuario.update({
    where: { id: usuarioId },
    data,
    select: usuarioSelect,
  });

  await registrarAuditoria({
    accion: "usuario.editar",
    entidad: "Usuario",
    entidadId: usuarioId,
    valorAnterior: { nombreCompleto: anterior.nombreCompleto, documento: anterior.documento },
    valorNuevo: { nombreCompleto: usuario.nombreCompleto, documento: usuario.documento },
    actor,
  });

  return usuario;
}

export async function cambiarEstadoUsuario(usuarioId: string, estado: EstadoUsuario, actor: ContextoActor) {
  const anterior = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: usuarioSelect });
  if (!anterior) {
    throw new HttpError(404, "Usuario no encontrado");
  }

  const usuario = await prisma.usuario.update({
    where: { id: usuarioId },
    data: { estado },
    select: usuarioSelect,
  });

  await registrarAuditoria({
    accion: "usuario.cambiar_estado",
    entidad: "Usuario",
    entidadId: usuarioId,
    valorAnterior: { estado: anterior.estado },
    valorNuevo: { estado: usuario.estado },
    actor,
  });

  return usuario;
}

export async function establecerPermisoExtra(
  usuarioId: string,
  permisoId: number,
  tipo: TipoOverridePermiso,
  actor: ContextoActor,
) {
  const anterior = await prisma.usuarioPermisoExtra.findUnique({
    where: { usuarioId_permisoId: { usuarioId, permisoId } },
  });

  const permisoExtra = await prisma.usuarioPermisoExtra.upsert({
    where: { usuarioId_permisoId: { usuarioId, permisoId } },
    create: { usuarioId, permisoId, tipo },
    update: { tipo },
  });

  await registrarAuditoria({
    accion: "usuario.permiso_extra",
    entidad: "Usuario",
    entidadId: usuarioId,
    valorAnterior: anterior ? { permisoId: anterior.permisoId, tipo: anterior.tipo } : undefined,
    valorNuevo: { permisoId, tipo },
    actor,
  });

  return permisoExtra;
}
