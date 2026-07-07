import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import UserForm from "./UserForm";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "KATALYST_ADMIN") {
    redirect("/"); // Redirect non-admins to dashboard home
  }

  const users = await prisma.user.findMany({
    include: {
      school: true,
    },
    orderBy: {
      createdAt: 'desc',
    }
  });

  const schools = await prisma.school.findMany({
    select: { id: true, name: true }
  });

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">Create and manage access for teachers, principals, and admins.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create User Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4">Create New Account</h2>
            <UserForm schools={schools} />
          </div>
        </div>

        {/* Users List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3">Name</th>
                    <th scope="col" className="px-6 py-3">Email</th>
                    <th scope="col" className="px-6 py-3">Role</th>
                    <th scope="col" className="px-6 py-3">School</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                        {user.name}
                      </td>
                      <td className="px-6 py-4">
                        {user.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium
                          ${user.role === 'KATALYST_ADMIN' ? 'bg-purple-100 text-purple-800' : ''}
                          ${user.role === 'PRINCIPAL' ? 'bg-blue-100 text-blue-800' : ''}
                          ${user.role === 'HOD' ? 'bg-yellow-100 text-yellow-800' : ''}
                          ${user.role === 'TEACHER' ? 'bg-green-100 text-green-800' : ''}
                          ${user.role === 'ACADEMIC_COORDINATOR' ? 'bg-orange-100 text-orange-800' : ''}
                        `}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.school?.name || '-'}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        No users found.
                      </td>
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
