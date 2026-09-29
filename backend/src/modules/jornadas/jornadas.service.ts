import type { EstadoJornada } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { obtenerSedeOFallar } from "../estructura/sedes.service.js";

// Máquina de estados de la jornada PAE (regla 8 del spec): mientras está
// ABIERTA o EN_ENTREGA, docentes/operadores pueden registrar asistencia y
// entregas; al cerrarla se consolida y se restringen las modificaciones
// directas. SINCRONIZANDO/SINCRONIZADA las maneja el motor de sincronización
// offline de fases futuras, pero la transición ya queda modelada aquí.
const TRANSICIONES: Record<EstadoJornada, EstadoJornada[]> = {
  NO_INICIADA: ["ABIERTA"],
  ABIERTA: ["EN_ENTREGA", "CERRADA"],
  EN_ENTREGA: ["CERRADA"],
  CERRADA: ["SINCRONIZANDO"],
  SINCRONIZANDO: ["SINCRONIZADA", "CERRADA"],
  SINCRONIZADA: [],
};

function normalizarFecha(fecha: Date): Date {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
}

async function transicionar(id: string, destino: EstadoJornada, cambios: Record<string, unknown> = {}) {
  const actual = await obtenerJornadaOFallar(id);
  if (!TRANSICIONES[actual.estado].includes(destino)) {
    throw new HttpError(409, `No se puede pasar la jornada de ${actual.estado} a ${destino}`);
  }

  return prisma.jornadaPae.update({ where: { id }, data: { estado: destino, ...cambios } });
}

export async function abrirJornada(sedeId: number, fecha: Date, usuarioId: string) {
  await obtenerSedeOFallar(sedeId);
  const fechaNormalizada = normalizarFecha(fecha);

  const existente = await prisma.jornadaPae.findUnique({
    where: { sedeId_fecha: { sedeId, fecha: fechaNormalizada } },
  });

  if (!existente) {
    return prisma.jornadaPae.create({
      data: {
        sedeId,
        fecha: fechaNormalizada,
        estado: "ABIERTA",
        usuarioAperturaId: usuarioId,
        horaApertura: new Date(),
      },
    });
  }

  if (existente.estado !== "NO_INICIADA") {
    throw new HttpError(409, `La jornada de esa sede y fecha ya está en estado ${existente.estado}`);
  }

  return prisma.jornadaPae.update({
    where: { id: existente.id },
    data: { estado: "ABIERTA", usuarioAperturaId: usuarioId, horaApertura: new Date() },
  });
}

export async function iniciarEntrega(id: string) {
  return transicionar(id, "EN_ENTREGA");
}

export async function cerrarJornada(id: string, usuarioId: string) {
  const actual = await obtenerJornadaOFallar(id);
  if (!TRANSICIONES[actual.estado].includes("CERRADA")) {
    throw new HttpError(409, `No se puede pasar la jornada de ${actual.estado} a CERRADA`);
  }

  // Regla 7 del spec: al cerrar la jornada, la asistencia queda bloqueada
  // para modificación directa; cualquier cambio posterior exige el flujo
  // de solicitud/autorización del módulo de asistencia.
  return prisma.$transaction(async (tx) => {
    const jornada = await tx.jornadaPae.update({
      where: { id },
      data: { estado: "CERRADA", usuarioCierreId: usuarioId, horaCierre: new Date() },
    });
    await tx.asistencia.updateMany({
      where: { jornadaId: id, bloqueada: false },
      data: { bloqueada: true },
    });
    return jornada;
  });
}

export async function marcarSincronizando(id: string) {
  return transicionar(id, "SINCRONIZANDO");
}

export async function marcarSincronizada(id: string) {
  return transicionar(id, "SINCRONIZADA");
}

export async function listarJornadas(filtros: { sedeId?: number; fecha?: Date; estado?: EstadoJornada }) {
  return prisma.jornadaPae.findMany({
    where: {
      sedeId: filtros.sedeId,
      fecha: filtros.fecha ? normalizarFecha(filtros.fecha) : undefined,
      estado: filtros.estado,
    },
    include: { sede: { select: { id: true, nombre: true } } },
    orderBy: { fecha: "desc" },
  });
}

export async function obtenerJornadaOFallar(id: string) {
  const jornada = await prisma.jornadaPae.findUnique({ where: { id } });
  if (!jornada) {
    throw new HttpError(404, "Jornada PAE no encontrada");
  }
  return jornada;
}

export async function verificarJornadaAbierta(id: string) {
  const jornada = await obtenerJornadaOFallar(id);
  if (jornada.estado !== "ABIERTA" && jornada.estado !== "EN_ENTREGA") {
    throw new HttpError(409, "La jornada no está abierta; no se pueden registrar cambios");
  }
  return jornada;
}
