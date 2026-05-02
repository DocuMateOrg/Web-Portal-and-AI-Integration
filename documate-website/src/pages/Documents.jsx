import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { uploadDocument, batchUpload } from "../services/api";
import {
  UploadCloud, FileText, X, Layers, File, CheckCircle, AlertCircle, Loader2
} from "lucide-react";

const MODE_SINGLE = "single";
const MODE_BATCH  = "batch";

export default function Documents() {
  const navigate = useNavigate();
  const inputRef  = useRef(null);

  const [mode,      setMode]      = useState(MODE_SINGLE);
  const [files,     setFiles]     = useState([]);       // staged files
  const [documents, setDocuments] = useState([]);       // processed single-mode docs
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [dragOver,  setDragOver]  = useState(false);

  /* ── file staging ─────────────────────────────────────────────── */
  const addFiles = (incoming) => {
    const accepted = Array.from(incoming).filter(
      (f) => f.type === "application/pdf" || f.type.startsWith("image/")
    );
    if (mode === MODE_SINGLE) {
      setFiles(accepted.slice(0, 1));
    } else {
      setFiles((prev) => {
        const names = new Set(prev.map((f) => f.name));
        return [...prev, ...accepted.filter((f) => !names.has(f.name))];
      });
    }
  };

  const removeFile = (name) => setFiles((prev) => prev.filter((f) => f.name !== name));

  /* ── drag-and-drop ────────────────────────────────────────────── */
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  /* ── upload ───────────────────────────────────────────────────── */
  const handleUpload = async () => {
    if (!files.length) return;
    setLoading(true);
    setError(null);

    try {
      if (mode === MODE_SINGLE) {
        const result = await uploadDocument(files[0]);
        const newDoc = { id: Date.now(), name: files[0].name, data: result };
        setDocuments((prev) => [newDoc, ...prev]);
        setFiles([]);
      } else {
        const result = await batchUpload(files);
        navigate("/batch-result", { state: result });
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Mode Toggle ─────────────────────────────────────────── */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { id: MODE_SINGLE, label: "Single File",  icon: <File size={15} /> },
          { id: MODE_BATCH,  label: "Batch Upload", icon: <Layers size={15} /> },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setFiles([]); setError(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === m.id
                ? "bg-white text-blue-600 shadow"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* ── Drop Zone ───────────────────────────────────────────── */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
          dragOver
            ? "border-blue-400 bg-blue-50"
            : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30"
        }`}
      >
        <UploadCloud size={40} className={dragOver ? "text-blue-500" : "text-slate-300"} />
        <p className="text-sm font-semibold text-slate-500">
          {mode === MODE_SINGLE
            ? "Click or drag a PDF / image here"
            : "Click or drag multiple PDFs / images here"}
        </p>
        <p className="text-xs text-slate-400">Supported: PDF, PNG, JPG, JPEG</p>
        <input
          ref={inputRef}
          type="file"
          multiple={mode === MODE_BATCH}
          accept=".pdf,image/*"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {/* ── Staged file chips ───────────────────────────────────── */}
      {files.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            {files.length} file{files.length > 1 ? "s" : ""} ready
          </p>
          {files.map((f) => (
            <div key={f.name} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-blue-400 shrink-0" />
                <span className="text-sm font-medium text-slate-700 truncate max-w-[280px]">{f.name}</span>
                <span className="text-xs text-slate-400">({(f.size / 1024).toFixed(1)} KB)</span>
              </div>
              <button onClick={() => removeFile(f.name)} className="text-slate-400 hover:text-red-400 transition-colors">
                <X size={16} />
              </button>
            </div>
          ))}

          {/* Upload btn */}
          <button
            onClick={handleUpload}
            disabled={loading}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-blue-100"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Processing…</>
            ) : (
              <><UploadCloud size={18} /> {mode === MODE_BATCH ? "Process All Documents" : "Upload & Analyse"}</>
            )}
          </button>
        </div>
      )}

      {/* ── Error banner ────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ── Processed single-mode docs list ─────────────────────── */}
      {documents.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-slate-700 text-sm uppercase tracking-wider">Processed Documents</h4>
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-5 py-4 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                  <CheckCircle size={18} className="text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{doc.name}</p>
                  <p className="text-xs text-slate-400">
                    {doc.data?.ocr?.language || "—"} · {((doc.data?.ocr?.confidence || 0) * 100).toFixed(1)}% confidence
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/documents/${doc.id}`, { state: doc.data })}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all"
              >
                View Results
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}