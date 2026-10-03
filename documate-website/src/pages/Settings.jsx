import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { fetchStorageUsage } from "../services/api";
import formatBytes from "../utils/formatBytes";

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(auth.currentUser);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [storageUsage, setStorageUsage] = useState(null);
  const [storageError, setStorageError] = useState("");
  const [storageLoading, setStorageLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    let mounted = true;
    fetchStorageUsage()
      .then(usage => {
        if (mounted) setStorageUsage(usage);
      })
      .catch(error => {
        if (mounted) setStorageError(error.message);
      })
      .finally(() => {
        if (mounted) setStorageLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const hasPasswordProvider = user?.providerData.some(
    provider => provider.providerId === "password"
  );

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setPasswordMessage(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: "error", text: "Complete all password fields." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "Your new password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "The new passwords do not match." });
      return;
    }
    if (!user?.email) {
      setPasswordMessage({ type: "error", text: "This account does not have an email address for password verification." });
      return;
    }

    setPasswordLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage({ type: "success", text: "Your password has been updated." });
    } catch (error) {
      const message = error.code === "auth/wrong-password" || error.code === "auth/invalid-credential"
        ? "The current password is incorrect."
        : error.code === "auth/weak-password"
          ? "Choose a stronger password with at least 6 characters."
          : error.code === "auth/requires-recent-login"
            ? "For security, sign out and sign in again before changing your password."
            : error.message.replace(/^Firebase:\s*/, "").replace(/\s*\(auth\/[^)]+\)\.?$/, "");
      setPasswordMessage({ type: "error", text: message });
    } finally {
      setPasswordLoading(false);
    }
  };

  const unmeasuredDocuments = storageUsage
    ? storageUsage.documents - storageUsage.measuredDocuments
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 px-4 py-8 text-slate-900 sm:px-8">
      <main className="mx-auto max-w-4xl">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-6 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white/70 hover:text-blue-700"
        >
          <ArrowLeft size={17} /> Back to dashboard
        </button>

        <header className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Account</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Settings</h1>
          <p className="mt-2 text-sm text-slate-500">Manage your profile, password, and document storage.</p>
        </header>

        <div className="grid gap-6">
          <section className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-xl shadow-blue-900/5">
            <div className="flex items-center gap-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                <UserRound size={22} />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">Profile information</h2>
                <p className="text-sm text-slate-500">Your sign-in email and account identity</p>
              </div>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <Mail size={14} /> Email address
                </div>
                <p className="break-all text-sm font-semibold text-slate-800">{user?.email || "Loading account..."}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <ShieldCheck size={14} /> Account status
                </div>
                <p className="text-sm font-semibold text-emerald-700">
                  {user?.emailVerified ? "Email verified" : "Active account"}
                </p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-xl shadow-blue-900/5">
            <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <KeyRound size={22} />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">Change password</h2>
                <p className="text-sm text-slate-500">Verify your current password before setting a new one.</p>
              </div>
            </div>
            {hasPasswordProvider ? (
              <form onSubmit={handlePasswordChange} className="grid gap-4 p-6 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700 sm:col-span-2">
                  Current password
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={event => setCurrentPassword(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    required
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  New password
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={event => setNewPassword(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    minLength={6}
                    required
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Confirm new password
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={event => setConfirmPassword(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    minLength={6}
                    required
                  />
                </label>
                {passwordMessage && (
                  <p
                    role={passwordMessage.type === "error" ? "alert" : "status"}
                    className={`rounded-xl px-4 py-3 text-sm sm:col-span-2 ${
                      passwordMessage.type === "error"
                        ? "border border-red-200 bg-red-50 text-red-700"
                        : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {passwordMessage.text}
                  </p>
                )}
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                  >
                    {passwordLoading && <LoaderCircle size={16} className="animate-spin" />}
                    {passwordLoading ? "Updating password..." : "Update password"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6">
                <p className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
                  This account uses a third-party sign-in provider. Change your password through that provider.
                </p>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-xl shadow-blue-900/5">
            <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">Document storage</h2>
                <p className="text-sm text-slate-500">Measured from original files saved with your documents.</p>
              </div>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-white">
                <p className="text-sm font-medium text-blue-100">Measured storage used</p>
                <p className="mt-2 text-3xl font-bold">
                  {storageLoading ? "Loading..." : storageError ? "Unavailable" : formatBytes(Number(storageUsage.bytes))}
                </p>
              </div>
              <div className="flex flex-col justify-center rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                {storageLoading ? (
                  <p className="text-sm text-slate-500">Loading storage details...</p>
                ) : storageError ? (
                  <p role="alert" className="text-sm text-red-700">Could not load storage usage: {storageError}</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-700">
                      File sizes recorded for {storageUsage.measuredDocuments} of {storageUsage.documents} documents
                    </p>
                    {unmeasuredDocuments > 0 && (
                      <p className="mt-2 text-xs leading-5 text-amber-700">
                        {unmeasuredDocuments} existing {unmeasuredDocuments === 1 ? "document has" : "documents have"} no recorded file size, so {unmeasuredDocuments === 1 ? "its size is" : "their sizes are"} not included.
                      </p>
                    )}
                    {unmeasuredDocuments === 0 && (
                      <p className="mt-2 text-xs text-slate-500">All stored documents have a measured original file size.</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
