"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  Building2,
  Map,
  Search,
  Upload,
  Users,
  ShieldCheck,
  History,
  LogOut,
  Menu,
  X,
  ScanLine,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scan", label: "Scan asset", icon: ScanLine },
  { href: "/assets", label: "Assets", icon: Package },
  { href: "/buildings", label: "Buildings", icon: Building2 },
  { href: "/map", label: "Map", icon: Map },
  { href: "/search", label: "Search", icon: Search },
];
const adminNav = [
  { href: "/admin/import", label: "Import Excel", icon: Upload },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/fields", label: "Custom fields", icon: ShieldCheck },
  { href: "/admin/audit", label: "Audit log", icon: History },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data } = useSession();
  const role = (data?.user as { role?: string } | undefined)?.role;
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-gray-50">
      <button
        aria-label="Open menu"
        className="fixed left-3 top-3 z-40 lg:hidden btn-secondary p-2"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      <aside
        className={cn(
          "fixed lg:sticky top-0 z-30 h-screen w-64 shrink-0 border-r border-gray-200 bg-white p-4 flex flex-col transition-transform",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0"
        )}
      >
        <div className="flex items-center gap-2 px-2 py-1 mb-4">
          <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <div className="font-semibold text-sm">HospitalAM</div>
        </div>

        <nav className="space-y-1 flex-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                  active ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {role === "ADMIN" && (
            <>
              <div className="mt-4 mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Admin
              </div>
              {adminNav.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                      active ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="border-t border-gray-200 pt-3 mt-3">
          <div className="px-3 pb-2">
            <div className="text-sm font-medium truncate">{data?.user?.email}</div>
            <div className="text-xs text-gray-500">{role ?? "USER"}</div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full btn-ghost justify-start"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 pt-16 lg:pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}
