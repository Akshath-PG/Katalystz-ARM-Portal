import { AccessLevel, Grant, LEVEL_LABELS, SCOPE_LABELS } from "@/lib/lms/accessMatrix";

const LEVEL_STYLES: Record<AccessLevel, string> = {
  none: "bg-gray-100 text-gray-400",
  view: "bg-sky-50 text-sky-700 border border-sky-100",
  contribute: "bg-green-50 text-green-700 border border-green-100",
  edit: "bg-yellow-50 text-yellow-800 border border-yellow-100",
  approve: "bg-purple-50 text-purple-700 border border-purple-100",
  manage: "bg-brand-50 text-brand-600 border border-brand-100",
};

export default function AccessBadge({ grant, showScope = true }: { grant: Grant; showScope?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${LEVEL_STYLES[grant.level]}`}>
        {LEVEL_LABELS[grant.level]}
      </span>
      {showScope && grant.scope && grant.level !== "none" && (
        <span className="text-[11px] text-gray-500 whitespace-nowrap">{SCOPE_LABELS[grant.scope]}</span>
      )}
    </div>
  );
}
