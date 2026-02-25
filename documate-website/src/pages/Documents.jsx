import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadDocument } from "../services/api";

export default function Documents() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const result = await uploadDocument(file);

      const newDoc = {
        id: Date.now(),
        name: file.name,
        data: result
      };

      setDocuments([...documents, newDoc]);

    } catch (error) {
      console.error(error);
      alert("Upload failed");
    }
  };

  const handleView = (doc) => {
    navigate(`/documents/${doc.id}`, { state: doc.data });
  };

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="text-lg font-bold mb-4">Upload Document</h3>

      <input
        type="file"
        onChange={handleUpload}
        className="border p-2 rounded mb-6"
      />

      <h4 className="font-semibold mb-3">Uploaded Documents</h4>

      {documents.length === 0 && <p>No documents uploaded yet.</p>}

      {documents.map((doc) => (
        <div
          key={doc.id}
          className="border p-3 rounded mb-2 flex justify-between items-center"
        >
          <span>{doc.name}</span>
          <button
            onClick={() => handleView(doc)}
            className="bg-blue-500 text-white px-3 py-1 rounded"
          >
            View
          </button>
        </div>
      ))}
    </div>
  );
}