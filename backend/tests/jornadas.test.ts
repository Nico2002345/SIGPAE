import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/modules/auth/password.js";
import { seedRolesYPermisos } from "../prisma/seedData.js";

const app = createApp();
const sufijo = Date.now();
const operadorLogin = `operador.jornadas.${sufijo}`;
const docenteLogin = `docente.jornadas.${sufijo}`;
const passwordPrueba = "ClaveSegura123";

describe("Jornada PAE", () => {
  let tokenOperador: string;
  let tokenDocente: string;
  let usuarioOperadorId: string;
  let usuarioDocenteId: string;
  let zonaId: number;
  let institucionId: number;
  let sedeId: number;
  let jornadaId: string;
  const fecha = "2026-10-01";

  beforeAll(async () => {
    await seedRolesYPermisos(prisma);

    const [rolOperador, rolDocente] = await Promise.all([
      prisma.rol.findUniqueOrThrow({ where: { nombre: "OPERADOR" } }),
      prisma.rol.findUniqueOrThrow({ where: { nombre: "DOCENTE" } }),
    ]);
    const passwordHash = await hashPassword(passwordPrueba);

    const operador = await prisma.usuario.create({
      data: { nombreCompleto: "Operador Jornadas", usuarioLogin: operadorLogin, passwordHash, rolId: rolOperador.id },
    });
    usuarioOperadorId = operador.id;

    const docente = await prisma.usuario.create({
      data: { nombreCompleto: "Docente Jornadas", usuarioLogin: docenteLogin, passwordHash, rolId: rolDocente.id },
    });
    usuarioDocenteId = docente.id;

    tokenOperador = (
      await request(app).post("/auth/login").send({ usuarioLogin: operadorLogin, password: passwordPrueba })
    ).body.accessToken;
    tokenDocente = (
      await request(app).post("/auth/login").send({ usuarioLogin: docenteLogin, password: passwordPrueba })
    ).body.accessToken;

    const zona = await prisma.zonaEducativa.create({ data: { nombre: `Zona Jornadas ${sufijo}` } });
    zonaId = zona.id;
    const institucion = await prisma.institucion.create({
      data: { nombre: "Institución Jornadas Test", codigoDane: `DANE-JOR-${sufijo}`, zonaId },
    });
    institucionId = institucion.id;
    const sede = await prisma.sede.create({
      data: { nombre: "Sede Jornadas Test", codigoDaneSede: `DANE-SEDE-JOR-${sufijo}`, institucionId },
    });
    sedeId = sede.id;
  });

  afterAll(async () => {
    await prisma.jornadaPae.deleteMany({ where: { sedeId } });
    await prisma.sede.deleteMany({ where: { id: sedeId } });
    await prisma.institucion.deleteMany({ where: { id: institucionId } });
    await prisma.zonaEducativa.deleteMany({ where: { id: zonaId } });
    await prisma.sesionRefresco.deleteMany({
      where: { usuarioId: { in: [usuarioOperadorId, usuarioDocenteId] } },
    });
    await prisma.usuario.deleteMany({ where: { id: { in: [usuarioOperadorId, usuarioDocenteId] } } });
    await prisma.$disconnect();
  });

  it("bloquea a un docente abriendo una jornada", async () => {
    const res = await request(app)
      .post("/jornadas/abrir")
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ sedeId, fecha });
    expect(res.status).toBe(403);
  });

  it("un operador abre la jornada del día y rechaza abrirla dos veces", async () => {
    const res = await request(app)
      .post("/jornadas/abrir")
      .set("Authorization", `Bearer ${tokenOperador}`)
      .send({ sedeId, fecha });

    expect(res.status).toBe(201);
    expect(res.body.jornada.estado).toBe("ABIERTA");
    jornadaId = res.body.jornada.id;

    const duplicado = await request(app)
      .post("/jornadas/abrir")
      .set("Authorization", `Bearer ${tokenOperador}`)
      .send({ sedeId, fecha });
    expect(duplicado.status).toBe(409);
  });

  it("un docente puede consultar la jornada aunque no pueda gestionarla", async () => {
    const res = await request(app)
      .get(`/jornadas/${jornadaId}`)
      .set("Authorization", `Bearer ${tokenDocente}`);
    expect(res.status).toBe(200);
    expect(res.body.jornada.estado).toBe("ABIERTA");
  });

  it("rechaza cerrar directamente sin pasar antes por una transición válida cuando ya está cerrada", async () => {
    const paseAEntrega = await request(app)
      .post(`/jornadas/${jornadaId}/iniciar-entrega`)
      .set("Authorization", `Bearer ${tokenOperador}`);
    expect(paseAEntrega.status).toBe(200);
    expect(paseAEntrega.body.jornada.estado).toBe("EN_ENTREGA");

    const cierre = await request(app)
      .post(`/jornadas/${jornadaId}/cerrar`)
      .set("Authorization", `Bearer ${tokenOperador}`);
    expect(cierre.status).toBe(200);
    expect(cierre.body.jornada.estado).toBe("CERRADA");
    expect(cierre.body.jornada.horaCierre).not.toBeNull();

    const reintentoEntrega = await request(app)
      .post(`/jornadas/${jornadaId}/iniciar-entrega`)
      .set("Authorization", `Bearer ${tokenOperador}`);
    expect(reintentoEntrega.status).toBe(409);
  });

  it("filtra el listado por sede y estado", async () => {
    const res = await request(app)
      .get(`/jornadas?sedeId=${sedeId}&estado=CERRADA`)
      .set("Authorization", `Bearer ${tokenOperador}`);
    expect(res.status).toBe(200);
    expect(res.body.jornadas.some((j: { id: string }) => j.id === jornadaId)).toBe(true);
  });
});
