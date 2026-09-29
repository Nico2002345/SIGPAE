import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { seedRolesYPermisos } from "./seedData.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const { maestro } = await seedRolesYPermisos(prisma);

  const usuarioLoginBootstrap = "maestro";
  const existente = await prisma.usuario.findUnique({ where: { usuarioLogin: usuarioLoginBootstrap } });

  if (existente) {
    console.log("Usuario maestro ya existía, no se modificó.");
    return;
  }

  const passwordInicial = process.env.SEED_MAESTRO_PASSWORD ?? crypto.randomUUID();
  const passwordHash = await hash(passwordInicial);

  await prisma.usuario.create({
    data: {
      nombreCompleto: "Administrador Maestro",
      usuarioLogin: usuarioLoginBootstrap,
      passwordHash,
      rolId: maestro.id,
    },
  });

  console.log(`Usuario maestro creado. Login: "${usuarioLoginBootstrap}" | Password inicial: "${passwordInicial}"`);
  console.log("Guarda esta contraseña ahora: no se volverá a mostrar.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
