"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Users,
  Award,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  Sparkles,
  FolderKanban,
  Target,
  CheckCircle2,
  ChevronRight,
  Compass,
  Clock,
  X,
  Search,
  Check,
  Building,
  GraduationCap,
  Layers,
  Globe2,
  Download,
  SlidersHorizontal,
  FileDown,
  FileText,
  Briefcase
} from "lucide-react";

type KpiData = {
  fiscal_year: string | number;
  is_all: boolean;
  available_years: number[];
  targets: {
    scopus: number;
    international: number;
    industry: number;
  };
  scopus: {
    current: number;
    target: number;
    percent: number;
    article_count: number;
    proceeding_count: number;
  };
  international: {
    current: number;
    target: number;
    percent: number;
  };
  industry: {
    current: number;
    target: number;
    percent: number;
  };
};

type ReportItem = {
  id: number;
  title: string;
  author_name?: string;
  lead_author?: string;
  journal_conference?: string;
  journal?: string;
  issue?: string;
  volume?: string;
  pages?: string;
  category?: string;
  inter_author?: string;
  inter_address?: string;
  publisher?: string;
  industry_org?: string;
  year?: number;
};

export default function HomePage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKpiYear, setSelectedKpiYear] = useState<string>("2569");

  // Edit Targets Modal State
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [editScopusTarget, setEditScopusTarget] = useState(290);
  const [editInterTarget, setEditInterTarget] = useState(80);
  const [editIndustryTarget, setEditIndustryTarget] = useState(4);
  const [isSavingTargets, setIsSavingTargets] = useState(false);

  // Plan Dept Data Report Modal (3.1, 3.2, 3.3)
  const [activeReportModal, setActiveReportModal] = useState<"scopus" | "international" | "industry" | null>(null);
  const [reportItems, setReportItems] = useState<ReportItem[]>([]);
  const [reportTotal, setReportTotal] = useState(0);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSearch, setReportSearch] = useState("");

  useEffect(() => {
    fetchGeneralStats();
  }, []);

  useEffect(() => {
    fetchKpiStats(selectedKpiYear);
  }, [selectedKpiYear]);

  const fetchGeneralStats = async () => {
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

  const fetchKpiStats = async (year: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/kpi/stats?year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setKpiData(data);
        setEditScopusTarget(data.targets?.scopus || 290);
        setEditInterTarget(data.targets?.international || 80);
        setEditIndustryTarget(data.targets?.industry || 4);
      }
    } catch (err) {
      console.error("Error fetching KPI stats:", err);
    }
  };

  const handleSaveTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTargets(true);
    try {
      const res = await fetch("http://localhost:5000/api/kpi/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fiscal_year: selectedKpiYear,
          scopus_target: editScopusTarget,
          international_target: editInterTarget,
          industry_target: editIndustryTarget
        })
      });
      if (res.ok) {
        setShowTargetModal(false);
        fetchKpiStats(selectedKpiYear);
      }
    } catch (err) {
      console.error("Error saving targets:", err);
    } finally {
      setIsSavingTargets(false);
    }
  };

  const openReportModal = async (type: "scopus" | "international" | "industry") => {
    setActiveReportModal(type);
    setReportLoading(true);
    setReportSearch("");
    try {
      const res = await fetch(`http://localhost:5000/api/kpi/report?type=${type}&year=${selectedKpiYear}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setReportItems(data.data || []);
        setReportTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Error fetching report data:", err);
    } finally {
      setReportLoading(false);
    }
  };

  const handleReportSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReportModal) return;
    setReportLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/kpi/report?type=${activeReportModal}&year=${selectedKpiYear}&q=${encodeURIComponent(reportSearch)}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setReportItems(data.data || []);
        setReportTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Error searching report:", err);
    } finally {
      setReportLoading(false);
    }
  };

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/records?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const totalPubs = stats?.total_publications ?? 0;
  const totalGrants = stats?.total_projects ?? 0;
  const totalResearchers = stats?.total_researchers ?? 0;
  const q1Count = stats?.quartile_distribution?.["Q1"] ?? 0;
  const q1Percentage = totalPubs > 0 ? Math.round((q1Count / totalPubs) * 100) : 0;
  const internationalPercent = kpiData?.international?.percent ?? 0;
  const industryPercent = kpiData?.industry?.percent ?? 0;
  const internationalAchieved = internationalPercent >= 100;
  const industryAchieved = industryPercent >= 100;

  return (
    <main className="research-home page-shell min-h-screen pb-20 pt-4 px-4 sm:px-6 lg:px-8 bg-slate-950 text-slate-100 font-sans">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* ========================================================================= */}
        {/* 1. HERO PORTAL BANNER (กระชับ พอดี ดูดี ไม่เทอะทะ) */}
        {/* ========================================================================= */}
        <section className="hero-portal relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-[#070e22] via-[#0c1830] to-[#121324] p-6 sm:p-8 lg:p-10 shadow-2xl backdrop-blur-xl">

          <div className="relative z-10 space-y-5">
            {/* Tag Identity */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-400">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Applied Science Research System • คณะวิทยาศาสตร์ประยุกต์</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-slate-400">
                <Building className="h-3.5 w-3.5 text-slate-400" />
                <span>หน่วยงานสารบรรณ & บริหารงานวิจัย (สร.)</span>
              </span>
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                ระบบบริหารจัดการงานวิจัย<br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
                  และผลงานตีพิมพ์
                </span>
              </h1>
              <p className="max-w-3xl text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                Applied Science Research and Publication Management System<br />
                ศูนย์กลางทะเบียนผลงานวิจัย ทุนวิจัย และรายงานตัวชี้วัดของคณะวิทยาศาสตร์ประยุกต์
              </p>
            </div>

            {/* Global Search Bar */}
            <form onSubmit={handleGlobalSearch} className="max-w-2xl">
              <div className="relative flex items-center">
                <Search className="absolute left-4 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อผลงานตีพิมพ์, คำสำคัญ, ชื่ออาจารย์ผู้วิจัย, หรือเลขที่โครงการ..."
                  className="hero-search-input w-full rounded-2xl border border-slate-700/80 bg-slate-900/90 py-3 pl-11 pr-28 text-xs sm:text-sm text-white placeholder-slate-400 shadow-inner focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition"
                />
                <button
                  type="submit"
                  className="absolute right-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md hover:brightness-110 active:scale-95 transition"
                >
                  ค้นหาด่วน
                </button>
              </div>
            </form>

            {/* Compact Metric Strip (แทนการใส่การ์ดยาวซ้ำซ้อน) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-2.5">
                <BookOpen className="h-4 w-4 text-orange-400 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[11px]">ผลงาน Scopus รวม</span>
                  <span className="font-bold text-white text-sm sm:text-base">{loading ? "..." : totalPubs.toLocaleString()} เรื่อง</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <FolderKanban className="h-4 w-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[11px]">ทุนวิจัยในระบบ</span>
                  <span className="font-bold text-white text-sm sm:text-base">{loading ? "..." : totalGrants.toLocaleString()} โครงการ</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4 text-cyan-400 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[11px]">คณาจารย์นักวิจัย</span>
                  <span className="font-bold text-white text-sm sm:text-base">{loading ? "..." : totalResearchers.toLocaleString()} ท่าน</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Award className="h-4 w-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[11px]">สัดส่วน Tier Q1</span>
                  <span className="font-bold text-emerald-400 text-sm sm:text-base">{q1Count} เรื่อง ({q1Percentage}%)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. PLAN TARGET INDICATORS (หัวใจหลัก: เลือกปีได้ ปรับเป้าหมายได้ นำส่งงานแผนได้) */}
        {/* ========================================================================= */}
        <section id="kpi-section" className="scroll-mt-24 rounded-3xl border border-slate-800/90 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950 p-6 sm:p-7 backdrop-blur-xl space-y-5">
          {/* Header with Year Selector & Configure Targets Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  ตัวชี้วัดและเป้าหมายตามแผนงานคณะ (Plan KPI Targets)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  จัดเก็บและนำส่งฝ่ายแผนงาน 3 ด้านหลัก • ปรับเป้าหมายได้ตามปีงบประมาณ
                </p>
              </div>
            </div>

            {/* Controls: Year Selector + Configure Button */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400">ปีงบประมาณ:</span>
                <select
                  value={selectedKpiYear}
                  onChange={(e) => setSelectedKpiYear(e.target.value)}
                  className="bg-transparent font-bold text-orange-400 focus:outline-none cursor-pointer"
                >
                  <option value="2569" className="bg-slate-900 text-white">2569 (ปีปัจจุบัน)</option>
                  <option value="2568" className="bg-slate-900 text-white">2568</option>
                  <option value="2567" className="bg-slate-900 text-white">2567</option>
                  <option value="2566" className="bg-slate-900 text-white">2566</option>
                  <option value="2565" className="bg-slate-900 text-white">2565</option>
                  <option value="ALL" className="bg-slate-900 text-white">ทั้งหมด (สะสม)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowTargetModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition active:scale-95"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-amber-400" />
                <span>ปรับเป้าหมาย</span>
              </button>
            </div>
          </div>

          {/* 3 KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* KPI 1: Scopus Publications (Requirement 2 & 3.1) */}
            <div className="rounded-2xl border border-orange-500/30 bg-slate-950/70 p-5 space-y-3.5 shadow-md flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">3.1 ตีพิมพ์ใน Scopus</span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                    (kpiData?.scopus?.percent || 0) >= 100
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
                      : "text-amber-400 bg-amber-500/10 border-amber-500/25"
                  }`}>
                    {(kpiData?.scopus?.percent || 0) >= 100 ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {(kpiData?.scopus?.percent || 0) >= 100 ? "บรรลุเป้าหมาย" : "อยู่ระหว่างดำเนินการ"}
                  </span>
                </div>

                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">
                      {(kpiData?.scopus?.current || 0).toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      / เป้า {kpiData?.targets?.scopus || 290} Paper
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="kpi-progress-fill h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, kpiData?.scopus?.percent || 0)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>ความก้าวหน้า</span>
                    <span className="kpi-progress-value text-orange-400 font-bold">{kpiData?.scopus?.percent || 0}%</span>
                  </div>
                </div>

                {/* Requirement 2: 2 Categories Breakdown */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-orange-400" />
                      วารสาร (Publication - Article)
                    </span>
                    <span className="font-bold text-white">
                      {(kpiData?.scopus?.article_count || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-amber-400" />
                      ประชุมวิชาการ (Proceeding)
                    </span>
                    <span className="font-bold text-white">
                      {(kpiData?.scopus?.proceeding_count || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: View Table & Export Excel */}
              <div className="pt-2 border-t border-slate-800/80 flex gap-2">
                <button
                  type="button"
                  onClick={() => openReportModal("scopus")}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 py-2 text-xs font-semibold text-slate-200 transition"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-orange-400" />
                  <span>ดูข้อมูลนำส่งงานแผน</span>
                </button>
                <a
                  href={`http://localhost:5000/api/kpi/export?type=scopus&year=${selectedKpiYear}`}
                  title="Export Excel สำหรับงานแผน"
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-600/20 text-orange-400 border border-orange-500/30 hover:bg-orange-600 hover:text-white transition"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* KPI 2: International Collaboration (Requirement 3.2) */}
            <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/70 p-5 space-y-3.5 shadow-md flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">3.2 ร่วมมือนานาชาติ</span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                    internationalAchieved
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
                      : "text-amber-400 bg-amber-500/10 border-amber-500/25"
                  }`}>
                    {internationalAchieved ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {internationalAchieved ? "บรรลุตามเป้า" : "อยู่ระหว่างดำเนินการ"}
                  </span>
                </div>

                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">
                      {(kpiData?.international?.current || 0).toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      / เป้า {kpiData?.targets?.international || 80} Paper
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`kpi-progress-fill h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 ${internationalAchieved ? "kpi-achieved-progress" : ""}`}
                      style={{ width: `${Math.min(100, internationalPercent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>สถานะความสำเร็จ</span>
                    <span className={`kpi-progress-value text-cyan-400 font-bold ${internationalAchieved ? "kpi-achieved-value" : ""}`}>{internationalPercent}%</span>
                  </div>
                </div>

                {/* Data Fields Preview for 3.2 */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-xs text-slate-300 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    ข้อมูลกำกับตามเกณฑ์งานแผน:
                  </span>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    • ชื่ออาจารย์ มจพ. + ตำแหน่งวิชาการ<br />
                    • Inter Author ต่างชาติ + ที่อยู่ & Publisher
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800/80 flex gap-2">
                <button
                  type="button"
                  onClick={() => openReportModal("international")}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 py-2 text-xs font-semibold text-slate-200 transition"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-cyan-400" />
                  <span>ดูข้อมูลนำส่งงานแผน</span>
                </button>
                <a
                  href={`http://localhost:5000/api/kpi/export?type=international&year=${selectedKpiYear}`}
                  title="Export Excel สำหรับงานแผน"
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600 hover:text-white transition"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* KPI 3: Industry Collaboration (Requirement 3.3) */}
            <div className="rounded-2xl border border-emerald-500/30 bg-slate-950/70 p-5 space-y-3.5 shadow-md flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">3.3 ร่วมมืออุตสาหกรรม</span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                    industryAchieved
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
                      : "text-amber-400 bg-amber-500/10 border-amber-500/25"
                  }`}>
                    {industryAchieved ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {industryAchieved ? "บรรลุตามเกณฑ์" : "กำลังดำเนินการ"}
                  </span>
                </div>

                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">
                      {kpiData?.industry?.current || 0}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      / เป้า {kpiData?.targets?.industry || 4} Paper
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`kpi-progress-fill h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 ${industryAchieved ? "kpi-achieved-progress" : ""}`}
                      style={{ width: `${Math.min(100, industryPercent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>สถานะความสำเร็จ</span>
                    <span className={`kpi-progress-value text-emerald-400 font-bold ${industryAchieved ? "kpi-achieved-value" : ""}`}>{industryPercent}%</span>
                  </div>
                </div>

                {/* Data Fields Preview for 3.3 */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-xs text-slate-300 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    ข้อมูลกำกับตามเกณฑ์งานแผน:
                  </span>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    • ชื่ออาจารย์ มจพ. + ตำแหน่งวิชาการ<br />
                    • ชื่อบทความ & ชื่อหน่วยงานภาคอุตสาหกรรม
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800/80 flex gap-2">
                <button
                  type="button"
                  onClick={() => openReportModal("industry")}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 py-2 text-xs font-semibold text-slate-200 transition"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                  <span>ดูข้อมูลนำส่งงานแผน</span>
                </button>
                <a
                  href={`http://localhost:5000/api/kpi/export?type=industry&year=${selectedKpiYear}`}
                  title="Export Excel สำหรับงานแผน"
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white transition"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. DUAL-WING SECTION: GRANT CLASSIFICATION & QUICK SERVICES (สมดุล สวยงาม) */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* ฝั่งซ้าย: โครงการทุนวิจัย 2 ประเภท (Requirement 1) */}
          <div className="lg:col-span-7 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">โครงสร้างทุนวิจัย 2 ประเภท</h3>
              </div>
              <Link
                href="/projects"
                className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>ดูทั้งหมด {totalGrants.toLocaleString()} ทุน</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="space-y-3 text-xs">
              {/* 1.1 ทุนวิจัยภายใน มจพ. */}
              <div className="rounded-2xl border border-amber-500/20 bg-slate-950/70 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    1.1 ทุนวิจัยภายใน มจพ.
                  </span>
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-medium">
                    ระบบติดตาม 7 ขั้นตอน
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["FF", "New", "Know", "Basic", "PHD", "PostDoc"].map((tag) => (
                    <Link
                      key={tag}
                      href={`/projects?tag=${tag}`}
                      className="rounded-lg bg-slate-900 px-2.5 py-1 font-semibold text-slate-300 border border-slate-800 hover:border-amber-500/40 hover:text-amber-300 transition"
                    >
                      {tag}
                    </Link>
                  ))}
                  <Link
                    href="/projects?tag=sci-"
                    className="rounded-lg bg-orange-500/15 text-orange-300 border border-orange-500/30 px-2.5 py-1 font-semibold hover:bg-orange-500/25 transition"
                  >
                    ★ ทุนวิจัยคณะวิทยาศาสตร์ประยุกต์ (sci-*)
                  </Link>
                </div>
              </div>

              {/* 1.2 ทุนวิจัยภายนอก */}
              <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/70 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    1.2 ทุนวิจัยภายนอก
                  </span>
                  <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-medium">
                    ความร่วมมือภายนอก
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["ภาครัฐ (อว./วช./บพค.)", "บริษัทเอกชน", "ภาคอุตสาหกรรม"].map((tag) => (
                    <Link
                      key={tag}
                      href="/projects"
                      className="rounded-lg bg-slate-900 px-3 py-1 font-semibold text-slate-300 border border-slate-800 hover:border-cyan-500/40 hover:text-cyan-300 transition"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ฝั่งขวา: บริการด่วน 4 เมนูหลัก (Quick Services กระชับ ไม่ซ้ำซ้อน) */}
          <div className="lg:col-span-5 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-orange-500" />
                <h3 className="text-base font-bold text-white">บริการหลักสำหรับหน่วยงาน</h3>
              </div>
              <span className="text-xs text-slate-500">Quick Access</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <Link
                href="/records"
                className="group rounded-2xl border border-slate-800 bg-slate-950/70 p-4 hover:border-orange-500/40 hover:bg-slate-950 transition flex flex-col justify-between space-y-2"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 group-hover:scale-105 transition">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white group-hover:text-orange-300 transition">ทะเบียน Scopus</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{totalPubs.toLocaleString()} บทความ Q1–Q4</p>
                </div>
              </Link>

              <Link
                href="/projects"
                className="group rounded-2xl border border-slate-800 bg-slate-950/70 p-4 hover:border-amber-500/40 hover:bg-slate-950 transition flex flex-col justify-between space-y-2"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition">
                  <FolderKanban className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white group-hover:text-amber-300 transition">ทะเบียนทุนวิจัย</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{totalGrants.toLocaleString()} โครงการ 7 ขั้นตอน</p>
                </div>
              </Link>

              <Link
                href="/researchers"
                className="group rounded-2xl border border-slate-800 bg-slate-950/70 p-4 hover:border-cyan-500/40 hover:bg-slate-950 transition flex flex-col justify-between space-y-2"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-105 transition">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white group-hover:text-cyan-300 transition">ทำเนียบคณาจารย์</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{totalResearchers.toLocaleString()} ท่าน 8 ภาควิชา</p>
                </div>
              </Link>

              <Link
                href="/upload"
                className="group rounded-2xl border border-slate-800 bg-slate-950/70 p-4 hover:border-emerald-500/40 hover:bg-slate-950 transition flex flex-col justify-between space-y-2"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white group-hover:text-emerald-300 transition">นำเข้า Excel สร.</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Smart Ingestion</p>
                </div>
              </Link>
            </div>
          </div>

        </section>

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT KPI TARGETS PER YEAR */}
      {/* ========================================================================= */}
      {showTargetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-orange-400" />
                <h3 className="text-base font-bold text-white">
                  ปรับเป้าหมายแผนงานคณะ ({selectedKpiYear})
                </h3>
              </div>
              <button
                onClick={() => setShowTargetModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTargets} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  1. เป้าหมายตีพิมพ์ Scopus (Paper)
                </label>
                <input
                  type="number"
                  min="1"
                  value={editScopusTarget}
                  onChange={(e) => setEditScopusTarget(parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  เกณฑ์มาตรฐานแผนงานคณะ: 290 เรื่อง
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  2. เป้าหมายความร่วมมือนานาชาติ (Paper)
                </label>
                <input
                  type="number"
                  min="1"
                  value={editInterTarget}
                  onChange={(e) => setEditInterTarget(parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  เกณฑ์มาตรฐานแผนงานคณะ: 80 เรื่อง
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  3. เป้าหมายร่วมมือภาคอุตสาหกรรม (Paper)
                </label>
                <input
                  type="number"
                  min="1"
                  value={editIndustryTarget}
                  onChange={(e) => setEditIndustryTarget(parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  เกณฑ์มาตรฐานแผนงานคณะ: 4 เรื่อง
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowTargetModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSavingTargets}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:brightness-110 active:scale-95 transition disabled:opacity-50"
                >
                  {isSavingTargets ? "กำลังบันทึก..." : "บันทึกเป้าหมาย"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PLAN DEPARTMENT DATA REPORT (REQUIREMENT 3.1, 3.2, 3.3) */}
      {/* ========================================================================= */}
      {activeReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 animate-in fade-in">
          <div className="w-full max-w-5xl max-h-[90vh] rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-orange-400" />
                  <h3 className="text-base font-bold text-white">
                    {activeReportModal === "scopus" && "3.1 ทะเบียนผลงานตีพิมพ์ Scopus นำส่งงานแผน"}
                    {activeReportModal === "international" && "3.2 ทะเบียนผลงานความร่วมมือนานาชาติ นำส่งงานแผน"}
                    {activeReportModal === "industry" && "3.3 ทะเบียนผลงานความร่วมมือภาคอุตสาหกรรม นำส่งงานแผน"}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  ปีงบประมาณ {selectedKpiYear} • ทั้งหมด {reportTotal.toLocaleString()} รายการ
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`http://localhost:5000/api/kpi/export?type=${activeReportModal}&year=${selectedKpiYear}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md hover:brightness-110 active:scale-95 transition"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  <span>Export Excel (.xlsx)</span>
                </a>
                <button
                  onClick={() => setActiveReportModal(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Search Filter Bar */}
            <div className="border-b border-slate-800 bg-slate-900 px-6 py-3">
              <form onSubmit={handleReportSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                    placeholder="ค้นหาชื่ออาจารย์, ชื่อบทความ, วารสาร, หรือหน่วยงาน..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:brightness-110 transition"
                >
                  ค้นหา
                </button>
              </form>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-auto p-6">
              {reportLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-2 text-xs text-slate-400">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                  <span>กำลังดึงข้อมูลรายงานฝ่ายแผนงาน...</span>
                </div>
              ) : reportItems.length === 0 ? (
                <div className="py-20 text-center text-xs text-slate-400">
                  ไม่พบข้อมูลตามเงื่อนไขที่ค้นหา
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                      <th className="py-2.5 px-3 w-12 text-center">#</th>
                      {activeReportModal === "scopus" && (
                        <>
                          <th className="py-2.5 px-3">ชื่อเจ้าของบทความ (ตำแหน่งวิชาการ)</th>
                          <th className="py-2.5 px-3">ชื่อบทความ (Article Title)</th>
                          <th className="py-2.5 px-3">ชื่อวารสาร/งานประชุม</th>
                          <th className="py-2.5 px-3 text-center">ฉบับ/ปี</th>
                          <th className="py-2.5 px-3 text-center">หน้าที่</th>
           
               <th className="py-2.5 px-3">ประเภท</th>
                        </>
                      )}
                      {activeReportModal === "international" && (
                        <>
                          <th className="py-2.5 px-3">ชื่อบทความ</th>
                          <th className="py-2.5 px-3">ชื่อวารสาร</th>
                          <th className="py-2.5 px-3">อาจารย์ มจพ.</th>
                          <th className="py-2.5 px-3">Inter Author (ต่างชาติ)</th>
                          <th className="py-2.5 px-3">ที่อยู่ต่างชาติ</th>
                          <th className="py-2.5 px-3">Publisher</th>
                        </>
                      )}
                      {activeReportModal === "industry" && (
                        <>
                          <th className="py-2.5 px-3">ชื่อเจ้าของบทความ</th>
                          <th className="py-2.5 px-3">ชื่อบทความ/โครงการ</th>
                          <th className="py-2.5 px-3">วารสาร/รหัสโครงการ</th>
                          <th className="py-2.5 px-3">หน่วยงานภาคอุตสาหกรรม</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {reportItems.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                        {activeReportModal === "scopus" && (
                          <>
                            <td className="py-3 px-3 font-semibold text-orange-300">{item.author_name}</td>
                            <td className="py-3 px-3 text-white max-w-xs">{item.title}</td>
                            <td className="py-3 px-3 text-slate-300">{item.journal_conference}</td>
                            <td className="py-3 px-3 text-center font-mono text-slate-400">
                              {item.issue}/{item.volume}
                            </td>
                            <td className="py-3 px-3 text-center font-mono text-slate-400">{item.pages}</td>
                            <td className="py-3 px-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.category?.includes("วารสาร")
                                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}>
                                {item.category}
                              </span>
                            </td>
                          </>
                        )}
                        {activeReportModal === "international" && (
                          <>
                            <td className="py-3 px-3 text-white font-medium max-w-xs">{item.title}</td>
                            <td className="py-3 px-3 text-slate-300">{item.journal}</td>
                            <td className="py-3 px-3 font-semibold text-cyan-300">{item.lead_author}</td>
                            <td className="py-3 px-3 text-slate-300 italic max-w-xs">{item.inter_author}</td>
                            <td className="py-3 px-3 text-slate-400">{item.inter_address}</td>
                            <td className="py-3 px-3 text-emerald-400 font-medium">{item.publisher}</td>
                          </>
                        )}
                        {activeReportModal === "industry" && (
                          <>
                            <td className="py-3 px-3 font-semibold text-emerald-300">{item.lead_author}</td>
                            <td className="py-3 px-3 text-white font-medium max-w-xs">{item.title}</td>
                            <td className="py-3 px-3 text-slate-300">{item.journal}</td>
                            <td className="py-3 px-3 text-amber-300 font-semibold">{item.industry_org}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-800 bg-slate-950/60 px-6 py-3 flex items-center justify-between text-xs text-slate-400">
              <span>แสดงตัวอย่าง 50 รายการแรกสำหรับการตรวจสอบหน้าจอ (ข้อมูลครบทุกรายการในไฟล์ Excel)</span>
              <button
                type="button"
                onClick={() => setActiveReportModal(null)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-1.5 text-xs text-white hover:bg-slate-700 transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
