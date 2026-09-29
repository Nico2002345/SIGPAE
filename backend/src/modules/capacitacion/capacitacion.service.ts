import type { EstadoEscenarioCapacitacion, ResultadoEvaluacion } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { abrirJornada } from "../jornadas/jornadas.service.js";
import { generarQr } from "../qr/qr.service.js";
import { crearEstudianteOficial } from "../estudiantes/estudiantes.service.js";
import { crearInstitucion } from "../estructura/instituciones.service.js";
import { crearSede } from "../estructura/sedes.service.js";

const NOMBRE_ZONA_CAPACITACION = "ZONA DE CAPACITACIÓN";

async function obtenerOCrearZonaCapacitacion() {
  const existente = await prisma.zonaEducativa.findUnique({ where: { nombre: NOMBRE_ZONA_CAPACITACION } });
  if (existente) return existente;
  return prisma.zonaEducativa.create({ data: { nombre: NOMBRE_ZONA_CAPACITACION } });
}

/**
 * Genera un entorno de práctica completo y aislado (regla 24 del spec):
 * institución, sede, N estudiantes con QR y una jornada del día, todos
 * marcados esCapacitacion=true. Reutiliza los mismos servicios que crean
 * datos reales (misma validación, mismas reglas de negocio) para que
 * practicar el flujo sea idéntico al real; lo único que cambia es el flag.
 *
 * A partir de aquí, asistencia/entregas se practican llamando a los
 * endpoints reales (POST /asistencia, POST /entregas) contra estos IDs
 * ficticios: esos módulos no necesitan saber que es una práctica.
 */
export async function generarEntorno(actorId: string, cantidadEstudiantes = 10) {
  if (cantidadEstudiantes < 1 || cantidadEstudiantes > 100) {
    throw new HttpError(400, "cantidadEstudiantes debe estar entre 1 y 100");
  }

  const zona = await obtenerOCrearZonaCapacitacion();
  const sufijo = Date.now();

  const institucion = await crearInstitucion({
    nombre: `Institución de Práctica ${sufijo}`,
    codigoDane: `CAP-${sufijo}`,
    zonaId: zona.id,
    esCapacitacion: true,
  });

  const sede = await crearSede({
    nombre: `Sede de Práctica ${sufijo}`,
    codigoDaneSede: `CAP-SEDE-${sufijo}`,
    institucionId: institucion.id,
    esCapacitacion: true,
  });

  const estudiantes = [];
  for (let i = 1; i <= cantidadEstudiantes; i++) {
    const estudiante = await crearEstudianteOficial({
      idPae: `PAE-9999-${String(sufijo).slice(-4)}${String(i).padStart(2, "0")}`,
      nombres: `Estudiante Práctica ${i}`,
      apellidos: "Ficticio",
      sedeId: sede.id,
      institucionId: institucion.id,
      esCapacitacion: true,
    });
    const qr = await generarQr(estudiante.id, { usuarioId: actorId });
    estudiantes.push({ ...estudiante, qrToken: qr.token });
  }

  const jornada = await abrirJornada(sede.id, new Date(), actorId);

  return { zona, institucion, sede, estudiantes, jornada };
}

/**
 * Borra físicamente todo lo ficticio de una institución de práctica. A
 * diferencia de los datos reales (que nunca se borran), aquí SÍ se borra:
 * son datos de entrenamiento sin valor de auditoría. La verificación
 * esCapacitacion=true es la última línea de defensa contra borrar una
 * institución real por error.
 */
export async function purgarEntorno(institucionId: number) {
  const institucion = await prisma.institucion.findUnique({ where: { id: institucionId } });
  if (!institucion) {
    throw new HttpError(404, "Institución no encontrada");
  }
  if (!institucion.esCapacitacion) {
    throw new HttpError(403, "Esta institución no es de capacitación; no se puede purgar");
  }

  const sedes = await prisma.sede.findMany({ where: { institucionId }, select: { id: true } });
  const sedeIds = sedes.map((s) => s.id);
  const estudiantes = await prisma.estudiante.findMany({
    where: { institucionId },
    select: { id: true },
  });
  const estudianteIds = estudiantes.map((e) => e.id);
  const jornadas = await prisma.jornadaPae.findMany({ where: { sedeId: { in: sedeIds } }, select: { id: true } });
  const jornadaIds = jornadas.map((j) => j.id);

  await prisma.$transaction([
    prisma.entrega.deleteMany({ where: { institucionId } }),
    prisma.asistencia.deleteMany({ where: { jornadaId: { in: jornadaIds } } }),
    prisma.solicitudModificacion.deleteMany({ where: { asistencia: { jornadaId: { in: jornadaIds } } } }),
    prisma.novedad.deleteMany({ where: { sedeId: { in: sedeIds } } }),
    prisma.qrCode.deleteMany({ where: { estudianteId: { in: estudianteIds } } }),
    prisma.historicoEstudiante.deleteMany({ where: { estudianteId: { in: estudianteIds } } }),
    prisma.jornadaPae.deleteMany({ where: { sedeId: { in: sedeIds } } }),
    prisma.estudiante.deleteMany({ where: { institucionId } }),
    prisma.sede.deleteMany({ where: { institucionId } }),
    prisma.institucion.delete({ where: { id: institucionId } }),
  ]);
}

export async function crearEscenario(data: { codigo: string; nombre: string; descripcion?: string }) {
  const existente = await prisma.escenarioCapacitacion.findUnique({ where: { codigo: data.codigo } });
  if (existente) {
    throw new HttpError(409, "Ya existe un escenario con ese código");
  }
  return prisma.escenarioCapacitacion.create({ data });
}

export async function listarEscenarios(filtros: { estado?: EstadoEscenarioCapacitacion }) {
  return prisma.escenarioCapacitacion.findMany({
    where: { estado: filtros.estado },
    orderBy: { codigo: "asc" },
  });
}

export async function registrarEvaluacion(data: {
  escenarioId: number;
  usuarioId: string;
  resultado: ResultadoEvaluacion;
  observaciones?: string;
}) {
  const escenario = await prisma.escenarioCapacitacion.findUnique({ where: { id: data.escenarioId } });
  if (!escenario) {
    throw new HttpError(404, "Escenario de capacitación no encontrado");
  }

  return prisma.evaluacionCapacitacion.create({ data });
}

export async function listarEvaluaciones(filtros: { usuarioId?: string; escenarioId?: number }) {
  return prisma.evaluacionCapacitacion.findMany({
    where: { usuarioId: filtros.usuarioId, escenarioId: filtros.escenarioId },
    include: {
      escenario: { select: { codigo: true, nombre: true } },
      usuario: { select: { id: true, nombreCompleto: true } },
    },
    orderBy: { fecha: "desc" },
  });
}
