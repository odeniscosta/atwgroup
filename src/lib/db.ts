import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const fallbackUrl = "postgresql://atw:atw_dev@localhost:5432/atwgroup";
const globalForPrisma = globalThis as unknown as { db?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? fallbackUrl,
  });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.db ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.db = db;
}
