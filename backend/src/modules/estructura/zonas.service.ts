import type { EstadoActivoInactivo } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";

export async function crearZona(data: { nombre: string }) {
  const existente = await prisma.zonaEducativa.findUnique({ where: { nombre: data.nombre } });
  if (existente) {
    throw new HttpError(409, "Ya existe una zona educativa con ese nombre");
  }

  return prisma.zonaEducativa.create({ data });
}

export async function listarZonas(filtros: { estado?: EstadoActivoInactivo }) {
  return prisma.zonaEducativa.findMany({
    where: { estado: filtros.estado },
    orderBy: { nombre: "asc" },
  });
}

export async function editarZona(
  id: number,
  data: { nombre?: string; estado?: EstadoActivoInactivo },
) {
  await obtenerZonaOFallar(id);
  return prisma.zonaEducativa.update({ where: { id }, data });
}

export async function obtenerZonaOFallar(id: number) {
  const zona = await prisma.zonaEducativa.findUnique({ where: { id } });
  if (!zona) {
    throw new HttpError(404, "Zona educativa no encontrada");
  }
  return zona;
}
