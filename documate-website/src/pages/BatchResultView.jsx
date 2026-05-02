import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft, FileText, Layers, ChevronDown, ChevronUp,
  BarChart2, Globe, CheckCircle, AlertCircle, BookOpen
} from "lucide-react";

/* ── tiny helpers ─────────────────────────────────────────────────── */
const Badge = ({ children, color = "blue" }) => {
  const colors = {
    blue:   "bg-blue-100 text-blue-700",
    green:  "bg-green-100 text-green-700",
    purple: "bg-purple-100 text-purple-700",
    slate:  "bg-slate-100 text-slate-600",
    red:    "bg-red-100 text-red-600",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[color]}`}>
      {children}
    </span>
  );
};

const categoryColor = (cat) => {
  const map = {
    resume: "green", research_paper: "purple", report: "blue",
    invoice: "slate", other: "slate",
  };
  return map[cat] || "slate";
};

/* ── collapsible card ─────────────────────────────────────────────── */
function FileCard({ item, index }) {
  const [open, setOpen] = useState(false);
  const isSuccess = item.status !== "failed";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all hover:shadow-md">
      {/* Header row */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            isSuccess ? "bg-blue-50" : "bg-red-50"
          }`}>
            {isSuccess
              ? <FileText size={18} className="text-blue-500" />
              : <AlertCircle size={18} className="text-red-400" />}
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-800 text-sm leading-tight">
              {item.filename}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {isSuccess && (
                <>
                  <Badge color={categoryColor(item.category)}>{item.category || "other"}</Badge>
                  <span className="text-xs text-slate-400">
                    {item.metadata?.pages ?? 1} page{(item.metadata?.pages ?? 1) !== 1 ? "s" : ""}
                    {" · "}
                    {item.metadata?.word_count ?? "—"} words
                  </span>
                </>
              )}
              {!isSuccess && (
                <span className="text-xs text-red-500">{item.error}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isSuccess && (
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-md">
              {((item.confidence || 0) * 100).toFixed(1)}%
            </span>
          )}
          {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </button>

      {/* Expanded body */}
      {open && isSuccess && (
        <div className="border-t border-slate-100 px-5 py-5 space-y-5 bg-slate-50/50">
          {/* Summary */}
          {item.summary && (
            <div>
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">AI Summary</h5>
              <p className="text-sm text-slate-700 leading-relaxed">{item.summary}</p>
            </div>
          )}

          {/* Tags */}
          {item.tags?.length > 0 && (
            <div>
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tags</h5>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((t) => (
                  <span key={t} className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Extracted text */}
          {item.text && (
            <div>
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Extracted Text</h5>
              <div className="bg-white border border-slate-100 rounded-xl p-4 max-h-56 overflow-y-auto text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                {item.text}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── combined summary card ────────────────────────────────────────── */
function CombinedSummarySection({ combinedText, combinedSummary }) {
  const [showText, setShowText] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
          <Layers size={18} className="text-purple-500" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">Combined Summary</h3>
          <p className="text-xs text-slate-400">Unified summary across all uploaded documents</p>
        </div>
      </div>

      {/* Summary text */}
      {combinedSummary?.summary ? (
        <p className="text-sm text-slate-700 leading-relaxed">{combinedSummary.summary}</p>
      ) : (
        <p className="text-sm text-slate-400 italic">No combined summary available.</p>
      )}

      {/* Tags */}
      {combinedSummary?.tags?.length > 0 && (
        <div>
          <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tags</h5>
          <div className="flex flex-wrap gap-1.5">
            {combinedSummary.tags.map((t) => (
              <span key={t} className="bg-purple-50 text-purple-600 px-2.5 py-0.5 rounded-full text-xs font-medium">
                #{t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Category badge */}
      {combinedSummary?.category && (
        <Badge color={categoryColor(combinedSummary.category)}>{combinedSummary.category}</Badge>
      )}

      {/* Raw combined text toggle */}
      {combinedText && (
        <div>
          <button
            onClick={() => setShowText((p) => !p)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <BookOpen size={14} />
            {showText ? "Hide" : "Show"} full extracted text
          </button>
          {showText && (
            <div className="mt-3 bg-slate-50 border border-slate-100 rounded-xl p-4 max-h-72 overflow-y-auto text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
              {combinedText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── main page ────────────────────────────────────────────────────── */
export default function BatchResultView() {
  const location = useLocation();
  const navigate  = useNavigate();
  const data = location.state;

  const [view, setView] = useState("per-file"); // "per-file" | "combined"

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-indigo-200 to-purple-200 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center space-y-4">
          <AlertCircle size={40} className="text-red-400 mx-auto" />
          <p className="text-slate-600 font-medium">No batch result data found.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 text-white px-5 py-2 rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { batch_info = {}, per_file = [], combined_text = "", combined_summary } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-indigo-200 to-purple-200 p-6 md:p-10">

      {/* ── Top bar ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Batch Results</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {batch_info.total_documents} document{batch_info.total_documents !== 1 ? "s" : ""} processed
          </p>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-xl shadow hover:bg-blue-50 transition font-semibold text-sm"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      {/* ── Stats strip ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {[
          {
            icon: <CheckCircle size={20} className="text-green-500" />,
            label: "Documents",
            value: batch_info.total_documents ?? "—",
            bg: "bg-green-50",
          },
          {
            icon: <BarChart2 size={20} className="text-blue-500" />,
            label: "Avg Confidence",
            value: `${((batch_info.avg_confidence || 0) * 100).toFixed(1)}%`,
            bg: "bg-blue-50",
          },
          {
            icon: <Globe size={20} className="text-purple-500" />,
            label: "Languages",
            value: batch_info.language || (batch_info.languages || []).join(", ") || "—",
            bg: "bg-purple-50",
          },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 flex items-center gap-3`}>
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
              {s.icon}
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              <p className="text-base font-bold text-slate-800">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── View toggle ───────────────────────────────────────── */}
      <div className="flex gap-2 bg-white/70 backdrop-blur p-1 rounded-xl w-fit mb-6 shadow-sm">
        <button
          onClick={() => setView("per-file")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            view === "per-file"
              ? "bg-blue-600 text-white shadow"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileText size={15} /> Per-file Results
        </button>
        <button
          onClick={() => setView("combined")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            view === "combined"
              ? "bg-purple-600 text-white shadow"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Layers size={15} /> Combined Summary
        </button>
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      {view === "per-file" && (
        <div className="space-y-4">
          {per_file.length === 0 && (
            <p className="text-slate-400 italic text-sm">No per-file results available.</p>
          )}
          {per_file.map((item, i) => (
            <FileCard key={item.filename + i} item={item} index={i} />
          ))}
        </div>
      )}

      {view === "combined" && (
        <CombinedSummarySection combinedText={combined_text} combinedSummary={combined_summary} />
      )}
    </div>
  );
}
