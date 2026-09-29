import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/modules/auth/password.js";
import { seedRolesYPermisos } from "../prisma/seedData.js";

const app = createApp();
const sufijo = Date.now();
const maestroLogin = `maestro.qr.${sufijo}`;
const operadorLogin = `operador.qr.${sufijo}`;
const passwordPrueba = "ClaveSegura123";

describe("QR de estudiantes", () => {
  let tokenMaestro: string;
  let tokenOperador: string;
  let usuarioMaestroId: string;
  let usuarioOperadorId: string;
  let zonaId: number;
  let institucionId: number;
  let sedeId: number;
  let estudianteId: string;

  beforeAll(async () => {
    await seedRolesYPermisos(prisma);

    const [rolMaestro, rolOperador] = await Promise.all([
      prisma.rol.findUniqueOrThrow({ where: { nombre: "MAESTRO" } }),
      prisma.rol.findUniqueOrThrow({ where: { nombre: "OPERADOR" } }),
    ]);
    const passwordHash = await hashPassword(passwordPrueba);

    const maestro = await prisma.usuario.create({
      data: { nombreCompleto: "Maestro QR", usuarioLogin: maestroLogin, passwordHash, rolId: rolMaestro.id },
    });
    usuarioMaestroId = maestro.id;

    const operador = await prisma.usuario.create({
      data: { nombreCompleto: "Operador QR", usuarioLogin: operadorLogin, passwordHash, rolId: rolOperador.id },
    });
    usuarioOperadorId = operador.id;

    tokenMaestro = (
      await request(app).post("/auth/login").send({ usuarioLogin: maestroLogin, password: passwordPrueba })
    ).body.accessToken;
    tokenOperador = (
      await request(app).post("/auth/login").send({ usuarioLogin: operadorLogin, password: passwordPrueba })
    ).body.accessToken;

    const zona = await prisma.zonaEducativa.create({ data: { nombre: `Zona QR ${sufijo}` } });
    zonaId = zona.id;
    const institucion = await prisma.institucion.create({
      data: { nombre: "Institución QR Test", codigoDane: `DANE-QR-${sufijo}`, zonaId },
    });
    institucionId = institucion.id;
    const sede = await prisma.sede.create({
      data: { nombre: "Sede QR Test", codigoDaneSede: `DANE-SEDE-QR-${sufijo}`, institucionId },
    });
    sedeId = sede.id;

    const estudiante = await prisma.estudiante.create({
      data: {
        idPae: `PAE-2026-${String(sufijo).slice(-6)}`,
        tipoIdentificador: "PAE",
        nombres: "Ana",
        apellidos: "Torres",
        sedeId,
        institucionId,
        origen: "SIMAT",
      },
    });
    estudianteId = estudiante.id;
  });

  afterAll(async () => {
    await prisma.qrCode.deleteMany({ where: { estudianteId } });
    await prisma.estudiante.deleteMany({ where: { id: estudianteId } });
    await prisma.sede.deleteMany({ where: { id: sedeId } });
    await prisma.institucion.deleteMany({ where: { id: institucionId } });
    await prisma.zonaEducativa.deleteMany({ where: { id: zonaId } });
    await prisma.sesionRefresco.deleteMany({
      where: { usuarioId: { in: [usuarioMaestroId, usuarioOperadorId] } },
    });
    await prisma.usuario.deleteMany({ where: { id: { in: [usuarioMaestroId, usuarioOperadorId] } } });
    await prisma.$disconnect();
  });

  it("bloquea a un operador generando un QR", async () => {
    const res = await request(app)
      .post(`/qr/estudiantes/${estudianteId}`)
      .set("Authorization", `Bearer ${tokenOperador}`);
    expect(res.status).toBe(403);
  });

  let primerToken: string;

  it("genera un QR con un token opaco (no el id_pae) y rechaza generar uno duplicado", async () => {
    const res = await request(app)
      .post(`/qr/estudiantes/${estudianteId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);

    expect(res.status).toBe(201);
    expect(res.body.qr.token).not.toContain("PAE-");
    expect(res.body.qr.estado).toBe("ACTIVO");
    expect(res.body.qr.versionCarnet).toBe(1);
    primerToken = res.body.qr.token;

    const duplicado = await request(app)
      .post(`/qr/estudiantes/${estudianteId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(duplicado.status).toBe(409);
  });

  it("no genera ni reemite un QR para un estudiante retirado", async () => {
    const estudianteRetirado = await prisma.estudiante.create({
      data: {
        idPae: `PAE-2026-${String(sufijo).slice(-5)}9`,
        tipoIdentificador: "PAE",
        nombres: "Retirado",
        apellidos: "Test",
        sedeId,
        institucionId,
        origen: "SIMAT",
        estado: "RETIRADO",
      },
    });

    const generar = await request(app)
      .post(`/qr/estudiantes/${estudianteRetirado.id}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(generar.status).toBe(409);

    await prisma.estudiante.delete({ where: { id: estudianteRetirado.id } });
  });

  it("genera la imagen del QR como data URL", async () => {
    const res = await request(app)
      .get(`/qr/estudiantes/${estudianteId}/imagen`)
      .set("Authorization", `Bearer ${tokenMaestro}`);

    expect(res.status).toBe(200);
    expect(res.body.imagenDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("permite a un operador resolver el token escaneado", async () => {
    const res = await request(app)
      .get(`/qr/resolver?token=${encodeURIComponent(primerToken)}`)
      .set("Authorization", `Bearer ${tokenOperador}`);

    expect(res.status).toBe(200);
    expect(res.body.estudiante.id).toBe(estudianteId);
  });

  it("rechaza un token inexistente", async () => {
    const res = await request(app)
      .get("/qr/resolver?token=token-que-no-existe")
      .set("Authorization", `Bearer ${tokenOperador}`);
    expect(res.status).toBe(404);
  });

  it("revoca el QR y el token deja de resolver", async () => {
    const revocado = await request(app)
      .post(`/qr/estudiantes/${estudianteId}/revocar`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(revocado.status).toBe(200);
    expect(revocado.body.qr.estado).toBe("REVOCADO");

    const resolver = await request(app)
      .get(`/qr/resolver?token=${encodeURIComponent(primerToken)}`)
      .set("Authorization", `Bearer ${tokenOperador}`);
    expect(resolver.status).toBe(409);
  });

  it("reemite un QR nuevo tras la revocación, invalidando el token anterior", async () => {
    const reemitido = await request(app)
      .post(`/qr/estudiantes/${estudianteId}/reemitir`)
      .set("Authorization", `Bearer ${tokenMaestro}`);

    expect(reemitido.status).toBe(200);
    expect(reemitido.body.qr.estado).toBe("ACTIVO");
    expect(reemitido.body.qr.versionCarnet).toBe(2);
    expect(reemitido.body.qr.token).not.toBe(primerToken);

    const resolverViejo = await request(app)
      .get(`/qr/resolver?token=${encodeURIComponent(primerToken)}`)
      .set("Authorization", `Bearer ${tokenOperador}`);
    expect(resolverViejo.status).toBe(404);

    const resolverNuevo = await request(app)
      .get(`/qr/resolver?token=${encodeURIComponent(reemitido.body.qr.token)}`)
      .set("Authorization", `Bearer ${tokenOperador}`);
    expect(resolverNuevo.status).toBe(200);
  });
});
