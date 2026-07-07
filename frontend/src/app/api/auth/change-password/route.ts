import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { oldPassword, newPassword } = await request.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Incorrect old password' }, { status: 400 });
    }

    // Check against password history
    let history: string[] = [];
    try {
      history = JSON.parse(user.passwordHistory || "[]");
    } catch (e) {
      history = [];
    }

    // Include the current password in the history check
    if (!history.includes(user.password)) {
      history.push(user.password);
    }

    // Check if new password matches any in history
    for (const oldHash of history) {
      const matchesHistory = await bcrypt.compare(newPassword, oldHash);
      if (matchesHistory) {
        return NextResponse.json({ error: 'New password must not be identical to any of your last 3 passwords' }, { status: 400 });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Keep only the last 3 passwords in history
    history.push(hashedPassword);
    if (history.length > 3) {
      history = history.slice(history.length - 3);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword,
        passwordHistory: JSON.stringify(history)
      }
    });

    return NextResponse.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
