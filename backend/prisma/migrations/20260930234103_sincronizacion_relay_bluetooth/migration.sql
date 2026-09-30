-- AlterTable
ALTER TABLE "sincronizaciones" ADD COLUMN     "dispositivo_relay_id" TEXT;

-- AddForeignKey
ALTER TABLE "sincronizaciones" ADD CONSTRAINT "sincronizaciones_dispositivo_relay_id_fkey" FOREIGN KEY ("dispositivo_relay_id") REFERENCES "dispositivos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
