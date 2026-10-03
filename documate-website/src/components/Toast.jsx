import { useEffect } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";

export default function Toast({ type = "success", message, onClose, duration = 5000 }) {
  useEffect(() => {
    if (!duration) return undefined;
    const timer = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timer);
  }, [duration, onClose]);

  if (!message) return null;
  const success = type === "success";

  return (
    <div
      role={success ? "status" : "alert"}
      className={`fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-2xl border bg-white p-4 shadow-xl ${
        success ? "border-emerald-200" : "border-red-200"
      }`}
    >
      {success
        ? <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-500" />
        : <XCircle size={20} className="mt-0.5 shrink-0 text-red-500" />}
      <p className={`flex-1 text-sm font-medium ${success ? "text-emerald-800" : "text-red-700"}`}>
        {message}
      </p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
        className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
      >
        <X size={16} />
      </button>
    </div>
  );
}
