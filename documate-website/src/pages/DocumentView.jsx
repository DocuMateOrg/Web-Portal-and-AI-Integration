import React from "react";
import { useParams } from "react-router-dom";

export default function DocumentView() {
  const { id } = useParams();

  const mockDocument = {
    name: id === "1" ? "Exam Paper" : "Lecture Notes",
    ocrText:
      "Sinhala and English text extracted from the document will appear here.",
    summary:
      "AI-generated summary will appear here."
  };

  return (
    <div className="p-6 bg-gradient-to-br from-blue-100 via-indigo-200 to-purple-200 min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Document Viewer</h2>

      <div className="bg-white p-6 rounded-xl shadow mb-6">
        <h3 className="font-semibold mb-2">{mockDocument.name}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg shadow-inner">
            <h4 className="font-semibold mb-2">OCR Text</h4>
            <p className="text-sm text-gray-600">
              {mockDocument.ocrText}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg shadow-inner">
            <h4 className="font-semibold mb-2">Summary</h4>
            <p className="text-sm text-gray-600">
              {mockDocument.summary}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
