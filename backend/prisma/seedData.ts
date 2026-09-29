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
  OPERADOR: ["qr.escanear", "jornadas.ver", "jornadas.gestionar", "asistencia.ver"],
  MANIPULADORA: ["qr.escanear", "jornadas.ver", "jornadas.gestionar", "asistencia.ver"],
  COORDINADOR_LOGISTICO: ["qr.escanear", "jornadas.ver", "jornadas.gestionar", "asistencia.ver"],
};

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
