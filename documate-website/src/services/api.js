import { auth } from "../firebase";

const AI_BASE = "http://localhost:8000";

export const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append("files", file);

  const response = await fetch(`${AI_BASE}/ocr`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || err.error || "Upload failed");
  }
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

export const generateTTS = async (text, lang = "en") => {
  const formData = new FormData();
  formData.append("text", text);
  formData.append("lang", lang);

  const response = await fetch(`${AI_BASE}/tts`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "TTS generation failed");
  }

  const result = await response.json();
  return result.audio_url; // Return the permanent Firebase URL
};

/* ===================== BACKEND (Node + Postgres) ===================== */
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";

/**
 * Waits for Firebase to restore auth state (resolves after the first
 * onAuthStateChanged emission) and then returns the Bearer token header.
 * This prevents the race condition where auth.currentUser is null
 * immediately after login/page load even though the user is authenticated.
 */
function waitForCurrentUser() {
  return new Promise((resolve) => {
    // If already hydrated, resolve immediately
    if (auth.currentUser !== undefined && auth.currentUser !== null) {
      return resolve(auth.currentUser);
    }
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

async function authHeaders() {
  const user = await waitForCurrentUser();
  if (!user) return {};                       // not logged in or DEV mode
  return { Authorization: `Bearer ${await user.getIdToken()}` };
}

async function backend(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(await authHeaders()), ...(options.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Backend error (${res.status})`);
  }
  return res.json();
}

// Backend row -> the shape the existing pages (Documents / DocumentView) already expect
const toFrontendDoc = (d) => ({
  id: d.id,
  name: d.filename,
  category: d.category || "other",
  tags: d.tags || [],
  summary: d.summary || "",
  document_url: d.file_url,
  data: {
    ocr: { text: d.extracted_text || "", language: d.language, confidence: d.confidence },
    summary: { summary: d.summary || "", tags: d.tags || [], category: d.category || "other" },
    document_url: d.file_url,
  },
});

export const fetchDocuments = async () => {
  const { documents } = await backend("/api/documents?status=processed");
  return documents.map(toFrontendDoc);
};

export const saveDocument = (doc) =>
  backend("/api/documents/save", { method: "POST", body: JSON.stringify(doc) });

export const trashDocument = (id) =>
  backend(`/api/documents/${id}/trash`, { method: "PUT" });
