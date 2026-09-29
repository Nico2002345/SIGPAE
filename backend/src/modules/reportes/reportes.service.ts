import type { EstadoEstudiante, EstadoNovedad, EstadoTraslado, TipoNovedad } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { obtenerJornadaOFallar } from "../jornadas/jornadas.service.js";

export async function reporteAsistenciaDiaria(jornadaId: string) {
  await obtenerJornadaOFallar(jornadaId);
  return prisma.asistencia.findMany({
    where: { jornadaId },
    select: {
      estado: true,
      fechaHoraRegistro: true,
      bloqueada: true,
      estudiante: { select: { idPae: true, nombres: true, apellidos: true } },
    },
    orderBy: { fechaHoraRegistro: "asc" },
  });
}

export async function reporteInasistencias(jornadaId: string) {
  const jornada = await obtenerJornadaOFallar(jornadaId);

  const [estudiantesDeLaSede, asistieron] = await Promise.all([
    prisma.estudiante.findMany({
      where: { sedeId: jornada.sedeId, estado: { in: ["ACTIVO", "PROVISIONAL_PENDIENTE"] } },
      select: { id: true, idPae: true, nombres: true, apellidos: true },
    }),
    prisma.asistencia.findMany({
      where: { jornadaId, estado: "ASISTIO" },
      select: { estudianteId: true },
    }),
  ]);

  const idsAsistieron = new Set(asistieron.map((a) => a.estudianteId));
  return estudiantesDeLaSede.filter((estudiante) => !idsAsistieron.has(estudiante.id));
}

export async function reporteEntregas(jornadaId: string) {
  await obtenerJornadaOFallar(jornadaId);
  return prisma.entrega.findMany({
    where: { jornadaId, resultado: "AUTORIZADA" },
    select: {
      tipo: true,
      fechaHora: true,
      estudiante: { select: { idPae: true, nombres: true, apellidos: true } },
    },
    orderBy: { fechaHora: "asc" },
  });
}

export async function reporteRedistribuciones(jornadaId: string) {
  await obtenerJornadaOFallar(jornadaId);
  return prisma.entrega.findMany({
    where: { jornadaId, tipo: "REDISTRIBUCION", resultado: "AUTORIZADA" },
    select: {
      fechaHora: true,
      estudiante: { select: { idPae: true, nombres: true, apellidos: true } },
      entregaOriginalId: true,
    },
    orderBy: { fechaHora: "asc" },
  });
}

export async function reporteIntentosRechazados(jornadaId: string) {
  await obtenerJornadaOFallar(jornadaId);
  return prisma.entrega.findMany({
    where: { jornadaId, resultado: "RECHAZADA" },
    select: {
      tipo: true,
      fechaHora: true,
      motivoRechazo: true,
      estudiante: { select: { idPae: true, nombres: true, apellidos: true } },
    },
    orderBy: { fechaHora: "asc" },
  });
}

