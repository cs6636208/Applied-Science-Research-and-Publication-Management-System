"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  Menu,
  Target,
  UploadCloud,
  Users,
  X,
} from "lucide-react";

const navItems = [
  { name: "ภาพรวมระบบ", href: "/", icon: LayoutDashboard, hint: "Dashboard" },
  { name: "ผลงานตีพิมพ์", href: "/records", icon: BookOpen, hint: "Publications" },
  { name: "ทุนและโครงการวิจัย", href: "/projects", icon: FolderKanban, hint: "Projects & Grants" },
  { name: "คณาจารย์และนักวิจัย", href: "/researchers", icon: Users, hint: "Researchers" },
  { name: "นำเข้าข้อมูล Excel", href: "/upload", icon: UploadCloud, hint: "Import Data" },
  { name: "ตัวชี้วัดและเป้าหมาย", href: "/#kpi-section", icon: Target, hint: "Plan KPI" },
];

function Brand() {
  return (
    <Link href="/" className="sidebar-brand" aria-label="หน้าหลักระบบบริหารจัดการงานวิจัย">
      <span className="sidebar-brand-mark">AS</span>
      <span className="sidebar-brand-copy">
        <strong>Research System</strong>
        <small>Applied Science</small>
      </span>
    </Link>
  );
}

function NavLinks({ closeMenu }: { closeMenu?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="app-nav" aria-label="เมนูหลัก">
      <p className="app-nav-label">เมนูหลัก</p>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.href.includes("#") ? false : pathname === item.href;
        return (
          <Link key={item.href} href={item.href} onClick={closeMenu} className={`app-nav-link ${isActive ? "is-active" : ""}`}>
            <Icon className="app-nav-icon" />
            <span className="app-nav-text"><strong>{item.name}</strong><small>{item.hint}</small></span>
            {isActive && <ChevronRight className="app-nav-arrow" />}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <>
      <aside className="app-sidebar">
        <Brand />
        <div className="sidebar-system-name">
          <span>ระบบบริหารจัดการงานวิจัยและผลงานตีพิมพ์คณะวิทยาศาสตร์ประยุกต์</span>
        </div>
        <NavLinks />
        <div className="sidebar-bottom">
          <div className="sidebar-status"><span /> ระบบพร้อมใช้งาน</div>
          <p>Applied Science Research and<br />Publication Management System</p>
        </div>
      </aside>

      <header className="mobile-topbar">
        <Brand />
        <button className="mobile-nav-toggle" onClick={() => setMobileMenuOpen((open) => !open)} aria-label="เปิดเมนู">
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {mobileMenuOpen && (
        <div className="mobile-nav-drawer">
          <NavLinks closeMenu={() => setMobileMenuOpen(false)} />
          <div className="sidebar-bottom"><div className="sidebar-status"><span /> ระบบพร้อมใช้งาน</div></div>
        </div>
      )}
    </>
  );
}
