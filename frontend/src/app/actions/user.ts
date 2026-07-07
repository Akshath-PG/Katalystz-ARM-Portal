'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { Role } from '@prisma/client';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function createUser(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'KATALYST_ADMIN') {
    return { error: 'Unauthorized: Only admins can create users.' };
  }

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as Role;
  const schoolId = formData.get('schoolId') as string;

  if (!name || !email || !password || !role) {
    return { error: 'Missing required fields' };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: 'Email already exists' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        schoolId: schoolId || null,
      },
    });

    revalidatePath('/users');
    return { success: true };
  } catch (error) {
    console.error('Error creating user:', error);
    return { error: 'Failed to create user' };
  }
}
