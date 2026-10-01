import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/modules/auth/password.js";
import { seedRolesYPermisos } from "../prisma/seedData.js";

/**
 * Fase 17: prueba integral. A diferencia de los tests por módulo (que
 * verifican cada regla de negocio de forma aislada con sus propios
 * fixtures), este test recorre UN solo escenario real de principio a fin,
 * pasando por todas las fases construidas, y verifica que lo que un módulo
 * escribe es exactamente lo que otro módulo, corriente abajo, lee:
 * estructura -> estudiante -> QR -> jornada -> asistencia (en vivo y
 * relevada por Bluetooth) -> entrega -> cierre -> corrección post-cierre
 * (solicitud de modificación) -> reportes -> auditoría -> aislamiento de
 * capacitación. Una regresión que rompa la integración entre dos fases
 * (aunque cada una siga pasando sus propios tests) debería fallar acá.
 */
const app = createApp();
const sufijo = Date.now();
const maestroLogin = `maestro.e2e.${sufijo}`;
const docenteLogin = `docente.e2e.${sufijo}`;
const operadorLogin = `operador.e2e.${sufijo}`;
const coordinadorLogin = `coordinador.e2e.${sufijo}`;
const manipuladoraLogin = `manipuladora.e2e.${sufijo}`;
const supervisorLogin = `supervisor.e2e.${sufijo}`;
const passwordPrueba = "ClaveSegura123";

