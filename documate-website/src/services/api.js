const AI_BASE = "http://localhost:8000";

export const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append("files", file);

  const response = await fetch(`${AI_BASE}/ocr`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) throw new Error("Upload failed");
  return response.json();
};

export const batchUpload = async (files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await fetch(`${AI_BASE}/batch`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "Batch upload failed");
  }
  return response.json();
};