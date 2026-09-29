import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/modules/auth/password.js";
import { seedRolesYPermisos } from "../prisma/seedData.js";

const app = createApp();
const sufijo = Date.now();
const operadorLogin = `operador.entregas.${sufijo}`;
const maestroLogin = `maestro.entregas.${sufijo}`;
const passwordPrueba = "ClaveSegura123";

describe("Entregas y redistribución", () => {
  let tokenOperador: string;
  let tokenMaestro: string;
  let usuarioOperadorId: string;
  let usuarioMaestroId: string;
  let zonaId: number;
  let institucionId: number;
  let sedeId: number;
  let otraSedeId: number;
  let jornadaId: string;

  let estudianteAsistioId: string;
  let qrAsistioToken: string;
  let estudianteNoAsistioId: string;
  let qrNoAsistioToken: string;
  let estudianteOtraSedeId: string;
  let qrOtraSedeToken: string;

  beforeAll(async () => {
    await seedRolesYPermisos(prisma);

    const [rolOperador, rolMaestro] = await Promise.all([
      prisma.rol.findUniqueOrThrow({ where: { nombre: "OPERADOR" } }),
      prisma.rol.findUniqueOrThrow({ where: { nombre: "MAESTRO" } }),
    ]);
    const passwordHash = await hashPassword(passwordPrueba);

    const operador = await prisma.usuario.create({
      data: { nombreCompleto: "Operador Entregas", usuarioLogin: operadorLogin, passwordHash, rolId: rolOperador.id },
    });
    usuarioOperadorId = operador.id;
    const maestro = await prisma.usuario.create({
      data: { nombreCompleto: "Maestro Entregas", usuarioLogin: maestroLogin, passwordHash, rolId: rolMaestro.id },
    });
    usuarioMaestroId = maestro.id;

    tokenOperador = (
      await request(app).post("/auth/login").send({ usuarioLogin: operadorLogin, password: passwordPrueba })
    ).body.accessToken;
    tokenMaestro = (
      await request(app).post("/auth/login").send({ usuarioLogin: maestroLogin, password: passwordPrueba })
    ).body.accessToken;

    const zona = await prisma.zonaEducativa.create({ data: { nombre: `Zona Entregas ${sufijo}` } });
    zonaId = zona.id;
    const institucion = await prisma.institucion.create({
      data: { nombre: "Institución Entregas Test", codigoDane: `DANE-ENT-${sufijo}`, zonaId },
    });
    institucionId = institucion.id;
    const sede = await prisma.sede.create({
      data: { nombre: "Sede Entregas Test", codigoDaneSede: `DANE-SEDE-ENT-${sufijo}`, institucionId },
    });
    sedeId = sede.id;
    const otraSede = await prisma.sede.create({
      data: { nombre: "Otra Sede Entregas", codigoDaneSede: `DANE-SEDE-ENT-OTRA-${sufijo}`, institucionId },
    });
    otraSedeId = otraSede.id;

    const jornada = await request(app)
      .post("/jornadas/abrir")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ sedeId, fecha: "2026-10-10" });
    jornadaId = jornada.body.jornada.id;

    let contadorEstudiantes = 0;
    async function crearEstudianteConQr(nombres: string, sede: number) {
      contadorEstudiantes += 1;
      const est = await prisma.estudiante.create({
        data: {
          idPae: `PAE-2026-${String(sufijo).slice(-5)}${contadorEstudiantes}`,
          tipoIdentificador: "PAE",
          nombres,
          apellidos: "Test",
          sedeId: sede,
          institucionId,
          origen: "SIMAT",
        },
      });
      const qrRes = await request(app)
        .post(`/qr/estudiantes/${est.id}`)
        .set("Authorization", `Bearer ${tokenMaestro}`);
      return { id: est.id, token: qrRes.body.qr.token as string };
    }

    const asistio = await crearEstudianteConQr("Asistió", sedeId);
    estudianteAsistioId = asistio.id;
    qrAsistioToken = asistio.token;

    const noAsistio = await crearEstudianteConQr("NoAsistió", sedeId);
    estudianteNoAsistioId = noAsistio.id;
    qrNoAsistioToken = noAsistio.token;

    const otraSedeEst = await crearEstudianteConQr("OtraSede", otraSedeId);
    estudianteOtraSedeId = otraSedeEst.id;
    qrOtraSedeToken = otraSedeEst.token;

    // La asistencia la registra un docente (permiso asistencia.registrar);
    // el operador solo entrega, por eso se usa tokenMaestro (tiene todos los permisos).
    await request(app)
      .post("/asistencia")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ jornadaId, estudianteId: estudianteAsistioId, estado: "ASISTIO" });
    await request(app)
      .post("/asistencia")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ jornadaId, estudianteId: estudianteNoAsistioId, estado: "NO_ASISTIO" });
  });

  afterAll(async () => {
    await prisma.entrega.deleteMany({ where: { jornadaId } });
    await prisma.asistencia.deleteMany({ where: { jornadaId } });
    await prisma.qrCode.deleteMany({
      where: { estudianteId: { in: [estudianteAsistioId, estudianteNoAsistioId, estudianteOtraSedeId] } },
    });
    await prisma.jornadaPae.deleteMany({ where: { id: jornadaId } });
    await prisma.estudiante.deleteMany({
      where: { id: { in: [estudianteAsistioId, estudianteNoAsistioId, estudianteOtraSedeId] } },
    });
    await prisma.sede.deleteMany({ where: { id: { in: [sedeId, otraSedeId] } } });
    await prisma.institucion.deleteMany({ where: { id: institucionId } });
    await prisma.zonaEducativa.deleteMany({ where: { id: zonaId } });
    await prisma.sesionRefresco.deleteMany({
      where: { usuarioId: { in: [usuarioOperadorId, usuarioMaestroId] } },
    });
    await prisma.usuario.deleteMany({ where: { id: { in: [usuarioOperadorId, usuarioMaestroId] } } });
    await prisma.$disconnect();
  });

  it("rechaza la entrega si el estudiante no asistió a clases", async () => {
    const res = await request(app)
      .post("/entregas")
      .set("Authorization", `Bearer ${tokenOperador}`)
      .send({ token: qrNoAsistioToken, jornadaId });

    expect(res.status).toBe(201);
    expect(res.body.entrega.resultado).toBe("RECHAZADA");
    expect(res.body.entrega.motivoRechazo).toMatch(/no registra asistencia/);
  });

  it("rechaza la entrega si el estudiante pertenece a otra sede", async () => {
    const res = await request(app)
      .post("/entregas")
      .set("Authorization", `Bearer ${tokenOperador}`)
      .send({ token: qrOtraSedeToken, jornadaId });

    expect(res.status).toBe(201);
    expect(res.body.entrega.resultado).toBe("RECHAZADA");
    expect(res.body.entrega.motivoRechazo).toMatch(/otra sede/);
  });

  it("autoriza la entrega normal de un estudiante que sí asistió y rechaza la segunda ración normal", async () => {
    const res = await request(app)
      .post("/entregas")
      .set("Authorization", `Bearer ${tokenOperador}`)
      .send({ token: qrAsistioToken, jornadaId });

    expect(res.status).toBe(201);
    expect(res.body.entrega.resultado).toBe("AUTORIZADA");
    expect(res.body.entrega.tipo).toBe("NORMAL");

    const segundaVez = await request(app)
      .post("/entregas")
      .set("Authorization", `Bearer ${tokenOperador}`)
      .send({ token: qrAsistioToken, jornadaId });
    expect(segundaVez.status).toBe(201);
    expect(segundaVez.body.entrega.resultado).toBe("RECHAZADA");
    expect(segundaVez.body.entrega.motivoRechazo).toMatch(/ya recibió/);
  });

  it("rechaza una redistribución sin entrega normal previa, y la autoriza cuando sí existe", async () => {
    const sinNormal = await request(app)
      .post("/entregas")
      .set("Authorization", `Bearer ${tokenOperador}`)
      .send({ token: qrNoAsistioToken, jornadaId, tipo: "REDISTRIBUCION" });
    expect(sinNormal.body.entrega.resultado).toBe("RECHAZADA");

    const redistribucion = await request(app)
      .post("/entregas")
      .set("Authorization", `Bearer ${tokenOperador}`)
      .send({ token: qrAsistioToken, jornadaId, tipo: "REDISTRIBUCION" });
    expect(redistribucion.status).toBe(201);
    expect(redistribucion.body.entrega.resultado).toBe("AUTORIZADA");
    expect(redistribucion.body.entrega.entregaOriginalId).not.toBeNull();
  });

  it("calcula el resumen de la jornada (beneficiarios, normales, redistribuciones)", async () => {
    const res = await request(app)
      .get(`/entregas/jornada/${jornadaId}/resumen`)
      .set("Authorization", `Bearer ${tokenMaestro}`);

    expect(res.status).toBe(200);
    expect(res.body.resumen).toEqual({
      beneficiariosAtendidos: 1,
      racionesNormales: 1,
      redistribuciones: 1,
      totalRacionesEntregadas: 2,
    });
  });

  it("rechaza si la jornada ya está cerrada", async () => {
    await request(app).post(`/jornadas/${jornadaId}/cerrar`).set("Authorization", `Bearer ${tokenMaestro}`);

    const nuevoEstudiante = await prisma.estudiante.create({
      data: {
        idPae: `PAE-2026-9${String(sufijo).slice(-5)}`,
        tipoIdentificador: "PAE",
        nombres: "Tarde",
        apellidos: "Test",
        sedeId,
        institucionId,
        origen: "SIMAT",
      },
    });
    const qrRes = await request(app)
      .post(`/qr/estudiantes/${nuevoEstudiante.id}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);

    const res = await request(app)
      .post("/entregas")
      .set("Authorization", `Bearer ${tokenOperador}`)
      .send({ token: qrRes.body.qr.token, jornadaId });

    expect(res.status).toBe(201);
    expect(res.body.entrega.resultado).toBe("RECHAZADA");
    expect(res.body.entrega.motivoRechazo).toMatch(/no está abierta/);

    await prisma.qrCode.delete({ where: { estudianteId: nuevoEstudiante.id } });
    await prisma.entrega.deleteMany({ where: { estudianteId: nuevoEstudiante.id } });
    await prisma.estudiante.delete({ where: { id: nuevoEstudiante.id } });
  });
});
