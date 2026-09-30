import type { Prisma, TipoSincronizacion } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { registrarAsistencia } from "../asistencia/asistencia.service.js";
import { obtenerDispositivoOFallar } from "../dispositivos/dispositivos.service.js";

interface CambioEntrante {
  entidad: string;
  entidadId: string;
  operacion: "INSERT" | "UPDATE";
  payload: unknown;
  timestampLocal: Date;
}

/**
 * Aplica un cambio reutilizando la MISMA lógica de negocio que el endpoint
 * en vivo (regla 21: "no sobrescribir silenciosamente"). Si la jornada ya
 * se cerró o el estudiante ya no está habilitado mientras el dispositivo
 * estaba desconectado, esto lanza el mismo HttpError que lanzaría la
 * llamada en vivo, y el cambio queda marcado CONFLICTO en vez de forzarse.
 */
async function aplicarCambio(cambio: CambioEntrante, usuarioId: string, dispositivoId: string): Promise<void> {
  if (cambio.entidad !== "Asistencia") {
    throw new HttpError(400, `Sincronización no soportada todavía para la entidad "${cambio.entidad}"`);
  }

  const payload = cambio.payload as { estudianteId?: unknown; jornadaId?: unknown; estado?: unknown };
  if (
    typeof payload.estudianteId !== "string" ||
    typeof payload.jornadaId !== "string" ||
    (payload.estado !== "ASISTIO" && payload.estado !== "NO_ASISTIO")
  ) {
    throw new HttpError(400, "Payload de asistencia inválido");
  }

  await registrarAsistencia({
    jornadaId: payload.jornadaId,
    estudianteId: payload.estudianteId,
    estado: payload.estado,
    usuarioId,
    dispositivoId,
  });
}

export async function procesarLote(data: {
  dispositivoId: string;
  usuarioId: string;
  tipo: TipoSincronizacion;
  cambios: CambioEntrante[];
}) {
  await obtenerDispositivoOFallar(data.dispositivoId);

  const fechaInicio = new Date();
  const detalle: { entidadId: string; motivo: string }[] = [];
  let confirmados = 0;
  let conflictos = 0;

  // Se aplican en orden cronológico (más viejo primero): si el mismo
  // estudiante+jornada se corrigió varias veces sin conexión, la corrección
  // más reciente debe ganar, igual que si se hubiera hecho en vivo.
  const cambiosOrdenados = [...data.cambios].sort(
    (a, b) => a.timestampLocal.getTime() - b.timestampLocal.getTime(),
  );

  for (const cambio of cambiosOrdenados) {
    const yaConfirmado = await prisma.colaSincronizacion.findFirst({
      where: { dispositivoId: data.dispositivoId, entidadId: cambio.entidadId, estado: "CONFIRMADO" },
    });
    if (yaConfirmado) {
      // Reintento de un lote ya procesado (ej. se perdió la respuesta):
      // no se vuelve a aplicar, pero cuenta como confirmado para el resumen.
      confirmados += 1;
      continue;
    }

    const registroCola = await prisma.colaSincronizacion.create({
      data: {
        entidad: cambio.entidad,
        entidadId: cambio.entidadId,
        operacion: cambio.operacion,
        payload: cambio.payload as Prisma.InputJsonValue,
        dispositivoId: data.dispositivoId,
        timestampLocal: cambio.timestampLocal,
      },
    });

    try {
      await aplicarCambio(cambio, data.usuarioId, data.dispositivoId);
      await prisma.colaSincronizacion.update({ where: { id: registroCola.id }, data: { estado: "CONFIRMADO" } });
      confirmados += 1;
    } catch (error) {
      const motivo = error instanceof HttpError ? error.message : "Error inesperado al aplicar el cambio";
      await prisma.colaSincronizacion.update({
        where: { id: registroCola.id },
        data: { estado: "CONFLICTO", intentos: { increment: 1 } },
      });
      conflictos += 1;
      detalle.push({ entidadId: cambio.entidadId, motivo });
    }
  }

  const estado = conflictos === 0 ? "EXITOSA" : confirmados === 0 ? "FALLIDA" : "PARCIAL";

  const sincronizacion = await prisma.sincronizacion.create({
    data: {
      dispositivoId: data.dispositivoId,
      usuarioId: data.usuarioId,
      tipo: data.tipo,
      fechaInicio,
      fechaFin: new Date(),
      registrosEnviados: data.cambios.length,
      registrosRecibidos: 0,
      estado,
      detalle: detalle.length > 0 ? (detalle as unknown as Prisma.InputJsonValue) : undefined,
    },
  });

  await prisma.dispositivo.update({
    where: { id: data.dispositivoId },
    data: { ultimaSincronizacion: new Date() },
  });

  return {
    sincronizacion,
    resumen: { total: data.cambios.length, confirmados, conflictos },
    conflictosDetalle: detalle,
  };
}

export async function listarSincronizaciones(filtros: { dispositivoId?: string; usuarioId?: string }) {
  return prisma.sincronizacion.findMany({
    where: { dispositivoId: filtros.dispositivoId, usuarioId: filtros.usuarioId },
    include: {
      dispositivo: { select: { id: true, identificadorUnico: true, tipo: true } },
      usuario: { select: { id: true, nombreCompleto: true } },
    },
    orderBy: { fechaInicio: "desc" },
  });
}
