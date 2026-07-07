"use client";

import { Building, LayoutDashboard, Settings, Users, FileText, Hexagon, LogOut } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Cross-School Analytics", href: "/", icon: LayoutDashboard },
    { name: "Manage Schools", href: "/schools", icon: Building },
    { name: "Admin Users", href: "/users", icon: Users },
    { name: "Audit Logs", href: "/logs", icon: FileText },
  ];

  return (
    <aside className="w-64 bg-white/70 backdrop-blur-md border-r border-white/40 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div className="h-16 flex items-center px-6 border-b border-white/40 gap-2">
        <Hexagon className="w-6 h-6 text-brand-500 fill-brand-50" />
        <h1 className="text-lg font-bold text-gray-900 tracking-tight">
          KATALYSTZ <span className="font-light text-brand-600">ARM</span>
        </h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                isActive 
                  ? "text-brand-600 bg-brand-50/80 shadow-sm border border-brand-100" 
                  : "text-gray-600 hover:bg-white/50 hover:text-brand-500"
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-white/40">
        <Link 
          href="/settings" 
          className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
            pathname === "/settings"
              ? "text-brand-600 bg-brand-50/80 shadow-sm border border-brand-100"
              : "text-gray-600 hover:bg-white/50 hover:text-brand-500"
          }`}
        >
          <Settings className="w-5 h-5" />
          Settings
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-3 px-3 py-2 mt-2 rounded-lg font-medium transition-all duration-200 text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
