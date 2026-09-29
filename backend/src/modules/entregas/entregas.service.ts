import type { TipoEntrega } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { obtenerJornadaOFallar } from "../jornadas/jornadas.service.js";
import { resolverToken } from "../qr/qr.service.js";

const ESTADOS_ESTUDIANTE_HABILITADOS = ["ACTIVO", "PROVISIONAL_PENDIENTE"] as const;

interface DatosComunesEntrega {
  estudianteId: string;
  jornadaId: string;
  tipo: TipoEntrega;
  usuarioId: string;
  dispositivoId?: string;
  sedeId: number;
  institucionId: number;
}

function crearRechazo(datos: DatosComunesEntrega, motivoRechazo: string) {
  return prisma.entrega.create({ data: { ...datos, resultado: "RECHAZADA", motivoRechazo } });
}

/**
 * Implementa las 8 verificaciones de la regla "ENTREGA PAE" del spec.
 * Un intento rechazado NO es un error HTTP: se persiste como Entrega con
 * resultado=RECHAZADA (auditoría + reporte de "intentos rechazados"), igual
 * que una autorizada. Solo un QR inválido/revocado (resuelto antes de
 * llegar aquí) es un error real, porque ahí no hay estudianteId confiable
 * al cual asociar el intento.
 */
export async function registrarEntrega(data: {
  token: string;
  jornadaId: string;
  tipo: TipoEntrega;
  usuarioId: string;
  dispositivoId?: string;
}) {
  const estudiante = await resolverToken(data.token);
  const jornada = await obtenerJornadaOFallar(data.jornadaId);

  const datosComunes: DatosComunesEntrega = {
    estudianteId: estudiante.id,
    jornadaId: data.jornadaId,
    tipo: data.tipo,
    usuarioId: data.usuarioId,
    dispositivoId: data.dispositivoId,
    sedeId: jornada.sedeId,
    institucionId: estudiante.institucionId,
  };

  if (!ESTADOS_ESTUDIANTE_HABILITADOS.includes(estudiante.estado as (typeof ESTADOS_ESTUDIANTE_HABILITADOS)[number])) {
    return crearRechazo(datosComunes, `El estudiante no está activo (estado: ${estudiante.estado})`);
  }

  if (estudiante.sedeId !== jornada.sedeId) {
    return crearRechazo(datosComunes, "El estudiante pertenece a otra sede educativa");
  }

  if (jornada.estado !== "ABIERTA" && jornada.estado !== "EN_ENTREGA") {
    return crearRechazo(datosComunes, "La jornada no está abierta");
  }

  const asistencia = await prisma.asistencia.findUnique({
    where: { estudianteId_jornadaId: { estudianteId: estudiante.id, jornadaId: data.jornadaId } },
  });
  if (!asistencia || asistencia.estado !== "ASISTIO") {
    return crearRechazo(datosComunes, "El estudiante no registra asistencia a clases en la jornada actual");
  }

  const entregaNormalPrevia = await prisma.entrega.findFirst({
    where: { estudianteId: estudiante.id, jornadaId: data.jornadaId, tipo: "NORMAL", resultado: "AUTORIZADA" },
  });

  if (data.tipo === "NORMAL" && entregaNormalPrevia) {
    return crearRechazo(datosComunes, "El estudiante ya recibió su ración normal en esta jornada");
  }
  if (data.tipo === "REDISTRIBUCION" && !entregaNormalPrevia) {
    return crearRechazo(datosComunes, "No hay una entrega normal previa para redistribuir en esta jornada");
  }

  return prisma.entrega.create({
    data: {
      ...datosComunes,
      entregaOriginalId: data.tipo === "REDISTRIBUCION" ? entregaNormalPrevia!.id : undefined,
      resultado: "AUTORIZADA",
    },
  });
}

export async function listarEntregasPorJornada(jornadaId: string) {
  return prisma.entrega.findMany({
    where: { jornadaId },
    include: { estudiante: { select: { id: true, idPae: true, nombres: true, apellidos: true } } },
    orderBy: { fechaHora: "desc" },
  });
}

export async function listarEntregasPorEstudiante(estudianteId: string) {
  return prisma.entrega.findMany({
    where: { estudianteId },
    include: { jornada: { select: { id: true, fecha: true, sedeId: true } } },
    orderBy: { fechaHora: "desc" },
  });
}

export async function resumenJornada(jornadaId: string) {
  const entregas = await prisma.entrega.findMany({ where: { jornadaId, resultado: "AUTORIZADA" } });
  const normales = entregas.filter((e) => e.tipo === "NORMAL");
  const redistribuciones = entregas.filter((e) => e.tipo === "REDISTRIBUCION");

  return {
    beneficiariosAtendidos: new Set(normales.map((e) => e.estudianteId)).size,
    racionesNormales: normales.length,
    redistribuciones: redistribuciones.length,
    totalRacionesEntregadas: normales.length + redistribuciones.length,
  };
}
