"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { name: "Overview", href: "/lms" },
  { name: "Access Matrix", href: "/lms/access-matrix" },
];

export default function LmsTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 border-b border-gray-200 mb-8">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 -mb-px text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-gray-500 hover:text-brand-500"
            }`}
          >
            {tab.name}
          </Link>
        );
      })}
    </div>
  );
}
