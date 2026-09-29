import { Prisma } from "@prisma/client";
import type { EstadoEstudiante } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { obtenerGradoOFallar } from "../estructura/grados.service.js";
import { obtenerGrupoOFallar } from "../estructura/grupos.service.js";
import { obtenerInstitucionOFallar } from "../estructura/instituciones.service.js";
import { obtenerSedeOFallar } from "../estructura/sedes.service.js";

// Estados de estudiante habilitados para operaciones activas (asistencia,
// entregas, QR): un estudiante RETIRADO/TRASLADADO/VINCULADO ya no debe
// poder recibir nuevas credenciales ni registros operativos.
export const ESTADOS_ESTUDIANTE_HABILITADOS = ["ACTIVO", "PROVISIONAL_PENDIENTE"] as const;

const resumenSelect = {
  id: true,
  idPae: true,
  tipoIdentificador: true,
  nombres: true,
  apellidos: true,
  estado: true,
  origen: true,
  sede: { select: { id: true, nombre: true } },
  institucion: { select: { id: true, nombre: true } },
  grado: { select: { id: true, nombre: true } },
  grupo: { select: { id: true, nombre: true } },
} as const;

async function validarUbicacion(data: {
  sedeId: number;
  institucionId: number;
  gradoId?: number | null;
  grupoId?: number | null;
}) {
  const [institucion, sede] = await Promise.all([
    obtenerInstitucionOFallar(data.institucionId),
    obtenerSedeOFallar(data.sedeId),
  ]);

  if (sede.institucionId !== institucion.id) {
    throw new HttpError(400, "La sede indicada no pertenece a la institución indicada");
  }

  if (data.gradoId != null) {
    await obtenerGradoOFallar(data.gradoId);
  }

  if (data.grupoId != null) {
    const grupo = await obtenerGrupoOFallar(data.grupoId);
    if (grupo.sedeId !== data.sedeId) {
      throw new HttpError(400, "El grupo indicado no pertenece a la sede indicada");
    }
    if (data.gradoId != null && grupo.gradoId !== data.gradoId) {
      throw new HttpError(400, "El grupo indicado no pertenece al grado indicado");
    }
  }
}

export async function crearEstudianteOficial(data: {
  idPae: string;
  documentoTipo?: string;
  documentoNumero?: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento?: Date;
  genero?: string;
  sedeId: number;
  institucionId: number;
  gradoId?: number;
  grupoId?: number;
}) {
  await validarUbicacion(data);

  const existente = await prisma.estudiante.findUnique({ where: { idPae: data.idPae } });
  if (existente) {
    throw new HttpError(409, "Ya existe un estudiante con ese id_pae");
  }
  if (data.documentoNumero) {
    const existenteDoc = await prisma.estudiante.findUnique({ where: { documentoNumero: data.documentoNumero } });
    if (existenteDoc) {
      throw new HttpError(409, "Ya existe un estudiante con ese número de documento");
    }
  }

  return prisma.estudiante.create({
    data: { ...data, tipoIdentificador: "PAE", origen: "SIMAT" },
    select: resumenSelect,
  });
}

