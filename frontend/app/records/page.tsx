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
  Plus,
  Download,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
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

  // CRUD & Export States
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPubId, setEditingPubId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title_en: "",
    title_th: "",
    publication_type: "Article",
    journal_name: "",
    issn: "",
    volume: "",
    issue_number: "",
    page_range: "",
    doi: "",
    scopus_id: "",
    external_url: "",
    quartile: "Q1",
    percentile: "",
    published_date: "",
    publication_year: new Date().getFullYear().toString(),
    authors_str: "",
    selected_sdgs: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

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

  // Toast Auto-Dismiss
  useEffect(() => {
    if (feedbackToast) {
      const t = setTimeout(() => setFeedbackToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [feedbackToast]);

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

  // Export Trigger
  const handleExport = (format: "xlsx" | "csv") => {
    setIsExporting(format);
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.append("q", searchQuery.trim());
    if (selectedQuartile !== "ALL") params.append("quartile", selectedQuartile);
    if (selectedYear !== "ALL") params.append("year", selectedYear);
    if (selectedSdg !== "ALL") params.append("sdg", selectedSdg);
    params.append("format", format);

    const exportUrl = `http://localhost:5000/api/publications/export?${params.toString()}`;
    window.open(exportUrl, "_blank");
    setTimeout(() => setIsExporting(null), 1500);
  };

  // Open Form for Create
  const handleOpenCreate = () => {
    setEditingPubId(null);
    setFormData({
      title_en: "",
      title_th: "",
      publication_type: "Article",
      journal_name: "",
      issn: "",
      volume: "",
      issue_number: "",
      page_range: "",
      doi: "",
      scopus_id: "",
      external_url: "",
      quartile: "Q1",
      percentile: "",
      published_date: "",
      publication_year: new Date().getFullYear().toString(),
      authors_str: "",
      selected_sdgs: [],
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Open Form for Edit
  const handleOpenEdit = (pub: Publication) => {
    setEditingPubId(pub.id);
    const authorsStr = pub.authors
      ? pub.authors.map((a) => `${a.prefix_title ? a.prefix_title + " " : ""}${a.full_name_th || a.full_name_en}`).join(", ")
      : "";
    const sdgList = pub.sdgs ? pub.sdgs.map((s) => s.code) : [];

    setFormData({
      title_en: pub.title_en || "",
      title_th: pub.title_th || "",
      publication_type: pub.publication_type || "Article",
      journal_name: pub.journal_name || "",
      issn: pub.issn || "",
      volume: pub.volume || "",
      issue_number: pub.issue_number || "",
      page_range: pub.page_range || "",
      doi: pub.doi || "",
      scopus_id: pub.scopus_id || "",
      external_url: pub.external_url || "",
      quartile: pub.quartile || "Q1",
      percentile: pub.percentile ? pub.percentile.toString() : "",
      published_date: pub.published_date ? pub.published_date.slice(0, 10) : "",
      publication_year: pub.publication_year ? pub.publication_year.toString() : "",
      authors_str: authorsStr,
      selected_sdgs: sdgList,
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Toggle SDG chip in form
  const toggleSdg = (code: string) => {
    setFormData((prev) => {
      const exists = prev.selected_sdgs.includes(code);
      return {
        ...prev,
        selected_sdgs: exists
          ? prev.selected_sdgs.filter((s) => s !== code)
          : [...prev.selected_sdgs, code],
      };
    });
  };

  // Save (Create or Update)
  const handleSavePublication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title_en.trim() && !formData.title_th.trim()) {
      setFormError("กรุณาระบุชื่อบทความ (ภาษาอังกฤษ หรือ ภาษาไทย)");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      title_en: formData.title_en.trim(),
      title_th: formData.title_th.trim() || null,
      publication_type: formData.publication_type,
      journal_name: formData.journal_name.trim() || null,
      issn: formData.issn.trim() || null,
      volume: formData.volume.trim() || null,
      issue_number: formData.issue_number.trim() || null,
      page_range: formData.page_range.trim() || null,
      doi: formData.doi.trim() || null,
      scopus_id: formData.scopus_id.trim() || null,
      external_url: formData.external_url.trim() || null,
      quartile: formData.quartile || null,
      percentile: formData.percentile ? parseFloat(formData.percentile) : null,
      published_date: formData.published_date || null,
      publication_year: formData.publication_year ? parseInt(formData.publication_year) : null,
      authors: formData.authors_str.trim() || null,
      sdgs: formData.selected_sdgs.length > 0 ? formData.selected_sdgs : null,
    };

    try {
      const url = editingPubId
        ? `http://localhost:5000/api/publications/${editingPubId}`
        : `http://localhost:5000/api/publications`;
      const method = editingPubId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }

      setIsFormModalOpen(false);
      setActiveModalPub(null);
      setFeedbackToast({
        type: "success",
        message: editingPubId ? "แก้ไขข้อมูลผลงานวิจัยสำเร็จเรียบร้อย" : "สร้างผลงานวิจัยใหม่สำเร็จเรียบร้อย",
      });
      fetchPublications();
    } catch (err: any) {
      setFormError(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Publication
  const handleDeletePublication = async (pubId: number, title: string) => {
    if (!confirm(`คุณต้องการลบผลงาน "${title}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      return;
    }
    try {
      const res = await fetch(`http://localhost:5000/api/publications/${pubId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "ไม่สามารถลบผลงานได้");
      }

      setActiveModalPub(null);
      setFeedbackToast({ type: "success", message: "ลบผลงานวิจัยสำเร็จเรียบร้อยแล้ว" });
      fetchPublications();
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาด: ${err.message}`);
    }
  };

  return (
    <main className="min-h-screen pb-16 pt-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* TOAST FEEDBACK */}
        {feedbackToast && (
          <div
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-3.5 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300 ${
              feedbackToast.type === "success"
                ? "border-emerald-500/40 bg-emerald-950/90 text-emerald-200"
                : "border-rose-500/40 bg-rose-950/90 text-rose-200"
            }`}
          >
            {feedbackToast.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
            )}
            <span className="text-sm font-medium">{feedbackToast.message}</span>
            <button
              onClick={() => setFeedbackToast(null)}
              className="ml-2 rounded-lg p-1 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

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
              สืบค้น คัดกรอง จัดการ และส่งออกรายงานผลงานวิชาการ คณะวิทยาศาสตร์ประยุกต์
            </p>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* ADD PUBLICATION BUTTON */}
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition"
            >
              <Plus className="h-4 w-4" />
              <span>เพิ่มผลงานใหม่</span>
            </button>

            {/* EXPORT BUTTONS */}
            <div className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-800/80 p-1">
              <button
                onClick={() => handleExport("xlsx")}
                disabled={isExporting !== null}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
                title="ส่งออกเป็นไฟล์ Excel"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                <span>{isExporting === "xlsx" ? "กำลังส่งออก..." : "Export Excel"}</span>
              </button>
              <span className="h-4 w-px bg-slate-700 mx-1" />
              <button
                onClick={() => handleExport("csv")}
                disabled={isExporting !== null}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
                title="ส่งออกเป็นไฟล์ CSV"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-cyan-400" />
                <span>CSV</span>
              </button>
            </div>

            {/* IMPORT LINK */}
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition active:scale-95"
            >
              <FileSpreadsheet className="h-4 w-4 text-cyan-400" />
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
              ลองเปลี่ยนคำค้นหา หรือเพิ่มผลงานใหม่เข้าสู่ระบบ
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition"
            >
              <Plus className="h-4 w-4" />
              <span>เพิ่มผลงานวิจัยตอนนี้</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {publications.map((pub) => {
              const authorsText = pub.authors
                ? pub.authors.map((a) => a.full_name_th || a.full_name_en).join(", ")
                : "";
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
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setActiveModalPub(pub)}
                          className="rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
                        >
                          ดูรายละเอียด
                        </button>
                        <button
                          onClick={() => handleOpenEdit(pub)}
                          title="แก้ไขผลงาน"
                          className="rounded-xl border border-slate-700/80 bg-slate-800/60 p-2 text-slate-400 hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-300 transition"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            handleDeletePublication(pub.id, pub.title_en || pub.title_th || "ผลงาน")
                          }
                          title="ลบผลงาน"
                          className="rounded-xl border border-slate-700/80 bg-slate-800/60 p-2 text-slate-400 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
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
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                    วารสาร (Journal)
                  </span>
                  <p className="font-semibold text-white">{activeModalPub.journal_name || "-"}</p>
                  {activeModalPub.issn && <p className="text-slate-400">ISSN: {activeModalPub.issn}</p>}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                    ฉบับและหน้า
                  </span>
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
                  {activeModalPub.authors && activeModalPub.authors.length > 0 ? (
                    activeModalPub.authors.map((auth, idx) => (
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
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">ไม่พบรายชื่อผู้แต่ง</span>
                  )}
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
                      href={
                        activeModalPub.doi.startsWith("http")
                          ? activeModalPub.doi
                          : `https://doi.org/${activeModalPub.doi}`
                      }
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

              {/* Bottom Actions inside modal */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  onClick={() => {
                    const p = activeModalPub;
                    setActiveModalPub(null);
                    handleOpenEdit(p);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>แก้ไขข้อมูลผลงานนี้</span>
                </button>
                <button
                  onClick={() =>
                    handleDeletePublication(
                      activeModalPub.id,
                      activeModalPub.title_en || activeModalPub.title_th || "ผลงาน"
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>ลบผลงานนี้</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CREATE / EDIT PUBLICATION FORM MODAL */}
        {isFormModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6">
              {/* Form Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    {editingPubId ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-white">
                      {editingPubId ? "แก้ไขข้อมูลผลงานวิจัย" : "เพิ่มผลงานวิจัยใหม่"}
                    </h2>
                    <p className="text-xs text-slate-400">
                      กรอกข้อมูลผลงานและระบบจะเชื่อมโยงวารสาร ผู้แต่ง และเป้าหมาย SDG ให้อัตโนมัติ
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsFormModalOpen(false)}
                  className="rounded-xl border border-slate-700 p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Error Alert */}
              {formError && (
                <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs sm:text-sm text-rose-300">
                  <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Actual Form */}
              <form onSubmit={handleSavePublication} className="space-y-6">
                {/* 1. Basic Titles */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                    1. ข้อมูลชื่อบทความวิชาการ
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        ชื่อบทความภาษาอังกฤษ (Title EN) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Deep Learning Framework for Smart City Optimization"
                        value={formData.title_en}
                        onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        ชื่อบทความภาษาไทย (Title TH)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. โครงข่ายการเรียนรู้เชิงลึกเพื่อการเพิ่มประสิทธิภาพเมืองอัจฉริยะ"
                        value={formData.title_th}
                        onChange={(e) => setFormData({ ...formData, title_th: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Journal & Publication Metadata */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                    2. ข้อมูลวารสารและการตีพิมพ์
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        ชื่อวารสาร (Journal Name)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. IEEE Transactions on Sustainable Energy"
                        value={formData.journal_name}
                        onChange={(e) => setFormData({ ...formData, journal_name: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">ISSN</label>
                      <input
                        type="text"
                        placeholder="e.g. 1949-3029"
                        value={formData.issn}
                        onChange={(e) => setFormData({ ...formData, issn: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        ประเภทผลงาน
                      </label>
                      <select
                        value={formData.publication_type}
                        onChange={(e) => setFormData({ ...formData, publication_type: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-cyan-500 focus:outline-none"
                      >
                        <option value="Article">Article (บทความวิชาการ)</option>
                        <option value="Conference Paper">Conference Paper (การประชุมวิชาการ)</option>
                        <option value="Review">Review Paper</option>
                        <option value="Book Chapter">Book Chapter</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Quartile (Q1 - Q4)
                      </label>
                      <select
                        value={formData.quartile}
                        onChange={(e) => setFormData({ ...formData, quartile: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-cyan-500 focus:outline-none"
                      >
                        <option value="Q1">Quartile 1 (Q1)</option>
                        <option value="Q2">Quartile 2 (Q2)</option>
                        <option value="Q3">Quartile 3 (Q3)</option>
                        <option value="Q4">Quartile 4 (Q4)</option>
                        <option value="Unranked">Unranked / อื่นๆ</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Percentile (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 95.5"
                        value={formData.percentile}
                        onChange={(e) => setFormData({ ...formData, percentile: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Volume (เล่มที่)</label>
                      <input
                        type="text"
                        placeholder="e.g. 15"
                        value={formData.volume}
                        onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Issue (ฉบับที่)</label>
                      <input
                        type="text"
                        placeholder="e.g. 2"
                        value={formData.issue_number}
                        onChange={(e) => setFormData({ ...formData, issue_number: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Pages (เลขหน้า)</label>
                      <input
                        type="text"
                        placeholder="e.g. 120-135"
                        value={formData.page_range}
                        onChange={(e) => setFormData({ ...formData, page_range: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">วันที่ตีพิมพ์</label>
                      <input
                        type="date"
                        value={formData.published_date}
                        onChange={(e) => setFormData({ ...formData, published_date: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">ปีที่ตีพิมพ์ (พ.ศ. หรือ ค.ศ.)</label>
                      <input
                        type="number"
                        placeholder="e.g. 2024"
                        value={formData.publication_year}
                        onChange={(e) => setFormData({ ...formData, publication_year: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Authors */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                    3. คณะผู้วิจัยและผู้แต่ง (Authors)
                  </h3>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      รายชื่อผู้แต่ง (คั่นด้วยเครื่องหมายจุลภาค , หรือขึ้นบรรทัดใหม่)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. ผศ.ดร.สมชาย ใจดี, รศ.ดร.วิชัย สุขเกษม, Dr. Alex Smith"
                      value={formData.authors_str}
                      onChange={(e) => setFormData({ ...formData, authors_str: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      * ระบบจะแยกคำนำหน้าชื่อและจับคู่นักวิจัยให้อัตโนมัติ โดยคนแรกจะเป็น First Author
                    </p>
                  </div>
                </div>

                {/* 4. External Identifiers */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                    4. รหัสอ้างอิงและลิงก์
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">DOI</label>
                      <input
                        type="text"
                        placeholder="10.1109/TSTE.2024.123456"
                        value={formData.doi}
                        onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Scopus EID</label>
                      <input
                        type="text"
                        placeholder="2-s2.0-85123456789"
                        value={formData.scopus_id}
                        onChange={(e) => setFormData({ ...formData, scopus_id: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">External URL</label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={formData.external_url}
                        onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. SDG Goals Alignment */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                    5. เป้าหมายการพัฒนาที่ยั่งยืน (SDG Goals)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 17 }, (_, i) => `SDG-${i + 1}`).map((code) => {
                      const isSelected = formData.selected_sdgs.includes(code);
                      return (
                        <button
                          type="button"
                          key={code}
                          onClick={() => toggleSdg(code)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            isSelected
                              ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-400/50"
                              : "border border-slate-700 bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                          }`}
                        >
                          {code}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-6">
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 hover:brightness-110 active:scale-95 transition disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{editingPubId ? "บันทึกการแก้ไข" : "สร้างผลงานวิจัย"}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
