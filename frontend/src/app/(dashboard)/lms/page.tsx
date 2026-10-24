export const dynamic = 'force-dynamic';

import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { Lock, ShieldAlert } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { LMS_MODULES, ROLE_LABELS, getGrant, isRole } from "@/lib/lms/accessMatrix";
import AccessBadge from "@/components/lms/AccessBadge";

export default async function LmsOverviewPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = session.user.role;
  const roleLabel = isRole(role) ? ROLE_LABELS[role] : role;

  return (
    <div>
      <div className="mb-6 bg-white/70 backdrop-blur-md p-4 rounded-xl border border-white/40 shadow-sm">
        <p className="text-sm text-gray-600">
          Signed in as <span className="font-semibold text-gray-900">{roleLabel}</span>. Modules you
          cannot open are locked.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {LMS_MODULES.map((mod) => {
          const grant = getGrant(role, mod.key);
          const locked = grant.level === "none";

          const card = (
            <div
              className={`h-full bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all ${
                locked ? "opacity-50" : "hover:border-brand-100 hover:shadow-md"
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <h2 className="text-lg font-semibold text-gray-900">{mod.name}</h2>
                {locked ? <Lock className="w-4 h-4 text-gray-400 shrink-0" /> : <AccessBadge grant={grant} />}
              </div>
              <p className="text-sm text-gray-500">{mod.description}</p>
              {mod.containsStudentPii && (
                <p className="mt-4 flex items-center gap-1 text-xs text-orange-700">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Contains student data
                </p>
              )}
            </div>
          );

          return locked ? (
            <div key={mod.key}>{card}</div>
          ) : (
            <Link key={mod.key} href={`/lms/${mod.key}`}>
              {card}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
