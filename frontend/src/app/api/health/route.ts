export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Public status check for deploys: reports whether the database is reachable
// and whether an admin account exists, without exposing any user data.
export async function GET() {
  const env = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? null,
  };

  try {
    const adminCount = await prisma.user.count({ where: { role: 'KATALYST_ADMIN' } });
    return NextResponse.json({ database: 'connected', adminAccount: adminCount > 0, env });
  } catch (error) {
    const code = (error as { errorCode?: string; code?: string }).errorCode ?? (error as { code?: string }).code;
    return NextResponse.json(
      { database: 'error', error: (error as Error).name, code: code ?? null, env },
      { status: 503 }
    );
  }
}
