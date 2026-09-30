import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/modules/auth/password.js";
import { seedRolesYPermisos } from "../prisma/seedData.js";

const app = createApp();
const sufijo = Date.now();
const manipuladoraLogin = `manipuladora.bt.${sufijo}`;
const coordinadorLogin = `coordinador.bt.${sufijo}`;
const maestroLogin = `maestro.bt.${sufijo}`;
const passwordPrueba = "ClaveSegura123";

describe("Sincronización por Bluetooth (relevo manipuladora -> coordinador)", () => {
  let tokenCoordinador: string;
  let tokenMaestro: string;
  let usuarioManipuladoraId: string;
  let usuarioCoordinadorId: string;
  let usuarioMaestroId: string;
  let zonaId: number;
  let institucionId: number;
  let sedeId: number;
  let jornadaId: string;
  let estudianteId: string;
  let dispositivoCoordinadorId: string;
  const identificadorManipuladora = `tablet-manipuladora-${sufijo}`;

  beforeAll(async () => {
    await seedRolesYPermisos(prisma);

    const [rolManipuladora, rolCoordinador, rolMaestro] = await Promise.all([
      prisma.rol.findUniqueOrThrow({ where: { nombre: "MANIPULADORA" } }),
      prisma.rol.findUniqueOrThrow({ where: { nombre: "COORDINADOR_LOGISTICO" } }),
      prisma.rol.findUniqueOrThrow({ where: { nombre: "MAESTRO" } }),
    ]);
    const passwordHash = await hashPassword(passwordPrueba);

    const manipuladora = await prisma.usuario.create({
      data: { nombreCompleto: "Manipuladora BT", usuarioLogin: manipuladoraLogin, passwordHash, rolId: rolManipuladora.id },
    });
    usuarioManipuladoraId = manipuladora.id;
    const coordinador = await prisma.usuario.create({
      data: { nombreCompleto: "Coordinador BT", usuarioLogin: coordinadorLogin, passwordHash, rolId: rolCoordinador.id },
    });
    usuarioCoordinadorId = coordinador.id;
    const maestro = await prisma.usuario.create({
      data: { nombreCompleto: "Maestro BT", usuarioLogin: maestroLogin, passwordHash, rolId: rolMaestro.id },
    });
    usuarioMaestroId = maestro.id;

    tokenCoordinador = (
      await request(app).post("/auth/login").send({ usuarioLogin: coordinadorLogin, password: passwordPrueba })
    ).body.accessToken;
    tokenMaestro = (
      await request(app).post("/auth/login").send({ usuarioLogin: maestroLogin, password: passwordPrueba })
    ).body.accessToken;

    const zona = await prisma.zonaEducativa.create({ data: { nombre: `Zona BT ${sufijo}` } });
    zonaId = zona.id;
    const institucion = await prisma.institucion.create({
      data: { nombre: "Institución BT Test", codigoDane: `DANE-BT-${sufijo}`, zonaId },
    });
    institucionId = institucion.id;
    const sede = await prisma.sede.create({
      data: { nombre: "Sede BT Test", codigoDaneSede: `DANE-SEDE-BT-${sufijo}`, institucionId },
    });
    sedeId = sede.id;

    const jornada = await request(app)
      .post("/jornadas/abrir")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ sedeId, fecha: "2026-10-16" });
    jornadaId = jornada.body.jornada.id;

    const estudiante = await prisma.estudiante.create({
      data: {
        idPae: `PAE-2026-${String(sufijo).slice(-6)}`,
        tipoIdentificador: "PAE",
        nombres: "Bluetooth",
        apellidos: "Test",
        sedeId,
        institucionId,
        origen: "SIMAT",
      },
    });
    estudianteId = estudiante.id;

    const dispositivoCoordinador = await request(app)
      .post("/dispositivos/registrar")
      .set("Authorization", `Bearer ${tokenCoordinador}`)
      .send({ identificadorUnico: `disp-coordinador-${sufijo}`, tipo: "ANDROID", nombre: "Celular coordinador" });
    dispositivoCoordinadorId = dispositivoCoordinador.body.dispositivo.id;
  });

  afterAll(async () => {
    await prisma.sincronizacion.deleteMany({ where: {} }).catch(() => undefined);
    const dispManipuladora = await prisma.dispositivo.findUnique({
      where: { identificadorUnico: identificadorManipuladora },
    });
    await prisma.colaSincronizacion.deleteMany({
      where: { dispositivoId: { in: [dispositivoCoordinadorId, dispManipuladora?.id ?? ""] } },
    });
    await prisma.sincronizacion.deleteMany({
      where: { dispositivoId: { in: [dispositivoCoordinadorId, dispManipuladora?.id ?? ""] } },
    });
    await prisma.asistencia.deleteMany({ where: { jornadaId } });
    if (dispManipuladora) await prisma.dispositivo.deleteMany({ where: { id: dispManipuladora.id } });
    await prisma.dispositivo.deleteMany({ where: { id: dispositivoCoordinadorId } });
    await prisma.jornadaPae.deleteMany({ where: { id: jornadaId } });
    await prisma.estudiante.deleteMany({ where: { id: estudianteId } });
    await prisma.sede.deleteMany({ where: { id: sedeId } });
    await prisma.institucion.deleteMany({ where: { id: institucionId } });
    await prisma.zonaEducativa.deleteMany({ where: { id: zonaId } });
    await prisma.sesionRefresco.deleteMany({
      where: { usuarioId: { in: [usuarioManipuladoraId, usuarioCoordinadorId, usuarioMaestroId] } },
    });
    await prisma.usuario.deleteMany({
      where: { id: { in: [usuarioManipuladoraId, usuarioCoordinadorId, usuarioMaestroId] } },
    });
    await prisma.$disconnect();
  });

  it("rechaza un lote BLUETOOTH sin dispositivoOrigen", async () => {
    const res = await request(app)
      .post("/sincronizacion/lote")
      .set("Authorization", `Bearer ${tokenCoordinador}`)
      .send({
        dispositivoId: dispositivoCoordinadorId,
        tipo: "BLUETOOTH",
        cambios: [
          {
            entidad: "Asistencia",
            entidadId: "local-bt-1",
            operacion: "INSERT",
            payload: { estudianteId, jornadaId, estado: "ASISTIO" },
            timestampLocal: new Date().toISOString(),
          },
        ],
      });
    expect(res.status).toBe(400);
  });

  it("relev a por Bluetooth: registra el dispositivo de origen y atribuye el cambio a la manipuladora, no al coordinador", async () => {
    const res = await request(app)
      .post("/sincronizacion/lote")
      .set("Authorization", `Bearer ${tokenCoordinador}`)
      .send({
        dispositivoId: dispositivoCoordinadorId,
        tipo: "BLUETOOTH",
        dispositivoOrigen: {
          identificadorUnico: identificadorManipuladora,
          tipo: "ANDROID",
          usuarioId: usuarioManipuladoraId,
          nombre: "Tablet manipuladora",
        },
        cambios: [
          {
            entidad: "Asistencia",
            entidadId: "local-bt-asistencia-1",
            operacion: "INSERT",
            payload: { estudianteId, jornadaId, estado: "ASISTIO" },
            timestampLocal: new Date().toISOString(),
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.resumen).toEqual({ total: 1, confirmados: 1, conflictos: 0 });
    expect(res.body.sincronizacion.dispositivoRelayId).toBe(dispositivoCoordinadorId);
    expect(res.body.sincronizacion.usuarioId).toBe(usuarioManipuladoraId);
    expect(res.body.sincronizacion.dispositivoId).not.toBe(dispositivoCoordinadorId);

    const dispositivoOrigen = await prisma.dispositivo.findUnique({
      where: { identificadorUnico: identificadorManipuladora },
    });
    expect(dispositivoOrigen).not.toBeNull();
    expect(res.body.sincronizacion.dispositivoId).toBe(dispositivoOrigen!.id);

    const asistencia = await prisma.asistencia.findUnique({
      where: { estudianteId_jornadaId: { estudianteId, jornadaId } },
    });
    expect(asistencia?.usuarioId).toBe(usuarioManipuladoraId);
    expect(asistencia?.dispositivoId).toBe(dispositivoOrigen!.id);
  });

  it("reenviar el mismo relevo es reanudable: no duplica aunque se reintente tras una interrupción", async () => {
    const dispositivoOrigen = await prisma.dispositivo.findUniqueOrThrow({
      where: { identificadorUnico: identificadorManipuladora },
    });

    const res = await request(app)
      .post("/sincronizacion/lote")
      .set("Authorization", `Bearer ${tokenCoordinador}`)
      .send({
        dispositivoId: dispositivoCoordinadorId,
        tipo: "BLUETOOTH",
        dispositivoOrigen: { id: dispositivoOrigen.id },
        cambios: [
          {
            entidad: "Asistencia",
            entidadId: "local-bt-asistencia-1",
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

  it("no permite atribuir el relevo a un usuario inexistente (no se puede fabricar autoría)", async () => {
    const res = await request(app)
      .post("/sincronizacion/lote")
      .set("Authorization", `Bearer ${tokenCoordinador}`)
      .send({
        dispositivoId: dispositivoCoordinadorId,
        tipo: "BLUETOOTH",
        dispositivoOrigen: {
          identificadorUnico: `tablet-fantasma-${sufijo}`,
          tipo: "ANDROID",
          usuarioId: "00000000-0000-0000-0000-000000000000",
        },
        cambios: [
          {
            entidad: "Asistencia",
            entidadId: "local-bt-fantasma",
            operacion: "INSERT",
            payload: { estudianteId, jornadaId, estado: "ASISTIO" },
            timestampLocal: new Date().toISOString(),
          },
        ],
      });

    expect(res.status).toBe(404);
  });

  it("no permite relevar a nombre de un dispositivo de origen inexistente (por id)", async () => {
    const res = await request(app)
      .post("/sincronizacion/lote")
      .set("Authorization", `Bearer ${tokenCoordinador}`)
      .send({
        dispositivoId: dispositivoCoordinadorId,
        tipo: "BLUETOOTH",
        dispositivoOrigen: { id: "00000000-0000-0000-0000-000000000000" },
        cambios: [
          {
            entidad: "Asistencia",
            entidadId: "local-bt-sin-origen",
            operacion: "INSERT",
            payload: { estudianteId, jornadaId, estado: "ASISTIO" },
            timestampLocal: new Date().toISOString(),
          },
        ],
      });

    expect(res.status).toBe(404);
  });
});
