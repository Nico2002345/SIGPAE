-- CreateTable
CREATE TABLE "sesiones_refresco" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "dispositivo_id" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "revocado_en" TIMESTAMP(3),

    CONSTRAINT "sesiones_refresco_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_refresco_token_hash_key" ON "sesiones_refresco"("token_hash");

-- CreateIndex
CREATE INDEX "sesiones_refresco_usuario_id_idx" ON "sesiones_refresco"("usuario_id");

-- AddForeignKey
ALTER TABLE "sesiones_refresco" ADD CONSTRAINT "sesiones_refresco_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_refresco" ADD CONSTRAINT "sesiones_refresco_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "dispositivos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
