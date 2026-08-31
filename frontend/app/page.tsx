"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Users,
  Building2,
  Award,
  ArrowRight,
  TrendingUp,
  Globe2,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";

type StatsData = {
  total_publications: number;
  total_researchers: number;
  total_journals: number;
  quartile_distribution: { [key: string]: number };
  yearly_trend: { year: number; count: number }[];
  top_sdgs: { sdg_code: string; description_th: string; count: number }[];
  top_researchers: {
    id: number;
    prefix_title: string;
    full_name_th: string;
    full_name_en: string;
    publication_count: number;
  }[];
};

export default function HomePage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const totalPubs = stats?.total_publications || 0;
  const q1Count = stats?.quartile_distribution?.["Q1"] || 0;
  const q2Count = stats?.quartile_distribution?.["Q2"] || 0;
  const q3Count = stats?.quartile_distribution?.["Q3"] || 0;
  const q4Count = stats?.quartile_distribution?.["Q4"] || 0;
  const unrankedCount = stats?.quartile_distribution?.["Unranked"] || 0;
  const q1Percentage = totalPubs > 0 ? Math.round((q1Count / totalPubs) * 100) : 0;

  return (
    <main className="min-h-screen pb-16 pt-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-10">
        {/* HERO BANNER */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950 p-8 md:p-12 shadow-2xl backdrop-blur-xl">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-24 -bottom-24 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-8 space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                <span>KMUTNB Applied Science Research Hub</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl leading-tight">
                ระบบจัดการและติดตาม <br />
                <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 bg-clip-text text-transparent">
                  ผลงานวิจัยและการตีพิมพ์วิชาการ
                </span>
              </h1>
              <p className="max-w-2xl text-base sm:text-lg text-slate-300 leading-relaxed">
                ศูนย์กลางฐานข้อมูลงานวิจัย คณะวิทยาศาสตร์ประยุกต์ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ 
                รองรับการนำเข้าไฟล์ Excel, จัดกลุ่ม Quartile (Q1–Q4), เชื่อมโยง SDG Goals และตรวจสอบความก้าวหน้าของผลงาน
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  href="/records"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:brightness-110 hover:shadow-cyan-500/40 active:scale-95"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>ค้นหาและสืบค้นผลงาน</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-6 py-3.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white active:scale-95"
                >
                  <FileSpreadsheet className="h-4 w-4 text-cyan-400" />
                  <span>นำเข้าข้อมูล Excel (.xlsx)</span>
                </Link>
              </div>
            </div>

            {/* Quick Impact Highlight */}
            <div className="lg:col-span-4 rounded-2xl border border-slate-700/80 bg-slate-950/70 p-6 backdrop-blur-md shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">High Impact Tier</span>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                  Scopus / WoS Q1
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-4xl font-extrabold text-white">{q1Count}</span>
                <span className="text-sm text-slate-400">จากทั้งหมด {totalPubs} ผลงาน</span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                  <span>สัดส่วนผลงาน Q1</span>
                  <span className="font-semibold text-emerald-400">{q1Percentage}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000"
                    style={{ width: `${Math.max(5, q1Percentage)}%` }}
                  />
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-400 leading-normal">
                สะท้อนคุณภาพและมาตรฐานงานวิจัยในระดับสากลของคณะวิทยาศาสตร์ประยุกต์
              </p>
            </div>
          </div>
        </section>

        {/* KPI CARDS */}
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-6 transition-all duration-300 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/10">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">ผลงานตีพิมพ์ทั้งหมด</span>
              <div className="rounded-xl bg-cyan-500/10 p-2.5 text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition">
                <BookOpen className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">{loading ? "-" : totalPubs}</span>
              <span className="text-xs text-cyan-400">บทความ</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">บันทึกในระบบฐานข้อมูล</p>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-6 transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">อาจารย์และนักวิจัย</span>
              <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-400 border border-blue-500/20 group-hover:scale-110 transition">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">{loading ? "-" : (stats?.total_researchers || 0)}</span>
              <span className="text-xs text-blue-400">ท่าน</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">สังกัดคณะและผู้ร่วมวิจัย</p>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-6 transition-all duration-300 hover:border-teal-500/40 hover:shadow-lg hover:shadow-teal-500/10">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">วารสารวิชาการ</span>
              <div className="rounded-xl bg-teal-500/10 p-2.5 text-teal-400 border border-teal-500/20 group-hover:scale-110 transition">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">{loading ? "-" : (stats?.total_journals || 0)}</span>
              <span className="text-xs text-teal-400">วารสาร</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">ในระดับชาติและนานาชาติ</p>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-6 transition-all duration-300 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">ผลงานระดับ Q1 / Q2</span>
              <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition">
                <Award className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">{loading ? "-" : (q1Count + q2Count)}</span>
              <span className="text-xs text-emerald-400">บทความ</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {totalPubs > 0 ? Math.round(((q1Count + q2Count) / totalPubs) * 100) : 0}% ของผลงานทั้งหมด
            </p>
          </div>
        </section>

        {/* DETAILED STATS GRID */}
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Quartile Breakdown */}
          <div className="lg:col-span-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8 backdrop-blur-md">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-500/10 p-2 text-amber-400 border border-amber-500/20">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">การกระจายตัวตาม Quartile</h2>
                  <p className="text-xs text-slate-400">ระดับคุณภาพของวารสารที่ตีพิมพ์</p>
                </div>
              </div>
              <Link href="/records" className="text-xs text-cyan-400 hover:underline">
                ดูทั้งหมด →
              </Link>
            </div>

            <div className="space-y-4">
              {[
                { label: "Quartile 1 (Q1)", count: q1Count, color: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500/30" },
                { label: "Quartile 2 (Q2)", count: q2Count, color: "bg-cyan-500", text: "text-cyan-400", border: "border-cyan-500/30" },
                { label: "Quartile 3 (Q3)", count: q3Count, color: "bg-amber-500", text: "text-amber-400", border: "border-amber-500/30" },
                { label: "Quartile 4 (Q4)", count: q4Count, color: "bg-rose-500", text: "text-rose-400", border: "border-rose-500/30" },
                { label: "Unranked / อื่นๆ", count: unrankedCount, color: "bg-slate-600", text: "text-slate-400", border: "border-slate-700" },
              ].map((item) => {
                const pct = totalPubs > 0 ? Math.round((item.count / totalPubs) * 100) : 0;
                return (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-medium text-slate-300">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${item.text}`}>{item.count}</span>
                        <span className="text-slate-500">({pct}%)</span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full ${item.color} transition-all duration-700`}
                        style={{ width: `${Math.max(item.count > 0 ? 3 : 0, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top SDG Alignment */}
          <div className="lg:col-span-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8 backdrop-blur-md">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-500/10 p-2 text-blue-400 border border-blue-500/20">
                  <Globe2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">เป้าหมายความยั่งยืน (SDGs)</h2>
                  <p className="text-xs text-slate-400">ความสอดคล้องกับ Sustainable Development Goals</p>
                </div>
              </div>
            </div>

            {stats?.top_sdgs && stats.top_sdgs.length > 0 ? (
              <div className="space-y-3">
                {stats.top_sdgs.map((sdg) => (
                  <div
                    key={sdg.sdg_code}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="rounded-md bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-400 border border-blue-500/20 shrink-0">
                        {sdg.sdg_code}
                      </span>
                      <p className="text-xs sm:text-sm text-slate-300 truncate">{sdg.description_th}</p>
                    </div>
                    <span className="text-xs font-bold text-slate-400 shrink-0 ml-3">{sdg.count} ผลงาน</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 text-center p-6">
                <Layers className="h-8 w-8 text-slate-600 mb-2" />
                <p className="text-sm text-slate-400">ยังไม่มีข้อมูลการเชื่อมโยง SDG ในระบบ</p>
                <p className="text-xs text-slate-500 mt-1">นำเข้าไฟล์ Excel ที่มีคอลัมน์ SDG เพื่อวิเคราะห์</p>
              </div>
            )}
          </div>
        </section>

        {/* FOOTER CALLOUT */}
        <section className="rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-white">ต้องการนำเข้าข้อมูลผลงานวิจัยเพิ่ม?</h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              รองรับไฟล์ Excel ของคณะ พร้อมระบบสร้างรายการวารสารและผู้แต่งอัตโนมัติ
            </p>
          </div>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 transition shrink-0"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>ไปที่หน้าอัปโหลด</span>
          </Link>
        </section>
      </div>
    </main>
  );
}
