import React from "react";
import { useNavigate } from "react-router-dom";

const documents = [
  { id: 1, name: "Exam Paper", status: "Uploaded" },
  { id: 2, name: "Lecture Notes", status: "Processing" },
];

export default function Documents() {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl shadow">
      {documents.map((doc) => (
        <div
          key={doc.id}
          onClick={() => navigate(`/documents/${doc.id}`)}
          className="flex justify-between items-center p-4 border-b last:border-b-0 cursor-pointer hover:bg-slate-50"
        >
          <span className="font-medium text-gray-800">
            {doc.name}
          </span>
          <span className="text-sm text-gray-500">
            {doc.status}
          </span>
        </div>
      ))}
    </div>
  );
}
