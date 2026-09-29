import type { EstadoActivoInactivo } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { obtenerInstitucionOFallar } from "./instituciones.service.js";

export async function crearSede(data: { nombre: string; codigoDaneSede: string; institucionId: number }) {
  await obtenerInstitucionOFallar(data.institucionId);

  const existente = await prisma.sede.findUnique({ where: { codigoDaneSede: data.codigoDaneSede } });
  if (existente) {
    throw new HttpError(409, "Ya existe una sede con ese código DANE de sede");
  }

  return prisma.sede.create({ data });
}

export async function listarSedes(filtros: { institucionId?: number; estado?: EstadoActivoInactivo }) {
  return prisma.sede.findMany({
    where: { institucionId: filtros.institucionId, estado: filtros.estado },
    include: { institucion: { select: { id: true, nombre: true, zonaId: true } } },
    orderBy: { nombre: "asc" },
  });
}

export async function editarSede(
  id: number,
  data: { nombre?: string; institucionId?: number; estado?: EstadoActivoInactivo },
) {
  await obtenerSedeOFallar(id);
  if (data.institucionId !== undefined) {
    await obtenerInstitucionOFallar(data.institucionId);
  }

  return prisma.sede.update({ where: { id }, data });
}

export async function obtenerSedeOFallar(id: number) {
  const sede = await prisma.sede.findUnique({ where: { id } });
  if (!sede) {
    throw new HttpError(404, "Sede no encontrada");
  }
  return sede;
}
