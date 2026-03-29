/**
 * Crée ou met à jour uniquement le compte admin (mot de passe = ADMIN_PASSWORD du .env).
 * Usage : npm run db:admin
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (
    process.env.ADMIN_EMAIL?.trim() || "admin@lagazettedufaubourg.local"
  ).toLowerCase();
  const password = (process.env.ADMIN_PASSWORD ?? "changeme").trim();
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.upsert({
    where: { email },
    create: { email, passwordHash, name: "Administrateur" },
    update: { passwordHash },
  });

  console.log(`Compte admin prêt — email : ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
