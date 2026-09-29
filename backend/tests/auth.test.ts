import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/modules/auth/password.js";
import { seedRolesYPermisos } from "../prisma/seedData.js";

const app = createApp();
const sufijo = Date.now();
const docenteLogin = `docente.test.${sufijo}`;
const maestroLogin = `maestro.test.${sufijo}`;
const passwordPrueba = "ClaveSegura123";

describe("Autenticación y permisos", () => {
  let usuarioDocenteId: string;
  let usuarioMaestroId: string;

  beforeAll(async () => {
    await seedRolesYPermisos(prisma);

    const [rolDocente, rolMaestro] = await Promise.all([
      prisma.rol.findUniqueOrThrow({ where: { nombre: "DOCENTE" } }),
      prisma.rol.findUniqueOrThrow({ where: { nombre: "MAESTRO" } }),
    ]);

    const passwordHash = await hashPassword(passwordPrueba);

    const docente = await prisma.usuario.create({
      data: {
        nombreCompleto: "Docente de Prueba",
        usuarioLogin: docenteLogin,
        passwordHash,
        rolId: rolDocente.id,
      },
    });
    usuarioDocenteId = docente.id;

    const maestro = await prisma.usuario.create({
      data: {
        nombreCompleto: "Maestro de Prueba",
        usuarioLogin: maestroLogin,
        passwordHash,
        rolId: rolMaestro.id,
      },
    });
    usuarioMaestroId = maestro.id;
  });

  afterAll(async () => {
    await prisma.sesionRefresco.deleteMany({
      where: { usuarioId: { in: [usuarioDocenteId, usuarioMaestroId] } },
    });
    await prisma.usuarioPermisoExtra.deleteMany({ where: { usuarioId: usuarioDocenteId } });
    await prisma.usuario.deleteMany({ where: { id: { in: [usuarioDocenteId, usuarioMaestroId] } } });
    await prisma.$disconnect();
  });

  it("rechaza login con contraseña incorrecta", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ usuarioLogin: docenteLogin, password: "incorrecta" });

    expect(res.status).toBe(401);
  });

  it("permite login con credenciales correctas y devuelve los permisos del rol", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ usuarioLogin: maestroLogin, password: passwordPrueba });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.usuario.permisos).toContain("usuarios.ver");
  });

  it("bloquea rutas protegidas sin token", async () => {
    const res = await request(app).get("/usuarios");
    expect(res.status).toBe(401);
  });

  it("bloquea a un usuario sin el permiso requerido", async () => {
    const login = await request(app)
      .post("/auth/login")
      .send({ usuarioLogin: docenteLogin, password: passwordPrueba });

    const res = await request(app)
      .get("/usuarios")
      .set("Authorization", `Bearer ${login.body.accessToken}`);

    expect(res.status).toBe(403);
  });

  it("otorga acceso tras conceder un permiso extra individual", async () => {
    const permisoVer = await prisma.permiso.findUniqueOrThrow({ where: { codigo: "usuarios.ver" } });
    await prisma.usuarioPermisoExtra.create({
      data: { usuarioId: usuarioDocenteId, permisoId: permisoVer.id, tipo: "OTORGADO" },
    });

    const login = await request(app)
      .post("/auth/login")
      .send({ usuarioLogin: docenteLogin, password: passwordPrueba });

    expect(login.body.usuario.permisos).toContain("usuarios.ver");

    const res = await request(app)
      .get("/usuarios")
      .set("Authorization", `Bearer ${login.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.usuarios)).toBe(true);
  });

  it("rota el refresh token y revoca el anterior", async () => {
    const login = await request(app)
      .post("/auth/login")
      .send({ usuarioLogin: maestroLogin, password: passwordPrueba });

    const primerRefresh = login.body.refreshToken as string;

    const refrescado = await request(app).post("/auth/refresh").send({ refreshToken: primerRefresh });
    expect(refrescado.status).toBe(200);
    expect(refrescado.body.accessToken).toBeDefined();

    const reintento = await request(app).post("/auth/refresh").send({ refreshToken: primerRefresh });
    expect(reintento.status).toBe(401);
  });

  it("revoca la sesión al hacer logout", async () => {
    const login = await request(app)
      .post("/auth/login")
      .send({ usuarioLogin: maestroLogin, password: passwordPrueba });

    const logout = await request(app)
      .post("/auth/logout")
      .send({ refreshToken: login.body.refreshToken });
    expect(logout.status).toBe(204);

    const intento = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: login.body.refreshToken });
    expect(intento.status).toBe(401);
  });
});
