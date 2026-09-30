import type { TipoDispositivo } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";

/**
 * Registra o actualiza un dispositivo por su identificador único (regla 21
 * del spec: cada evento de sincronización debe poder atribuirse a un
 * dispositivo). Es idempotente a propósito: la app llama esto en cada
 * arranque, no solo la primera vez.
 */
export async function registrarDispositivo(data: {
  identificadorUnico: string;
  tipo: TipoDispositivo;
  nombre?: string;
  usuarioId: string;
}) {
  return prisma.dispositivo.upsert({
    where: { identificadorUnico: data.identificadorUnico },
    create: {
      identificadorUnico: data.identificadorUnico,
      tipo: data.tipo,
      nombre: data.nombre,
      usuarioPrincipalId: data.usuarioId,
    },
    update: {
      usuarioPrincipalId: data.usuarioId,
      nombre: data.nombre,
      estado: "ACTIVO",
    },
  });
}

export async function obtenerDispositivoOFallar(id: string) {
  const dispositivo = await prisma.dispositivo.findUnique({ where: { id } });
  if (!dispositivo) {
    throw new HttpError(404, "Dispositivo no encontrado");
  }
  return dispositivo;
}

export async function listarDispositivos(filtros: { usuarioId?: string }) {
  return prisma.dispositivo.findMany({
    where: { usuarioPrincipalId: filtros.usuarioId },
    orderBy: { createdAt: "desc" },
  });
}
