"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";

const API_URL = "http://localhost:5000/api/upload";

export default function UploadPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const onSelectedFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (selected) {
      setFileName(selected.name);
    }
  };

  const uploadFile = async (selectedFile: File) => {
    const formData = new FormData();
    formData.append("file", selectedFile);

    setLoading(true);
    setStatus("Uploading...");

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Upload failed");
      }

      setStatus(`Uploaded successfully: ${result.count} records added.`);
      setFileName(selectedFile.name);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);

    const selected = event.dataTransfer.files?.[0];
    if (selected) {
      setFileName(selected.name);
      await uploadFile(selected);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <nav className="mb-8 flex items-center justify-between text-sm text-slate-300">
          <a href="/" className="font-semibold text-white">KMUTNB Data Hub</a>
          <div className="flex gap-3">
            <a href="/" className="rounded-full border border-slate-700 px-4 py-2 hover:bg-slate-800">Home</a>
            <a href="/records" className="rounded-full border border-slate-700 px-4 py-2 hover:bg-slate-800">Records</a>
          </div>
        </nav>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
          <h1 className="text-3xl font-bold">Upload Excel file</h1>
          <p className="mt-2 text-slate-300">Drag and drop your xlsx/xls file here or choose a file from your computer.</p>

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`mt-8 rounded-2xl border-2 border-dashed p-10 text-center transition ${
              dragging ? "border-cyan-400 bg-cyan-500/5" : "border-slate-700 bg-slate-950"
            }`}
          >
            <p className="text-lg font-medium">{fileName || "Drop your Excel file here"}</p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-5 rounded-full bg-cyan-500 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-400"
            >
              Choose file
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (selected) {
                  setFileName(selected.name);
                  void uploadFile(selected);
                }
              }}
              className="hidden"
            />
          </div>

          <div className="mt-6 min-h-6 text-sm text-slate-300">
            {loading ? "Uploading..." : status}
          </div>
        </section>
      </div>
    </main>
  );
}
