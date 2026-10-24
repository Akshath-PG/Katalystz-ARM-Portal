import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Creates the first admin when the database has no users at all, so a fresh
// database can be logged into. Runs against the runtime database, which on
// Vercel previews can differ from the one the build-time seed writes to.
// Mirrors prisma/seed.ts: ADMIN_EMAIL / ADMIN_PASSWORD override the defaults.
export async function ensureInitialAdmin() {
  if ((await prisma.user.count()) > 0) return;

  await prisma.user.create({
    data: {
      name: "Katalystz Admin",
      email: process.env.ADMIN_EMAIL || "admin@katalystzedu.com",
      password: await bcrypt.hash(process.env.ADMIN_PASSWORD || "Password123!", 10),
      role: "KATALYST_ADMIN",
    },
  });
}
