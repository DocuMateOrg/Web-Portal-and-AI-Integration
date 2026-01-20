import React from "react";

const documents = [
  { id: 1, name: "Exam Paper", status: "uploaded" },
  { id: 2, name: "Lecture Notes", status: "processing" }
];

function Documents() {
  return (
    <div>
      <h2>Documents List</h2>
      <ul>
        {documents.map(doc => (
          <li key={doc.id}>
            {doc.name} - {doc.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Documents;