export async function crearEstudianteProvisional(data: {
  nombres: string;
  apellidos: string;
  fechaNacimiento?: Date;
  genero?: string;
  sedeId: number;
  institucionId: number;
  gradoId?: number;
  grupoId?: number;
}) {
  await validarUbicacion(data);

  const anio = new Date().getFullYear();
  for (let intento = 0; intento < 5; intento++) {
    const total = await prisma.estudiante.count({
      where: { idPae: { startsWith: `TEMP-${anio}-` } },
    });
    const idPae = `TEMP-${anio}-${String(total + 1).padStart(6, "0")}`;

    try {
      return await prisma.estudiante.create({
        data: { ...data, idPae, tipoIdentificador: "TEMP", origen: "PROVISIONAL", estado: "PROVISIONAL_PENDIENTE" },
        select: resumenSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        continue;
      }
      throw error;
    }
  }

  throw new HttpError(409, "No se pudo generar un identificador provisional único, intente de nuevo");
}

export async function listarEstudiantes(filtros: {
  sedeId?: number;
  institucionId?: number;
  gradoId?: number;
  grupoId?: number;
  estado?: EstadoEstudiante;
  busqueda?: string;
}) {
  return prisma.estudiante.findMany({
    where: {
      sedeId: filtros.sedeId,
      institucionId: filtros.institucionId,
      gradoId: filtros.gradoId,
      grupoId: filtros.grupoId,
      estado: filtros.estado,
      OR: filtros.busqueda
        ? [
            { nombres: { contains: filtros.busqueda, mode: "insensitive" } },
            { apellidos: { contains: filtros.busqueda, mode: "insensitive" } },
            { idPae: { contains: filtros.busqueda, mode: "insensitive" } },
            { documentoNumero: { contains: filtros.busqueda, mode: "insensitive" } },
          ]
        : undefined,
    },
    select: resumenSelect,
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
  });
}

export async function obtenerDetalleEstudiante(id: string) {
  const estudiante = await prisma.estudiante.findUnique({
    where: { id },
    include: {
      sede: { select: { id: true, nombre: true } },
      institucion: { select: { id: true, nombre: true } },
      grado: { select: { id: true, nombre: true } },
      grupo: { select: { id: true, nombre: true } },
      historico: { orderBy: { fecha: "desc" } },
      vinculacionComoTemporal: true,
      vinculacionComoOficial: true,
    },
  });

  if (!estudiante) {
    throw new HttpError(404, "Estudiante no encontrado");
  }

  return estudiante;
}

export async function obtenerEstudianteOFallar(id: string) {
  const estudiante = await prisma.estudiante.findUnique({ where: { id } });
  if (!estudiante) {
    throw new HttpError(404, "Estudiante no encontrado");
  }
  return estudiante;
}

const CAMPOS_EDITABLES = [
  "nombres",
  "apellidos",
  "fechaNacimiento",
  "documentoTipo",
  "documentoNumero",
  "genero",
  "gradoId",
  "grupoId",
] as const;

export interface CamposEditablesEstudiante {
  nombres?: string;
  apellidos?: string;
  fechaNacimiento?: Date;
  documentoTipo?: string;
  documentoNumero?: string;
  genero?: string;
  gradoId?: number | null;
  grupoId?: number | null;
}

export async function editarEstudiante(
  id: string,
  usuarioId: string,
  data: CamposEditablesEstudiante,
  opciones: { soloProvisional: boolean },
) {
  const actual = await obtenerEstudianteOFallar(id);

  if (opciones.soloProvisional && actual.origen !== "PROVISIONAL") {
    throw new HttpError(403, "Solo puede editar estudiantes provisionales, no registros oficiales de SIMAT");
  }
  if (actual.estado === "VINCULADO" || actual.estado === "RETIRADO") {
    throw new HttpError(
      409,
      "Este estudiante ya fue " +
        (actual.estado === "VINCULADO" ? "vinculado a un registro oficial" : "retirado") +
        "; el registro queda congelado y no se puede editar directamente",
    );
  }

  if (data.documentoNumero && data.documentoNumero !== actual.documentoNumero) {
    const existenteDoc = await prisma.estudiante.findUnique({ where: { documentoNumero: data.documentoNumero } });
    if (existenteDoc) {
      throw new HttpError(409, "Ya existe un estudiante con ese número de documento");
    }
  }

  const gradoEfectivo = data.gradoId !== undefined ? data.gradoId : actual.gradoId;
  if (data.gradoId !== undefined && data.gradoId !== null) {
    await obtenerGradoOFallar(data.gradoId);
  }
  if (data.grupoId !== undefined && data.grupoId !== null) {
    const grupo = await obtenerGrupoOFallar(data.grupoId);
    if (grupo.sedeId !== actual.sedeId) {
      throw new HttpError(400, "El grupo indicado no pertenece a la sede del estudiante");
    }
    if (gradoEfectivo != null && grupo.gradoId !== gradoEfectivo) {
      throw new HttpError(400, "El grupo indicado no pertenece al grado indicado");
    }
  }

  const cambios: { campo: string; valorAnterior: string | null; valorNuevo: string | null }[] = [];
  for (const campo of CAMPOS_EDITABLES) {
    if (!(campo in data)) continue;
    const valorAnterior = (actual as Record<string, unknown>)[campo];
    const valorNuevo = data[campo];
    const anteriorTexto = valorAnterior == null ? null : String(valorAnterior);
    const nuevoTexto = valorNuevo == null ? null : String(valorNuevo);
    if (anteriorTexto !== nuevoTexto) {
      cambios.push({ campo, valorAnterior: anteriorTexto, valorNuevo: nuevoTexto });
    }
  }

  return prisma.$transaction(async (tx) => {
    const actualizado = await tx.estudiante.update({ where: { id }, data, select: resumenSelect });
    if (cambios.length > 0) {
      await tx.historicoEstudiante.createMany({
        data: cambios.map((cambio) => ({ ...cambio, estudianteId: id, origen: "MANUAL", usuarioId })),
      });
    }
    return actualizado;
  });
}

export async function retirarEstudiante(id: string, usuarioId: string, descripcion: string) {
  const actual = await obtenerEstudianteOFallar(id);
  if (actual.estado === "RETIRADO") {
    throw new HttpError(409, "El estudiante ya está retirado");
  }

  return prisma.$transaction(async (tx) => {
    const actualizado = await tx.estudiante.update({
      where: { id },
      data: { estado: "RETIRADO" },
      select: resumenSelect,
    });
    await tx.historicoEstudiante.create({
      data: {
        estudianteId: id,
        campo: "estado",
        valorAnterior: actual.estado,
        valorNuevo: "RETIRADO",
        origen: "MANUAL",
        usuarioId,
      },
    });
    await tx.novedad.create({
      data: { estudianteId: id, sedeId: actual.sedeId, tipo: "RETIRO", descripcion, usuarioId },
    });
    return actualizado;
  });
}

export async function vincularProvisionalConOficial(
  estudianteTemporalId: string,
  estudianteOficialId: string,
  usuarioId: string,
) {
  const [temporal, oficial] = await Promise.all([
    obtenerEstudianteOFallar(estudianteTemporalId),
    obtenerEstudianteOFallar(estudianteOficialId),
  ]);

  if (temporal.tipoIdentificador !== "TEMP" || temporal.origen !== "PROVISIONAL") {
    throw new HttpError(400, "El primer estudiante debe ser un registro provisional (TEMP)");
  }
  if (oficial.tipoIdentificador !== "PAE" || oficial.origen !== "SIMAT") {
    throw new HttpError(400, "El segundo estudiante debe ser un registro oficial proveniente de SIMAT");
  }
  if (temporal.estado === "VINCULADO") {
    throw new HttpError(409, "Este estudiante provisional ya fue vinculado a un registro oficial");
  }

  return prisma.$transaction(async (tx) => {
    await tx.estudiante.update({ where: { id: estudianteTemporalId }, data: { estado: "VINCULADO" } });

    const vinculacion = await tx.vinculacionProvisional.create({
      data: { estudianteTemporalId, estudianteOficialId, usuarioId },
    });

    await tx.historicoEstudiante.create({
      data: {
        estudianteId: estudianteOficialId,
        campo: "vinculacion_provisional",
        valorAnterior: null,
        valorNuevo: estudianteTemporalId,
        origen: "MANUAL",
        usuarioId,
      },
    });

    return vinculacion;
  });
}
