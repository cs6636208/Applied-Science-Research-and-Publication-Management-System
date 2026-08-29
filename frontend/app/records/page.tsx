"use client";

import { useEffect, useState } from "react";

type RecordItem = {
  id: number;
  paper_id?: string | null;
  title?: string | null;
  authors?: string | null;
  publication_year?: number | null;
  journal?: string | null;
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  keywords?: string | null;
  abstract?: string | null;
  doi?: string | null;
  url?: string | null;
  source_file?: string | null;
};

export default function RecordsPage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/records");
        const data = await response.json();
        setRecords(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchRecords();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-8 flex items-center justify-between text-sm text-slate-300">
          <a href="/" className="font-semibold text-white">KMUTNB Data Hub</a>
          <div className="flex gap-3">
            <a href="/" className="rounded-full border border-slate-700 px-4 py-2 hover:bg-slate-800">Home</a>
            <a href="/upload" className="rounded-full border border-slate-700 px-4 py-2 hover:bg-slate-800">Upload</a>
          </div>
        </nav>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Stored Records</h1>
              <p className="mt-2 text-slate-300">List of academic records from PostgreSQL.</p>
            </div>
            <a href="/upload" className="rounded-full bg-cyan-500 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-400">
              Upload another file
            </a>
          </div>

          {loading ? (
            <p className="text-slate-300">Loading records...</p>
          ) : records.length === 0 ? (
            <p className="text-slate-300">No records found yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-700">
              <table className="min-w-full divide-y divide-slate-700 text-left text-sm">
                <thead className="bg-slate-800 text-slate-200">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Authors</th>
                    <th className="px-4 py-3">Journal</th>
                    <th className="px-4 py-3">Year</th>
                    <th className="px-4 py-3">File</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-800/70">
                      <td className="px-4 py-3 text-slate-400">{record.id}</td>
                      <td className="px-4 py-3">{record.title ?? "-"}</td>
                      <td className="px-4 py-3">{record.authors ?? "-"}</td>
                      <td className="px-4 py-3">{record.journal ?? "-"}</td>
                      <td className="px-4 py-3">{record.publication_year ?? "-"}</td>
                      <td className="px-4 py-3">{record.source_file ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
