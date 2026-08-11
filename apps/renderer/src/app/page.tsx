"use client";

export default function DashboardPage() {
  return (
    <div className="flex h-full flex-col p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your PDF workspace — fast, intelligent, precise.
        </p>
      </div>

      {/* Quick actions grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
        {[
          { label: "Merge PDF", desc: "Combine multiple files into one", color: "#6D5DFC" },
          { label: "Split PDF", desc: "Extract pages into separate files", color: "#5b8dee" },
          { label: "Compress PDF", desc: "Reduce file size without quality loss", color: "#10b981" },
          { label: "Convert PDF", desc: "Export to Word, Excel, JPG & more", color: "#f59e0b" },
          { label: "Sign PDF", desc: "Add digital signatures securely", color: "#ec4899" },
          { label: "Protect PDF", desc: "Encrypt with password & permissions", color: "#8b5cf6" },
        ].map((action) => (
          <button
            key={action.label}
            className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/3 p-5 text-left transition-all duration-200 hover:border-white/10 hover:bg-white/5"
          >
            <div
              className="mb-3 h-1.5 w-8 rounded-full transition-all duration-200 group-hover:w-12"
              style={{ background: action.color, boxShadow: `0 0 8px ${action.color}80` }}
            />
            <p className="text-sm font-medium text-white">{action.label}</p>
            <p className="mt-1 text-xs text-gray-500">{action.desc}</p>
          </button>
        ))}
      </div>

      {/* Recent activity placeholder */}
      <div className="mt-8 rounded-xl border border-white/5 bg-white/3 p-6">
        <h2 className="mb-4 text-sm font-medium text-gray-300">Recent Files</h2>
        <div className="space-y-2">
          {["Q1_Report.pdf", "Invoice_2025.pdf", "Contract_v3.pdf"].map((file) => (
            <div
              key={file}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-white/4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#6D5DFC]/10">
                  <span className="text-[10px] font-bold text-[#a594fd]">PDF</span>
                </div>
                <span className="text-sm text-gray-300">{file}</span>
              </div>
              <span className="text-xs text-gray-600">Just now</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
