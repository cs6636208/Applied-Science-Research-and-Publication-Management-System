"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  BookOpen,
  ExternalLink,
  Users,
  Calendar,
  Layers,
  Building2,
  Award,
  X,
  FileSpreadsheet,
  CheckCircle2,
  Globe2,
} from "lucide-react";

type Author = {
  id: number;
  researcher_id: number;
  full_name_th: string;
  full_name_en: string;
  prefix_title: string;
  author_role: string;
  author_order: number;
  faculty_name?: string;
};

type SDG = {
  id: number;
  code: string;
  description_th: string;
};

type Publication = {
  id: number;
  title_th?: string | null;
  title_en: string;
  publication_type?: string | null;
  volume?: string | null;
  issue_number?: string | null;
  page_range?: string | null;
  doi?: string | null;
  scopus_id?: string | null;
  external_url?: string | null;
  quartile?: string | null;
  percentile?: number | null;
  published_date?: string | null;
  publication_year?: number | null;
  status?: string | null;
  journal_id?: number | null;
  journal_name?: string | null;
  issn?: string | null;
  lead_researcher_name?: string | null;
  authors: Author[];
  sdgs: SDG[];
};

export default function RecordsPage() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuartile, setSelectedQuartile] = useState<string>("ALL");
  const [selectedYear, setSelectedYear] = useState<string>("ALL");
  const [selectedSdg, setSelectedSdg] = useState<string>("ALL");
  const [activeModalPub, setActiveModalPub] = useState<Publication | null>(null);

  const fetchPublications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("q", searchQuery.trim());
      if (selectedQuartile !== "ALL") params.append("quartile", selectedQuartile);
      if (selectedYear !== "ALL") params.append("year", selectedYear);
      if (selectedSdg !== "ALL") params.append("sdg", selectedSdg);

      const res = await fetch(`http://localhost:5000/api/publications?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPublications(Array.isArray(data) ? data : []);
      } else {
        setPublications([]);
      }
    } catch (err) {
      console.error("Failed to fetch publications:", err);
      setPublications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPublications();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedQuartile, selectedYear, selectedSdg]);

  // Extract distinct available years from current data for the dropdown
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    publications.forEach((p) => {
      if (p.publication_year) years.add(p.publication_year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [publications]);

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
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300 mb-2">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Publications Database</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              คลังผลงานวิจัยและการตีพิมพ์
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              สืบค้น คัดกรอง และดูรายละเอียดผลงานทางวิชาการ คณะวิทยาศาสตร์ประยุกต์
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 transition active:scale-95 shadow-md shadow-cyan-500/20"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>นำเข้าไฟล์ Excel</span>
            </Link>
          </div>
        </div>

        {/* SEARCH & FILTER CONTROLS */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md space-y-4 shadow-xl">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาตามชื่อผลงาน, ชื่อนักวิจัย, ชื่อวารสาร หรือ DOI..."
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

          {/* Filter Pills and Dropdowns */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            {/* Quartile Pills */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
                Quartile:
              </span>
              {["ALL", "Q1", "Q2", "Q3", "Q4"].map((q) => {
                const isActive = selectedQuartile === q;
                return (
                  <button
                    key={q}
                    onClick={() => setSelectedQuartile(q)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? q === "Q1"
                          ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                          : q === "Q2"
                          ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                          : q === "Q3"
                          ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                          : q === "Q4"
                          ? "bg-rose-500 text-slate-950 shadow-md shadow-rose-500/20"
                          : "bg-white text-slate-950"
                        : "border border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 hover:text-white"
                    }`}
                  >
                    {q === "ALL" ? "ทุก Quartile" : q}
                  </button>
                );
              })}
            </div>

            {/* Dropdowns */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Year Select */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="ALL">ปีที่ตีพิมพ์: ทั้งหมด</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    ปี {yr}
                  </option>
                ))}
              </select>

              {/* SDG Select */}
              <select
                value={selectedSdg}
                onChange={(e) => setSelectedSdg(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="ALL">SDG Goals: ทั้งหมด</option>
                {Array.from({ length: 17 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={`SDG-${n}`}>
                    SDG-{n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* RESULTS COUNT & STATUS */}
        <div className="flex items-center justify-between text-xs sm:text-sm text-slate-400 px-1">
          <span>
            พบผลงานทั้งหมด <strong className="text-white">{publications.length}</strong> รายการ
          </span>
          {(searchQuery || selectedQuartile !== "ALL" || selectedYear !== "ALL" || selectedSdg !== "ALL") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedQuartile("ALL");
                setSelectedYear("ALL");
                setSelectedSdg("ALL");
              }}
              className="text-cyan-400 hover:underline"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>

        {/* PUBLICATIONS LIST */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-36 rounded-2xl border border-slate-800 bg-slate-900/50 animate-pulse"
              />
            ))}
          </div>
        ) : publications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
            <BookOpen className="h-12 w-12 text-slate-600 mb-3" />
            <h3 className="text-lg font-bold text-white">ไม่พบผลงานวิจัยตามเงื่อนไข</h3>
            <p className="text-sm text-slate-400 max-w-md mt-1">
              ลองเปลี่ยนคำค้นหา หรือนำเข้าไฟล์ข้อมูล Excel เพิ่มเติม
            </p>
            <Link
              href="/upload"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
            >
              <FileSpreadsheet className="h-4 w-4 text-cyan-400" />
              <span>นำเข้าข้อมูล Excel ตอนนี้</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {publications.map((pub) => {
              const authorsText = pub.authors.map((a) => a.full_name_th || a.full_name_en).join(", ");
              return (
                <div
                  key={pub.id}
                  className="group relative rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 transition-all duration-300 hover:border-cyan-500/40 hover:bg-slate-900 hover:shadow-xl hover:shadow-cyan-500/5 backdrop-blur-sm"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Main Info */}
                    <div className="space-y-2.5 flex-1 min-w-0">
                      {/* Badges Row */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`rounded-md border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${getQuartileBadge(
                            pub.quartile
                          )}`}
                        >
                          {pub.quartile ? `${pub.quartile}` : "Unranked"}
                        </span>

                        {pub.percentile && (
                          <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-300 font-medium">
                            Percentile: {pub.percentile}%
                          </span>
                        )}

                        <span className="rounded-md border border-slate-700/60 bg-slate-800/40 px-2 py-0.5 text-slate-400">
                          {pub.publication_type || "Article"}
                        </span>

                        {pub.publication_year && (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{pub.publication_year}</span>
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h2
                        onClick={() => setActiveModalPub(pub)}
                        className="cursor-pointer text-base sm:text-lg font-bold text-white group-hover:text-cyan-300 transition line-clamp-2"
                      >
                        {pub.title_en || pub.title_th}
                      </h2>
                      {pub.title_th && pub.title_th !== pub.title_en && (
                        <p className="text-xs sm:text-sm text-slate-400 line-clamp-1 italic">
                          {pub.title_th}
                        </p>
                      )}

                      {/* Authors */}
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <Users className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                        <span className="line-clamp-1">
                          {authorsText || pub.lead_researcher_name || "ไม่ระบุผู้แต่ง"}
                        </span>
                      </div>

                      {/* Journal & Metadata */}
                      {pub.journal_name && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="font-medium text-slate-300 truncate">{pub.journal_name}</span>
                          {pub.volume && <span>Vol. {pub.volume}</span>}
                          {pub.issue_number && <span>No. {pub.issue_number}</span>}
                          {pub.page_range && <span>pp. {pub.page_range}</span>}
                        </div>
                      )}

                      {/* SDGs Badges */}
                      {pub.sdgs && pub.sdgs.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {pub.sdgs.map((sdg) => (
                            <span
                              key={sdg.code}
                              className="rounded bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-300 border border-blue-500/20"
                            >
                              {sdg.code}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions & Links */}
                    <div className="flex lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                      <button
                        onClick={() => setActiveModalPub(pub)}
                        className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
                      >
                        ดูรายละเอียด
                      </button>

                      {pub.doi && (
                        <a
                          href={pub.doi.startsWith("http") ? pub.doi : `https://doi.org/${pub.doi}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 transition"
                        >
                          <span>DOI</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PUBLICATION DETAIL MODAL */}
        {activeModalPub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6">
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-md border px-2.5 py-0.5 text-xs font-bold uppercase ${getQuartileBadge(
                        activeModalPub.quartile
                      )}`}
                    >
                      {activeModalPub.quartile || "Unranked"}
                    </span>
                    {activeModalPub.publication_year && (
                      <span className="text-xs text-slate-400">ปี {activeModalPub.publication_year}</span>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white pt-2 leading-snug">
                    {activeModalPub.title_en || activeModalPub.title_th}
                  </h2>
                  {activeModalPub.title_th && activeModalPub.title_th !== activeModalPub.title_en && (
                    <p className="text-sm text-slate-400 italic">{activeModalPub.title_th}</p>
                  )}
                </div>
                <button
                  onClick={() => setActiveModalPub(null)}
                  className="rounded-xl border border-slate-700 p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">วารสาร (Journal)</span>
                  <p className="font-semibold text-white">{activeModalPub.journal_name || "-"}</p>
                  {activeModalPub.issn && <p className="text-slate-400">ISSN: {activeModalPub.issn}</p>}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">ฉบับและหน้า</span>
                  <p className="text-slate-300">
                    Volume: {activeModalPub.volume || "-"} | Issue: {activeModalPub.issue_number || "-"}
                  </p>
                  <p className="text-slate-400">Pages: {activeModalPub.page_range || "-"}</p>
                </div>
              </div>

              {/* Authors List */}
              <div className="space-y-2.5">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                  รายชื่อผู้วิจัยและผู้แต่ง (Authors)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {activeModalPub.authors.map((auth, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-700/80 bg-slate-800/80 px-3.5 py-2 text-xs text-slate-200"
                    >
                      <div className="font-semibold text-white">
                        {auth.prefix_title} {auth.full_name_th || auth.full_name_en}
                      </div>
                      <div className="text-[11px] text-cyan-400 mt-0.5">
                        {auth.author_role || `ลำดับที่ ${auth.author_order}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SDG Alignment */}
              {activeModalPub.sdgs && activeModalPub.sdgs.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                    เป้าหมายความยั่งยืนที่เกี่ยวข้อง (SDGs)
                  </h3>
                  <div className="space-y-2">
                    {activeModalPub.sdgs.map((sdg) => (
                      <div
                        key={sdg.code}
                        className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-3.5 py-2 text-xs text-slate-300"
                      >
                        <span className="font-bold text-blue-400 shrink-0">{sdg.code}</span>
                        <span className="truncate">{sdg.description_th}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* External Identifiers & Links */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  ลิงก์และรหัสอ้างอิงภายนอก
                </span>
                <div className="flex flex-wrap gap-3">
                  {activeModalPub.doi && (
                    <a
                      href={activeModalPub.doi.startsWith("http") ? activeModalPub.doi : `https://doi.org/${activeModalPub.doi}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-3.5 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 transition"
                    >
                      <span>Digital Object Identifier (DOI)</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}

                  {activeModalPub.scopus_id && (
                    <span className="rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-slate-300">
                      Scopus EID: {activeModalPub.scopus_id}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
