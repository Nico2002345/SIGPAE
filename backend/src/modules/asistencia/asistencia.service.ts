import type { EstadoAsistencia } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { obtenerEstudianteOFallar } from "../estudiantes/estudiantes.service.js";
import { verificarJornadaAbierta } from "../jornadas/jornadas.service.js";

const ESTADOS_ESTUDIANTE_HABILITADOS = ["ACTIVO", "PROVISIONAL_PENDIENTE"] as const;

export async function registrarAsistencia(data: {
  jornadaId: string;
  estudianteId: string;
  estado: EstadoAsistencia;
  usuarioId: string;
  dispositivoId?: string;
}) {
  const jornada = await verificarJornadaAbierta(data.jornadaId);
  const estudiante = await obtenerEstudianteOFallar(data.estudianteId);

  if (estudiante.sedeId !== jornada.sedeId) {
    throw new HttpError(400, "El estudiante no pertenece a la sede de esta jornada");
  }
  if (!ESTADOS_ESTUDIANTE_HABILITADOS.includes(estudiante.estado as (typeof ESTADOS_ESTUDIANTE_HABILITADOS)[number])) {
    throw new HttpError(400, "El estudiante no está activo, no se puede registrar su asistencia");
  }

  const existente = await prisma.asistencia.findUnique({
    where: { estudianteId_jornadaId: { estudianteId: data.estudianteId, jornadaId: data.jornadaId } },
  });

  if (existente) {
    if (existente.bloqueada) {
      throw new HttpError(
        409,
        "La asistencia de este estudiante ya fue cerrada; use el mecanismo de solicitud de modificación",
      );
    }
    return prisma.asistencia.update({
      where: { id: existente.id },
      data: {
        estado: data.estado,
        usuarioId: data.usuarioId,
        dispositivoId: data.dispositivoId,
        fechaHoraRegistro: new Date(),
      },
    });
  }

  return prisma.asistencia.create({
    data: {
      jornadaId: data.jornadaId,
      estudianteId: data.estudianteId,
      estado: data.estado,
      usuarioId: data.usuarioId,
      dispositivoId: data.dispositivoId,
    },
  });
}

export async function listarAsistenciaPorJornada(jornadaId: string) {
  return prisma.asistencia.findMany({
    where: { jornadaId },
    include: {
      estudiante: { select: { id: true, idPae: true, nombres: true, apellidos: true } },
    },
    orderBy: { fechaHoraRegistro: "desc" },
  });
}

export async function listarAsistenciaPorEstudiante(estudianteId: string) {
  return prisma.asistencia.findMany({
    where: { estudianteId },
    include: { jornada: { select: { id: true, fecha: true, sedeId: true, estado: true } } },
    orderBy: { fechaHoraRegistro: "desc" },
  });
}

export async function obtenerAsistenciaOFallar(id: string) {
  const asistencia = await prisma.asistencia.findUnique({ where: { id } });
  if (!asistencia) {
    throw new HttpError(404, "Registro de asistencia no encontrado");
  }
  return asistencia;
}

export async function solicitarModificacion(data: {
  asistenciaId: string;
  valorPropuesto: EstadoAsistencia;
  motivo: string;
  usuarioSolicitanteId: string;
}) {
  const asistencia = await obtenerAsistenciaOFallar(data.asistenciaId);
  if (!asistencia.bloqueada) {
    throw new HttpError(
      400,
      "Esta asistencia aún no fue cerrada; corríjala directamente en vez de solicitar una modificación",
    );
  }

  const solicitudPendiente = await prisma.solicitudModificacion.findFirst({
    where: { asistenciaId: data.asistenciaId, estado: "PENDIENTE" },
  });
  if (solicitudPendiente) {
    throw new HttpError(409, "Ya existe una solicitud de modificación pendiente para esta asistencia");
  }

  return prisma.solicitudModificacion.create({
    data: {
      asistenciaId: data.asistenciaId,
      valorPropuesto: data.valorPropuesto,
      motivo: data.motivo,
      usuarioSolicitanteId: data.usuarioSolicitanteId,
    },
  });
}

export async function resolverSolicitud(
  solicitudId: string,
  aprobar: boolean,
  usuarioAutorizaId: string,
) {
  const solicitud = await prisma.solicitudModificacion.findUnique({ where: { id: solicitudId } });
  if (!solicitud) {
    throw new HttpError(404, "Solicitud de modificación no encontrada");
  }
  if (solicitud.estado !== "PENDIENTE") {
    throw new HttpError(409, "Esta solicitud ya fue resuelta");
  }

  return prisma.$transaction(async (tx) => {
    const actualizada = await tx.solicitudModificacion.update({
      where: { id: solicitudId },
      data: {
        estado: aprobar ? "APROBADA" : "RECHAZADA",
        usuarioAutorizaId,
        fechaResolucion: new Date(),
      },
    });

    if (aprobar) {
      await tx.asistencia.update({
        where: { id: solicitud.asistenciaId },
        data: { estado: solicitud.valorPropuesto },
      });
    }

    return actualizada;
  });
}

export async function listarSolicitudes(filtros: { estado?: "PENDIENTE" | "APROBADA" | "RECHAZADA" }) {
  return prisma.solicitudModificacion.findMany({
    where: { estado: filtros.estado },
    include: {
      asistencia: {
        select: {
          id: true,
          estado: true,
          jornadaId: true,
          estudiante: { select: { id: true, nombres: true, apellidos: true } },
        },
      },
    },
    orderBy: { fechaSolicitud: "desc" },
  });
}
