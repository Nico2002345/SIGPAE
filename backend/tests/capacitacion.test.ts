import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/modules/auth/password.js";
import { seedRolesYPermisos } from "../prisma/seedData.js";

const app = createApp();
const sufijo = Date.now();
const maestroLogin = `maestro.capacitacion.${sufijo}`;
const docenteLogin = `docente.capacitacion.${sufijo}`;
const passwordPrueba = "ClaveSegura123";

describe("Capacitación (modo práctica)", () => {
  let tokenMaestro: string;
  let tokenDocente: string;
  let usuarioMaestroId: string;
  let usuarioDocenteId: string;
  let institucionId: number;
  let sedeId: number;
  let jornadaId: string;
  let estudianteId: string;
  let qrToken: string;

  beforeAll(async () => {
    await seedRolesYPermisos(prisma);

    const [rolMaestro, rolDocente] = await Promise.all([
      prisma.rol.findUniqueOrThrow({ where: { nombre: "MAESTRO" } }),
      prisma.rol.findUniqueOrThrow({ where: { nombre: "DOCENTE" } }),
    ]);
    const passwordHash = await hashPassword(passwordPrueba);

    const maestro = await prisma.usuario.create({
      data: { nombreCompleto: "Maestro Capacitación", usuarioLogin: maestroLogin, passwordHash, rolId: rolMaestro.id },
    });
    usuarioMaestroId = maestro.id;
    const docente = await prisma.usuario.create({
      data: { nombreCompleto: "Docente Capacitación", usuarioLogin: docenteLogin, passwordHash, rolId: rolDocente.id },
    });
    usuarioDocenteId = docente.id;

    tokenMaestro = (
      await request(app).post("/auth/login").send({ usuarioLogin: maestroLogin, password: passwordPrueba })
    ).body.accessToken;
    tokenDocente = (
      await request(app).post("/auth/login").send({ usuarioLogin: docenteLogin, password: passwordPrueba })
    ).body.accessToken;
  });

  afterAll(async () => {
    await prisma.sesionRefresco.deleteMany({
      where: { usuarioId: { in: [usuarioMaestroId, usuarioDocenteId] } },
    });
    await prisma.usuario.deleteMany({ where: { id: { in: [usuarioMaestroId, usuarioDocenteId] } } });
    await prisma.$disconnect();
  });

  it("bloquea a un docente generando un entorno de práctica", async () => {
    const res = await request(app)
      .post("/capacitacion/entorno")
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ cantidadEstudiantes: 3 });
    expect(res.status).toBe(403);
  });

  it("genera un entorno ficticio completo (institución, sede, estudiantes con QR, jornada)", async () => {
    const res = await request(app)
      .post("/capacitacion/entorno")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ cantidadEstudiantes: 3 });

    expect(res.status).toBe(201);
    const { entorno } = res.body;
    expect(entorno.institucion.esCapacitacion).toBe(true);
    expect(entorno.sede.esCapacitacion).toBe(true);
    expect(entorno.estudiantes).toHaveLength(3);
    expect(entorno.jornada.estado).toBe("ABIERTA");

    institucionId = entorno.institucion.id;
    sedeId = entorno.sede.id;
    jornadaId = entorno.jornada.id;
    estudianteId = entorno.estudiantes[0].id;
    qrToken = entorno.estudiantes[0].qrToken;
    expect(qrToken).toBeTruthy();
  });

  it("los listados reales NO incluyen los datos de práctica por defecto, pero sí con esCapacitacion=true", async () => {
    const institucionesReales = await request(app)
      .get("/instituciones")
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(institucionesReales.body.instituciones.some((i: { id: number }) => i.id === institucionId)).toBe(false);

    const institucionesPractica = await request(app)
      .get("/instituciones?esCapacitacion=true")
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(institucionesPractica.body.instituciones.some((i: { id: number }) => i.id === institucionId)).toBe(true);

    const estudiantesReales = await request(app)
      .get(`/estudiantes?sedeId=${sedeId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(estudiantesReales.body.estudiantes).toHaveLength(0);

    const estudiantesPractica = await request(app)
      .get(`/estudiantes?sedeId=${sedeId}&esCapacitacion=true`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(estudiantesPractica.body.estudiantes).toHaveLength(3);

    const jornadasReales = await request(app)
      .get(`/jornadas?sedeId=${sedeId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(jornadasReales.body.jornadas).toHaveLength(0);
  });

  it("permite practicar el flujo real de asistencia y entrega contra los datos ficticios", async () => {
    const asistencia = await request(app)
      .post("/asistencia")
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ jornadaId, estudianteId, estado: "ASISTIO" });
    expect(asistencia.status).toBe(201);

    const entrega = await request(app)
      .post("/entregas")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ token: qrToken, jornadaId });
    expect(entrega.status).toBe(201);
    expect(entrega.body.entrega.resultado).toBe("AUTORIZADA");
    expect(entrega.body.entrega.sedeId).toBe(sedeId);
  });

  it("los reportes consolidados NO cuentan las entregas ficticias por defecto", async () => {
    const res = await request(app)
      .get(`/reportes/consolidado/sede?sedeId=${sedeId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(res.status).toBe(200);
    expect(res.body.consolidado_por_sede).toHaveLength(0);

    const resPractica = await request(app)
      .get(`/reportes/consolidado/sede?sedeId=${sedeId}&esCapacitacion=true`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(resPractica.body.consolidado_por_sede[0].totalRacionesEntregadas).toBe(1);
  });

  it("bloquea purgar una institución que no es de capacitación", async () => {
    const zonaReal = await prisma.zonaEducativa.create({ data: { nombre: `Zona Real Capacitación ${sufijo}` } });
    const institucionReal = await prisma.institucion.create({
      data: { nombre: "Institución Real Test", codigoDane: `DANE-REAL-CAP-${sufijo}`, zonaId: zonaReal.id },
    });

    const res = await request(app)
      .delete(`/capacitacion/entorno/${institucionReal.id}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(res.status).toBe(403);

    await prisma.institucion.delete({ where: { id: institucionReal.id } });
    await prisma.zonaEducativa.delete({ where: { id: zonaReal.id } });
  });

  it("purga el entorno de práctica y lo borra físicamente", async () => {
    const res = await request(app)
      .delete(`/capacitacion/entorno/${institucionId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(res.status).toBe(204);

    const institucion = await prisma.institucion.findUnique({ where: { id: institucionId } });
    expect(institucion).toBeNull();
    const sede = await prisma.sede.findUnique({ where: { id: sedeId } });
    expect(sede).toBeNull();
    const jornada = await prisma.jornadaPae.findUnique({ where: { id: jornadaId } });
    expect(jornada).toBeNull();
    const estudiante = await prisma.estudiante.findUnique({ where: { id: estudianteId } });
    expect(estudiante).toBeNull();
  });

  let escenarioId: number;

  it("crea un escenario de capacitación y bloquea el código duplicado", async () => {
    const res = await request(app)
      .post("/capacitacion/escenarios")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ codigo: `ESC-${sufijo}`, nombre: "Escenario de prueba" });
    expect(res.status).toBe(201);
    escenarioId = res.body.escenario.id;

    const duplicado = await request(app)
      .post("/capacitacion/escenarios")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ codigo: `ESC-${sufijo}`, nombre: "Otro nombre" });
    expect(duplicado.status).toBe(409);

    const listado = await request(app)
      .get("/capacitacion/escenarios")
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(listado.body.escenarios.some((e: { id: number }) => e.id === escenarioId)).toBe(true);
  });

  it("registra y lista una evaluación de capacitación", async () => {
    const res = await request(app)
      .post("/capacitacion/evaluaciones")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ escenarioId, usuarioId: usuarioDocenteId, resultado: "APROBADO", observaciones: "Buen manejo" });
    expect(res.status).toBe(201);

    const listado = await request(app)
      .get(`/capacitacion/evaluaciones?usuarioId=${usuarioDocenteId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(listado.body.evaluaciones).toHaveLength(1);
    expect(listado.body.evaluaciones[0].resultado).toBe("APROBADO");

    await prisma.evaluacionCapacitacion.deleteMany({ where: { escenarioId } });
    await prisma.escenarioCapacitacion.delete({ where: { id: escenarioId } });
  });
});
