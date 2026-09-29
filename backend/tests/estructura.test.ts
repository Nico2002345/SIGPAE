import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/modules/auth/password.js";
import { seedRolesYPermisos } from "../prisma/seedData.js";

const app = createApp();
const sufijo = Date.now();
const maestroLogin = `maestro.estructura.${sufijo}`;
const docenteLogin = `docente.estructura.${sufijo}`;
const passwordPrueba = "ClaveSegura123";

describe("Estructura educativa (zonas, instituciones, sedes, grados, grupos)", () => {
  let tokenMaestro: string;
  let tokenDocente: string;
  let usuarioMaestroId: string;
  let usuarioDocenteId: string;
  let zonaId: number;
  let institucionId: number;
  let sedeId: number;
  let gradoId: number;

  beforeAll(async () => {
    await seedRolesYPermisos(prisma);

    const [rolMaestro, rolDocente] = await Promise.all([
      prisma.rol.findUniqueOrThrow({ where: { nombre: "MAESTRO" } }),
      prisma.rol.findUniqueOrThrow({ where: { nombre: "DOCENTE" } }),
    ]);

    const passwordHash = await hashPassword(passwordPrueba);

    const maestro = await prisma.usuario.create({
      data: { nombreCompleto: "Maestro Estructura", usuarioLogin: maestroLogin, passwordHash, rolId: rolMaestro.id },
    });
    usuarioMaestroId = maestro.id;

    const docente = await prisma.usuario.create({
      data: { nombreCompleto: "Docente Estructura", usuarioLogin: docenteLogin, passwordHash, rolId: rolDocente.id },
    });
    usuarioDocenteId = docente.id;

    const loginMaestro = await request(app)
      .post("/auth/login")
      .send({ usuarioLogin: maestroLogin, password: passwordPrueba });
    tokenMaestro = loginMaestro.body.accessToken;

    const loginDocente = await request(app)
      .post("/auth/login")
      .send({ usuarioLogin: docenteLogin, password: passwordPrueba });
    tokenDocente = loginDocente.body.accessToken;
  });

  afterAll(async () => {
    await prisma.grupo.deleteMany({ where: { sedeId } });
    await prisma.sede.deleteMany({ where: { id: sedeId } });
    await prisma.institucion.deleteMany({ where: { id: institucionId } });
    await prisma.zonaEducativa.deleteMany({ where: { id: zonaId } });
    await prisma.grado.deleteMany({ where: { id: gradoId } });
    await prisma.sesionRefresco.deleteMany({
      where: { usuarioId: { in: [usuarioMaestroId, usuarioDocenteId] } },
    });
    await prisma.usuario.deleteMany({ where: { id: { in: [usuarioMaestroId, usuarioDocenteId] } } });
    await prisma.$disconnect();
  });

  it("bloquea a un docente creando una zona educativa", async () => {
    const res = await request(app)
      .post("/zonas")
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ nombre: `Zona Test Prohibida ${sufijo}` });

    expect(res.status).toBe(403);
  });

  it("permite al maestro crear una zona educativa y rechaza el nombre duplicado", async () => {
    const res = await request(app)
      .post("/zonas")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ nombre: `Zona Test ${sufijo}` });

    expect(res.status).toBe(201);
    zonaId = res.body.zona.id;

    const duplicado = await request(app)
      .post("/zonas")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ nombre: `Zona Test ${sufijo}` });
    expect(duplicado.status).toBe(409);
  });

  it("rechaza crear una institución en una zona inexistente", async () => {
    const res = await request(app)
      .post("/instituciones")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ nombre: "Institución Fantasma", codigoDane: `DANE-${sufijo}-X`, zonaId: 999999 });

    expect(res.status).toBe(404);
  });

  it("crea una institución válida dentro de la zona", async () => {
    const res = await request(app)
      .post("/instituciones")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ nombre: "Institución Test", codigoDane: `DANE-${sufijo}`, zonaId });

    expect(res.status).toBe(201);
    institucionId = res.body.institucion.id;
  });

  it("crea una sede válida dentro de la institución y la lista filtrando por institución", async () => {
    const res = await request(app)
      .post("/sedes")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ nombre: "Sede Principal Test", codigoDaneSede: `DANE-SEDE-${sufijo}`, institucionId });

    expect(res.status).toBe(201);
    sedeId = res.body.sede.id;

    const listado = await request(app)
      .get(`/sedes?institucionId=${institucionId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);

    expect(listado.status).toBe(200);
    expect(listado.body.sedes.some((s: { id: number }) => s.id === sedeId)).toBe(true);
  });

  it("crea un grado y un grupo, y rechaza el grupo duplicado", async () => {
    const grado = await request(app)
      .post("/grados")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ nombre: `Grado Test ${sufijo}`, nivel: 1 });
    expect(grado.status).toBe(201);
    gradoId = grado.body.grado.id;

    const grupo = await request(app)
      .post("/grupos")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ sedeId, gradoId, nombre: "01", jornadaEscolar: "MANANA", anioLectivo: 2026 });
    expect(grupo.status).toBe(201);

    const duplicado = await request(app)
      .post("/grupos")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ sedeId, gradoId, nombre: "01", jornadaEscolar: "MANANA", anioLectivo: 2026 });
    expect(duplicado.status).toBe(409);
  });

  it("desactiva una sede mediante edición de estado", async () => {
    const res = await request(app)
      .patch(`/sedes/${sedeId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ estado: "INACTIVO" });

    expect(res.status).toBe(200);
    expect(res.body.sede.estado).toBe("INACTIVO");
  });
});
