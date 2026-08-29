export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-10 flex items-center justify-between">
          <div className="text-xl font-bold tracking-wide">KMUTNB Data Hub</div>
          <div className="flex gap-3 text-sm text-slate-300">
            <a href="/" className="rounded-full border border-slate-700 px-4 py-2 hover:bg-slate-800">Home</a>
            <a href="/upload" className="rounded-full border border-slate-700 px-4 py-2 hover:bg-slate-800">Upload</a>
            <a href="/records" className="rounded-full border border-slate-700 px-4 py-2 hover:bg-slate-800">Records</a>
          </div>
        </nav>

        <section className="grid gap-8 rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl md:grid-cols-[1.25fr_0.75fr] md:p-12">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-cyan-300">
              Academic data management
            </p>
            <h1 className="text-4xl font-bold leading-tight md:text-6xl">
              Upload Excel files and view academic records instantly.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 md:text-lg">
              This system accepts Excel spreadsheets, maps the columns automatically, saves them into PostgreSQL,
              and provides a clean record viewer for academic publications.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="/upload" className="rounded-full bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400">
                Start upload
              </a>
              <a href="/records" className="rounded-full border border-slate-600 px-6 py-3 font-semibold text-white transition hover:bg-slate-800">
                View records
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-950 p-6">
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-800 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p>
                <p className="mt-2 text-2xl font-bold text-emerald-400">Online</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-300">
                <div className="rounded-xl bg-slate-800 p-4">
                  <p className="text-slate-400">Uploaded</p>
                  <p className="mt-2 text-2xl font-semibold text-white">500+</p>
                </div>
                <div className="rounded-xl bg-slate-800 p-4">
                  <p className="text-slate-400">Sheets</p>
                  <p className="mt-2 text-2xl font-semibold text-white">Multi</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
