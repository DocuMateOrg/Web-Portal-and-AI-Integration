import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { uploadDocument, batchUpload, fetchDocuments, saveDocument, trashDocument, restoreDocument, permanentlyDeleteDocument, setDocumentStarred } from "../services/api";
import {
  UploadCloud, FileText, X, CheckCircle2, Trash2, Search, Filter, Loader2, AlertCircle, Tag, Star, Sparkles
} from "lucide-react";

const MODE_SINGLE = "single";
const MODE_BATCH  = "batch";

export default function Documents({
  view = "all-docs",
  categoryFilter = null,
  sortBy = "newest",
  onDocumentsChange,
  onTrashDocumentsChange,
  onDocumentsLoadingChange,
  onCategoryFilterChange,
}) {
  const navigate = useNavigate();

  const [mode,      setMode]      = useState(MODE_SINGLE);
  const [files,     setFiles]     = useState([]);       
  
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [dragOver,  setDragOver]  = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [starredPending, setStarredPending] = useState(() => new Set());
  const [deletePending, setDeletePending] = useState(() => new Set());

  const refresh = useCallback(async () => {
    setDocumentsLoading(true);
    try {
      setDocuments(await fetchDocuments(view === "trash" ? "trashed" : "processed"));
      setError(null);
    } catch (e) {
      setError("Could not load documents: " + e.message);
    } finally {
      setDocumentsLoading(false);
    }
  }, [view]);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    onDocumentsLoadingChange?.(documentsLoading);
  }, [documentsLoading, onDocumentsLoadingChange]);
  useEffect(() => {
    setSelectedCategory(categoryFilter || "All");
  }, [categoryFilter]);
  useEffect(() => {
    if (view === "trash") onTrashDocumentsChange?.(documents);
    else onDocumentsChange?.(documents);
  }, [documents, view, onDocumentsChange, onTrashDocumentsChange]);

  const addFiles = (incoming) => {
    const accepted = Array.from(incoming).filter(f => f.type === "application/pdf" || f.type.startsWith("image/"));
    if (mode === MODE_SINGLE) { setFiles(accepted.slice(0, 1)); } 
    else { setFiles(prev => {
        const names = new Set(prev.map(f => f.name));
        return [...prev, ...accepted.filter(f => !names.has(f.name))];
    });}
  };

  const removeFile = (name) => setFiles(prev => prev.filter(f => f.name !== name));
  const deleteDocument = async (id) => { try { await trashDocument(id); await refresh(); } catch (e) { setError(e.message); } };
  const restoreTrashedDocument = async (id) => {
    try {
      setError(null);
      await restoreDocument(id);
      await refresh();
    } catch (e) {
      setError("Could not restore document: " + e.message);
    }
  };
  const permanentlyDeleteTrashedDocument = async (doc) => {
    if (!window.confirm(`Permanently delete "${doc.name}"? This cannot be undone.`)) return;
    setDeletePending(prev => new Set(prev).add(doc.id));
    setError(null);
    try {
      await permanentlyDeleteDocument(doc.id);
      await refresh();
    } catch (e) {
      setError("Could not permanently delete document: " + e.message);
    } finally {
      setDeletePending(prev => {
        const next = new Set(prev);
        next.delete(doc.id);
        return next;
      });
    }
  };
  const toggleStarred = async (doc) => {
    if (starredPending.has(doc.id)) return;
    setStarredPending(prev => new Set(prev).add(doc.id));
    setError(null);
    try {
      const result = await setDocumentStarred(doc.id, !doc.starred);
      setDocuments(prev => prev.map(item =>
        item.id === doc.id ? { ...item, starred: result.starred } : item
      ));
    } catch (e) {
      setError("Could not update starred status: " + e.message);
    } finally {
      setStarredPending(prev => {
        const next = new Set(prev);
        next.delete(doc.id);
        return next;
      });
    }
  };
  const clearAllDocuments = async () => {
    if (!window.confirm("Move all documents to trash?")) return;
    try { await Promise.all(documents.map(d => trashDocument(d.id))); await refresh(); }
    catch (e) { setError(e.message); }
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setLoading(true); setError(null);
    try {
      if (mode === MODE_SINGLE) {
        const result = await uploadDocument(files[0]);
        const s = result.summary || {};
        const newDoc = { 
          id: Date.now(), 
          name: files[0].name, 
          data: result,
          category: s.category || "other",
          tags: s.tags || [],
          summary: s.summary || "",
          document_url: result.document_url // Store Firebase URL
        };
        await saveDocument({
          filename: newDoc.name,
          fileUrl: newDoc.document_url,
          text: result.ocr?.text || "",
          summary: newDoc.summary,
          tags: newDoc.tags,
          category: newDoc.category,
          fileSize: files[0].size,
          language: result.ocr?.language,
          confidence: result.ocr?.confidence,
        });
        await refresh();
        setFiles([]);
      } else {
        const result = await batchUpload(files);
        
        // Match the flat structure from BatchResultView.jsx
        const batchDocs = (result.per_file || []).map((item, index) => {
          // If item.summary is an object (single mode style)
          const isObj = typeof item.summary === "object" && item.summary !== null;
          const summaryText = isObj ? (item.summary.summary || "") : (item.summary || "");
          const tagsList = isObj ? (item.summary.tags || []) : (item.tags || []);
          const cat = isObj ? (item.summary.category || "other") : (item.category || "other");

          return {
            id: Date.now() + index,
            name: item.filename,
            // Wrap in the structure DocumentView.jsx expects
            data: { 
              ocr: { text: item.text || item.ocr?.text || "" }, 
              summary: { summary: summaryText, tags: tagsList, category: cat },
              document_url: item.document_url
            },
            category: cat,
            tags: tagsList,
            summary: summaryText,
            document_url: item.document_url,
            fileSize: files[index]?.size || 0,
          };
        });
        
        for (let index = 0; index < batchDocs.length; index += 1) {
          const d = batchDocs[index];
          const savedDocument = await saveDocument({
            filename: d.name,
            fileUrl: d.document_url,
            text: d.data.ocr.text,
            summary: d.summary,
            tags: d.tags,
            category: d.category,
            fileSize: d.fileSize,
            language: result.per_file[index]?.language,
            confidence: result.per_file[index]?.confidence,
          });
          d.documentId = savedDocument.id;
        }
        await refresh();
        setFiles([]);
        navigate("/batch-result", {
          state: {
            ...result,
            per_file: result.per_file.map((item, index) => ({
              ...item,
              documentId: batchDocs[index]?.documentId,
            })),
          },
        });
      }
    } catch (err) { setError(err.message || "Error during processing."); }
    finally { setLoading(false); }
  };

  const categories = useMemo(() => ["All", ...new Set(documents.map(d => d.category))], [documents]);

  const filteredDocuments = useMemo(() => {
    const filtered = documents.filter(doc => {
      if (view === "starred" && !doc.starred) return false;
      const normalizeCategory = value => String(value || "other").trim().toLowerCase().replace(/[_-]+/g, " ");
      if (categoryFilter && normalizeCategory(doc.category) !== normalizeCategory(categoryFilter)) return false;
      const q = searchQuery.toLowerCase();
      const matchesSearch = doc.name.toLowerCase().includes(q) || 
                            (doc.summary && doc.summary.toLowerCase().includes(q)) || 
                            (doc.tags && doc.tags.some(t => t.toLowerCase().includes(q)));
      const matchesCategory = selectedCategory === "All" || normalizeCategory(doc.category) === normalizeCategory(selectedCategory);
      return matchesSearch && matchesCategory;
    });
    return filtered.sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      if (sortBy === "name-desc") return b.name.localeCompare(a.name, undefined, { sensitivity: "base" });
      if (sortBy === "category-asc") return a.category.localeCompare(b.category, undefined, { sensitivity: "base" });
      if (sortBy === "category-desc") return b.category.localeCompare(a.category, undefined, { sensitivity: "base" });
      const dateA = Date.parse(a.created_at || "") || 0;
      const dateB = Date.parse(b.created_at || "") || 0;
      return sortBy === "oldest" ? dateA - dateB : dateB - dateA;
    });
  }, [documents, searchQuery, selectedCategory, view, categoryFilter, sortBy]);

  const emptyMessage = view === "trash"
    ? "Your trash is empty."
    : view === "starred"
    ? "No starred documents yet."
    : categoryFilter
      ? `No documents in ${categoryFilter}.`
      : "No documents found.";

  return (
    <div className="space-y-6">
      {view !== "trash" && <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
          <button onClick={() => {setMode(MODE_SINGLE); setFiles([]);}} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === MODE_SINGLE ? "bg-white text-blue-600 shadow" : "text-slate-500"}`}>Single File</button>
          <button onClick={() => {setMode(MODE_BATCH); setFiles([]);}} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === MODE_BATCH ? "bg-white text-blue-600 shadow" : "text-slate-500"}`}>Batch Upload</button>
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Search title, tags, summary..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
        </div>
      </div>}

      {view !== "trash" && (
        <label
          htmlFor="document-upload-input"
          onDragOver={event => { event.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={event => {
            event.preventDefault();
            setDragOver(false);
            addFiles(event.dataTransfer.files);
          }}
          className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center shadow-sm transition-all focus-within:ring-4 focus-within:ring-blue-200 ${
            dragOver
              ? "border-blue-600 bg-blue-100"
              : "border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 hover:border-blue-500 hover:from-blue-100 hover:to-indigo-100"
          }`}
        >
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200 transition-transform group-hover:-translate-y-0.5">
            <UploadCloud size={28} />
          </span>
          <span className="text-base font-bold text-blue-900">
            {dragOver ? "Drop your files to upload" : "Choose files to upload"}
          </span>
          <span className="mt-1 text-sm text-blue-700">
            or drag and drop PDF and image files here
          </span>
          <span className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors group-hover:bg-blue-700">
            Browse files
          </span>
          <input
            id="document-upload-input"
            type="file"
            multiple={mode === MODE_BATCH}
            accept=".pdf,image/*"
            className="sr-only"
            onChange={event => addFiles(event.target.files)}
          />
        </label>
      )}

      {view !== "trash" && files.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2 shadow-sm">
          {files.map(f => (
            <div key={f.name} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2">
              <span className="text-sm font-medium text-slate-700 truncate max-w-[250px]">{f.name}</span>
              <X size={16} className="cursor-pointer text-slate-400 hover:text-red-500" onClick={() => removeFile(f.name)} />
            </div>
          ))}
          <button onClick={handleUpload} disabled={loading} className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl disabled:bg-blue-300 transition-all flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : "Start Analysis"}
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle size={18} className="shrink-0" /> {error}
        </div>
      )}

      {view !== "trash" && documents.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <Filter size={16} className="text-slate-400" />
            {categories.map(cat => {
              const active = categoryFilter
                ? String(categoryFilter).trim().toLowerCase() === cat.trim().toLowerCase()
                : selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    onCategoryFilterChange?.(cat === "All" ? null : cat);
                  }}
                  aria-pressed={active}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-all ${active ? "bg-blue-600 text-white shadow-md" : "border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-600"}`}
                >
                  {cat === "All" ? cat : cat.replace(/[_-]+/g, " ")}
                </button>
              );
            })}
          </div>
          <button onClick={clearAllDocuments} className="text-red-500 hover:text-red-700 text-xs font-bold uppercase flex items-center gap-1"><Trash2 size={14} /> Clear</button>
        </div>
      )}

      <div className="grid gap-4">
        {documentsLoading ? Array.from({ length: 4 }, (_, index) => (
          <div key={`document-skeleton-${index}`} aria-hidden="true" className="flex animate-pulse items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="h-12 w-12 shrink-0 rounded-xl bg-slate-100" />
            <div className="min-w-0 flex-1 space-y-3 py-1">
              <div className="h-4 w-2/5 rounded bg-slate-100" />
              <div className="h-3 w-4/5 rounded bg-slate-100" />
              <div className="h-3 w-1/3 rounded bg-slate-100" />
            </div>
            <div className="hidden h-10 w-28 rounded-xl bg-slate-100 sm:block" />
          </div>
        )) : filteredDocuments.map(doc => (
          <div key={doc.id} className="group bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0"><FileText size={24} className="text-blue-500" /></div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-800 leading-tight">{doc.name}</p>
                  <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded font-bold uppercase">{doc.category}</span>
                  <CheckCircle2 size={14} className="text-green-500" />
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 max-w-2xl">{doc.summary || "Generating summary..."}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(doc.tags || []).map(t => (
                    <span key={t} className="flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-medium">
                      <Tag size={10} className="shrink-0" /> {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {view === "trash" ? (
                <>
                  <button
                    onClick={() => restoreTrashedDocument(doc.id)}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-700"
                  >
                    <CheckCircle2 size={16} /> Restore
                  </button>
                  <button
                    onClick={() => permanentlyDeleteTrashedDocument(doc)}
                    disabled={deletePending.has(doc.id)}
                    className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={16} /> {deletePending.has(doc.id) ? "Deleting..." : "Delete"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => toggleStarred(doc)}
                    disabled={starredPending.has(doc.id)}
                    aria-label={doc.starred ? `Remove ${doc.name} from starred` : `Star ${doc.name}`}
                    title={doc.starred ? "Remove from starred" : "Add to starred"}
                    className={`p-2.5 rounded-xl transition-all disabled:opacity-50 ${doc.starred ? "text-amber-500 hover:bg-amber-50" : "text-slate-300 hover:text-amber-500 hover:bg-amber-50"}`}
                  >
                    <Star size={18} fill={doc.starred ? "currentColor" : "none"} />
                  </button>
                  <button onClick={() => deleteDocument(doc.id)} className="p-2.5 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 size={18} /></button>
                </>
              )}
              {view !== "trash" && (
                <button onClick={() => navigate(`/documents/${doc.id}`, { state: doc.data })} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all shadow-sm">View Details</button>
              )}
            </div>
          </div>
        ))}
        {!documentsLoading && !error && filteredDocuments.length === 0 && documents.length === 0 && view === "all-docs" && !categoryFilter && (
          <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-indigo-50 px-6 py-12 text-center shadow-sm sm:px-10">
            <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-blue-100/70" />
            <div className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-indigo-100/60" />
            <div className="relative mx-auto flex max-w-lg flex-col items-center">
              <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-lg shadow-blue-100">
                <FileText size={38} className="text-blue-500" />
                <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
                  <Sparkles size={16} />
                </span>
              </div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Welcome to DocuMate</p>
              <h3 className="text-2xl font-bold tracking-tight text-slate-800">Your document workspace is ready</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Upload your first PDF or image to extract text, create summaries, and keep everything organized in one place.
              </p>
              <label htmlFor="document-upload-input" className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700">
                <UploadCloud size={18} /> Upload your first document
              </label>
            </div>
          </div>
        )}
        {!documentsLoading && !error && filteredDocuments.length === 0 && !(documents.length === 0 && view === "all-docs" && !categoryFilter) && (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-400">
            {emptyMessage}
          </p>
        )}
      </div>
    </div>
  );
}
