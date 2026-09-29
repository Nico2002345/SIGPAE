import type { PrismaClient, Rol } from "@prisma/client";

export const ROLES = [
  { nombre: "MAESTRO", descripcion: "Control administrativo total del sistema", esSistema: true },
  { nombre: "SUBMAESTRO", descripcion: "Administración delegada; permisos individuales configurables" },
  { nombre: "DOCENTE", descripcion: "Asistencia y novedades de sus grupos/sedes autorizados" },
  { nombre: "SUPERVISION_PAE", descripcion: "Supervisión y reportes del programa" },
  { nombre: "OPERADOR", descripcion: "Registro de entregas de PAE en sede" },
  { nombre: "COORDINADOR_LOGISTICO", descripcion: "Coordinación operativa de una zona y sus sedes" },
  { nombre: "MANIPULADORA", descripcion: "Registro de operación PAE en sede, incluido trabajo sin conexión" },
  { nombre: "VEEDOR_PAE", descripcion: "Veeduría y consulta del programa" },
];

export const PERMISOS = [
  { codigo: "usuarios.crear", modulo: "usuarios", descripcion: "Crear usuarios" },
  { codigo: "usuarios.ver", modulo: "usuarios", descripcion: "Consultar usuarios" },
  { codigo: "usuarios.editar", modulo: "usuarios", descripcion: "Editar datos de usuarios" },
  { codigo: "usuarios.desactivar", modulo: "usuarios", descripcion: "Activar o desactivar usuarios" },
  { codigo: "roles.administrar", modulo: "usuarios", descripcion: "Administrar permisos individuales por usuario" },

  { codigo: "zonas.ver", modulo: "estructura", descripcion: "Consultar zonas educativas" },
  { codigo: "zonas.crear", modulo: "estructura", descripcion: "Crear zonas educativas" },
  { codigo: "zonas.editar", modulo: "estructura", descripcion: "Editar zonas educativas" },

  { codigo: "instituciones.ver", modulo: "estructura", descripcion: "Consultar instituciones" },
  { codigo: "instituciones.crear", modulo: "estructura", descripcion: "Crear instituciones" },
  { codigo: "instituciones.editar", modulo: "estructura", descripcion: "Editar instituciones" },

  { codigo: "sedes.ver", modulo: "estructura", descripcion: "Consultar sedes" },
  { codigo: "sedes.crear", modulo: "estructura", descripcion: "Crear sedes" },
  { codigo: "sedes.editar", modulo: "estructura", descripcion: "Editar sedes" },

  { codigo: "grados.ver", modulo: "estructura", descripcion: "Consultar grados" },
  { codigo: "grados.crear", modulo: "estructura", descripcion: "Crear grados" },
  { codigo: "grados.editar", modulo: "estructura", descripcion: "Editar grados" },

  { codigo: "grupos.ver", modulo: "estructura", descripcion: "Consultar grupos" },
  { codigo: "grupos.crear", modulo: "estructura", descripcion: "Crear grupos" },
  { codigo: "grupos.editar", modulo: "estructura", descripcion: "Editar grupos" },

  { codigo: "estudiantes.ver", modulo: "estudiantes", descripcion: "Consultar estudiantes" },
  { codigo: "estudiantes.crear", modulo: "estudiantes", descripcion: "Crear estudiantes oficiales (origen SIMAT)" },
  {
    codigo: "estudiantes.crear_provisional",
    modulo: "estudiantes",
    descripcion: "Crear estudiantes provisionales (TEMP) aún no reportados en SIMAT",
  },
  {
    codigo: "estudiantes.editar",
    modulo: "estudiantes",
    descripcion: "Editar cualquier estudiante, incluidos los de origen SIMAT",
  },
  {
    codigo: "estudiantes.editar_provisional",
    modulo: "estudiantes",
    descripcion: "Editar únicamente estudiantes provisionales (no datos maestros de SIMAT)",
  },
  { codigo: "estudiantes.retirar", modulo: "estudiantes", descripcion: "Registrar el retiro de un estudiante" },
  {
    codigo: "estudiantes.vincular",
    modulo: "estudiantes",
    descripcion: "Vincular un estudiante provisional con su registro oficial de SIMAT",
  },

  { codigo: "qr.generar", modulo: "qr", descripcion: "Generar, reemitir o revocar el QR de un estudiante" },
  { codigo: "qr.ver", modulo: "qr", descripcion: "Consultar el QR e imagen de carnet de un estudiante" },
  { codigo: "qr.escanear", modulo: "qr", descripcion: "Resolver un QR escaneado en campo para identificar al estudiante" },

  { codigo: "jornadas.ver", modulo: "jornadas", descripcion: "Consultar jornadas PAE" },
  {
    codigo: "jornadas.gestionar",
    modulo: "jornadas",
    descripcion: "Abrir, iniciar entrega y cerrar una jornada PAE",
  },

  { codigo: "asistencia.ver", modulo: "asistencia", descripcion: "Consultar registros de asistencia" },
  { codigo: "asistencia.registrar", modulo: "asistencia", descripcion: "Registrar o corregir asistencia mientras la jornada está abierta" },
  {
    codigo: "asistencia.solicitar_modificacion",
    modulo: "asistencia",
    descripcion: "Solicitar modificar una asistencia ya bloqueada tras el cierre de la jornada",
  },
  {
    codigo: "asistencia.autorizar_modificacion",
    modulo: "asistencia",
    descripcion: "Aprobar o rechazar solicitudes de modificación de asistencia",
  },

  { codigo: "entregas.registrar", modulo: "entregas", descripcion: "Registrar una entrega de PAE escaneando el QR del estudiante" },
  { codigo: "entregas.ver", modulo: "entregas", descripcion: "Consultar entregas y su resumen por jornada" },

  { codigo: "reportes.ver", modulo: "reportes", descripcion: "Consultar y exportar reportes del programa" },

  { codigo: "auditoria.ver", modulo: "auditoria", descripcion: "Consultar el registro de auditoría del sistema" },

  {
    codigo: "capacitacion.gestionar",
    modulo: "capacitacion",
    descripcion: "Generar o purgar entornos de práctica y administrar el catálogo de escenarios",
  },
  { codigo: "capacitacion.ver", modulo: "capacitacion", descripcion: "Consultar escenarios y evaluaciones de capacitación" },
  { codigo: "capacitacion.evaluar", modulo: "capacitacion", descripcion: "Registrar la evaluación de una capacitación" },
];

