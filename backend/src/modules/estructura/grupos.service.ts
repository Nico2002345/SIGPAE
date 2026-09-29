import type { EstadoActivoInactivo, JornadaEscolar } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { obtenerGradoOFallar } from "./grados.service.js";
import { obtenerSedeOFallar } from "./sedes.service.js";

export async function crearGrupo(data: {
  sedeId: number;
  gradoId: number;
  nombre: string;
  jornadaEscolar: JornadaEscolar;
  anioLectivo: number;
}) {
  await Promise.all([obtenerSedeOFallar(data.sedeId), obtenerGradoOFallar(data.gradoId)]);

  const existente = await prisma.grupo.findUnique({
    where: {
      sedeId_gradoId_nombre_anioLectivo: {
        sedeId: data.sedeId,
        gradoId: data.gradoId,
        nombre: data.nombre,
        anioLectivo: data.anioLectivo,
      },
    },
  });
  if (existente) {
    throw new HttpError(409, "Ya existe ese grupo para la sede, grado y año lectivo indicados");
  }

  return prisma.grupo.create({ data });
}

export async function listarGrupos(filtros: {
  sedeId?: number;
  gradoId?: number;
  anioLectivo?: number;
  estado?: EstadoActivoInactivo;
}) {
  return prisma.grupo.findMany({
    where: {
      sedeId: filtros.sedeId,
      gradoId: filtros.gradoId,
      anioLectivo: filtros.anioLectivo,
      estado: filtros.estado,
    },
    include: {
      sede: { select: { id: true, nombre: true } },
      grado: { select: { id: true, nombre: true, nivel: true } },
    },
    orderBy: [{ anioLectivo: "desc" }, { nombre: "asc" }],
  });
}

export async function editarGrupo(
  id: number,
  data: { nombre?: string; jornadaEscolar?: JornadaEscolar; estado?: EstadoActivoInactivo },
) {
  await obtenerGrupoOFallar(id);
  return prisma.grupo.update({ where: { id }, data });
}

export async function obtenerGrupoOFallar(id: number) {
  const grupo = await prisma.grupo.findUnique({ where: { id } });
  if (!grupo) {
    throw new HttpError(404, "Grupo no encontrado");
  }
  return grupo;
}
