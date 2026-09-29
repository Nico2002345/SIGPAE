import type { EstadoAsistencia } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { ESTADOS_ESTUDIANTE_HABILITADOS } from "../estudiantes/estudiantes.service.js";
import { bloquearYVerificarJornadaAbierta } from "../jornadas/jornadas.service.js";

export async function registrarAsistencia(data: {
  jornadaId: string;
  estudianteId: string;
  estado: EstadoAsistencia;
  usuarioId: string;
  dispositivoId?: string;
}) {
  // Todo el flujo corre dentro de la transacción que bloquea la jornada
  // (FOR UPDATE): si un cierre de jornada está en curso para la misma
  // jornada, esta llamada espera a que termine y vuelve a leer el estado
  // ya actualizado, en vez de operar sobre un snapshot desactualizado.
  return prisma.$transaction(async (tx) => {
    const jornada = await bloquearYVerificarJornadaAbierta(tx, data.jornadaId);

    const estudiante = await tx.estudiante.findUnique({ where: { id: data.estudianteId } });
    if (!estudiante) {
      throw new HttpError(404, "Estudiante no encontrado");
    }
    if (estudiante.sedeId !== jornada.sedeId) {
      throw new HttpError(400, "El estudiante no pertenece a la sede de esta jornada");
    }
    if (
      !ESTADOS_ESTUDIANTE_HABILITADOS.includes(estudiante.estado as (typeof ESTADOS_ESTUDIANTE_HABILITADOS)[number])
    ) {
      throw new HttpError(400, "El estudiante no está activo, no se puede registrar su asistencia");
    }

    const existente = await tx.asistencia.findUnique({
      where: { estudianteId_jornadaId: { estudianteId: data.estudianteId, jornadaId: data.jornadaId } },
    });

    if (existente) {
      if (existente.bloqueada) {
        throw new HttpError(
          409,
          "La asistencia de este estudiante ya fue cerrada; use el mecanismo de solicitud de modificación",
        );
      }
      return tx.asistencia.update({
        where: { id: existente.id },
        data: {
          estado: data.estado,
          usuarioId: data.usuarioId,
          dispositivoId: data.dispositivoId,
          fechaHoraRegistro: new Date(),
        },
      });
    }

    return tx.asistencia.create({
      data: {
        jornadaId: data.jornadaId,
        estudianteId: data.estudianteId,
        estado: data.estado,
        usuarioId: data.usuarioId,
        dispositivoId: data.dispositivoId,
      },
    });
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
  return prisma.$transaction(async (tx) => {
    const solicitud = await tx.solicitudModificacion.findUnique({ where: { id: solicitudId } });
    if (!solicitud) {
      throw new HttpError(404, "Solicitud de modificación no encontrada");
    }

    // updateMany con `estado: PENDIENTE` en el where hace la lectura y la
    // escritura atómicas: si dos resoluciones concurrentes llegan aquí,
    // Postgres serializa las dos escrituras sobre la misma fila y la
    // segunda ve el estado ya cambiado por la primera, así que su WHERE
    // no matchea ninguna fila (count=0) en vez de sobrescribir el resultado.
    const resultado = await tx.solicitudModificacion.updateMany({
      where: { id: solicitudId, estado: "PENDIENTE" },
      data: {
        estado: aprobar ? "APROBADA" : "RECHAZADA",
        usuarioAutorizaId,
        fechaResolucion: new Date(),
      },
    });
    if (resultado.count === 0) {
      throw new HttpError(409, "Esta solicitud ya fue resuelta");
    }

    if (aprobar) {
      await tx.asistencia.update({
        where: { id: solicitud.asistenciaId },
        data: { estado: solicitud.valorPropuesto },
      });
    }

    return tx.solicitudModificacion.findUniqueOrThrow({ where: { id: solicitudId } });
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
