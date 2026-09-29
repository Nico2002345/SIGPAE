import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";

export interface ContextoActor {
  usuarioId?: string;
  dispositivoId?: string;
  ip?: string;
}

/**
 * Registra un evento de auditoría (regla 23 del spec). La tabla `auditoria`
 * nunca se borra ni se edita mediante una operación normal: este módulo no
 * expone ningún endpoint de escritura fuera de este helper, ni ninguno de
 * borrado/edición.
 */
export async function registrarAuditoria(data: {
  accion: string;
  entidad: string;
  entidadId?: string;
  valorAnterior?: Prisma.InputJsonValue;
  valorNuevo?: Prisma.InputJsonValue;
  motivo?: string;
  actor?: ContextoActor;
}) {
  return prisma.auditoria.create({
    data: {
      accion: data.accion,
      entidad: data.entidad,
      entidadId: data.entidadId,
      valorAnterior: data.valorAnterior,
      valorNuevo: data.valorNuevo,
      motivo: data.motivo,
      usuarioId: data.actor?.usuarioId,
      dispositivoId: data.actor?.dispositivoId,
      ip: data.actor?.ip,
    },
  });
}

export async function listarAuditoria(filtros: {
  entidad?: string;
  entidadId?: string;
  usuarioId?: string;
  accion?: string;
  fechaInicio?: Date;
  fechaFin?: Date;
  limite?: number;
}) {
  const limite = Math.min(filtros.limite ?? 100, 500);

  return prisma.auditoria.findMany({
    where: {
      entidad: filtros.entidad,
      entidadId: filtros.entidadId,
      usuarioId: filtros.usuarioId,
      accion: filtros.accion,
      fechaHora:
        filtros.fechaInicio || filtros.fechaFin
          ? { gte: filtros.fechaInicio, lte: filtros.fechaFin }
          : undefined,
    },
    include: { usuario: { select: { id: true, nombreCompleto: true, usuarioLogin: true } } },
    orderBy: { fechaHora: "desc" },
    take: limite,
  });
}
