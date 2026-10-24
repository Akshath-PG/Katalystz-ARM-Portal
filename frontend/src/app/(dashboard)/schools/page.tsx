export const dynamic = 'force-dynamic';

import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { Building } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can, getGrant } from "@/lib/lms/accessMatrix";
import { createSchool } from "@/app/actions/school";
import RecordForm from "@/components/schools/RecordForm";

export default async function SchoolsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { role, schoolId } = session.user;
  if (!can(role, "classes", "view")) redirect("/");

  // Only global-scope roles pick between schools; everyone else goes to their own.
  if (getGrant(role, "classes").scope !== "global") {
    if (schoolId) redirect(`/schools/${schoolId}`);
    return <p className="text-gray-500">Your account is not linked to a school yet. Ask an admin to assign one.</p>;
  }

  const schools = await prisma.school.findMany({
    include: { _count: { select: { classes: true, users: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 font-heading">Manage Schools</h1>
        <p className="text-gray-500 mt-1">Add schools, then open one to add its classes, subjects and students.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <RecordForm
            title="Add School"
            submitLabel="Create School"
            action={createSchool}
            fields={[
              { name: "name", label: "School Name", type: "text", required: true },
              { name: "address", label: "Address", type: "text" },
            ]}
          />
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6 content-start">
          {schools.map((school) => (
            <Link
              key={school.id}
              href={`/schools/${school.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:border-brand-100 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <Building className="w-5 h-5 text-brand-500" />
                <h2 className="text-lg font-semibold text-gray-900">{school.name}</h2>
              </div>
              {school.address && <p className="text-sm text-gray-500">{school.address}</p>}
              <p className="text-sm text-gray-600 mt-3">
                {school._count.classes} classes · {school._count.users} staff
              </p>
            </Link>
          ))}
          {schools.length === 0 && (
            <div className="sm:col-span-2 bg-white/70 rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
              No schools yet. Add the first one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
