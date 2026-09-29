import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../src/config/prisma.js";

describe("Modelo de datos (Prisma + PostgreSQL)", () => {
  const nombreZona = `Zona Test ${Date.now()}`;

  afterAll(async () => {
    await prisma.zonaEducativa.deleteMany({ where: { nombre: nombreZona } });
    await prisma.$disconnect();
  });

  it("crea zona → institución → sede → grado → grupo y respeta las relaciones", async () => {
    const zona = await prisma.zonaEducativa.create({
      data: { nombre: nombreZona },
    });

    const institucion = await prisma.institucion.create({
      data: {
        nombre: "Institución Educativa MANDI",
        codigoDane: `DANE-${Date.now()}`,
        zonaId: zona.id,
      },
    });

    const sede = await prisma.sede.create({
      data: {
        nombre: "Sede Rural 01",
        codigoDaneSede: `SEDE-${Date.now()}`,
        institucionId: institucion.id,
      },
    });

    const grado = await prisma.grado.create({
      data: { nombre: `Quinto ${Date.now()}`, nivel: 5 },
    });

    const grupo = await prisma.grupo.create({
      data: {
        sedeId: sede.id,
        gradoId: grado.id,
        nombre: "01",
        jornadaEscolar: "UNICA",
        anioLectivo: 2026,
      },
    });

    const sedeConRelaciones = await prisma.sede.findUniqueOrThrow({
      where: { id: sede.id },
      include: { institucion: { include: { zona: true } }, grupos: true },
    });

    expect(sedeConRelaciones.institucion.zona.nombre).toBe(nombreZona);
    expect(sedeConRelaciones.grupos).toHaveLength(1);
    expect(sedeConRelaciones.grupos[0]?.id).toBe(grupo.id);

    await prisma.grupo.delete({ where: { id: grupo.id } });
    await prisma.grado.delete({ where: { id: grado.id } });
    await prisma.sede.delete({ where: { id: sede.id } });
    await prisma.institucion.delete({ where: { id: institucion.id } });
  });
});