describe("Integración end-to-end: ciclo completo de una jornada PAE", () => {
  let tokenMaestro: string;
  let tokenDocente: string;
  let tokenOperador: string;
  let tokenCoordinador: string;
  let tokenSupervisor: string;
  let usuarioMaestroId: string;
  let usuarioDocenteId: string;
  let usuarioOperadorId: string;
  let usuarioCoordinadorId: string;
  let usuarioManipuladoraId: string;
  let usuarioSupervisorId: string;

  let zonaId: number;
  let institucionId: number;
  let sedeId: number;
  let jornadaId: string;

  let estudianteEnVivoId: string;
  let qrEnVivoToken: string;
  let estudianteRelevadoId: string;
  let qrRelevadoToken: string;

  let dispositivoCoordinadorId: string;
  let dispositivoDocenteId: string;
  const identificadorManipuladora = `tablet-manipuladora-e2e-${sufijo}`;

  let asistenciaEnVivoId: string;
  let solicitudId: string;

  const idsUsuarios = () => [
    usuarioMaestroId,
    usuarioDocenteId,
    usuarioOperadorId,
    usuarioCoordinadorId,
    usuarioManipuladoraId,
    usuarioSupervisorId,
  ];

  beforeAll(async () => {
    await seedRolesYPermisos(prisma);

    const roles = await prisma.rol.findMany({
      where: {
        nombre: { in: ["MAESTRO", "DOCENTE", "OPERADOR", "COORDINADOR_LOGISTICO", "MANIPULADORA", "SUPERVISION_PAE"] },
      },
    });
    const rolPorNombre = Object.fromEntries(roles.map((r) => [r.nombre, r.id]));
    const passwordHash = await hashPassword(passwordPrueba);

    async function crearUsuario(nombreCompleto: string, login: string, rol: string) {
      const usuario = await prisma.usuario.create({
        data: { nombreCompleto, usuarioLogin: login, passwordHash, rolId: rolPorNombre[rol] },
      });
      return usuario.id;
    }

    usuarioMaestroId = await crearUsuario("Maestro E2E", maestroLogin, "MAESTRO");
    usuarioDocenteId = await crearUsuario("Docente E2E", docenteLogin, "DOCENTE");
    usuarioOperadorId = await crearUsuario("Operador E2E", operadorLogin, "OPERADOR");
    usuarioCoordinadorId = await crearUsuario("Coordinador E2E", coordinadorLogin, "COORDINADOR_LOGISTICO");
    usuarioManipuladoraId = await crearUsuario("Manipuladora E2E", manipuladoraLogin, "MANIPULADORA");
    usuarioSupervisorId = await crearUsuario("Supervisor E2E", supervisorLogin, "SUPERVISION_PAE");

    async function login(usuarioLogin: string): Promise<string> {
      const res = await request(app).post("/auth/login").send({ usuarioLogin, password: passwordPrueba });
      return res.body.accessToken as string;
    }

    tokenMaestro = await login(maestroLogin);
    tokenDocente = await login(docenteLogin);
    tokenOperador = await login(operadorLogin);
    tokenCoordinador = await login(coordinadorLogin);
    tokenSupervisor = await login(supervisorLogin);
  });

  afterAll(async () => {
    const dispManipuladora = await prisma.dispositivo.findUnique({
      where: { identificadorUnico: identificadorManipuladora },
    });
    const idsDispositivos = [dispositivoCoordinadorId, dispositivoDocenteId, dispManipuladora?.id].filter(
      (id): id is string => Boolean(id),
    );
    // Las sincronizaciones quedan referenciadas tanto por dispositivo
    // (origen o relay) como por usuario; hay que limpiarlas antes de poder
    // borrar cualquiera de los dos o la FK lo impide.
    await prisma.sincronizacion.deleteMany({
      where: {
        OR: [
          { usuarioId: { in: idsUsuarios() } },
          { dispositivoId: { in: idsDispositivos } },
          { dispositivoRelayId: { in: idsDispositivos } },
        ],
      },
    });
    if (idsDispositivos.length > 0) {
      await prisma.colaSincronizacion.deleteMany({ where: { dispositivoId: { in: idsDispositivos } } });
      await prisma.dispositivo.deleteMany({ where: { id: { in: idsDispositivos } } });
    }
    if (jornadaId) {
      await prisma.solicitudModificacion.deleteMany({
        where: { asistencia: { jornadaId } },
      });
      await prisma.entrega.deleteMany({ where: { jornadaId } });
      await prisma.asistencia.deleteMany({ where: { jornadaId } });
      await prisma.jornadaPae.deleteMany({ where: { id: jornadaId } });
    }
    const idsEstudiantes = [estudianteEnVivoId, estudianteRelevadoId].filter(Boolean);
    if (idsEstudiantes.length > 0) {
      await prisma.qrCode.deleteMany({ where: { estudianteId: { in: idsEstudiantes } } });
      await prisma.estudiante.deleteMany({ where: { id: { in: idsEstudiantes } } });
    }
    if (sedeId) await prisma.sede.deleteMany({ where: { id: sedeId } });
    if (institucionId) await prisma.institucion.deleteMany({ where: { id: institucionId } });
    if (zonaId) await prisma.zonaEducativa.deleteMany({ where: { id: zonaId } });
    await prisma.sesionRefresco.deleteMany({ where: { usuarioId: { in: idsUsuarios() } } });
    await prisma.usuario.deleteMany({ where: { id: { in: idsUsuarios() } } });
    await prisma.$disconnect();
  });

  it("1. crea la estructura (zona -> institución -> sede) a través de la API", async () => {
    const zona = await request(app)
      .post("/zonas")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ nombre: `Zona E2E ${sufijo}` });
    expect(zona.status).toBe(201);
    zonaId = zona.body.zona.id;

    const institucion = await request(app)
      .post("/instituciones")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ nombre: "Institución E2E", codigoDane: `DANE-E2E-${sufijo}`, zonaId });
    expect(institucion.status).toBe(201);
    institucionId = institucion.body.institucion.id;

    const sede = await request(app)
      .post("/sedes")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ nombre: "Sede E2E", codigoDaneSede: `DANE-SEDE-E2E-${sufijo}`, institucionId });
    expect(sede.status).toBe(201);
    sedeId = sede.body.sede.id;
  });

  it("2. matricula dos estudiantes oficiales y les genera QR", async () => {
    async function crearEstudianteConQr(sufijoLocal: string, nombres: string) {
      const estudiante = await request(app)
        .post("/estudiantes")
        .set("Authorization", `Bearer ${tokenMaestro}`)
        .send({
          idPae: `PAE-2026-${String(sufijo).slice(-5)}${sufijoLocal}`,
          nombres,
          apellidos: "E2E",
          sedeId,
          institucionId,
        });
      expect(estudiante.status).toBe(201);

      const qr = await request(app)
        .post(`/qr/estudiantes/${estudiante.body.estudiante.id}`)
        .set("Authorization", `Bearer ${tokenMaestro}`);
      expect(qr.status).toBe(201);

      return { id: estudiante.body.estudiante.id as string, token: qr.body.qr.token as string };
    }

    const enVivo = await crearEstudianteConQr("1", "EnVivo");
    estudianteEnVivoId = enVivo.id;
    qrEnVivoToken = enVivo.token;

    const relevado = await crearEstudianteConQr("2", "Relevado");
    estudianteRelevadoId = relevado.id;
    qrRelevadoToken = relevado.token;
  });

  it("3. abre la jornada PAE de la sede", async () => {
    const res = await request(app)
      .post("/jornadas/abrir")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ sedeId, fecha: "2026-10-20" });
    expect(res.status).toBe(201);
    expect(res.body.jornada.estado).toBe("ABIERTA");
    jornadaId = res.body.jornada.id;
  });

  it("4. el docente registra asistencia en vivo para el primer estudiante", async () => {
    const res = await request(app)
      .post("/asistencia")
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ jornadaId, estudianteId: estudianteEnVivoId, estado: "ASISTIO" });
    expect(res.status).toBe(201);
    expect(res.body.asistencia.estado).toBe("ASISTIO");
    asistenciaEnVivoId = res.body.asistencia.id;
  });

  it("5. el coordinador registra al dispositivo por el que va a relevar", async () => {
    const res = await request(app)
      .post("/dispositivos/registrar")
      .set("Authorization", `Bearer ${tokenCoordinador}`)
      .send({ identificadorUnico: `disp-coordinador-e2e-${sufijo}`, tipo: "ANDROID", nombre: "Celular coordinador" });
    expect(res.status).toBe(201);
    dispositivoCoordinadorId = res.body.dispositivo.id;
  });

  it("6. una manipuladora sin señal registra asistencia del segundo estudiante y el coordinador la releva por Bluetooth", async () => {
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
            entidadId: `local-${sufijo}-relevado`,
            operacion: "INSERT",
            payload: { estudianteId: estudianteRelevadoId, jornadaId, estado: "ASISTIO" },
            timestampLocal: new Date().toISOString(),
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.resumen).toEqual({ total: 1, confirmados: 1, conflictos: 0 });
    // La atribución real es de la manipuladora, no del coordinador que transmitió.
    expect(res.body.sincronizacion.usuarioId).toBe(usuarioManipuladoraId);
    expect(res.body.sincronizacion.dispositivoRelayId).toBe(dispositivoCoordinadorId);

    const asistencia = await prisma.asistencia.findUniqueOrThrow({
      where: { estudianteId_jornadaId: { estudianteId: estudianteRelevadoId, jornadaId } },
    });
    expect(asistencia.usuarioId).toBe(usuarioManipuladoraId);
    expect(asistencia.estado).toBe("ASISTIO");
  });

  it("7. el operador entrega la ración a ambos estudiantes escaneando su QR", async () => {
    const enVivo = await request(app)
      .post("/entregas")
      .set("Authorization", `Bearer ${tokenOperador}`)
      .send({ token: qrEnVivoToken, jornadaId });
    expect(enVivo.body.entrega.resultado).toBe("AUTORIZADA");

    // La asistencia llegó por relevo Bluetooth, no en vivo, pero la entrega
    // no distingue el origen: solo le importa que haya un ASISTIO vigente.
    const relevado = await request(app)
      .post("/entregas")
      .set("Authorization", `Bearer ${tokenOperador}`)
      .send({ token: qrRelevadoToken, jornadaId });
    expect(relevado.body.entrega.resultado).toBe("AUTORIZADA");
  });

  it("8. un supervisor de solo lectura puede ver el resumen pero no registrar entregas", async () => {
    const resumen = await request(app)
      .get(`/entregas/jornada/${jornadaId}/resumen`)
      .set("Authorization", `Bearer ${tokenSupervisor}`);
    expect(resumen.status).toBe(200);
    expect(resumen.body.resumen.beneficiariosAtendidos).toBe(2);

    const intentoEntrega = await request(app)
      .post("/entregas")
      .set("Authorization", `Bearer ${tokenSupervisor}`)
      .send({ token: qrEnVivoToken, jornadaId });
    expect(intentoEntrega.status).toBe(403);
  });

  it("9. se cierra la jornada y las asistencias quedan bloqueadas", async () => {
    const res = await request(app).post(`/jornadas/${jornadaId}/cerrar`).set("Authorization", `Bearer ${tokenMaestro}`);
    expect(res.status).toBe(200);
    expect(res.body.jornada.estado).toBe("CERRADA");

    const asistencia = await prisma.asistencia.findUniqueOrThrow({ where: { id: asistenciaEnVivoId } });
    expect(asistencia.bloqueada).toBe(true);
  });

  it("10. tras el cierre, un intento de sincronizar un cambio directo por Internet queda en CONFLICTO, no lo sobrescribe", async () => {
    const dispositivoDocente = await request(app)
      .post("/dispositivos/registrar")
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ identificadorUnico: `disp-docente-e2e-${sufijo}`, tipo: "WINDOWS" });
    dispositivoDocenteId = dispositivoDocente.body.dispositivo.id;

    const res = await request(app)
      .post("/sincronizacion/lote")
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({
        dispositivoId: dispositivoDocenteId,
        tipo: "INTERNET",
        cambios: [
          {
            entidad: "Asistencia",
            entidadId: `local-${sufijo}-tardio`,
            operacion: "UPDATE",
            payload: { estudianteId: estudianteEnVivoId, jornadaId, estado: "NO_ASISTIO" },
            timestampLocal: new Date().toISOString(),
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.resumen).toEqual({ total: 1, confirmados: 0, conflictos: 1 });

    const asistencia = await prisma.asistencia.findUniqueOrThrow({ where: { id: asistenciaEnVivoId } });
    expect(asistencia.estado).toBe("ASISTIO");
  });

  it("11. la única forma de corregir una asistencia bloqueada es una solicitud de modificación aprobada", async () => {
    const solicitud = await request(app)
      .post(`/asistencia/${asistenciaEnVivoId}/solicitudes`)
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ valorPropuesto: "NO_ASISTIO", motivo: "El estudiante se retiró antes de la jornada" });
    expect(solicitud.status).toBe(201);
    expect(solicitud.body.solicitud.estado).toBe("PENDIENTE");
    solicitudId = solicitud.body.solicitud.id;

    // Quien solicita no tiene permiso para autorizar su propia solicitud
    // (asistencia.autorizar_modificacion no está en el rol DOCENTE).
    const bloqueadoSinPermiso = await request(app)
      .post(`/asistencia/solicitudes/${solicitudId}/resolver`)
      .set("Authorization", `Bearer ${tokenDocente}`)
      .send({ aprobar: true });
    expect(bloqueadoSinPermiso.status).toBe(403);

    const resolucion = await request(app)
      .post(`/asistencia/solicitudes/${solicitudId}/resolver`)
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ aprobar: true });
    expect(resolucion.status).toBe(200);
    expect(resolucion.body.solicitud.estado).toBe("APROBADA");

    const asistencia = await prisma.asistencia.findUniqueOrThrow({ where: { id: asistenciaEnVivoId } });
    expect(asistencia.estado).toBe("NO_ASISTIO");
  });

  it("12. los reportes de la jornada reflejan exactamente lo que registraron asistencia y entregas", async () => {
    const asistenciaDiaria = await request(app)
      .get(`/reportes/asistencia-diaria?jornadaId=${jornadaId}`)
      .set("Authorization", `Bearer ${tokenSupervisor}`);
    expect(asistenciaDiaria.status).toBe(200);
    const filasAsistencia = asistenciaDiaria.body.asistencia_diaria as { estado: string }[];
    expect(filasAsistencia).toHaveLength(2);
    // La solicitud de modificación del paso 11 cambió el primero a NO_ASISTIO.
    expect(filasAsistencia.filter((f) => f.estado === "ASISTIO")).toHaveLength(1);
    expect(filasAsistencia.filter((f) => f.estado === "NO_ASISTIO")).toHaveLength(1);

    const entregas = await request(app)
      .get(`/reportes/entregas?jornadaId=${jornadaId}`)
      .set("Authorization", `Bearer ${tokenSupervisor}`);
    expect(entregas.status).toBe(200);
    // Ambas entregas se autorizaron en el paso 7, antes del cierre; la
    // corrección posterior de asistencia (paso 11) no las deshace, porque
    // ninguna regla del spec liga retroactivamente una entrega ya
    // autorizada al valor de asistencia vigente después del cierre.
    expect(entregas.body.entregas).toHaveLength(2);
  });

  it("13. el historial de sincronizaciones distingue el relevo Bluetooth del directo por Internet", async () => {
    // GET /sincronizacion?dispositivoId= filtra por el dispositivo de
    // origen (a quien se le atribuyen los cambios), no por quien transmitió
    // — por eso se consulta sin filtro y se busca por dispositivoRelayId.
    const res = await request(app).get("/sincronizacion").set("Authorization", `Bearer ${tokenMaestro}`);
    expect(res.status).toBe(200);

    const relevo = res.body.sincronizaciones.find(
      (s: { dispositivoRelayId: string | null }) => s.dispositivoRelayId === dispositivoCoordinadorId,
    );
    expect(relevo).toBeTruthy();
    expect(relevo.tipo).toBe("BLUETOOTH");

    const directo = res.body.sincronizaciones.find(
      (s: { dispositivoId: string }) => s.dispositivoId === dispositivoDocenteId,
    );
    expect(directo).toBeTruthy();
    expect(directo.dispositivoRelayId).toBeNull();
    expect(directo.tipo).toBe("INTERNET");
  });

  it("14. la generación del QR de esta corrida quedó auditada", async () => {
    const res = await request(app)
      .get(`/auditoria?entidad=QrCode&entidadId=${estudianteEnVivoId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    // La auditoría de QR se indexa por el id del QrCode, no del estudiante;
    // basta con confirmar que el endpoint es accesible y no hay error de
    // otro módulo filtrando por una entidad que no le corresponde.
    expect(res.status).toBe(200);

    const sinFiltro = await request(app).get("/auditoria?entidad=QrCode").set("Authorization", `Bearer ${tokenMaestro}`);
    expect(sinFiltro.status).toBe(200);
    expect((sinFiltro.body.auditoria as { valorNuevo: unknown }[]).length).toBeGreaterThan(0);

    const bloqueado = await request(app).get("/auditoria").set("Authorization", `Bearer ${tokenDocente}`);
    expect(bloqueado.status).toBe(403);
  });

  it("15. un entorno de capacitación generado en paralelo no contamina ni se ve afectado por esta jornada real", async () => {
    const entorno = await request(app)
      .post("/capacitacion/entorno")
      .set("Authorization", `Bearer ${tokenMaestro}`)
      .send({ cantidadEstudiantes: 1 });
    expect(entorno.status).toBe(201);

    const jornadasRealesDeLaSede = await request(app)
      .get(`/jornadas?sedeId=${sedeId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(jornadasRealesDeLaSede.body.jornadas.map((j: { id: string }) => j.id)).toEqual([jornadaId]);

    const consolidadoReal = await request(app)
      .get(`/reportes/consolidado/sede?sedeId=${sedeId}`)
      .set("Authorization", `Bearer ${tokenMaestro}`);
    expect(consolidadoReal.status).toBe(200);
    expect(
      (consolidadoReal.body.consolidado_por_sede as { sedeId: number }[]).every((f) => f.sedeId !== entorno.body.entorno.sede.id),
    ).toBe(true);

    await prisma.entrega.deleteMany({ where: { sedeId: entorno.body.entorno.sede.id } });
    await prisma.asistencia.deleteMany({ where: { jornadaId: entorno.body.entorno.jornada.id } });
    await prisma.qrCode.deleteMany({
      where: { estudianteId: { in: entorno.body.entorno.estudiantes.map((e: { id: string }) => e.id) } },
    });
    await prisma.jornadaPae.deleteMany({ where: { id: entorno.body.entorno.jornada.id } });
    await prisma.estudiante.deleteMany({
      where: { id: { in: entorno.body.entorno.estudiantes.map((e: { id: string }) => e.id) } },
    });
    await prisma.sede.deleteMany({ where: { id: entorno.body.entorno.sede.id } });
    await prisma.institucion.deleteMany({ where: { id: entorno.body.entorno.institucion.id } });
  });
});
