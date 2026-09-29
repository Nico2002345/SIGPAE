-- CreateEnum
CREATE TYPE "EstadoEscenarioCapacitacion" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "ResultadoEvaluacion" AS ENUM ('APROBADO', 'REPROBADO');

-- AlterTable
ALTER TABLE "estudiantes" ADD COLUMN     "es_capacitacion" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "instituciones" ADD COLUMN     "es_capacitacion" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "jornadas_pae" ADD COLUMN     "es_capacitacion" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "sedes" ADD COLUMN     "es_capacitacion" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "escenarios_capacitacion" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "EstadoEscenarioCapacitacion" NOT NULL DEFAULT 'ACTIVO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escenarios_capacitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluaciones_capacitacion" (
    "id" TEXT NOT NULL,
    "escenario_id" INTEGER NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "resultado" "ResultadoEvaluacion" NOT NULL,
    "observaciones" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluaciones_capacitacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "escenarios_capacitacion_codigo_key" ON "escenarios_capacitacion"("codigo");

-- AddForeignKey
ALTER TABLE "evaluaciones_capacitacion" ADD CONSTRAINT "evaluaciones_capacitacion_escenario_id_fkey" FOREIGN KEY ("escenario_id") REFERENCES "escenarios_capacitacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluaciones_capacitacion" ADD CONSTRAINT "evaluaciones_capacitacion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
