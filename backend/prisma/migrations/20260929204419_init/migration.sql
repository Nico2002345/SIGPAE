-- CreateEnum
CREATE TYPE "EstadoActivoInactivo" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "JornadaEscolar" AS ENUM ('MANANA', 'TARDE', 'UNICA', 'NOCHE', 'FIN_DE_SEMANA');

-- CreateEnum
CREATE TYPE "TipoIdentificadorEstudiante" AS ENUM ('PAE', 'TEMP');

-- CreateEnum
CREATE TYPE "EstadoEstudiante" AS ENUM ('ACTIVO', 'RETIRADO', 'TRASLADADO', 'PROVISIONAL_PENDIENTE');

-- CreateEnum
CREATE TYPE "OrigenEstudiante" AS ENUM ('SIMAT', 'PROVISIONAL');

-- CreateEnum
CREATE TYPE "OrigenCambioHistorico" AS ENUM ('IMPORT_SIMAT', 'MANUAL');

-- CreateEnum
CREATE TYPE "EstadoImportacion" AS ENUM ('PENDIENTE_REVISION', 'APLICADA', 'DESCARTADA');

-- CreateEnum
CREATE TYPE "TipoCambioImportacion" AS ENUM ('NUEVO', 'ACTUALIZADO', 'RETIRADO', 'TRASLADADO', 'SIN_CAMBIO', 'ERROR');

-- CreateEnum
CREATE TYPE "EstadoTraslado" AS ENUM ('PENDIENTE', 'CONFIRMADO');

-- CreateEnum
CREATE TYPE "EstadoQr" AS ENUM ('ACTIVO', 'REVOCADO');

-- CreateEnum
CREATE TYPE "EstadoUsuario" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "TipoOverridePermiso" AS ENUM ('OTORGADO', 'DENEGADO');

-- CreateEnum
CREATE TYPE "EstadoAsignacion" AS ENUM ('ACTIVA', 'INACTIVA');

-- CreateEnum
CREATE TYPE "TipoDispositivo" AS ENUM ('ANDROID', 'WINDOWS', 'WEB');

-- CreateEnum
CREATE TYPE "EstadoDispositivo" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "EstadoJornada" AS ENUM ('NO_INICIADA', 'ABIERTA', 'EN_ENTREGA', 'CERRADA', 'SINCRONIZANDO', 'SINCRONIZADA');

-- CreateEnum
CREATE TYPE "EstadoAsistencia" AS ENUM ('ASISTIO', 'NO_ASISTIO');

-- CreateEnum
CREATE TYPE "EstadoSolicitudModificacion" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "TipoEntrega" AS ENUM ('NORMAL', 'REDISTRIBUCION');

