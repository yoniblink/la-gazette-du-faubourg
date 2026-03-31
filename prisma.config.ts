import "dotenv/config";
import { defineConfig } from "prisma/config";

/** Remplace `package.json#prisma` (déprécié avant Prisma 7). */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
