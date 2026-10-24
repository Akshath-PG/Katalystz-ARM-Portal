'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { can, getGrant } from '@/lib/lms/accessMatrix';

type Result = { error?: string; success?: boolean };

// Writes are allowed for global scope, or school scope on the user's own school.
// Department scope (HOD) needs a department model before it can grant writes.
async function authorizeWrite(moduleKey: string, schoolId: string): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session) return 'You must be signed in.';

  const { role, schoolId: userSchoolId } = session.user;
  if (!can(role, moduleKey, 'create')) return 'Unauthorized: your role cannot add these records.';

  const { scope } = getGrant(role, moduleKey);
  if (scope === 'global') return null;
  if (scope === 'school' && userSchoolId === schoolId) return null;
  return 'Unauthorized: you can only add records for your own school.';
}

function field(formData: FormData, name: string) {
  return ((formData.get(name) as string | null) ?? '').trim();
}

export async function createSchool(formData: FormData): Promise<Result> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'KATALYST_ADMIN') {
    return { error: 'Unauthorized: Only admins can create schools.' };
  }

  const name = field(formData, 'name');
  const address = field(formData, 'address');
  if (!name) return { error: 'School name is required' };

  try {
    await prisma.school.create({ data: { name, address: address || null } });
    revalidatePath('/schools');
    return { success: true };
  } catch (error) {
    console.error('Error creating school:', error);
    return { error: 'Failed to create school' };
  }
}

export async function createClass(formData: FormData): Promise<Result> {
  const schoolId = field(formData, 'schoolId');
  const name = field(formData, 'name');
  const teacherId = field(formData, 'teacherId');
  if (!schoolId || !name) return { error: 'Class name is required' };

  const denied = await authorizeWrite('classes', schoolId);
  if (denied) return { error: denied };

  try {
    if (teacherId) {
      const teacher = await prisma.user.findFirst({ where: { id: teacherId, schoolId } });
      if (!teacher) return { error: 'Class teacher must belong to this school' };
    }
    await prisma.class.create({ data: { schoolId, name, teacherId: teacherId || null } });
    revalidatePath(`/schools/${schoolId}`);
    return { success: true };
  } catch (error) {
    console.error('Error creating class:', error);
    return { error: 'Failed to create class' };
  }
}

export async function createSubject(formData: FormData): Promise<Result> {
  const schoolId = field(formData, 'schoolId');
  const classId = field(formData, 'classId');
  const name = field(formData, 'name');
  if (!schoolId || !classId || !name) return { error: 'Class and subject name are required' };

  const denied = await authorizeWrite('curriculum', schoolId);
  if (denied) return { error: denied };

  try {
    const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!cls) return { error: 'Class not found in this school' };
    await prisma.subject.create({ data: { schoolId, classId, name } });
    revalidatePath(`/schools/${schoolId}`);
    return { success: true };
  } catch (error) {
    console.error('Error creating subject:', error);
    return { error: 'Failed to create subject' };
  }
}

export async function createStudent(formData: FormData): Promise<Result> {
  const schoolId = field(formData, 'schoolId');
  const classId = field(formData, 'classId');
  const name = field(formData, 'name');
  if (!schoolId || !classId || !name) return { error: 'Class and student name are required' };

  const denied = await authorizeWrite('classes', schoolId);
  if (denied) return { error: denied };

  try {
    const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!cls) return { error: 'Class not found in this school' };
    await prisma.student.create({ data: { classId, name } });
    revalidatePath(`/schools/${schoolId}`);
    return { success: true };
  } catch (error) {
    console.error('Error creating student:', error);
    return { error: 'Failed to add student' };
  }
}
