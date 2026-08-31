"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, UploadCloud, LayoutDashboard, Database } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Publications", href: "/records", icon: BookOpen },
    { name: "Import Dataset", href: "/upload", icon: UploadCloud },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition">
            <Database className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base md:text-lg">KMUTNB Data Hub</span>
              <span className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-400 border border-cyan-500/20">
                Applied Science
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Research & Publication Management System</p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1.5 sm:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-slate-800/90 text-cyan-400 border border-cyan-500/30 shadow-inner"
                    : "text-slate-300 hover:bg-slate-800/50 hover:text-white border border-transparent"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
