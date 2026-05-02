import React, { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { uploadDocument, batchUpload } from "../services/api";
import {
  UploadCloud, FileText, X, CheckCircle2, Trash2, Search, Filter, Loader2, AlertCircle, Tag
} from "lucide-react";

const MODE_SINGLE = "single";
const MODE_BATCH  = "batch";

export default function Documents() {
  const navigate = useNavigate();
  const inputRef  = useRef(null);

  const [mode,      setMode]      = useState(MODE_SINGLE);
  const [files,     setFiles]     = useState([]);       
  
  const [documents, setDocuments] = useState(() => {
    try {
      const saved = localStorage.getItem("documate_docs");
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [dragOver,  setDragOver]  = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    localStorage.setItem("documate_docs", JSON.stringify(documents));
  }, [documents]);

  const addFiles = (incoming) => {
    const accepted = Array.from(incoming).filter(f => f.type === "application/pdf" || f.type.startsWith("image/"));
    if (mode === MODE_SINGLE) { setFiles(accepted.slice(0, 1)); } 
    else { setFiles(prev => {
        const names = new Set(prev.map(f => f.name));
        return [...prev, ...accepted.filter(f => !names.has(f.name))];
    });}
  };

  const removeFile = (name) => setFiles(prev => prev.filter(f => f.name !== name));
  const deleteDocument = (id) => setDocuments(prev => prev.filter(doc => doc.id !== id));
  const clearAllDocuments = () => { if (window.confirm("Clear library?")) { setDocuments([]); localStorage.removeItem("documate_docs"); } };

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
          summary: s.summary || ""
        };
        const updated = [newDoc, ...documents];
        setDocuments(updated);
        localStorage.setItem("documate_docs", JSON.stringify(updated));
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
              summary: { summary: summaryText, tags: tagsList, category: cat } 
            },
            category: cat,
            tags: tagsList,
            summary: summaryText
          };
        });
        
        const updated = [...batchDocs, ...documents];
        setDocuments(updated);
        localStorage.setItem("documate_docs", JSON.stringify(updated));
        
        setFiles([]);
        navigate("/batch-result", { state: result });
      }
    } catch (err) { setError(err.message || "Error during processing."); }
    finally { setLoading(false); }
  };

  const categories = useMemo(() => ["All", ...new Set(documents.map(d => d.category))], [documents]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = doc.name.toLowerCase().includes(q) || 
                            (doc.summary && doc.summary.toLowerCase().includes(q)) || 
                            (doc.tags && doc.tags.some(t => t.toLowerCase().includes(q)));
      const matchesCategory = selectedCategory === "All" || doc.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [documents, searchQuery, selectedCategory]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
          <button onClick={() => {setMode(MODE_SINGLE); setFiles([]);}} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === MODE_SINGLE ? "bg-white text-blue-600 shadow" : "text-slate-500"}`}>Single File</button>
          <button onClick={() => {setMode(MODE_BATCH); setFiles([]);}} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === MODE_BATCH ? "bg-white text-blue-600 shadow" : "text-slate-500"}`}>Batch Upload</button>
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Search title, tags, summary..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
        </div>
      </div>

      <div onClick={() => inputRef.current?.click()} onDragOver={e => {e.preventDefault(); setDragOver(true);}} onDragLeave={() => setDragOver(false)} onDrop={e => {e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files);}} className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${dragOver ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"}`}>
        <UploadCloud size={40} className={dragOver ? "text-blue-500" : "text-slate-300"} />
        <p className="text-sm font-semibold text-slate-500">Click or drag files here</p>
        <input ref={inputRef} type="file" multiple={mode === MODE_BATCH} accept=".pdf,image/*" className="hidden" onChange={e => addFiles(e.target.files)} />
      </div>

      {files.length > 0 && (
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

      {documents.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex gap-2 items-center">
            <Filter size={16} className="text-slate-400" />
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedCategory === cat ? "bg-blue-600 text-white shadow-md" : "bg-white text-slate-600 border border-slate-200"}`}>{cat}</button>
            ))}
          </div>
          <button onClick={clearAllDocuments} className="text-red-500 hover:text-red-700 text-xs font-bold uppercase flex items-center gap-1"><Trash2 size={14} /> Clear</button>
        </div>
      )}

      <div className="grid gap-4">
        {filteredDocuments.map(doc => (
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
              <button onClick={() => deleteDocument(doc.id)} className="p-2.5 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 size={18} /></button>
              <button onClick={() => navigate(`/documents/${doc.id}`, { state: doc.data })} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all shadow-sm">View Details</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

