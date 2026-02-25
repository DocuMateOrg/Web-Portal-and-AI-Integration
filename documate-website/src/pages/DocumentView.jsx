import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function DocumentView() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state;

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <p className="text-gray-600">No document data available.</p>
          <button
            onClick={() => navigate("/documents")}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg"
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
        <h2 className="text-3xl font-bold text-gray-800">
          📄 Document Analysis
        </h2>

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
          <h3 className="text-xl font-semibold text-gray-700 mb-4">
            🔍 Extracted Text
          </h3>

          <div className="bg-gray-50 border rounded-lg p-4 overflow-y-auto max-h-[400px] text-sm text-gray-700 whitespace-pre-line">
            {ocr.text}
          </div>

          <div className="mt-4 flex justify-between text-sm text-gray-500">
            <span>
              🌐 Language: <strong>{ocr.language}</strong>
            </span>
            <span>
              🎯 Confidence:{" "}
              <span className="font-semibold text-green-600">
                {(ocr.confidence * 100).toFixed(1)}%
              </span>
            </span>
          </div>
        </div>

        {/* Summary Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">
            📝 AI Summary
          </h3>

          <div className="bg-gray-50 border rounded-lg p-4 text-gray-700 text-sm mb-6">
            {summary.summary}
          </div>

          <h4 className="text-md font-semibold mb-3 text-gray-600">
            🏷 Tags
          </h4>

          <div className="flex flex-wrap gap-2">
            {summary.tags.map((tag, index) => (
              <span
                key={index}
                className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}