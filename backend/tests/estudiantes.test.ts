import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/modules/auth/password.js";
import { seedRolesYPermisos } from "../prisma/seedData.js";

const app = createApp();
const sufijo = Date.now();
const maestroLogin = `maestro.estudiantes.${sufijo}`;
const docenteLogin = `docente.estudiantes.${sufijo}`;
const passwordPrueba = "ClaveSegura123";

describe("Estudiantes (oficiales y provisionales)", () => {
  let tokenMaestro: string;
  let tokenDocente: string;
  let usuarioMaestroId: string;
  let usuarioDocenteId: string;
  let zonaId: number;
  let institucionId: number;
  let sedeId: number;
  let otraSedeId: number;
  let estudianteOficialId: string;
  let estudianteProvisionalId: string;

  beforeAll(async () => {
    await seedRolesYPermisos(prisma);

    const [rolMaestro, rolDocente] = await Promise.all([
      prisma.rol.findUniqueOrThrow({ where: { nombre: "MAESTRO" } }),
      prisma.rol.findUniqueOrThrow({ where: { nombre: "DOCENTE" } }),
    ]);
    const passwordHash = await hashPassword(passwordPrueba);

    const maestro = await prisma.usuario.create({
      data: { nombreCompleto: "Maestro Estudiantes", usuarioLogin: maestroLogin, passwordHash, rolId: rolMaestro.id },
    });
    usuarioMaestroId = maestro.id;

    const docente = await prisma.usuario.create({
      data: { nombreCompleto: "Docente Estudiantes", usuarioLogin: docenteLogin, passwordHash, rolId: rolDocente.id },
    });
    usuarioDocenteId = docente.id;

    tokenMaestro = (
      await request(app).post("/auth/login").send({ usuarioLogin: maestroLogin, password: passwordPrueba })
    ).body.accessToken;
    tokenDocente = (
      await request(app).post("/auth/login").send({ usuarioLogin: docenteLogin, password: passwordPrueba })
    ).body.accessToken;

    const zona = await prisma.zonaEducativa.create({ data: { nombre: `Zona Estudiantes ${sufijo}` } });
    zonaId = zona.id;
    const institucion = await prisma.institucion.create({
      data: { nombre: "Institución Estudiantes Test", codigoDane: `DANE-EST-${sufijo}`, zonaId },
    });
    institucionId = institucion.id;
    const sede = await prisma.sede.create({
      data: { nombre: "Sede Estudiantes Test", codigoDaneSede: `DANE-SEDE-EST-${sufijo}`, institucionId },
    });
    sedeId = sede.id;
    const otraSede = await prisma.sede.create({
      data: { nombre: "Otra Sede Test", codigoDaneSede: `DANE-SEDE-OTRA-${sufijo}`, institucionId },
    });
    otraSedeId = otraSede.id;
  });

  afterAll(async () => {
    await prisma.novedad.deleteMany({ where: { sedeId: { in: [sedeId, otraSedeId] } } });
    await prisma.historicoEstudiante.deleteMany({
      where: { estudianteId: { in: [estudianteOficialId, estudianteProvisionalId].filter(Boolean) } },
    });
    await prisma.vinculacionProvisional.deleteMany({
      where: { estudianteTemporalId: estudianteProvisionalId },
    });
    await prisma.estudiante.deleteMany({ where: { sedeId: { in: [sedeId, otraSedeId] } } });
    await prisma.sede.deleteMany({ where: { id: { in: [sedeId, otraSedeId] } } });
    await prisma.institucion.deleteMany({ where: { id: institucionId } });
    await prisma.zonaEducativa.deleteMany({ where: { id: zonaId } });
    await prisma.sesionRefresco.deleteMany({
      where: { usuarioId: { in: [usuarioMaestroId, usuarioDocenteId] } },
    });
    await prisma.usuario.deleteMany({ where: { id: { in: [usuarioMaestroId, usuarioDocenteId] } } });
    await prisma.$disconnect();
  });

  it("bloquea a un docente creando un estudiante oficial", async () => {
    const res = await request(app)
      .post("/estudiantes")
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({
        idPae: `PAE-2026-${String(sufijo).slice(-6)}`,
        nombres: "Juan",
        apellidos: "Pérez",
        sedeId,
        institucionId,
      });

    expect(res.status).toBe(403);
  });

  it("rechaza un estudiante oficial cuya sede no pertenece a la institución indicada", async () => {
    const otraInstitucion = await prisma.institucion.create({
      data: { nombre: "Institución Ajena", codigoDane: `DANE-AJENA-${sufijo}`, zonaId },
    });

    const res = await request(app)
      .post("/estudiantes")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({
        idPae: `PAE-2026-${String(sufijo).slice(-6)}`,
        nombres: "Juan",
        apellidos: "Pérez",
        sedeId,
        institucionId: otraInstitucion.id,
      });

    expect(res.status).toBe(400);
    await prisma.institucion.delete({ where: { id: otraInstitucion.id } });
  });

  it("crea un estudiante oficial válido", async () => {
    const res = await request(app)
      .post("/estudiantes")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({
        idPae: `PAE-2026-${String(sufijo).slice(-6)}`,
        nombres: "Juan",
        apellidos: "Pérez",
        sedeId,
        institucionId,
      });

    expect(res.status).toBe(201);
    estudianteOficialId = res.body.estudiante.id;
    expect(res.body.estudiante.tipoIdentificador).toBe("PAE");
  });

  it("permite a un docente crear un estudiante provisional con id TEMP autogenerado", async () => {
    const res = await request(app)
      .post("/estudiantes/provisionales")
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ nombres: "María", apellidos: "Gómez", sedeId, institucionId });

    expect(res.status).toBe(201);
    estudianteProvisionalId = res.body.estudiante.id;
    expect(res.body.estudiante.tipoIdentificador).toBe("TEMP");
    expect(res.body.estudiante.idPae).toMatch(/^TEMP-\d{4}-\d{6}$/);
    expect(res.body.estudiante.estado).toBe("PROVISIONAL_PENDIENTE");
  });

  it("bloquea a un docente editando un estudiante oficial pero le permite editar uno provisional", async () => {
    const bloqueado = await request(app)
      .patch(`/estudiantes/${estudianteOficialId}`)
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ genero: "F" });
    expect(bloqueado.status).toBe(403);

    const permitido = await request(app)
      .patch(`/estudiantes/${estudianteProvisionalId}`)
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ genero: "F" });
    expect(permitido.status).toBe(200);

    const detalle = await request(app)
      .get(`/estudiantes/${estudianteProvisionalId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(detalle.body.estudiante.historico.some((h: { campo: string }) => h.campo === "genero")).toBe(true);
  });

  it("registra el retiro de un estudiante generando histórico y novedad", async () => {
    const res = await request(app)
      .post(`/estudiantes/${estudianteProvisionalId}/retirar`)
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ descripcion: "Se trasladó de vereda sin previo aviso" });

    expect(res.status).toBe(200);
    expect(res.body.estudiante.estado).toBe("RETIRADO");

    const novedades = await prisma.novedad.findMany({ where: { estudianteId: estudianteProvisionalId } });
    expect(novedades).toHaveLength(1);
    expect(novedades[0].tipo).toBe("RETIRO");

    const repetido = await request(app)
      .post(`/estudiantes/${estudianteProvisionalId}/retirar`)
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ descripcion: "Otra vez" });
    expect(repetido.status).toBe(409);
  });

  it("vincula un estudiante provisional con su registro oficial y bloquea vincular dos veces", async () => {
    const nuevoProvisional = await request(app)
      .post("/estudiantes/provisionales")
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ nombres: "Pedro", apellidos: "Ramírez", sedeId, institucionId });
    const provisionalId = nuevoProvisional.body.estudiante.id;

    const vinculacion = await request(app)
      .post(`/estudiantes/${provisionalId}/vincular-oficial`)
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ estudianteOficialId });
    expect(vinculacion.status).toBe(201);

    const detalleProvisional = await request(app)
      .get(`/estudiantes/${provisionalId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(detalleProvisional.body.estudiante.estado).toBe("VINCULADO");

    const intentoEditar = await request(app)
      .patch(`/estudiantes/${provisionalId}`)
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ genero: "M" });
    expect(intentoEditar.status).toBe(409);

    const reintento = await request(app)
      .post(`/estudiantes/${provisionalId}/vincular-oficial`)
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ estudianteOficialId });
    expect(reintento.status).toBe(409);

    await prisma.vinculacionProvisional.deleteMany({ where: { estudianteTemporalId: provisionalId } });
    await prisma.historicoEstudiante.deleteMany({ where: { estudianteId: { in: [provisionalId, estudianteOficialId] } } });
    await prisma.estudiante.delete({ where: { id: provisionalId } });
  });

  it("rechaza editar con un grado y un grupo que no corresponden entre sí", async () => {
    const gradoA = await prisma.grado.create({ data: { nombre: `Grado A ${sufijo}`, nivel: 1 } });
    const gradoB = await prisma.grado.create({ data: { nombre: `Grado B ${sufijo}`, nivel: 2 } });
    const grupoDeGradoB = await prisma.grupo.create({
      data: { sedeId, gradoId: gradoB.id, nombre: "01", jornadaEscolar: "MANANA", anioLectivo: 2026 },
    });

    const res = await request(app)
      .patch(`/estudiantes/${estudianteOficialId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ gradoId: gradoA.id, grupoId: grupoDeGradoB.id });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no pertenece al grado/);

    await prisma.grupo.delete({ where: { id: grupoDeGradoB.id } });
    await prisma.grado.deleteMany({ where: { id: { in: [gradoA.id, gradoB.id] } } });
  });

  it("rechaza crear un estudiante con un número de documento ya usado por otro", async () => {
    const documentoDuplicado = `DOC-${sufijo}`;

    const primero = await request(app)
      .post("/estudiantes")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({
        idPae: `PAE-2026-${String(sufijo).slice(-5)}5`,
        documentoNumero: documentoDuplicado,
        nombres: "Documento",
        apellidos: "Uno",
        sedeId,
        institucionId,
      });
    expect(primero.status).toBe(201);

    const segundo = await request(app)
      .post("/estudiantes")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({
        idPae: `PAE-2026-${String(sufijo).slice(-5)}6`,
        documentoNumero: documentoDuplicado,
        nombres: "Documento",
        apellidos: "Dos",
        sedeId,
        institucionId,
      });
    expect(segundo.status).toBe(409);

    await prisma.estudiante.delete({ where: { id: primero.body.estudiante.id } });
  });

  it("filtra el listado de estudiantes por sede y por texto de búsqueda", async () => {
    const porSede = await request(app)
      .get(`/estudiantes?sedeId=${sedeId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(porSede.status).toBe(200);
    expect(porSede.body.estudiantes.some((e: { id: string }) => e.id === estudianteOficialId)).toBe(true);

    const porBusqueda = await request(app)
      .get("/estudiantes?busqueda=Pérez")
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(porBusqueda.status).toBe(200);
    expect(porBusqueda.body.estudiantes.some((e: { id: string }) => e.id === estudianteOficialId)).toBe(true);
  });
});
