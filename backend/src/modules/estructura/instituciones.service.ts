import type { EstadoActivoInactivo } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { obtenerZonaOFallar } from "./zonas.service.js";

export async function crearInstitucion(data: {
  nombre: string;
  codigoDane: string;
  zonaId: number;
  esCapacitacion?: boolean;
}) {
  await obtenerZonaOFallar(data.zonaId);

  const existente = await prisma.institucion.findUnique({ where: { codigoDane: data.codigoDane } });
  if (existente) {
    throw new HttpError(409, "Ya existe una institución con ese código DANE");
  }

  return prisma.institucion.create({ data });
}

export async function listarInstituciones(filtros: {
  zonaId?: number;
  estado?: EstadoActivoInactivo;
  esCapacitacion?: boolean;
}) {
  return prisma.institucion.findMany({
    where: {
      zonaId: filtros.zonaId,
      estado: filtros.estado,
      esCapacitacion: filtros.esCapacitacion ?? false,
    },
    include: { zona: { select: { id: true, nombre: true } } },
    orderBy: { nombre: "asc" },
  });
}

export async function editarInstitucion(
  id: number,
  data: { nombre?: string; zonaId?: number; estado?: EstadoActivoInactivo },
) {
  await obtenerInstitucionOFallar(id);
  if (data.zonaId !== undefined) {
    await obtenerZonaOFallar(data.zonaId);
  }

  return prisma.institucion.update({ where: { id }, data });
}

export async function obtenerInstitucionOFallar(id: number) {
  const institucion = await prisma.institucion.findUnique({ where: { id } });
  if (!institucion) {
    throw new HttpError(404, "Institución no encontrada");
  }
  return institucion;
}
