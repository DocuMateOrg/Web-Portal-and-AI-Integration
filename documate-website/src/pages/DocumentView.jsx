import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { generateTTS } from "../services/api";
import { Volume2, Loader2, AlertCircle } from "lucide-react";

function AudioPlayer({ text, lang = "en" }) {
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const audioRef = useRef(null);

  // Revoke old object URL when component unmounts to avoid memory leaks
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  const handleGenerate = async () => {
    if (!text?.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const url = await generateTTS(text, lang);
      setAudioUrl(url);
      // Auto-play once loaded
      setTimeout(() => audioRef.current?.play(), 100);
    } catch (err) {
      setError(err.message || "TTS failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 size={18} className="text-blue-500" />
          <span className="text-sm font-semibold text-slate-700">🔊 Listen to Summary</span>
        </div>

        {!audioUrl && (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all"
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Generating…</>
              : <><Volume2 size={14} /> Generate Audio</>}
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-xs">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {audioUrl && (
        <audio ref={audioRef} controls className="w-full h-10 rounded-lg" src={audioUrl}>
          Your browser does not support the audio element.
        </audio>
      )}
    </div>
  );
}

export default function DocumentView() {
  const location = useLocation();
  const navigate  = useNavigate();
  const data = location.state;

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="bg-white p-6 rounded-xl shadow-md text-center space-y-4">
          <p className="text-gray-600">No document data available.</p>
          <button
            onClick={() => navigate("/documents")}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg"
          >
            Back to Documents
          </button>
        </div>
      </div>
    );
  }

  const { ocr, summary } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-indigo-200 to-purple-200 p-8">

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">📄 Document Analysis</h2>
        <button
          onClick={() => navigate("/dashboard")}
          className="bg-white text-blue-600 px-4 py-2 rounded-lg shadow hover:bg-blue-50 transition"
        >
          ← Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* OCR Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">🔍 Extracted Text</h3>

          <div className="bg-gray-50 border rounded-lg p-4 overflow-y-auto max-h-[400px] text-sm text-gray-700 whitespace-pre-line flex-1">
            {ocr?.text || "No text extracted."}
          </div>

          <div className="mt-4 flex justify-between text-sm text-gray-500">
            <span>🌐 Language: <strong>{ocr?.language || "—"}</strong></span>
            <span>
              🎯 Confidence:{" "}
              <span className="font-semibold text-green-600">
                {ocr?.confidence != null ? (ocr.confidence * 100).toFixed(1) + "%" : "—"}
              </span>
            </span>
          </div>
        </div>

        {/* Summary + TTS Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">📝 AI Summary</h3>

          <div className="bg-gray-50 border rounded-lg p-4 text-gray-700 text-sm mb-4">
            {summary?.summary || "No summary available."}
          </div>

          <h4 className="text-md font-semibold mb-3 text-gray-600">🏷 Tags</h4>
          <div className="flex flex-wrap gap-2 mb-4">
            {(summary?.tags || []).map((tag, i) => (
              <span
                key={i}
                className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* TTS Audio Player */}
          {summary?.summary && (
            <AudioPlayer text={summary.summary} lang={ocr?.language || "en"} />
          )}
        </div>

      </div>
    </div>
  );
}