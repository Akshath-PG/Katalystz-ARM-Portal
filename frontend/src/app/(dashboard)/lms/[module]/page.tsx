export const dynamic = 'force-dynamic';

import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { LEVEL_ACTIONS, can, getGrant, getModule } from "@/lib/lms/accessMatrix";
import AccessBadge from "@/components/lms/AccessBadge";

export default async function LmsModulePage({ params }: { params: { module: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const mod = getModule(params.module);
  if (!mod) notFound();

  const role = session.user.role;
  if (!can(role, mod.key, "view")) redirect("/lms");

  const grant = getGrant(role, mod.key);
  const actions = LEVEL_ACTIONS[grant.level];

  return (
    <div>
      <Link href="/lms" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-500 mb-6">
        <ArrowLeft className="w-4 h-4" />
        All modules
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">{mod.name}</h2>
            <p className="text-gray-500 mt-1">{mod.description}</p>
          </div>
          <AccessBadge grant={grant} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((action) => (
            <span key={action} className="px-2 py-0.5 rounded bg-gray-100 text-xs font-medium text-gray-700 capitalize">
              {action}
            </span>
          ))}
        </div>
      </div>

      {/* Module content goes here once each module is built. */}
      <div className="bg-white/70 backdrop-blur-md rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
        {mod.name} content is coming soon.
      </div>
    </div>
  );
}
