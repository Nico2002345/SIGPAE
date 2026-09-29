import type { EstadoActivoInactivo } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";

export async function crearGrado(data: { nombre: string; nivel: number }) {
  const existente = await prisma.grado.findUnique({ where: { nombre: data.nombre } });
  if (existente) {
    throw new HttpError(409, "Ya existe un grado con ese nombre");
  }

  return prisma.grado.create({ data });
}

export async function listarGrados(filtros: { estado?: EstadoActivoInactivo }) {
  return prisma.grado.findMany({
    where: { estado: filtros.estado },
    orderBy: { nivel: "asc" },
  });
}

export async function editarGrado(
  id: number,
  data: { nombre?: string; nivel?: number; estado?: EstadoActivoInactivo },
) {
  await obtenerGradoOFallar(id);
  return prisma.grado.update({ where: { id }, data });
}

export async function obtenerGradoOFallar(id: number) {
  const grado = await prisma.grado.findUnique({ where: { id } });
  if (!grado) {
    throw new HttpError(404, "Grado no encontrado");
  }
  return grado;
}
