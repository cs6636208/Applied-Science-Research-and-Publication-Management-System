"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import Link from "next/link";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Users,
  Building2,
  Layers,
  Sparkles,
  RefreshCw,
  Download,
} from "lucide-react";

type IngestionStats = {
  inserted_publications: number;
  inserted_researchers: number;
  inserted_journals: number;
  inserted_authors_links: number;
  inserted_sdgs: number;
};

type UploadResult = {
  success: boolean;
  message: string;
  stats?: IngestionStats;
  count?: number;
};

export default function UploadPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const response = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "การอัปโหลดล้มเหลว");
      }

      setResult(data);
      setFileName(file.name);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการนำเข้าไฟล์");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      uploadFile(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFileName(file.name);
      uploadFile(file);
    }
  };

  return (
    <main className="min-h-screen pb-16 pt-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* HEADER */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Excel Importer & Relational Mapper</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl tracking-tight">
            นำเข้าชุดข้อมูลผลงานวิจัย (Excel)
          </h1>
          <p className="max-w-xl mx-auto text-sm sm:text-base text-slate-400">
            ระบบจะทำการวิเคราะห์หัวตาราง แยกรายชื่อผู้แต่ง บันทึกวารสาร และจับคู่เป้าหมาย SDG ให้อัตโนมัติ
          </p>
        </div>

        {/* UPLOAD ZONE */}
        {!result && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl space-y-6">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 sm:p-14 text-center transition duration-300 ${
                dragging
                  ? "border-cyan-400 bg-cyan-500/10 scale-[1.01]"
                  : "border-slate-700 bg-slate-950/70 hover:border-slate-600"
              }`}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-4 shadow-lg shadow-cyan-500/10">
                {loading ? (
                  <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
                ) : (
                  <UploadCloud className="h-8 w-8 text-cyan-400" />
                )}
              </div>

              {loading ? (
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white">กำลังประมวลผลไฟล์...</h3>
                  <p className="text-xs text-slate-400">
                    กำลังอ่านข้อมูล, สร้างความสัมพันธ์นักวิจัย, วารสาร และ SDG
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      {fileName ? fileName : "ลากไฟล์ Excel (.xlsx, .xls) มาวางที่นี่"}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">หรือคลิกปุ่มด้านล่างเพื่อเลือกไฟล์จากเครื่องของคุณ</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>เลือกไฟล์ Excel</span>
                    </button>

                    <a
                      href="/kmutnb_publication_template.xlsx"
                      download="kmutnb_publication_template.xlsx"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition active:scale-95"
                    >
                      <Download className="h-4 w-4 text-cyan-400" />
                      <span>ดาวน์โหลดไฟล์ตัวอย่าง (.xlsx)</span>
                    </a>
                  </div>

                  <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* Error Display */}
            {errorMsg && (
              <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs sm:text-sm text-rose-300">
                <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Supported Column Info Box */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                โครงสร้างคอลัมน์ที่รองรับ (Auto-detection):
              </h4>
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  "ชื่อบทความ (Title / Title_TH / Title_EN)",
                  "ผู้แต่ง (Authors)",
                  "วารสาร (Journal)",
                  "ปีที่ตีพิมพ์ (Year)",
                  "Quartile (Q1-Q4)",
                  "Percentile",
                  "DOI",
                  "Scopus ID",
                  "SDG Goals",
                  "Volume / Issue / Pages",
                ].map((col) => (
                  <span
                    key={col}
                    className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1 text-slate-300"
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* SUCCESS SUMMARY CARD */}
        {result && (
          <section className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">นำเข้าข้อมูลสำเร็จเรียบร้อย!</h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5">{result.message}</p>
              </div>
            </div>

            {/* Ingestion Stats Breakdown */}
            {result.stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-center">
                  <div className="flex items-center justify-center text-cyan-400 mb-1">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {result.stats.inserted_publications}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">บทความตีพิมพ์</div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-center">
                  <div className="flex items-center justify-center text-blue-400 mb-1">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {result.stats.inserted_researchers}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">นักวิจัยใหม่</div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-center">
                  <div className="flex items-center justify-center text-teal-400 mb-1">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {result.stats.inserted_journals}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">วารสารใหม่</div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-center">
                  <div className="flex items-center justify-center text-emerald-400 mb-1">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {result.stats.inserted_sdgs}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">แท็ก SDG</div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-800">
              <Link
                href="/records"
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400 transition active:scale-95 shadow-lg shadow-cyan-500/25"
              >
                <BookOpen className="h-4 w-4" />
                <span>ไปที่คลังผลงานวิจัย</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setFileName("");
                }}
                className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
              >
                นำเข้าไฟล์อื่นเพิ่มเติม
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
