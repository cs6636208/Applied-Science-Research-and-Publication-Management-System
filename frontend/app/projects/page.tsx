"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderKanban,
  Search,
  Filter,
  DollarSign,
  Calendar,
  Building,
  User,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Briefcase,
  Layers,
  Sparkles,
  Download,
  Check,
  Tag,
  ChevronDown
} from "lucide-react";

type Project = {
  id: number;
  project_code: string | null;
  title_th: string | null;
  title_en: string | null;
  project_type: string | null;
  fiscal_year: number | null;
  start_date: string | null;
  end_date: string | null;
  budget: string | null;
  status: string | null;
  funding_source_name: string | null;
  funding_source_type: string | null;
  researchers: {
    researcher_id: number;
    full_name_th: string;
    role: string;
  }[];
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceType, setSourceType] = useState<"ALL" | "INTERNAL" | "EXTERNAL">("ALL");
  const [subTypeFilter, setSubTypeFilter] = useState<string>("ALL");
  const [selectedYear, setSelectedYear] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;

  const fiscalYears = [2569, 2568, 2567, 2566, 2565, 2564];

  useEffect(() => {
    fetchProjects();
  }, [currentPage, sourceType, selectedYear]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * limit;
      let url = `http://localhost:5000/api/projects?limit=${limit}&offset=${offset}`;

      // Combine searchTerm with subTypeFilter if selected
      let finalSearch = searchTerm.trim();
      if (subTypeFilter !== "ALL") {
        finalSearch = finalSearch ? `${finalSearch} ${subTypeFilter}` : subTypeFilter;
      }

      if (finalSearch) {
        url += `&q=${encodeURIComponent(finalSearch)}`;
      }
      if (sourceType !== "ALL") {
        url += `&source_type=${sourceType}`;
      }
      if (selectedYear !== "ALL") {
        const yearInt = parseInt(selectedYear);
        const ceYear = yearInt > 2500 ? yearInt - 543 : yearInt;
        url += `&year=${ceYear}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.data || []);
        setTotalCount(data.total || 0);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchProjects();
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  const formatBudget = (val: string | null) => {
    if (!val) return "ไม่ระบุงบประมาณ";
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return num.toLocaleString("th-TH", { maximumFractionDigits: 0 }) + " บาท";
  };

  const displayYear = (year: number | null) => {
    if (!year) return "-";
    return year < 2500 ? year + 543 : year;
  };

  // Requirement 1: Classifier for 2 Grant Categories
  const classifyGrant = (proj: Project) => {
    const code = (proj.project_code || "").toUpperCase();
    const title = (proj.title_th || proj.title_en || "").toUpperCase();
    const fs = (proj.funding_source_name || "").toUpperCase();
    const isExt = proj.funding_source_type === "EXTERNAL" || proj.project_type === "external_grant";

    if (isExt) {
      if (fs.includes("บริษัท") || fs.includes("จำกัด") || fs.includes("มหาชน")) {
        return { main: "ทุนวิจัยภายนอก", sub: "บริษัทเอกชน", badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" };
      }
      if (fs.includes("อุตสาหกรรม") || fs.includes("เซอร์วิส") || title.includes("อุตสาหกรรม")) {
        return { main: "ทุนวิจัยภายนอก", sub: "ภาคอุตสาหกรรม", badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
      }
      return { main: "ทุนวิจัยภายนอก", sub: "ภาครัฐ (วช./อว./บพค.)", badgeClass: "bg-sky-500/10 text-sky-400 border-sky-500/30" };
    }

    // Internal Grants (1.1)
    if (code.startsWith("SCI-") || code.includes("SCI-") || title.includes("คณะวิทยาศาสตร์ประยุกต์")) {
      return { main: "ทุนวิจัยภายใน มจพ.", sub: "ทุนวิจัยคณะวิทยาศาสตร์ประยุกต์ (sci-*)", badgeClass: "bg-orange-500/15 text-orange-400 border-orange-500/30", isFaculty: true };
    }
    if (code.includes("-FF-")) {
      return { main: "ทุนวิจัยภายใน มจพ.", sub: "FF (Fundamental Fund)", badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
    }
    if (code.includes("-NEW-")) {
      return { main: "ทุนวิจัยภายใน มจพ.", sub: "New (นักวิจัยรุ่นใหม่)", badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
    }
    if (code.includes("-KNOW-")) {
      return { main: "ทุนวิจัยภายใน มจพ.", sub: "Know (ยกระดับองค์ความรู้)", badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
    }
    if (code.includes("-BASIC-")) {
      return { main: "ทุนวิจัยภายใน มจพ.", sub: "Basic (วิจัยพื้นฐาน)", badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
    }
    if (code.includes("-PHD-")) {
      return { main: "ทุนวิจัยภายใน มจพ.", sub: "PHD (ปริญญาเอก)", badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
    }
    if (code.includes("-POSTDOC-")) {
      return { main: "ทุนวิจัยภายใน มจพ.", sub: "PostDoc (หลังปริญญาเอก)", badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
    }
    return { main: "ทุนวิจัยภายใน มจพ.", sub: "ทุนอุดหนุนวิจัย มจพ.", badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
  };

  return (
    <main className="projects-page page-shell min-h-screen pb-20 pt-6 px-4 sm:px-6 lg:px-8 bg-slate-950 text-slate-100 font-sans">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* Header Breadcrumbs & Title */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/" className="hover:text-orange-400 transition">หน้าแรก</Link>
            <span>/</span>
            <span className="text-orange-400 font-medium">ทะเบียนทุนและโครงการวิจัย</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/25">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                    ทะเบียนทุนและโครงการวิจัย ({totalCount.toLocaleString()} ทุน)
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    จำแนก 2 ประเภท: 1.1 ทุนวิจัยภายใน มจพ. (FF, New, Know, Basic, PHD, PostDoc, ทุนคณะ) | 1.2 ทุนวิจัยภายนอก (ภาครัฐ, บริษัทเอกชน, อุตสาหกรรม)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4" />
                <span>ฐานข้อมูล {totalCount.toLocaleString()} โครงการวิจัย</span>
              </span>
            </div>
          </div>
        </div>

        {/* 2 Category Overview Bar (Requirement 1) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Internal Grants Card */}
          <div className="rounded-2xl border border-amber-500/30 bg-slate-900/60 p-5 space-y-3 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400" />
                <h3 className="text-sm font-bold text-white">1.1 ทุนวิจัยภายใน มจพ.</h3>
              </div>
              <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                ระบบติดตาม 7 ขั้นตอน
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {["FF", "New", "Know", "Basic", "PHD", "PostDoc", "sci- (ทุนคณะ)"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    const searchKey = tag.startsWith("sci") ? "sci-" : tag;
                    setSubTypeFilter(searchKey);
                    setSourceType("INTERNAL");
                    setCurrentPage(1);
                  }}
                  className={`rounded-lg px-2.5 py-1 font-semibold border transition ${
                    subTypeFilter === (tag.startsWith("sci") ? "sci-" : tag)
                      ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm"
                      : "bg-slate-950/80 text-slate-300 border-slate-800 hover:border-amber-500/50 hover:text-amber-300"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              * ทุนวิจัยคณะวิทยาศาสตร์ประยุกต์มีระบบติดตามรายงาน 9/6/3 เดือน และส่งเล่มสมบูรณ์
            </p>
          </div>

          {/* External Grants Card */}
          <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/60 p-5 space-y-3 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
                <h3 className="text-sm font-bold text-white">1.2 ทุนวิจัยภายนอก</h3>
              </div>
              <span className="text-[11px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                ความร่วมมือภายนอก
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {["ภาครัฐ (อว./วช.)", "บริษัทเอกชน", "ภาคอุตสาหกรรม"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    const searchKey = tag.includes("ภาครัฐ") ? "วิจัย" : (tag.includes("บริษัท") ? "บริษัท" : "อุตสาหกรรม");
                    setSubTypeFilter(searchKey);
                    setSourceType("EXTERNAL");
                    setCurrentPage(1);
                  }}
                  className={`rounded-lg px-2.5 py-1 font-semibold border transition ${
                    subTypeFilter.includes(tag.includes("ภาครัฐ") ? "วิจัย" : (tag.includes("บริษัท") ? "บริษัท" : "อุตสาหกรรม"))
                      ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm"
                      : "bg-slate-950/80 text-slate-300 border-slate-800 hover:border-cyan-500/50 hover:text-cyan-300"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              รองรับการส่งออกข้อมูลส่งตัวชี้วัดแผนงานคณะ (KPI 3.3 ร่วมมือภาคอุตสาหกรรม)
            </p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 backdrop-blur-xl space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อโครงการวิจัย, รหัสโครงการ, ชื่อแหล่งทุน, หรือชื่อผู้วิจัย..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none"
              />
            </div>

            {/* Filter: Source Type (Main 2 Categories) */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => { setSourceType("ALL"); setSubTypeFilter("ALL"); setCurrentPage(1); }}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  sourceType === "ALL" && subTypeFilter === "ALL"
                    ? "bg-orange-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => { setSourceType("INTERNAL"); setSubTypeFilter("ALL"); setCurrentPage(1); }}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  sourceType === "INTERNAL" && subTypeFilter === "ALL"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                1.1 ทุนใน มจพ.
              </button>
              <button
                type="button"
                onClick={() => { setSourceType("EXTERNAL"); setSubTypeFilter("ALL"); setCurrentPage(1); }}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  sourceType === "EXTERNAL" && subTypeFilter === "ALL"
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                1.2 ทุนภายนอก
              </button>
            </div>

            {/* Filter: Year */}
            <select
              value={selectedYear}
              onChange={(e) => { setSelectedYear(e.target.value); setCurrentPage(1); }}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-orange-500 focus:outline-none"
            >
              <option value="ALL">ทุกปีงบประมาณ</option>
              {fiscalYears.map((y) => (
                <option key={y} value={y}>ปีงบประมาณ {y}</option>
              ))}
            </select>

            {/* Search Button */}
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:brightness-110 active:scale-95 transition"
            >
              <Search className="h-3.5 w-3.5" />
              <span>ค้นหา</span>
            </button>
          </form>

          {/* Active Filter Tags */}
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
            <div>
              พบผลลัพธ์ทั้งหมด <span className="font-bold text-orange-400">{totalCount.toLocaleString()}</span> โครงการวิจัย
              {subTypeFilter !== "ALL" && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] text-amber-300">
                  ตัวกรอง: {subTypeFilter}
                  <button type="button" onClick={() => { setSubTypeFilter("ALL"); fetchProjects(); }} className="ml-1 text-slate-400 hover:text-white">✕</button>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">
                แสดงหน้า {currentPage} จาก {totalPages} หน้า
              </span>
            </div>
          </div>
        </div>

        {/* Projects List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
            <p className="text-xs text-slate-400">กำลังโหลดรายการโครงการวิจัย...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 py-16 text-center space-y-3">
            <FolderKanban className="mx-auto h-12 w-12 text-slate-600" />
            <h3 className="text-base font-bold text-white">ไม่พบข้อมูลโครงการวิจัยตามเงื่อนไขที่ค้นหา</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองประเภททุนและปีงบประมาณอื่น
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {projects.map((proj) => {
              const classification = classifyGrant(proj);
              return (
                <div
                  key={proj.id}
                  className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 sm:p-6 transition-all duration-200 hover:border-orange-500/40 hover:bg-slate-900/90 shadow-lg space-y-4"
                >
                  {/* Top Bar: Code, Fiscal Year, Category Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      {proj.project_code ? (
                        <span className="rounded-md bg-orange-500/10 border border-orange-500/25 px-2 py-0.5 text-xs font-mono font-bold text-orange-400">
                          {proj.project_code}
                        </span>
                      ) : (
                        <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-mono text-slate-400">
                          ID: #{proj.id}
                        </span>
                      )}

                      <span className="rounded-md bg-slate-800/80 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                        ปีงบประมาณ {displayYear(proj.fiscal_year)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${classification.badgeClass}`}>
                        {classification.sub}
                      </span>
                      {classification.isFaculty && (
                        <span className="rounded-full bg-orange-600/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 text-[10px] font-bold">
                          คณะวิทยาศาสตร์ประยุกต์
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Project Title */}
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                      {proj.title_th || proj.title_en || "ไม่มีชื่อโครงการ"}
                    </h3>
                    {proj.title_en && proj.title_th && (
                      <p className="text-xs text-slate-400 mt-1 italic">
                        {proj.title_en}
                      </p>
                    )}
                  </div>

                  {/* Details Grid: Researchers, Funding Source, Budget */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        หัวหน้าโครงการ / ผู้วิจัย
                      </span>
                      <div className="text-slate-200 font-semibold">
                        {proj.researchers && proj.researchers.length > 0 ? (
                          proj.researchers.map((r, i) => (
                            <span key={r.researcher_id || i} className="block">
                              {r.full_name_th || "ไม่ระบุชื่อ"} {r.role ? `(${r.role})` : ""}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                        <Building className="h-3.5 w-3.5 text-slate-400" />
                        แหล่งทุนสนับสนุน
                      </span>
                      <p className="text-slate-200 font-semibold">
                        {proj.funding_source_name || classification.main}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                        งบประมาณจัดสรร
                      </span>
                      <p className="text-emerald-400 font-bold">
                        {formatBudget(proj.budget)}
                      </p>
                    </div>
                  </div>

                  {/* 7-Step Lifecycle Indicator */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-400" />
                      <span>สถานะวงจรโครงการ:</span>
                      <span className="font-semibold text-slate-300">
                        {proj.status || "อยู่ระหว่างดำเนินโครงการตามสัญญา"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <span>วงจร 7 ขั้นตอน:</span>
                      <span className="text-emerald-400 font-medium">1.ยื่น 2.อนุมัติ 3.สัญญา 4.เบิกจ่าย 5.รายงานก้าวหน้า 6.เล่มสมบูรณ์ 7.ปิด</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800/80 pt-6">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>ก่อนหน้า</span>
            </button>

            <span className="text-xs text-slate-400">
              หน้า <span className="font-bold text-white">{currentPage}</span> จาก {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>ถัดไป</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
