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

export type DispositivoOrigenInput =
  | { id: string }
  | { identificadorUnico: string; tipo: TipoDispositivo; usuarioId: string; nombre?: string };

/**
 * Resuelve el dispositivo real que generó un cambio cuando este llega
 * relevado (ej. por Bluetooth desde una manipuladora sin señal, reenviado
 * por el dispositivo del coordinador). Si el dispositivo de origen ya
 * tiene id se verifica que exista; si no, se registra en el mismo
 * movimiento (misma idempotencia que `registrarDispositivo`), validando
 * que el usuario que se le atribuye exista de verdad — el dispositivo que
 * releva no puede inventar a nombre de quién se aplicó el cambio.
 */
export async function resolverDispositivoOrigen(
  input: DispositivoOrigenInput,
): Promise<{ dispositivoId: string; usuarioId: string }> {
  if ("id" in input) {
    const dispositivo = await obtenerDispositivoOFallar(input.id);
    if (!dispositivo.usuarioPrincipalId) {
      throw new HttpError(400, "El dispositivo de origen no tiene un usuario asociado");
    }
    return { dispositivoId: dispositivo.id, usuarioId: dispositivo.usuarioPrincipalId };
  }

  const usuarioOrigen = await prisma.usuario.findUnique({ where: { id: input.usuarioId } });
  if (!usuarioOrigen) {
    throw new HttpError(404, "Usuario de origen no encontrado");
  }
  const dispositivo = await registrarDispositivo(input);
  return { dispositivoId: dispositivo.id, usuarioId: input.usuarioId };
}

export async function listarDispositivos(filtros: { usuarioId?: string }) {
  return prisma.dispositivo.findMany({
    where: { usuarioPrincipalId: filtros.usuarioId },
    orderBy: { createdAt: "desc" },
  });
}
