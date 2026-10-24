export const dynamic = 'force-dynamic';

import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { authOptions } from "@/lib/auth";
import {
  ACCESS_LEVELS,
  DATA_USAGE_RULES,
  LEVEL_DESCRIPTIONS,
  LMS_MODULES,
  ROLES,
  ROLE_LABELS,
  SCOPE_DESCRIPTIONS,
  SCOPE_LABELS,
  Scope,
} from "@/lib/lms/accessMatrix";
import AccessBadge from "@/components/lms/AccessBadge";

export default async function AccessMatrixPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const currentRole = session.user.role;

  return (
    <div className="space-y-8">
      {/* Summary matrix */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Summary Matrix</h2>
          <p className="text-sm text-gray-500">Access level and data scope for each role. Your role is highlighted.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left">Module</th>
                {ROLES.map((role) => (
                  <th
                    key={role}
                    scope="col"
                    className={`px-4 py-3 text-center whitespace-nowrap ${
                      role === currentRole ? "bg-brand-50 text-brand-600" : ""
                    }`}
                  >
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LMS_MODULES.map((mod) => (
                <tr key={mod.key} className="border-b last:border-b-0 hover:bg-gray-50/50">
                  <th scope="row" className="px-6 py-4 text-left font-medium text-gray-900">
                    <div className="flex items-center gap-1.5">
                      {mod.name}
                      {mod.containsStudentPii && (
                        <ShieldAlert className="w-3.5 h-3.5 text-orange-600" aria-label="Contains student data" />
                      )}
                    </div>
                    <div className="text-xs font-normal text-gray-500">{mod.description}</div>
                  </th>
                  {ROLES.map((role) => (
                    <td
                      key={role}
                      className={`px-4 py-4 text-center ${role === currentRole ? "bg-brand-50/40" : ""}`}
                    >
                      <AccessBadge grant={mod.access[role]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Access Levels</h2>
          <dl className="space-y-3">
            {ACCESS_LEVELS.map((level) => (
              <div key={level} className="flex items-start gap-4">
                <dt className="w-24 shrink-0">
                  <AccessBadge grant={{ level }} showScope={false} />
                </dt>
                <dd className="text-sm text-gray-600">{LEVEL_DESCRIPTIONS[level]}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Scope</h2>
          <dl className="space-y-3">
            {(Object.keys(SCOPE_LABELS) as Scope[]).map((scope) => (
              <div key={scope} className="flex items-start gap-4">
                <dt className="w-32 shrink-0 text-sm font-medium text-gray-900">{SCOPE_LABELS[scope]}</dt>
                <dd className="text-sm text-gray-600">{SCOPE_DESCRIPTIONS[scope]}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Data usage restrictions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Usage &amp; Restrictions</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DATA_USAGE_RULES.map((rule) => (
            <li key={rule.title} className="p-4 rounded-lg bg-gray-50 border border-gray-100">
              <p className="font-medium text-gray-900">{rule.title}</p>
              <p className="text-sm text-gray-600 mt-1">{rule.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
