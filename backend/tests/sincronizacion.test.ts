import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/modules/auth/password.js";
import { seedRolesYPermisos } from "../prisma/seedData.js";

const app = createApp();
const sufijo = Date.now();
const docenteLogin = `docente.sync.${sufijo}`;
const maestroLogin = `maestro.sync.${sufijo}`;
const supervisorLogin = `supervisor.sync.${sufijo}`;
const passwordPrueba = "ClaveSegura123";

describe("Sincronización", () => {
  let tokenDocente: string;
  let tokenMaestro: string;
  let tokenSupervisor: string;
  let usuarioDocenteId: string;
  let usuarioMaestroId: string;
  let usuarioSupervisorId: string;
  let zonaId: number;
  let institucionId: number;
  let sedeId: number;
  let jornadaId: string;
  let estudianteId: string;
  let dispositivoId: string;

  beforeAll(async () => {
    await seedRolesYPermisos(prisma);

    const [rolDocente, rolMaestro, rolSupervisor] = await Promise.all([
      prisma.rol.findUniqueOrThrow({ where: { nombre: "DOCENTE" } }),
      prisma.rol.findUniqueOrThrow({ where: { nombre: "MAESTRO" } }),
      prisma.rol.findUniqueOrThrow({ where: { nombre: "SUPERVISION_PAE" } }),
    ]);
    const passwordHash = await hashPassword(passwordPrueba);

    const docente = await prisma.usuario.create({
      data: { nombreCompleto: "Docente Sync", usuarioLogin: docenteLogin, passwordHash, rolId: rolDocente.id },
    });
    usuarioDocenteId = docente.id;
    const maestro = await prisma.usuario.create({
      data: { nombreCompleto: "Maestro Sync", usuarioLogin: maestroLogin, passwordHash, rolId: rolMaestro.id },
    });
    usuarioMaestroId = maestro.id;
    const supervisor = await prisma.usuario.create({
      data: { nombreCompleto: "Supervisor Sync", usuarioLogin: supervisorLogin, passwordHash, rolId: rolSupervisor.id },
    });
    usuarioSupervisorId = supervisor.id;

    tokenDocente = (
      await request(app).post("/auth/login").send({ usuarioLogin: docenteLogin, password: passwordPrueba })
    ).body.accessToken;
    tokenMaestro = (
      await request(app).post("/auth/login").send({ usuarioLogin: maestroLogin, password: passwordPrueba })
    ).body.accessToken;
    tokenSupervisor = (
      await request(app).post("/auth/login").send({ usuarioLogin: supervisorLogin, password: passwordPrueba })
    ).body.accessToken;

    const zona = await prisma.zonaEducativa.create({ data: { nombre: `Zona Sync ${sufijo}` } });
    zonaId = zona.id;
    const institucion = await prisma.institucion.create({
      data: { nombre: "Institución Sync Test", codigoDane: `DANE-SYNC-${sufijo}`, zonaId },
    });
    institucionId = institucion.id;
    const sede = await prisma.sede.create({
      data: { nombre: "Sede Sync Test", codigoDaneSede: `DANE-SEDE-SYNC-${sufijo}`, institucionId },
    });
    sedeId = sede.id;

    const jornada = await request(app)
      .post("/jornadas/abrir")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ sedeId, fecha: "2026-10-15" });
    jornadaId = jornada.body.jornada.id;

    const estudiante = await prisma.estudiante.create({
      data: {
        idPae: `PAE-2026-${String(sufijo).slice(-6)}`,
        tipoIdentificador: "PAE",
        nombres: "Sync",
        apellidos: "Test",
        sedeId,
        institucionId,
        origen: "SIMAT",
      },
    });
    estudianteId = estudiante.id;

    const dispositivo = await request(app)
      .post("/dispositivos/registrar")
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ identificadorUnico: `disp-${sufijo}`, tipo: "ANDROID", nombre: "Tablet de prueba" });
    dispositivoId = dispositivo.body.dispositivo.id;
  });

  afterAll(async () => {
    await prisma.sincronizacion.deleteMany({ where: { dispositivoId } });
    await prisma.colaSincronizacion.deleteMany({ where: { dispositivoId } });
    await prisma.asistencia.deleteMany({ where: { jornadaId } });
    await prisma.dispositivo.deleteMany({ where: { id: dispositivoId } });
    await prisma.jornadaPae.deleteMany({ where: { id: jornadaId } });
    await prisma.estudiante.deleteMany({ where: { id: estudianteId } });
    await prisma.sede.deleteMany({ where: { id: sedeId } });
    await prisma.institucion.deleteMany({ where: { id: institucionId } });
    await prisma.zonaEducativa.deleteMany({ where: { id: zonaId } });
    await prisma.sesionRefresco.deleteMany({
      where: { usuarioId: { in: [usuarioDocenteId, usuarioMaestroId, usuarioSupervisorId] } },
    });
    await prisma.usuario.deleteMany({
      where: { id: { in: [usuarioDocenteId, usuarioMaestroId, usuarioSupervisorId] } },
    });
    await prisma.$disconnect();
  });

  it("registra un dispositivo de forma idempotente", async () => {
    const res = await request(app)
      .post("/dispositivos/registrar")
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ identificadorUnico: `disp-${sufijo}`, tipo: "ANDROID", nombre: "Tablet de prueba" });
    expect(res.status).toBe(201);
    expect(res.body.dispositivo.id).toBe(dispositivoId);
  });

  it("bloquea a un usuario sin permiso enviando un lote (SUPERVISION_PAE no tiene sincronizacion.registrar)", async () => {
    const res = await request(app)
      .post("/sincronizacion/lote")
      .set("Authorization", `Bearer ${tokenSupervisor}`)
      .send({
        dispositivoId,
        tipo: "INTERNET",
        cambios: [
          {
            entidad: "Asistencia",
            entidadId: "local-1",
            operacion: "INSERT",
            payload: { estudianteId, jornadaId, estado: "ASISTIO" },
            timestampLocal: new Date().toISOString(),
          },
        ],
      });
    expect(res.status).toBe(403);
  });

  it("procesa un lote válido y confirma el cambio", async () => {
    const res = await request(app)
      .post("/sincronizacion/lote")
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({
        dispositivoId,
        tipo: "INTERNET",
        cambios: [
          {
            entidad: "Asistencia",
            entidadId: "local-asistencia-1",
            operacion: "INSERT",
            payload: { estudianteId, jornadaId, estado: "ASISTIO" },
            timestampLocal: new Date().toISOString(),
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.resumen).toEqual({ total: 1, confirmados: 1, conflictos: 0 });
    expect(res.body.sincronizacion.estado).toBe("EXITOSA");

    const asistencia = await prisma.asistencia.findUnique({
      where: { estudianteId_jornadaId: { estudianteId, jornadaId } },
    });
    expect(asistencia?.estado).toBe("ASISTIO");
  });

  it("reenviar el mismo lote es idempotente: no duplica ni falla", async () => {
    const res = await request(app)
      .post("/sincronizacion/lote")
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({
        dispositivoId,
        tipo: "INTERNET",
        cambios: [
          {
            entidad: "Asistencia",
            entidadId: "local-asistencia-1",
            operacion: "INSERT",
            payload: { estudianteId, jornadaId, estado: "ASISTIO" },
            timestampLocal: new Date().toISOString(),
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.resumen).toEqual({ total: 1, confirmados: 1, conflictos: 0 });

    const totalAsistencias = await prisma.asistencia.count({ where: { estudianteId, jornadaId } });
    expect(totalAsistencias).toBe(1);
  });

  it("una corrección posterior (timestamp más reciente) gana sobre una más vieja, aunque lleguen en el mismo lote fuera de orden", async () => {
    const hace5Min = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const ahora = new Date().toISOString();

    const res = await request(app)
      .post("/sincronizacion/lote")
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({
        dispositivoId,
        tipo: "INTERNET",
        cambios: [
          {
            entidad: "Asistencia",
            entidadId: "local-asistencia-2",
            operacion: "UPDATE",
            payload: { estudianteId, jornadaId, estado: "NO_ASISTIO" },
            timestampLocal: ahora,
          },
          {
            entidad: "Asistencia",
            entidadId: "local-asistencia-1b",
            operacion: "UPDATE",
            payload: { estudianteId, jornadaId, estado: "ASISTIO" },
            timestampLocal: hace5Min,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.resumen.confirmados).toBe(2);

    const asistencia = await prisma.asistencia.findUnique({
      where: { estudianteId_jornadaId: { estudianteId, jornadaId } },
    });
    expect(asistencia?.estado).toBe("NO_ASISTIO");
  });

  it("marca CONFLICTO un cambio cuya jornada ya está cerrada, sin tumbar el resto del lote", async () => {
    await request(app).post(`/jornadas/${jornadaId}/cerrar`).set("Authorization", `Bearer ${tokenMaestro}`);

    const otroEstudiante = await prisma.estudiante.create({
      data: {
        idPae: `PAE-2026-${String(sufijo).slice(-5)}9`,
        tipoIdentificador: "PAE",
        nombres: "Sync",
        apellidos: "Cerrada",
        sedeId,
        institucionId,
        origen: "SIMAT",
      },
    });

    const res = await request(app)
      .post("/sincronizacion/lote")
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({
        dispositivoId,
        tipo: "INTERNET",
        cambios: [
          {
            entidad: "Asistencia",
            entidadId: "local-asistencia-jornada-cerrada",
            operacion: "INSERT",
            payload: { estudianteId: otroEstudiante.id, jornadaId, estado: "ASISTIO" },
            timestampLocal: new Date().toISOString(),
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.resumen).toEqual({ total: 1, confirmados: 0, conflictos: 1 });
    expect(res.body.sincronizacion.estado).toBe("FALLIDA");
    expect(res.body.conflictosDetalle[0].motivo).toMatch(/no está abierta/);

    await prisma.estudiante.delete({ where: { id: otroEstudiante.id } });
  });

  it("lista el historial de sincronizaciones", async () => {
    const res = await request(app)
      .get(`/sincronizacion?dispositivoId=${dispositivoId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(res.status).toBe(200);
    expect(res.body.sincronizaciones.length).toBeGreaterThan(0);
  });
});