// Catálogo inicial de escenarios practicables (regla 24 del spec, ejemplo
// "CAPACITACIÓN 001"). El Maestro puede agregar más desde la API; estos son
// solo el punto de partida.
export const ESCENARIOS_CAPACITACION = [
  { codigo: "CAP-001-ENTREGA-NORMAL", nombre: "Entrega normal" },
  { codigo: "CAP-001-INASISTENCIA", nombre: "Inasistencia" },
  { codigo: "CAP-001-REDISTRIBUCION", nombre: "Redistribución" },
  { codigo: "CAP-001-SEDE-INCORRECTA", nombre: "Sede incorrecta" },
  { codigo: "CAP-001-TRASLADO", nombre: "Traslado" },
  { codigo: "CAP-001-PROVISIONAL", nombre: "Estudiante provisional" },
  { codigo: "CAP-001-CIERRE-JORNADA", nombre: "Cierre de jornada" },
  { codigo: "CAP-001-SIN-INTERNET", nombre: "Sin Internet" },
  { codigo: "CAP-001-SYNC-BLUETOOTH", nombre: "Sincronización Bluetooth" },
];

// Permisos otorgados a roles distintos de MAESTRO (que siempre recibe todos).
// Reglas de negocio (ver docs de Fase 0): un docente puede consultar estudiantes,
// crear/editar provisionales e informar retiros, pero no tocar datos maestros de SIMAT.
const PERMISOS_POR_ROL: Record<string, string[]> = {
  DOCENTE: [
    "estudiantes.ver",
    "estudiantes.crear_provisional",
    "estudiantes.editar_provisional",
    "estudiantes.retirar",
    "jornadas.ver",
    "asistencia.ver",
    "asistencia.registrar",
    "asistencia.solicitar_modificacion",
  ],
  OPERADOR: [
    "qr.escanear",
    "jornadas.ver",
    "jornadas.gestionar",
    "asistencia.ver",
    "entregas.registrar",
    "entregas.ver",
  ],
  MANIPULADORA: [
    "qr.escanear",
    "jornadas.ver",
    "jornadas.gestionar",
    "asistencia.ver",
    "entregas.registrar",
    "entregas.ver",
  ],
  COORDINADOR_LOGISTICO: [
    "qr.escanear",
    "jornadas.ver",
    "jornadas.gestionar",
    "asistencia.ver",
    "entregas.registrar",
    "entregas.ver",
    "reportes.ver",
  ],
  // Rol de solo lectura/supervisión (regla 13): sin permisos operativos de
  // registro, únicamente consulta y reportes.
  SUPERVISION_PAE: [
    "estudiantes.ver",
    "jornadas.ver",
    "asistencia.ver",
    "entregas.ver",
    "reportes.ver",
    "auditoria.ver",
  ],
  VEEDOR_PAE: ["estudiantes.ver", "jornadas.ver", "asistencia.ver", "entregas.ver", "reportes.ver", "auditoria.ver"],
};

export async function seedEscenariosCapacitacion(prisma: PrismaClient): Promise<void> {
  for (const escenario of ESCENARIOS_CAPACITACION) {
    await prisma.escenarioCapacitacion.upsert({
      where: { codigo: escenario.codigo },
      update: {},
      create: escenario,
    });
  }
}

export async function seedRolesYPermisos(prisma: PrismaClient): Promise<{ maestro: Rol }> {
  for (const rol of ROLES) {
    await prisma.rol.upsert({ where: { nombre: rol.nombre }, update: {}, create: rol });
  }

  for (const permiso of PERMISOS) {
    await prisma.permiso.upsert({ where: { codigo: permiso.codigo }, update: {}, create: permiso });
  }

  const maestro = await prisma.rol.findUniqueOrThrow({ where: { nombre: "MAESTRO" } });
  const permisos = await prisma.permiso.findMany();

  for (const permiso of permisos) {
    await prisma.rolPermiso.upsert({
      where: { rolId_permisoId: { rolId: maestro.id, permisoId: permiso.id } },
      update: {},
      create: { rolId: maestro.id, permisoId: permiso.id },
    });
  }

  for (const [nombreRol, codigosPermisos] of Object.entries(PERMISOS_POR_ROL)) {
    const rol = await prisma.rol.findUniqueOrThrow({ where: { nombre: nombreRol } });
    for (const codigo of codigosPermisos) {
      const permiso = permisos.find((p) => p.codigo === codigo);
      if (!permiso) continue;
      await prisma.rolPermiso.upsert({
        where: { rolId_permisoId: { rolId: rol.id, permisoId: permiso.id } },
        update: {},
        create: { rolId: rol.id, permisoId: permiso.id },
      });
    }
  }

  return { maestro };
}
