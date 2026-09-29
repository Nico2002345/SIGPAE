import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/modules/auth/password.js";
import { seedRolesYPermisos } from "../prisma/seedData.js";

const app = createApp();
const sufijo = Date.now();
const docenteLogin = `docente.asistencia.${sufijo}`;
const maestroLogin = `maestro.asistencia.${sufijo}`;
const passwordPrueba = "ClaveSegura123";

describe("Asistencia", () => {
  let tokenDocente: string;
  let tokenMaestro: string;
  let usuarioDocenteId: string;
  let usuarioMaestroId: string;
  let zonaId: number;
  let institucionId: number;
  let sedeId: number;
  let otraSedeId: number;
  let estudianteId: string;
  let estudianteOtraSedeId: string;
  let jornadaId: string;

  beforeAll(async () => {
    await seedRolesYPermisos(prisma);

    const [rolDocente, rolMaestro] = await Promise.all([
      prisma.rol.findUniqueOrThrow({ where: { nombre: "DOCENTE" } }),
      prisma.rol.findUniqueOrThrow({ where: { nombre: "MAESTRO" } }),
    ]);
    const passwordHash = await hashPassword(passwordPrueba);

    const docente = await prisma.usuario.create({
      data: { nombreCompleto: "Docente Asistencia", usuarioLogin: docenteLogin, passwordHash, rolId: rolDocente.id },
    });
    usuarioDocenteId = docente.id;
    const maestro = await prisma.usuario.create({
      data: { nombreCompleto: "Maestro Asistencia", usuarioLogin: maestroLogin, passwordHash, rolId: rolMaestro.id },
    });
    usuarioMaestroId = maestro.id;

    tokenDocente = (
      await request(app).post("/auth/login").send({ usuarioLogin: docenteLogin, password: passwordPrueba })
    ).body.accessToken;
    tokenMaestro = (
      await request(app).post("/auth/login").send({ usuarioLogin: maestroLogin, password: passwordPrueba })
    ).body.accessToken;

    const zona = await prisma.zonaEducativa.create({ data: { nombre: `Zona Asistencia ${sufijo}` } });
    zonaId = zona.id;
    const institucion = await prisma.institucion.create({
      data: { nombre: "Institución Asistencia Test", codigoDane: `DANE-ASIS-${sufijo}`, zonaId },
    });
    institucionId = institucion.id;
    const sede = await prisma.sede.create({
      data: { nombre: "Sede Asistencia Test", codigoDaneSede: `DANE-SEDE-ASIS-${sufijo}`, institucionId },
    });
    sedeId = sede.id;
    const otraSede = await prisma.sede.create({
      data: { nombre: "Otra Sede Asistencia", codigoDaneSede: `DANE-SEDE-ASIS-OTRA-${sufijo}`, institucionId },
    });
    otraSedeId = otraSede.id;

    const estudiante = await prisma.estudiante.create({
      data: {
        idPae: `PAE-2026-${String(sufijo).slice(-6)}`,
        tipoIdentificador: "PAE",
        nombres: "Luis",
        apellidos: "Martínez",
        sedeId,
        institucionId,
        origen: "SIMAT",
      },
    });
    estudianteId = estudiante.id;

    const estudianteOtraSede = await prisma.estudiante.create({
      data: {
        idPae: `PAE-2027-${String(sufijo).slice(-6)}`,
        tipoIdentificador: "PAE",
        nombres: "Otro",
        apellidos: "Estudiante",
        sedeId: otraSedeId,
        institucionId,
        origen: "SIMAT",
      },
    });
    estudianteOtraSedeId = estudianteOtraSede.id;

    const jornada = await request(app)
      .post("/jornadas/abrir")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ sedeId, fecha: "2026-10-05" });
    jornadaId = jornada.body.jornada.id;
  });

  afterAll(async () => {
    await prisma.solicitudModificacion.deleteMany({
      where: { asistencia: { jornadaId } },
    });
    await prisma.asistencia.deleteMany({ where: { jornadaId } });
    await prisma.jornadaPae.deleteMany({ where: { id: jornadaId } });
    await prisma.estudiante.deleteMany({ where: { id: { in: [estudianteId, estudianteOtraSedeId] } } });
    await prisma.sede.deleteMany({ where: { id: { in: [sedeId, otraSedeId] } } });
    await prisma.institucion.deleteMany({ where: { id: institucionId } });
    await prisma.zonaEducativa.deleteMany({ where: { id: zonaId } });
    await prisma.sesionRefresco.deleteMany({
      where: { usuarioId: { in: [usuarioDocenteId, usuarioMaestroId] } },
    });
    await prisma.usuario.deleteMany({ where: { id: { in: [usuarioDocenteId, usuarioMaestroId] } } });
    await prisma.$disconnect();
  });

  let asistenciaId: string;

  it("rechaza registrar asistencia de un estudiante de otra sede", async () => {
    const res = await request(app)
      .post("/asistencia")
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ jornadaId, estudianteId: estudianteOtraSedeId, estado: "ASISTIO" });
    expect(res.status).toBe(400);
  });

  it("un docente registra asistencia y puede corregirla mientras la jornada esté abierta", async () => {
    const res = await request(app)
      .post("/asistencia")
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ jornadaId, estudianteId, estado: "NO_ASISTIO" });
    expect(res.status).toBe(201);
    asistenciaId = res.body.asistencia.id;
    expect(res.body.asistencia.bloqueada).toBe(false);

    const correccion = await request(app)
      .post("/asistencia")
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ jornadaId, estudianteId, estado: "ASISTIO" });
    expect(correccion.status).toBe(201);
    expect(correccion.body.asistencia.id).toBe(asistenciaId);
    expect(correccion.body.asistencia.estado).toBe("ASISTIO");
  });

  it("al cerrar la jornada, la asistencia queda bloqueada y no se puede corregir directamente", async () => {
    const cierre = await request(app)
      .post(`/jornadas/${jornadaId}/cerrar`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(cierre.status).toBe(200);

    const intento = await request(app)
      .post("/asistencia")
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ jornadaId, estudianteId, estado: "NO_ASISTIO" });
    expect(intento.status).toBe(409);
  });

  let solicitudId: string;

  it("permite solicitar una modificación tras el cierre y bloquea una segunda solicitud pendiente", async () => {
    const res = await request(app)
      .post(`/asistencia/${asistenciaId}/solicitudes`)
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ valorPropuesto: "NO_ASISTIO", motivo: "Se equivocó al marcar, el estudiante no vino" });
    expect(res.status).toBe(201);
    solicitudId = res.body.solicitud.id;
    expect(res.body.solicitud.estado).toBe("PENDIENTE");

    const duplicada = await request(app)
      .post(`/asistencia/${asistenciaId}/solicitudes`)
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ valorPropuesto: "NO_ASISTIO", motivo: "Otra vez" });
    expect(duplicada.status).toBe(409);
  });

  it("bloquea a un docente resolviendo su propia solicitud", async () => {
    const res = await request(app)
      .post(`/asistencia/solicitudes/${solicitudId}/resolver`)
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ aprobar: true });
    expect(res.status).toBe(403);
  });

  it("dos resoluciones simultáneas de la misma solicitud solo aplican una", async () => {
    const estudianteConcurrente = await prisma.estudiante.create({
      data: {
        idPae: `PAE-2026-${String(sufijo).slice(-4)}99`,
        tipoIdentificador: "PAE",
        nombres: "Concurrente",
        apellidos: "Test",
        sedeId,
        institucionId,
        origen: "SIMAT",
      },
    });
    // La jornada ya está cerrada en este punto del archivo: se crea la
    // asistencia directamente ya bloqueada, como quedaría tras un cierre.
    const asistenciaConcurrente = await prisma.asistencia.create({
      data: {
        estudianteId: estudianteConcurrente.id,
        jornadaId,
        estado: "ASISTIO",
        usuarioId: usuarioDocenteId,
        bloqueada: true,
      },
    });
    const solicitudConcurrente = await request(app)
      .post(`/asistencia/${asistenciaConcurrente.id}/solicitudes`)
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ valorPropuesto: "NO_ASISTIO", motivo: "Prueba de concurrencia" });
    expect(solicitudConcurrente.status).toBe(201);

    const [primera, segunda] = await Promise.all([
      request(app)
        .post(`/asistencia/solicitudes/${solicitudConcurrente.body.solicitud.id}/resolver`)
        .set("Authorization", `Bearer ${tokenMaestro}`)
        .send({ aprobar: true }),
      request(app)
        .post(`/asistencia/solicitudes/${solicitudConcurrente.body.solicitud.id}/resolver`)
        .set("Authorization", `Bearer ${tokenMaestro}`)
        .send({ aprobar: false }),
    ]);

    const estados = [primera.status, segunda.status];
    expect(estados.filter((s) => s === 200)).toHaveLength(1);
    expect(estados.filter((s) => s === 409)).toHaveLength(1);

    await prisma.solicitudModificacion.deleteMany({ where: { asistenciaId: asistenciaConcurrente.id } });
    await prisma.asistencia.delete({ where: { id: asistenciaConcurrente.id } });
    await prisma.estudiante.delete({ where: { id: estudianteConcurrente.id } });
  });

  it("el maestro aprueba la solicitud y el estado de la asistencia cambia", async () => {
    const res = await request(app)
      .post(`/asistencia/solicitudes/${solicitudId}/resolver`)
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ aprobar: true });
    expect(res.status).toBe(200);
    expect(res.body.solicitud.estado).toBe("APROBADA");

    const historial = await request(app)
      .get(`/asistencia/estudiante/${estudianteId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    const registro = historial.body.asistencias.find((a: { id: string }) => a.id === asistenciaId);
    expect(registro.estado).toBe("NO_ASISTIO");
    expect(registro.bloqueada).toBe(true);

    const reintento = await request(app)
      .post(`/asistencia/solicitudes/${solicitudId}/resolver`)
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ aprobar: true });
    expect(reintento.status).toBe(409);
  });
});
