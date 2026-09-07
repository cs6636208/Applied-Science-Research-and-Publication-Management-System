"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  BookOpen,
  Award,
  ExternalLink,
  X,
  Building2,
  Calendar,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
} from "lucide-react";

type ResearcherSummary = {
  id: number;
  prefix_title?: string | null;
  full_name_th: string;
  full_name_en?: string | null;
  academic_position?: string | null;
  position_type?: string | null;
  faculty_id?: number | null;
  faculty_name_th?: string | null;
  is_internal: boolean;
  publication_count: number;
};

type ResearcherPublication = {
  id: number;
  title_en: string;
  title_th?: string | null;
  publication_type?: string | null;
  quartile?: string | null;
  percentile?: number | null;
  published_date?: string | null;
  publication_year?: number | null;
  doi?: string | null;
  scopus_id?: string | null;
  journal_name?: string | null;
  author_role: string;
  author_order: number;
};

type ResearcherDetail = ResearcherSummary & {
  total_publications: number;
  quartile_counts: { [key: string]: number };
  publications: ResearcherPublication[];
};

export default function ResearchersPage() {
  const [researchers, setResearchers] = useState<ResearcherSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeResearcherId, setActiveResearcherId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<ResearcherDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch all researchers
  useEffect(() => {
    const fetchResearchers = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:5000/api/researchers");
        if (res.ok) {
          const data = await res.json();
          setResearchers(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to fetch researchers:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchResearchers();
  }, []);

  // Fetch researcher detail when modal opens
  useEffect(() => {
    if (!activeResearcherId) {
      setDetailData(null);
      return;
    }

    const fetchDetail = async () => {
      setDetailLoading(true);
      try {
        const res = await fetch(`http://localhost:5000/api/researchers/${activeResearcherId}`);
        if (res.ok) {
          const data = await res.json();
          setDetailData(data);
        }
      } catch (err) {
        console.error("Failed to fetch researcher profile:", err);
      } finally {
        setDetailLoading(false);
      }
    };

    fetchDetail();
  }, [activeResearcherId]);

  // Filter researchers by search
  const filteredResearchers = researchers.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.full_name_th?.toLowerCase().includes(q) ||
      r.full_name_en?.toLowerCase().includes(q) ||
      r.faculty_name_th?.toLowerCase().includes(q) ||
      r.academic_position?.toLowerCase().includes(q)
    );
  });

  const getQuartileBadge = (q?: string | null) => {
    switch (q?.toUpperCase()) {
      case "Q1":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-bold";
      case "Q2":
        return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30 font-bold";
      case "Q3":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30 font-bold";
      case "Q4":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <main className="min-h-screen pb-16 pt-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-300 mb-2">
              <Users className="h-3.5 w-3.5" />
              <span>Researchers Directory</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              ทำเนียบอาจารย์และนักวิจัย
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              สืบค้นรายชื่ออาจารย์ นักวิจัย และผลงานวิชาการที่ตีพิมพ์ในระดับสากล คณะวิทยาศาสตร์ประยุกต์
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/records"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800/80 border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition active:scale-95"
            >
              <BookOpen className="h-4 w-4 text-cyan-400" />
              <span>ดูผลงานวิจัยทั้งหมด</span>
            </Link>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md shadow-xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาตามชื่อ-นามสกุลนักวิจัย, ตำแหน่งวิชาการ หรือภาควิชา/คณะ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 py-3.5 pl-12 pr-10 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* COUNT */}
        <div className="flex items-center justify-between text-xs sm:text-sm text-slate-400 px-1">
          <span>
            พบอาจารย์และนักวิจัย <strong className="text-white">{filteredResearchers.length}</strong> ท่าน
          </span>
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-cyan-400 hover:underline">
              ล้างคำค้นหา
            </button>
          )}
        </div>

        {/* RESEARCHERS GRID */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-44 rounded-2xl border border-slate-800 bg-slate-900/50 animate-pulse"
              />
            ))}
          </div>
        ) : filteredResearchers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
            <Users className="h-12 w-12 text-slate-600 mb-3" />
            <h3 className="text-lg font-bold text-white">ไม่พบรายชื่อนักวิจัยตามคำค้นหา</h3>
            <p className="text-sm text-slate-400 max-w-md mt-1">ลองเปลี่ยนคำค้นหาใหม่อีกครั้ง</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredResearchers.map((res) => {
              const displayName = `${res.prefix_title ? res.prefix_title + " " : ""}${res.full_name_th || res.full_name_en}`;
              const initials = (res.full_name_th || res.full_name_en || "R").slice(0, 2);

              return (
                <div
                  key={res.id}
                  onClick={() => setActiveResearcherId(res.id)}
                  className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm transition-all duration-300 hover:border-cyan-500/40 hover:bg-slate-900 hover:shadow-xl hover:shadow-cyan-500/5 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      {/* Avatar with gradient */}
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 font-bold text-white shadow-md shadow-cyan-500/20 group-hover:scale-105 transition">
                        {initials}
                      </div>

                      {/* Publications Count Badge */}
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                        <BookOpen className="h-3 w-3" />
                        <span>{res.publication_count} ผลงาน</span>
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition line-clamp-1">
                        {displayName}
                      </h3>
                      {res.full_name_en && (
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{res.full_name_en}</p>
                      )}
                    </div>

                    <div className="space-y-1 text-xs text-slate-400">
                      {res.academic_position && (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <GraduationCap className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{res.academic_position}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">
                          {res.faculty_name_th || "คณะวิทยาศาสตร์ประยุกต์"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-800 flex items-center justify-between text-xs font-medium text-slate-400 group-hover:text-cyan-300 transition">
                    <span>ดูประวัติผลงานวิจัย</span>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* RESEARCHER PROFILE MODAL */}
        {activeResearcherId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6">
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-lg font-bold text-white shadow-lg shadow-cyan-500/20">
                    {detailData
                      ? (detailData.full_name_th || detailData.full_name_en || "R").slice(0, 2)
                      : "R"}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {detailData?.prefix_title ? `${detailData.prefix_title} ` : ""}
                      {detailData?.full_name_th || detailData?.full_name_en}
                    </h2>
                    {detailData?.full_name_en && (
                      <p className="text-xs text-slate-400">{detailData.full_name_en}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-300">
                      {detailData?.academic_position && (
                        <span className="rounded bg-slate-800 px-2 py-0.5 border border-slate-700">
                          {detailData.academic_position}
                        </span>
                      )}
                      <span className="text-slate-400">
                        {detailData?.faculty_name_th || "คณะวิทยาศาสตร์ประยุกต์"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveResearcherId(null)}
                  className="rounded-xl border border-slate-700 p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {detailLoading ? (
                <div className="h-48 flex items-center justify-center text-slate-400">
                  กำลังโหลดข้อมูลนักวิจัย...
                </div>
              ) : detailData ? (
                <div className="space-y-6">
                  {/* KPI STATS ROW */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-center">
                      <div className="text-xs text-slate-400">ผลงานทั้งหมด</div>
                      <div className="text-xl font-bold text-white mt-1">
                        {detailData.total_publications}
                      </div>
                    </div>
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
                      <div className="text-xs text-emerald-400 font-semibold">Quartile 1</div>
                      <div className="text-xl font-bold text-emerald-300 mt-1">
                        {detailData.quartile_counts?.["Q1"] || 0}
                      </div>
                    </div>
                    <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-center">
                      <div className="text-xs text-cyan-400 font-semibold">Quartile 2</div>
                      <div className="text-xl font-bold text-cyan-300 mt-1">
                        {detailData.quartile_counts?.["Q2"] || 0}
                      </div>
                    </div>
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-center">
                      <div className="text-xs text-amber-400 font-semibold">Quartile 3</div>
                      <div className="text-xl font-bold text-amber-300 mt-1">
                        {detailData.quartile_counts?.["Q3"] || 0}
                      </div>
                    </div>
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-center col-span-2 sm:col-span-1">
                      <div className="text-xs text-rose-400 font-semibold">Quartile 4</div>
                      <div className="text-xl font-bold text-rose-300 mt-1">
                        {detailData.quartile_counts?.["Q4"] || 0}
                      </div>
                    </div>
                  </div>

                  {/* PUBLICATIONS LIST */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      รายการบทความตีพิมพ์ของนักวิจัย ({detailData.publications.length} รายการ)
                    </h3>

                    {detailData.publications.length === 0 ? (
                      <p className="text-xs text-slate-500">ยังไม่มีรายการผลงานในระบบ</p>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {detailData.publications.map((p) => (
                          <div
                            key={p.id}
                            className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2 hover:border-slate-700 transition"
                          >
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span
                                className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase ${getQuartileBadge(
                                  p.quartile
                                )}`}
                              >
                                {p.quartile || "Unranked"}
                              </span>
                              {p.percentile && (
                                <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300 text-[11px]">
                                  Percentile: {p.percentile}%
                                </span>
                              )}
                              <span className="rounded bg-cyan-500/10 text-cyan-300 px-2 py-0.5 text-[11px]">
                                {p.author_role || `ผู้แต่งลำดับที่ ${p.author_order}`}
                              </span>
                              {p.publication_year && (
                                <span className="text-slate-400 text-[11px]">ปี {p.publication_year}</span>
                              )}
                            </div>

                            <h4 className="text-sm font-bold text-white leading-snug">
                              {p.title_en || p.title_th}
                            </h4>

                            {p.journal_name && (
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                <span className="truncate text-slate-300">{p.journal_name}</span>
                              </div>
                            )}

                            {p.doi && (
                              <div className="pt-1">
                                <a
                                  href={p.doi.startsWith("http") ? p.doi : `https://doi.org/${p.doi}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline"
                                >
                                  <span>DOI: {p.doi}</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