export async function reporteEstudiantesProvisionales(filtros: {
  sedeId?: number;
  institucionId?: number;
  estado?: EstadoEstudiante;
}) {
  return prisma.estudiante.findMany({
    where: {
      origen: "PROVISIONAL",
      sedeId: filtros.sedeId,
      institucionId: filtros.institucionId,
      estado: filtros.estado,
    },
    select: {
      idPae: true,
      nombres: true,
      apellidos: true,
      estado: true,
      createdAt: true,
      sede: { select: { nombre: true } },
      institucion: { select: { nombre: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function reporteTraslados(filtros: { estado?: EstadoTraslado; institucionId?: number }) {
  return prisma.traslado.findMany({
    where: {
      estado: filtros.estado,
      institucionNuevaId: filtros.institucionId,
    },
    select: {
      fechaDeteccion: true,
      estado: true,
      estudiante: { select: { idPae: true, nombres: true, apellidos: true } },
      institucionAnterior: { select: { nombre: true } },
      institucionNueva: { select: { nombre: true } },
      sedeAnterior: { select: { nombre: true } },
      sedeNueva: { select: { nombre: true } },
    },
    orderBy: { fechaDeteccion: "desc" },
  });
}

export async function reporteNovedades(filtros: { sedeId?: number; tipo?: TipoNovedad; estado?: EstadoNovedad }) {
  return prisma.novedad.findMany({
    where: { sedeId: filtros.sedeId, tipo: filtros.tipo, estado: filtros.estado },
    select: {
      fecha: true,
      tipo: true,
      descripcion: true,
      estado: true,
      estudiante: { select: { idPae: true, nombres: true, apellidos: true } },
      sede: { select: { nombre: true } },
    },
    orderBy: { fecha: "desc" },
  });
}

interface FiltrosConsolidado {
  fechaInicio?: Date;
  fechaFin?: Date;
  sedeId?: number;
  institucionId?: number;
  zonaId?: number;
}

interface EntregaParaConsolidado {
  estudianteId: string;
  tipo: "NORMAL" | "REDISTRIBUCION";
  fechaHora: Date;
  sedeId: number;
  institucionId: number;
  sede: { nombre: string };
  institucion: { nombre: string; zonaId: number; zona: { nombre: string } };
}

async function obtenerEntregasAutorizadas(filtros: FiltrosConsolidado): Promise<EntregaParaConsolidado[]> {
  return prisma.entrega.findMany({
    where: {
      resultado: "AUTORIZADA",
      sedeId: filtros.sedeId,
      institucionId: filtros.institucionId,
      institucion: filtros.zonaId ? { zonaId: filtros.zonaId } : undefined,
      fechaHora:
        filtros.fechaInicio || filtros.fechaFin
          ? { gte: filtros.fechaInicio, lte: filtros.fechaFin }
          : undefined,
    },
    select: {
      estudianteId: true,
      tipo: true,
      fechaHora: true,
      sedeId: true,
      institucionId: true,
      sede: { select: { nombre: true } },
      institucion: { select: { nombre: true, zonaId: true, zona: { select: { nombre: true } } } },
    },
  });
}

function consolidarPorClave<T extends Record<string, unknown>>(
  entregas: EntregaParaConsolidado[],
  clave: (e: EntregaParaConsolidado) => string,
  etiqueta: (e: EntregaParaConsolidado) => T,
) {
  const acumulado = new Map<
    string,
    { etiqueta: T; estudiantesNormales: Set<string>; racionesNormales: number; redistribuciones: number }
  >();

  for (const entrega of entregas) {
    const k = clave(entrega);
    if (!acumulado.has(k)) {
      acumulado.set(k, {
        etiqueta: etiqueta(entrega),
        estudiantesNormales: new Set(),
        racionesNormales: 0,
        redistribuciones: 0,
      });
    }
    const bucket = acumulado.get(k)!;
    if (entrega.tipo === "NORMAL") {
      bucket.estudiantesNormales.add(entrega.estudianteId);
      bucket.racionesNormales += 1;
    } else {
      bucket.redistribuciones += 1;
    }
  }

  return [...acumulado.values()]
    .map((bucket) => ({
      ...bucket.etiqueta,
      beneficiariosAtendidos: bucket.estudiantesNormales.size,
      racionesNormales: bucket.racionesNormales,
      redistribuciones: bucket.redistribuciones,
      totalRacionesEntregadas: bucket.racionesNormales + bucket.redistribuciones,
    }))
    .sort((a, b) => (b.totalRacionesEntregadas as number) - (a.totalRacionesEntregadas as number));
}

export async function consolidadoPorSede(filtros: FiltrosConsolidado) {
  const entregas = await obtenerEntregasAutorizadas(filtros);
  return consolidarPorClave(
    entregas,
    (e) => String(e.sedeId),
    (e) => ({ sedeId: e.sedeId, sede: e.sede.nombre }),
  );
}

export async function consolidadoPorInstitucion(filtros: FiltrosConsolidado) {
  const entregas = await obtenerEntregasAutorizadas(filtros);
  return consolidarPorClave(
    entregas,
    (e) => String(e.institucionId),
    (e) => ({ institucionId: e.institucionId, institucion: e.institucion.nombre }),
  );
}

export async function consolidadoPorZona(filtros: FiltrosConsolidado) {
  const entregas = await obtenerEntregasAutorizadas(filtros);
  return consolidarPorClave(
    entregas,
    (e) => String(e.institucion.zonaId),
    (e) => ({ zonaId: e.institucion.zonaId, zona: e.institucion.zona.nombre }),
  );
}

export async function consolidadoPorPeriodo(filtros: FiltrosConsolidado) {
  const entregas = await obtenerEntregasAutorizadas(filtros);
  return consolidarPorClave(
    entregas,
    (e) => e.fechaHora.toISOString().slice(0, 10),
    (e) => ({ fecha: e.fechaHora.toISOString().slice(0, 10) }),
  ).sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
}
