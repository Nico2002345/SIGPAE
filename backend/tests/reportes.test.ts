import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/modules/auth/password.js";
import { seedRolesYPermisos } from "../prisma/seedData.js";

const app = createApp();
const sufijo = Date.now();
const maestroLogin = `maestro.reportes.${sufijo}`;
const docenteLogin = `docente.reportes.${sufijo}`;
const passwordPrueba = "ClaveSegura123";

describe("Reportes", () => {
  let tokenMaestro: string;
  let tokenDocente: string;
  let usuarioMaestroId: string;
  let usuarioDocenteId: string;
  let zonaId: number;
  let institucionId: number;
  let sedeId: number;
  let jornadaId: string;
  let estudianteAsistioId: string;
  let estudianteNoAsistioId: string;
  let estudianteProvisionalId: string;

  beforeAll(async () => {
    await seedRolesYPermisos(prisma);

    const [rolMaestro, rolDocente] = await Promise.all([
      prisma.rol.findUniqueOrThrow({ where: { nombre: "MAESTRO" } }),
      prisma.rol.findUniqueOrThrow({ where: { nombre: "DOCENTE" } }),
    ]);
    const passwordHash = await hashPassword(passwordPrueba);

    const maestro = await prisma.usuario.create({
      data: { nombreCompleto: "Maestro Reportes", usuarioLogin: maestroLogin, passwordHash, rolId: rolMaestro.id },
    });
    usuarioMaestroId = maestro.id;
    const docente = await prisma.usuario.create({
      data: { nombreCompleto: "Docente Reportes", usuarioLogin: docenteLogin, passwordHash, rolId: rolDocente.id },
    });
    usuarioDocenteId = docente.id;

    tokenMaestro = (
      await request(app).post("/auth/login").send({ usuarioLogin: maestroLogin, password: passwordPrueba })
    ).body.accessToken;
    tokenDocente = (
      await request(app).post("/auth/login").send({ usuarioLogin: docenteLogin, password: passwordPrueba })
    ).body.accessToken;

    const zona = await prisma.zonaEducativa.create({ data: { nombre: `Zona Reportes ${sufijo}` } });
    zonaId = zona.id;
    const institucion = await prisma.institucion.create({
      data: { nombre: "Institución Reportes Test", codigoDane: `DANE-REP-${sufijo}`, zonaId },
    });
    institucionId = institucion.id;
    const sede = await prisma.sede.create({
      data: { nombre: "Sede Reportes Test", codigoDaneSede: `DANE-SEDE-REP-${sufijo}`, institucionId },
    });
    sedeId = sede.id;

    const jornada = await request(app)
      .post("/jornadas/abrir")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ sedeId, fecha: "2026-10-12" });
    jornadaId = jornada.body.jornada.id;

    const asistio = await prisma.estudiante.create({
      data: {
        idPae: `PAE-2026-${String(sufijo).slice(-5)}1`,
        tipoIdentificador: "PAE",
        nombres: "Reporte",
        apellidos: "Asistió",
        sedeId,
        institucionId,
        origen: "SIMAT",
      },
    });
    estudianteAsistioId = asistio.id;

    const noAsistio = await prisma.estudiante.create({
      data: {
        idPae: `PAE-2026-${String(sufijo).slice(-5)}2`,
        tipoIdentificador: "PAE",
        nombres: "Reporte",
        apellidos: "NoAsistió",
        sedeId,
        institucionId,
        origen: "SIMAT",
      },
    });
    estudianteNoAsistioId = noAsistio.id;

    const provisional = await request(app)
      .post("/estudiantes/provisionales")
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ nombres: "Reporte", apellidos: "Provisional", sedeId, institucionId });
    estudianteProvisionalId = provisional.body.estudiante.id;

    await request(app)
      .post("/asistencia")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ jornadaId, estudianteId: estudianteAsistioId, estado: "ASISTIO" });

    const qrAsistio = await request(app)
      .post(`/qr/estudiantes/${estudianteAsistioId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);

    await request(app)
      .post("/entregas")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ token: qrAsistio.body.qr.token, jornadaId });

    const qrNoAsistio = await request(app)
      .post(`/qr/estudiantes/${estudianteNoAsistioId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    await request(app)
      .post("/entregas")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ token: qrNoAsistio.body.qr.token, jornadaId });
  });

  afterAll(async () => {
    await prisma.entrega.deleteMany({ where: { jornadaId } });
    await prisma.asistencia.deleteMany({ where: { jornadaId } });
    await prisma.qrCode.deleteMany({
      where: { estudianteId: { in: [estudianteAsistioId, estudianteNoAsistioId] } },
    });
    await prisma.jornadaPae.deleteMany({ where: { id: jornadaId } });
    await prisma.estudiante.deleteMany({
      where: { id: { in: [estudianteAsistioId, estudianteNoAsistioId, estudianteProvisionalId] } },
    });
    await prisma.sede.deleteMany({ where: { id: sedeId } });
    await prisma.institucion.deleteMany({ where: { id: institucionId } });
    await prisma.zonaEducativa.deleteMany({ where: { id: zonaId } });
    await prisma.sesionRefresco.deleteMany({
      where: { usuarioId: { in: [usuarioMaestroId, usuarioDocenteId] } },
    });
    await prisma.usuario.deleteMany({ where: { id: { in: [usuarioMaestroId, usuarioDocenteId] } } });
    await prisma.$disconnect();
  });

  it("bloquea a un docente accediendo a reportes", async () => {
    const res = await request(app)
      .get(`/reportes/asistencia-diaria?jornadaId=${jornadaId}`)
      .set("Authorization", `Bearer ${tokenDocente}`);
    expect(res.status).toBe(403);
  });

  it("reporta inasistencias: solo aparece el estudiante que no asistió", async () => {
    const res = await request(app)
      .get(`/reportes/inasistencias?jornadaId=${jornadaId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(res.status).toBe(200);
    const ids = res.body.inasistencias.map((e: { id: string }) => e.id);
    expect(ids).toContain(estudianteNoAsistioId);
    expect(ids).not.toContain(estudianteAsistioId);
  });

  it("reporta intentos rechazados con el motivo", async () => {
    const res = await request(app)
      .get(`/reportes/intentos-rechazados?jornadaId=${jornadaId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(res.status).toBe(200);
    expect(res.body.intentos_rechazados).toHaveLength(1);
    expect(res.body.intentos_rechazados[0].motivoRechazo).toMatch(/no registra asistencia/);
  });

  it("reporta estudiantes provisionales", async () => {
    const res = await request(app)
      .get(`/reportes/estudiantes-provisionales?sedeId=${sedeId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(res.status).toBe(200);
    expect(res.body.estudiantes_provisionales.some((e: { idPae: string }) => e.idPae.startsWith("TEMP-"))).toBe(
      true,
    );
  });

  it("consolida por sede con beneficiarios y raciones correctos", async () => {
    const res = await request(app)
      .get(`/reportes/consolidado/sede?sedeId=${sedeId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(res.status).toBe(200);
    expect(res.body.consolidado_por_sede).toEqual([
      {
        sedeId,
        sede: "Sede Reportes Test",
        beneficiariosAtendidos: 1,
        racionesNormales: 1,
        redistribuciones: 0,
        totalRacionesEntregadas: 1,
      },
    ]);
  });

  it("consolida por zona agregando la institución", async () => {
    const res = await request(app)
      .get(`/reportes/consolidado/zona?zonaId=${zonaId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(res.status).toBe(200);
    expect(res.body.consolidado_por_zona[0].totalRacionesEntregadas).toBe(1);
  });

  it("exporta el reporte de asistencia diaria como archivo Excel", async () => {
    const res = await request(app)
      .get(`/reportes/asistencia-diaria?jornadaId=${jornadaId}&formato=excel`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("spreadsheetml");
    expect(res.headers["content-disposition"]).toContain("asistencia_diaria.xlsx");
  });
});
