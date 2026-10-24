export const dynamic = 'force-dynamic';

import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can, getGrant } from "@/lib/lms/accessMatrix";
import { createClass, createStudent, createSubject } from "@/app/actions/school";
import RecordForm from "@/components/schools/RecordForm";

// Mirrors the write rule in app/actions/school.ts so forms only show when they will work.
function canWrite(role: string, moduleKey: string, userSchoolId: string | null, schoolId: string) {
  if (!can(role, moduleKey, "create")) return false;
  const { scope } = getGrant(role, moduleKey);
  return scope === "global" || (scope === "school" && userSchoolId === schoolId);
}

export default async function SchoolDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { role, id: userId, schoolId: userSchoolId } = session.user;
  const classesGrant = getGrant(role, "classes");
  if (!can(role, "classes", "view")) redirect("/");
  if (classesGrant.scope !== "global" && userSchoolId !== params.id) redirect("/schools");

  const school = await prisma.school.findUnique({
    where: { id: params.id },
    include: {
      classes: {
        // Teachers only see the classes they teach.
        where: classesGrant.scope === "class" ? { teacherId: userId } : undefined,
        include: {
          teacher: { select: { name: true } },
          subjects: { select: { id: true, name: true }, orderBy: { name: "asc" } },
          _count: { select: { students: true } },
        },
        orderBy: { name: "asc" },
      },
      users: { where: { role: "TEACHER" }, select: { id: true, name: true }, orderBy: { name: "asc" } },
    },
  });
  if (!school) notFound();

  const classOptions = school.classes.map((c) => ({ value: c.id, label: c.name }));
  const canAddClasses = canWrite(role, "classes", userSchoolId, school.id);
  const canAddSubjects = canWrite(role, "curriculum", userSchoolId, school.id);
  const hasForms = canAddClasses || canAddSubjects;

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {classesGrant.scope === "global" && (
        <Link href="/schools" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-500 mb-6">
          <ArrowLeft className="w-4 h-4" />
          All schools
        </Link>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 font-heading">{school.name}</h1>
        {school.address && <p className="text-gray-500 mt-1">{school.address}</p>}
      </div>

      <div className={`grid grid-cols-1 gap-8 ${hasForms ? "lg:grid-cols-3" : ""}`}>
        {hasForms && (
          <div className="lg:col-span-1 space-y-6">
            {canAddClasses && (
              <RecordForm
                title="Add Class"
                submitLabel="Create Class"
                action={createClass}
                fields={[
                  { name: "schoolId", type: "hidden", value: school.id },
                  { name: "name", label: "Class Name", type: "text", required: true, placeholder: "Grade 10 - A" },
                  {
                    name: "teacherId",
                    label: "Class Teacher",
                    type: "select",
                    emptyLabel: "Not assigned",
                    options: school.users.map((u) => ({ value: u.id, label: u.name })),
                  },
                ]}
              />
            )}
            {canAddSubjects && classOptions.length > 0 && (
              <RecordForm
                title="Add Subject"
                submitLabel="Add Subject"
                action={createSubject}
                fields={[
                  { name: "schoolId", type: "hidden", value: school.id },
                  { name: "classId", label: "Class", type: "select", required: true, options: classOptions },
                  { name: "name", label: "Subject Name", type: "text", required: true, placeholder: "Mathematics" },
                ]}
              />
            )}
            {canAddClasses && classOptions.length > 0 && (
              <RecordForm
                title="Add Student"
                submitLabel="Add Student"
                action={createStudent}
                fields={[
                  { name: "schoolId", type: "hidden", value: school.id },
                  { name: "classId", label: "Class", type: "select", required: true, options: classOptions },
                  { name: "name", label: "Student Name", type: "text", required: true },
                ]}
              />
            )}
          </div>
        )}

        <div className={hasForms ? "lg:col-span-2" : ""}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3">Class</th>
                    <th scope="col" className="px-6 py-3">Class Teacher</th>
                    <th scope="col" className="px-6 py-3">Subjects</th>
                    <th scope="col" className="px-6 py-3">Students</th>
                  </tr>
                </thead>
                <tbody>
                  {school.classes.map((c) => (
                    <tr key={c.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{c.name}</td>
                      <td className="px-6 py-4">{c.teacher?.name || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {c.subjects.map((s) => (
                            <span key={s.id} className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-700">{s.name}</span>
                          ))}
                          {c.subjects.length === 0 && '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">{c._count.students}</td>
                    </tr>
                  ))}
                  {school.classes.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No classes yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
