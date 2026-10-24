import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Makes sure the database has an admin, so a fresh database can be logged into.
// Runs against the runtime database, which on Vercel previews can differ from
// the one the build-time seed writes to. When no KATALYST_ADMIN exists, the
// ADMIN_EMAIL account is created (or promoted, if it already exists) with
// ADMIN_PASSWORD. Mirrors prisma/seed.ts defaults.
export async function ensureInitialAdmin() {
  if ((await prisma.user.count({ where: { role: "KATALYST_ADMIN" } })) > 0) return;

  const email = process.env.ADMIN_EMAIL || "admin@katalystzedu.com";
  const password = await bcrypt.hash(process.env.ADMIN_PASSWORD || "Password123!", 10);

  await prisma.user.upsert({
    where: { email },
    update: { role: "KATALYST_ADMIN", password, schoolId: null },
    create: { name: "Katalystz Admin", email, password, role: "KATALYST_ADMIN" },
  });
}
