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
];

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

  return { maestro };
}