-- CreateEnum
CREATE TYPE "ResultadoEntrega" AS ENUM ('AUTORIZADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "TipoNovedad" AS ENUM ('RETIRO', 'TRASLADO_REPORTADO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoNovedad" AS ENUM ('ABIERTA', 'CERRADA');

-- CreateEnum
CREATE TYPE "OperacionSync" AS ENUM ('INSERT', 'UPDATE');

-- CreateEnum
CREATE TYPE "EstadoColaSincronizacion" AS ENUM ('PENDIENTE', 'ENVIADO', 'CONFIRMADO', 'CONFLICTO');

-- CreateEnum
CREATE TYPE "TipoSincronizacion" AS ENUM ('INTERNET', 'BLUETOOTH');

-- CreateEnum
CREATE TYPE "EstadoSincronizacion" AS ENUM ('EXITOSA', 'PARCIAL', 'FALLIDA');

-- CreateTable
CREATE TABLE "zonas_educativas" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" "EstadoActivoInactivo" NOT NULL DEFAULT 'ACTIVO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zonas_educativas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instituciones" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo_dane" TEXT NOT NULL,
    "zona_id" INTEGER NOT NULL,
    "estado" "EstadoActivoInactivo" NOT NULL DEFAULT 'ACTIVO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instituciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sedes" (
    "id" SERIAL NOT NULL,
    "institucion_id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo_dane_sede" TEXT NOT NULL,
    "estado" "EstadoActivoInactivo" NOT NULL DEFAULT 'ACTIVO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sedes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grados" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL,
    "estado" "EstadoActivoInactivo" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "grados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupos" (
    "id" SERIAL NOT NULL,
    "sede_id" INTEGER NOT NULL,
    "grado_id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "jornada_escolar" "JornadaEscolar" NOT NULL,
    "anio_lectivo" INTEGER NOT NULL,
    "estado" "EstadoActivoInactivo" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "grupos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estudiantes" (
    "id" TEXT NOT NULL,
    "id_pae" TEXT NOT NULL,
    "tipo_identificador" "TipoIdentificadorEstudiante" NOT NULL,
    "documento_tipo" TEXT,
    "documento_numero" TEXT,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "fecha_nacimiento" DATE,
    "genero" TEXT,
    "sede_id" INTEGER NOT NULL,
    "institucion_id" INTEGER NOT NULL,
    "grado_id" INTEGER,
    "grupo_id" INTEGER,
    "estado" "EstadoEstudiante" NOT NULL DEFAULT 'ACTIVO',
    "origen" "OrigenEstudiante" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estudiantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_estudiante" (
    "id" TEXT NOT NULL,
    "estudiante_id" TEXT NOT NULL,
    "campo" TEXT NOT NULL,
    "valor_anterior" TEXT,
    "valor_nuevo" TEXT,
    "origen" "OrigenCambioHistorico" NOT NULL,
    "importacion_id" INTEGER,
    "usuario_id" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_estudiante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "importaciones_simat" (
    "id" SERIAL NOT NULL,
    "fecha_importacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_id" TEXT NOT NULL,
    "archivo_nombre" TEXT NOT NULL,
    "total_recibidos" INTEGER NOT NULL DEFAULT 0,
    "nuevos" INTEGER NOT NULL DEFAULT 0,
    "actualizados" INTEGER NOT NULL DEFAULT 0,
    "retirados" INTEGER NOT NULL DEFAULT 0,
    "trasladados" INTEGER NOT NULL DEFAULT 0,
    "sin_cambios" INTEGER NOT NULL DEFAULT 0,
    "errores" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoImportacion" NOT NULL DEFAULT 'PENDIENTE_REVISION',

    CONSTRAINT "importaciones_simat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "importaciones_detalle" (
    "id" TEXT NOT NULL,
    "importacion_id" INTEGER NOT NULL,
    "estudiante_id" TEXT,
    "tipo_cambio" "TipoCambioImportacion" NOT NULL,
    "detalle" JSONB,

    CONSTRAINT "importaciones_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traslados" (
    "id" TEXT NOT NULL,
    "estudiante_id" TEXT NOT NULL,
    "institucion_anterior_id" INTEGER,
    "sede_anterior_id" INTEGER,
    "institucion_nueva_id" INTEGER NOT NULL,
    "sede_nueva_id" INTEGER NOT NULL,
    "fecha_deteccion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importacion_id" INTEGER,
    "estado" "EstadoTraslado" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "traslados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vinculaciones_provisionales" (
    "id" TEXT NOT NULL,
    "estudiante_temporal_id" TEXT NOT NULL,
    "estudiante_oficial_id" TEXT NOT NULL,
    "fecha_vinculacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_id" TEXT NOT NULL,

    CONSTRAINT "vinculaciones_provisionales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_codes" (
    "id" SERIAL NOT NULL,
    "estudiante_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "estado" "EstadoQr" NOT NULL DEFAULT 'ACTIVO',
    "version_carnet" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "es_sistema" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permisos" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT,
    "modulo" TEXT NOT NULL,

    CONSTRAINT "permisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles_permisos" (
    "rol_id" INTEGER NOT NULL,
    "permiso_id" INTEGER NOT NULL,

    CONSTRAINT "roles_permisos_pkey" PRIMARY KEY ("rol_id","permiso_id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "documento" TEXT,
    "usuario_login" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol_id" INTEGER NOT NULL,
    "estado" "EstadoUsuario" NOT NULL DEFAULT 'ACTIVO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_permisos_extra" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "permiso_id" INTEGER NOT NULL,
    "tipo" "TipoOverridePermiso" NOT NULL,

    CONSTRAINT "usuarios_permisos_extra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones_operativas" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "zona_id" INTEGER NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE,
    "estado" "EstadoAsignacion" NOT NULL DEFAULT 'ACTIVA',

    CONSTRAINT "asignaciones_operativas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones_operativas_sedes" (
    "asignacion_id" TEXT NOT NULL,
    "sede_id" INTEGER NOT NULL,

    CONSTRAINT "asignaciones_operativas_sedes_pkey" PRIMARY KEY ("asignacion_id","sede_id")
);

-- CreateTable
CREATE TABLE "asignaciones_docentes" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "sede_id" INTEGER NOT NULL,
    "grupo_id" INTEGER,
    "anio_lectivo" INTEGER NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE,
    "estado" "EstadoAsignacion" NOT NULL DEFAULT 'ACTIVA',

    CONSTRAINT "asignaciones_docentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispositivos" (
    "id" TEXT NOT NULL,
    "identificador_unico" TEXT NOT NULL,
    "usuario_principal_id" TEXT,
    "tipo" "TipoDispositivo" NOT NULL,
    "nombre" TEXT,
    "ultima_sincronizacion" TIMESTAMP(3),
    "estado" "EstadoDispositivo" NOT NULL DEFAULT 'ACTIVO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispositivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jornadas_pae" (
    "id" TEXT NOT NULL,
    "sede_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "estado" "EstadoJornada" NOT NULL DEFAULT 'NO_INICIADA',
    "usuario_apertura_id" TEXT,
    "hora_apertura" TIMESTAMP(3),
    "usuario_cierre_id" TEXT,
    "hora_cierre" TIMESTAMP(3),

    CONSTRAINT "jornadas_pae_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asistencia" (
    "id" TEXT NOT NULL,
    "estudiante_id" TEXT NOT NULL,
    "jornada_id" TEXT NOT NULL,
    "estado" "EstadoAsistencia" NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "dispositivo_id" TEXT,
    "fecha_hora_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bloqueada" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "asistencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_modificacion" (
    "id" TEXT NOT NULL,
    "asistencia_id" TEXT NOT NULL,
    "valor_propuesto" "EstadoAsistencia" NOT NULL,
    "motivo" TEXT NOT NULL,
    "usuario_solicitante_id" TEXT NOT NULL,
    "estado" "EstadoSolicitudModificacion" NOT NULL DEFAULT 'PENDIENTE',
    "usuario_autoriza_id" TEXT,
    "fecha_solicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_resolucion" TIMESTAMP(3),

    CONSTRAINT "solicitudes_modificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entregas" (
    "id" TEXT NOT NULL,
    "estudiante_id" TEXT NOT NULL,
    "jornada_id" TEXT NOT NULL,
    "tipo" "TipoEntrega" NOT NULL,
    "entrega_original_id" TEXT,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_id" TEXT NOT NULL,
    "dispositivo_id" TEXT,
    "sede_id" INTEGER NOT NULL,
    "institucion_id" INTEGER NOT NULL,
    "resultado" "ResultadoEntrega" NOT NULL,
    "motivo_rechazo" TEXT,

    CONSTRAINT "entregas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "novedades" (
    "id" TEXT NOT NULL,
    "estudiante_id" TEXT,
    "sede_id" INTEGER NOT NULL,
    "tipo" "TipoNovedad" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoNovedad" NOT NULL DEFAULT 'ABIERTA',

    CONSTRAINT "novedades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cola_sincronizacion" (
    "id" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT NOT NULL,
    "operacion" "OperacionSync" NOT NULL,
    "payload" JSONB NOT NULL,
    "dispositivo_id" TEXT NOT NULL,
    "estado" "EstadoColaSincronizacion" NOT NULL DEFAULT 'PENDIENTE',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "timestamp_local" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cola_sincronizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sincronizaciones" (
    "id" TEXT NOT NULL,
    "dispositivo_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tipo" "TipoSincronizacion" NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3),
    "registros_enviados" INTEGER NOT NULL DEFAULT 0,
    "registros_recibidos" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoSincronizacion" NOT NULL,
    "detalle" JSONB,

    CONSTRAINT "sincronizaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT,
    "valor_anterior" JSONB,
    "valor_nuevo" JSONB,
    "motivo" TEXT,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispositivo_id" TEXT,
    "ip" TEXT,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "zonas_educativas_nombre_key" ON "zonas_educativas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "instituciones_codigo_dane_key" ON "instituciones"("codigo_dane");

-- CreateIndex
CREATE UNIQUE INDEX "sedes_codigo_dane_sede_key" ON "sedes"("codigo_dane_sede");

-- CreateIndex
CREATE UNIQUE INDEX "grados_nombre_key" ON "grados"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "grupos_sede_id_grado_id_nombre_anio_lectivo_key" ON "grupos"("sede_id", "grado_id", "nombre", "anio_lectivo");

-- CreateIndex
CREATE UNIQUE INDEX "estudiantes_id_pae_key" ON "estudiantes"("id_pae");

-- CreateIndex
CREATE UNIQUE INDEX "estudiantes_documento_numero_key" ON "estudiantes"("documento_numero");

-- CreateIndex
CREATE INDEX "estudiantes_sede_id_idx" ON "estudiantes"("sede_id");

-- CreateIndex
CREATE INDEX "estudiantes_institucion_id_idx" ON "estudiantes"("institucion_id");

-- CreateIndex
CREATE INDEX "historico_estudiante_estudiante_id_idx" ON "historico_estudiante"("estudiante_id");

-- CreateIndex
CREATE INDEX "importaciones_detalle_importacion_id_idx" ON "importaciones_detalle"("importacion_id");

-- CreateIndex
CREATE INDEX "traslados_estudiante_id_idx" ON "traslados"("estudiante_id");

-- CreateIndex
CREATE UNIQUE INDEX "vinculaciones_provisionales_estudiante_temporal_id_key" ON "vinculaciones_provisionales"("estudiante_temporal_id");

-- CreateIndex
CREATE UNIQUE INDEX "vinculaciones_provisionales_estudiante_oficial_id_key" ON "vinculaciones_provisionales"("estudiante_oficial_id");

-- CreateIndex
CREATE UNIQUE INDEX "qr_codes_estudiante_id_key" ON "qr_codes"("estudiante_id");

-- CreateIndex
CREATE UNIQUE INDEX "qr_codes_token_key" ON "qr_codes"("token");

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_key" ON "roles"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "permisos_codigo_key" ON "permisos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_documento_key" ON "usuarios"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_usuario_login_key" ON "usuarios"("usuario_login");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_permisos_extra_usuario_id_permiso_id_key" ON "usuarios_permisos_extra"("usuario_id", "permiso_id");

-- CreateIndex
CREATE UNIQUE INDEX "dispositivos_identificador_unico_key" ON "dispositivos"("identificador_unico");

-- CreateIndex
CREATE UNIQUE INDEX "jornadas_pae_sede_id_fecha_key" ON "jornadas_pae"("sede_id", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "asistencia_estudiante_id_jornada_id_key" ON "asistencia"("estudiante_id", "jornada_id");

-- CreateIndex
CREATE INDEX "entregas_estudiante_id_jornada_id_idx" ON "entregas"("estudiante_id", "jornada_id");

-- CreateIndex
CREATE INDEX "cola_sincronizacion_dispositivo_id_estado_idx" ON "cola_sincronizacion"("dispositivo_id", "estado");

-- CreateIndex
CREATE INDEX "auditoria_entidad_entidad_id_idx" ON "auditoria"("entidad", "entidad_id");

-- AddForeignKey
ALTER TABLE "instituciones" ADD CONSTRAINT "instituciones_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zonas_educativas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sedes" ADD CONSTRAINT "sedes_institucion_id_fkey" FOREIGN KEY ("institucion_id") REFERENCES "instituciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupos" ADD CONSTRAINT "grupos_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupos" ADD CONSTRAINT "grupos_grado_id_fkey" FOREIGN KEY ("grado_id") REFERENCES "grados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estudiantes" ADD CONSTRAINT "estudiantes_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estudiantes" ADD CONSTRAINT "estudiantes_institucion_id_fkey" FOREIGN KEY ("institucion_id") REFERENCES "instituciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estudiantes" ADD CONSTRAINT "estudiantes_grado_id_fkey" FOREIGN KEY ("grado_id") REFERENCES "grados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estudiantes" ADD CONSTRAINT "estudiantes_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_estudiante" ADD CONSTRAINT "historico_estudiante_estudiante_id_fkey" FOREIGN KEY ("estudiante_id") REFERENCES "estudiantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_estudiante" ADD CONSTRAINT "historico_estudiante_importacion_id_fkey" FOREIGN KEY ("importacion_id") REFERENCES "importaciones_simat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_estudiante" ADD CONSTRAINT "historico_estudiante_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importaciones_simat" ADD CONSTRAINT "importaciones_simat_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importaciones_detalle" ADD CONSTRAINT "importaciones_detalle_importacion_id_fkey" FOREIGN KEY ("importacion_id") REFERENCES "importaciones_simat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importaciones_detalle" ADD CONSTRAINT "importaciones_detalle_estudiante_id_fkey" FOREIGN KEY ("estudiante_id") REFERENCES "estudiantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traslados" ADD CONSTRAINT "traslados_estudiante_id_fkey" FOREIGN KEY ("estudiante_id") REFERENCES "estudiantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traslados" ADD CONSTRAINT "traslados_institucion_anterior_id_fkey" FOREIGN KEY ("institucion_anterior_id") REFERENCES "instituciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traslados" ADD CONSTRAINT "traslados_sede_anterior_id_fkey" FOREIGN KEY ("sede_anterior_id") REFERENCES "sedes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traslados" ADD CONSTRAINT "traslados_institucion_nueva_id_fkey" FOREIGN KEY ("institucion_nueva_id") REFERENCES "instituciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traslados" ADD CONSTRAINT "traslados_sede_nueva_id_fkey" FOREIGN KEY ("sede_nueva_id") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traslados" ADD CONSTRAINT "traslados_importacion_id_fkey" FOREIGN KEY ("importacion_id") REFERENCES "importaciones_simat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinculaciones_provisionales" ADD CONSTRAINT "vinculaciones_provisionales_estudiante_temporal_id_fkey" FOREIGN KEY ("estudiante_temporal_id") REFERENCES "estudiantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinculaciones_provisionales" ADD CONSTRAINT "vinculaciones_provisionales_estudiante_oficial_id_fkey" FOREIGN KEY ("estudiante_oficial_id") REFERENCES "estudiantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinculaciones_provisionales" ADD CONSTRAINT "vinculaciones_provisionales_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_estudiante_id_fkey" FOREIGN KEY ("estudiante_id") REFERENCES "estudiantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_permiso_id_fkey" FOREIGN KEY ("permiso_id") REFERENCES "permisos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_permisos_extra" ADD CONSTRAINT "usuarios_permisos_extra_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_permisos_extra" ADD CONSTRAINT "usuarios_permisos_extra_permiso_id_fkey" FOREIGN KEY ("permiso_id") REFERENCES "permisos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_operativas" ADD CONSTRAINT "asignaciones_operativas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_operativas" ADD CONSTRAINT "asignaciones_operativas_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zonas_educativas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_operativas_sedes" ADD CONSTRAINT "asignaciones_operativas_sedes_asignacion_id_fkey" FOREIGN KEY ("asignacion_id") REFERENCES "asignaciones_operativas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_operativas_sedes" ADD CONSTRAINT "asignaciones_operativas_sedes_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_docentes" ADD CONSTRAINT "asignaciones_docentes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_docentes" ADD CONSTRAINT "asignaciones_docentes_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_docentes" ADD CONSTRAINT "asignaciones_docentes_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispositivos" ADD CONSTRAINT "dispositivos_usuario_principal_id_fkey" FOREIGN KEY ("usuario_principal_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jornadas_pae" ADD CONSTRAINT "jornadas_pae_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jornadas_pae" ADD CONSTRAINT "jornadas_pae_usuario_apertura_id_fkey" FOREIGN KEY ("usuario_apertura_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jornadas_pae" ADD CONSTRAINT "jornadas_pae_usuario_cierre_id_fkey" FOREIGN KEY ("usuario_cierre_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencia" ADD CONSTRAINT "asistencia_estudiante_id_fkey" FOREIGN KEY ("estudiante_id") REFERENCES "estudiantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencia" ADD CONSTRAINT "asistencia_jornada_id_fkey" FOREIGN KEY ("jornada_id") REFERENCES "jornadas_pae"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencia" ADD CONSTRAINT "asistencia_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencia" ADD CONSTRAINT "asistencia_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "dispositivos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_modificacion" ADD CONSTRAINT "solicitudes_modificacion_asistencia_id_fkey" FOREIGN KEY ("asistencia_id") REFERENCES "asistencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_modificacion" ADD CONSTRAINT "solicitudes_modificacion_usuario_solicitante_id_fkey" FOREIGN KEY ("usuario_solicitante_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_modificacion" ADD CONSTRAINT "solicitudes_modificacion_usuario_autoriza_id_fkey" FOREIGN KEY ("usuario_autoriza_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_estudiante_id_fkey" FOREIGN KEY ("estudiante_id") REFERENCES "estudiantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_jornada_id_fkey" FOREIGN KEY ("jornada_id") REFERENCES "jornadas_pae"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_entrega_original_id_fkey" FOREIGN KEY ("entrega_original_id") REFERENCES "entregas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "dispositivos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_institucion_id_fkey" FOREIGN KEY ("institucion_id") REFERENCES "instituciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedades" ADD CONSTRAINT "novedades_estudiante_id_fkey" FOREIGN KEY ("estudiante_id") REFERENCES "estudiantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedades" ADD CONSTRAINT "novedades_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedades" ADD CONSTRAINT "novedades_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cola_sincronizacion" ADD CONSTRAINT "cola_sincronizacion_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "dispositivos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sincronizaciones" ADD CONSTRAINT "sincronizaciones_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "dispositivos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sincronizaciones" ADD CONSTRAINT "sincronizaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "dispositivos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
