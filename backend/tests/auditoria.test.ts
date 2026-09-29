import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/modules/auth/password.js";
import { seedRolesYPermisos } from "../prisma/seedData.js";

const app = createApp();
const sufijo = Date.now();
const maestroLogin = `maestro.auditoria.${sufijo}`;
const docenteLogin = `docente.auditoria.${sufijo}`;
const passwordPrueba = "ClaveSegura123";

describe("Auditoría", () => {
  let tokenMaestro: string;
  let tokenDocente: string;
  let usuarioMaestroId: string;
  let usuarioDocenteId: string;
  let usuarioCreadoId: string;
  let zonaId: number;
  let institucionId: number;
  let sedeId: number;
  let estudianteId: string;

  beforeAll(async () => {
    await seedRolesYPermisos(prisma);

    const [rolMaestro, rolDocente] = await Promise.all([
      prisma.rol.findUniqueOrThrow({ where: { nombre: "MAESTRO" } }),
      prisma.rol.findUniqueOrThrow({ where: { nombre: "DOCENTE" } }),
    ]);
    const passwordHash = await hashPassword(passwordPrueba);

    const maestro = await prisma.usuario.create({
      data: { nombreCompleto: "Maestro Auditoria", usuarioLogin: maestroLogin, passwordHash, rolId: rolMaestro.id },
    });
    usuarioMaestroId = maestro.id;
    const docente = await prisma.usuario.create({
      data: { nombreCompleto: "Docente Auditoria", usuarioLogin: docenteLogin, passwordHash, rolId: rolDocente.id },
    });
    usuarioDocenteId = docente.id;

    tokenMaestro = (
      await request(app).post("/auth/login").send({ usuarioLogin: maestroLogin, password: passwordPrueba })
    ).body.accessToken;
    tokenDocente = (
      await request(app).post("/auth/login").send({ usuarioLogin: docenteLogin, password: passwordPrueba })
    ).body.accessToken;

    const zona = await prisma.zonaEducativa.create({ data: { nombre: `Zona Auditoria ${sufijo}` } });
    zonaId = zona.id;
    const institucion = await prisma.institucion.create({
      data: { nombre: "Institución Auditoria Test", codigoDane: `DANE-AUD-${sufijo}`, zonaId },
    });
    institucionId = institucion.id;
    const sede = await prisma.sede.create({
      data: { nombre: "Sede Auditoria Test", codigoDaneSede: `DANE-SEDE-AUD-${sufijo}`, institucionId },
    });
    sedeId = sede.id;

    const estudiante = await prisma.estudiante.create({
      data: {
        idPae: `PAE-2026-${String(sufijo).slice(-6)}`,
        tipoIdentificador: "PAE",
        nombres: "Auditado",
        apellidos: "Test",
        sedeId,
        institucionId,
        origen: "SIMAT",
      },
    });
    estudianteId = estudiante.id;
  });

  afterAll(async () => {
    await prisma.auditoria.deleteMany({
      where: { OR: [{ entidadId: usuarioCreadoId }, { entidadId: estudianteId }] },
    });
    await prisma.qrCode.deleteMany({ where: { estudianteId } });
    await prisma.estudiante.deleteMany({ where: { id: estudianteId } });
    await prisma.sede.deleteMany({ where: { id: sedeId } });
    await prisma.institucion.deleteMany({ where: { id: institucionId } });
    await prisma.zonaEducativa.deleteMany({ where: { id: zonaId } });
    await prisma.sesionRefresco.deleteMany({
      where: { usuarioId: { in: [usuarioMaestroId, usuarioDocenteId] } },
    });
    await prisma.usuario.deleteMany({
      where: { id: { in: [usuarioMaestroId, usuarioDocenteId, usuarioCreadoId].filter(Boolean) } },
    });
    await prisma.$disconnect();
  });

  it("bloquea a un docente consultando la auditoría", async () => {
    const res = await request(app).get("/auditoria").set("Authorization", `Bearer ${tokenDocente}`);
    expect(res.status).toBe(403);
  });

  it("registra la creación de un usuario sin exponer la contraseña", async () => {
    const rolDocente = await prisma.rol.findUniqueOrThrow({ where: { nombre: "DOCENTE" } });
    const res = await request(app)
      .post("/usuarios")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({
        nombreCompleto: "Usuario Auditado",
        usuarioLogin: `auditado.${sufijo}`,
        password: "ClaveSegura123",
        rolId: rolDocente.id,
      });
    expect(res.status).toBe(201);
    usuarioCreadoId = res.body.usuario.id;

    const auditoria = await request(app)
      .get(`/auditoria?entidad=Usuario&entidadId=${usuarioCreadoId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);

    expect(auditoria.status).toBe(200);
    expect(auditoria.body.auditoria).toHaveLength(1);
    const registro = auditoria.body.auditoria[0];
    expect(registro.accion).toBe("usuario.crear");
    expect(registro.usuario.id).toBe(usuarioMaestroId);
    expect(JSON.stringify(registro.valorNuevo)).not.toMatch(/passwordHash|ClaveSegura/);
  });

  it("registra la generación y revocación de un QR sin exponer el token", async () => {
    const generar = await request(app)
      .post(`/qr/estudiantes/${estudianteId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(generar.status).toBe(201);
    const tokenGenerado: string = generar.body.qr.token;

    await request(app)
      .post(`/qr/estudiantes/${estudianteId}/revocar`)
      .set("Authorization", `Bearer ${tokenMaestro}`);

    const auditoria = await request(app)
      .get(`/auditoria?entidad=QrCode`)
      .set("Authorization", `Bearer ${tokenMaestro}`);

    expect(auditoria.status).toBe(200);
    const acciones = auditoria.body.auditoria.map((a: { accion: string }) => a.accion);
    expect(acciones).toEqual(expect.arrayContaining(["qr.generar", "qr.revocar"]));
    expect(JSON.stringify(auditoria.body.auditoria)).not.toContain(tokenGenerado);
  });

  it("no expone ningún endpoint para borrar o editar registros de auditoría", async () => {
    const cualquiera = await request(app)
      .get("/auditoria?entidad=Usuario")
      .set("Authorization", `Bearer ${tokenMaestro}`);
    const idExistente = cualquiera.body.auditoria[0]?.id;
    expect(idExistente).toBeDefined();

    const intentoBorrar = await request(app)
      .delete(`/auditoria/${idExistente}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(intentoBorrar.status).toBe(404);

    const intentoEditar = await request(app)
      .patch(`/auditoria/${idExistente}`)
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ motivo: "manipulado" });
    expect(intentoEditar.status).toBe(404);
  });
});
