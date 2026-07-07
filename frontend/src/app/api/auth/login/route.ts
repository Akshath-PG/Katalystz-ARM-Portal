export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // We accept username or email for flexibility based on your curl
    const loginEmail = email || body.username;

    if (!loginEmail || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: loginEmail }
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Generate JWT Token
    const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret';
    
    // Set token expiry (e.g., 24 hours)
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        schoolId: user.schoolId
      },
      secret,
      { expiresIn: '24h' }
    );

    return NextResponse.json({
      message: 'Login successful',
      token: token,
      expiresIn: '24h',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('API Login Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
