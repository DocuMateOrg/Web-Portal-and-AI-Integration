import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Star,
  Receipt,
  Briefcase,
  FileCode,
  Activity,
  Settings,
  Search,
  LayoutGrid,
  ChevronDown,
  LogOut,
  Trash2,
  Menu,
  X,
} from "lucide-react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { fetchStorageUsage, searchDocuments } from "../services/api";
import formatBytes from "../utils/formatBytes";
import Documents from "./Documents";

/* ──────────────────────────────────────────────────────────
   Helpers — derive readable display name & initials from email
   e.g.  "john.doe@gmail.com"  →  displayName: "John Doe", initials: "JD"
         "alice@company.com"   →  displayName: "Alice",    initials: "AL"
────────────────────────────────────────────────────────── */
function getInitials(email) {
  if (!email) return "?";
  const name = email.split("@")[0];
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getDisplayName(email) {
  if (!email) return "User";
  return email
    .split("@")[0]
    .split(/[._-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

/* ──────────────────────────────────────────────────────────
   UserProfile component
   • Listens to Firebase auth state in real time
   • Shows gradient avatar with initials + name + email
   • Dropdown with "My Profile" and "Sign Out"
   • Closes on outside click
────────────────────────────────────────────────────────── */
function UserProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Stay in sync with Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return unsub;
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const email = user?.email || "";
  const initials = getInitials(email);
  const displayName = getDisplayName(email);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar button */}
      <button
        id="user-profile-btn"
        onClick={() => setOpen((prev) => !prev)}
        title={email}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-white/70 transition-all"
      >
        {/* Gradient circle with initials */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-200 flex-shrink-0">
          <span className="text-white text-xs font-bold tracking-wide">{initials}</span>
        </div>

        {/* Name + email — visible on sm and above */}
        <div className="hidden sm:flex flex-col items-start leading-tight max-w-[140px]">
          <span className="text-sm font-semibold text-slate-800 truncate w-full">
            {displayName}
          </span>
          <span className="text-[10px] text-slate-400 truncate w-full">{email}</span>
        </div>

        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          id="user-dropdown"
          className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden"
        >
          {/* User info banner */}
          <div className="px-4 py-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-white text-sm font-bold">{initials}</span>
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-800 truncate">{displayName}</p>
                <p className="text-[11px] text-slate-500 truncate">{email}</p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-2">
            <button
              id="sign-out-btn"
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors font-medium"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Dashboard
────────────────────────────────────────────────────────── */
const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all-docs");
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [trashDocuments, setTrashDocuments] = useState([]);
  const [sortBy, setSortBy] = useState("newest");
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [storageUsage, setStorageUsage] = useState(null);
  const [storageError, setStorageError] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  useEffect(() => {
    let mounted = true;
    fetchStorageUsage()
      .then(usage => {
        if (mounted) setStorageUsage(usage);
      })
      .catch(error => {
        if (mounted) setStorageError(error.message);
      });
    return () => { mounted = false; };
  }, []);
  const categoryCounts = documents.reduce((counts, doc) => {
    const category = doc.category || "other";
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {});
  const categoryIcons = {
    receipt: <Receipt size={18} className="text-red-400" />,
    receipts: <Receipt size={18} className="text-red-400" />,
    contract: <Briefcase size={18} className="text-green-400" />,
    contracts: <Briefcase size={18} className="text-green-400" />,
    bill: <FileCode size={18} className="text-cyan-400" />,
    bills: <FileCode size={18} className="text-cyan-400" />,
    medical: <Activity size={18} className="text-purple-400" />,
  };
  const selectTab = (tab) => {
    setActiveTab(tab);
    setCategoryFilter(null);
    setMobileSidebarOpen(false);
  };
  const selectCategory = category => {
    setCategoryFilter(category);
    setActiveTab(category ? "category" : "all-docs");
    setMobileSidebarOpen(false);
  };
  const activeTitle = categoryFilter
    ? categoryFilter.replace(/[_-]+/g, " ").replace(/\b\w/g, letter => letter.toUpperCase())
    : activeTab === "starred" ? "Starred"
      : activeTab === "trash" ? "Trash"
        : activeTab === "search" ? "Search results"
          : "All documents";
  const activeCount = activeTab === "search"
    ? searchResults.length
    : activeTab === "trash"
      ? trashDocuments.length
      : activeTab === "starred"
        ? documents.filter(doc => doc.starred).length
        : categoryFilter
          ? categoryCounts[categoryFilter] || 0
          : documents.length;
  const runSearch = async (event) => {
    event.preventDefault();
    const query = searchInput.trim();
    if (!query) {
      setSearchResults([]);
      setSearchError("Enter a name, keyword, or phrase to search your documents.");
      setActiveTab("search");
      return;
    }

    setActiveTab("search");
    setCategoryFilter(null);
    setSearchError("");
    setSearchLoading(true);
    try {
      setSearchResults(await searchDocuments(query));
    } catch (error) {
      setSearchResults([]);
      setSearchError(`Search failed: ${error.message}`);
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="flex h-dvh min-h-screen overflow-hidden bg-gradient-to-br from-blue-100 via-indigo-200 to-purple-200 font-sans text-slate-900">
      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/40 md:hidden"
        />
      )}
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col border-r border-slate-100 bg-white/95 p-5 shadow-xl backdrop-blur transition-transform duration-200 md:static md:z-auto md:w-64 md:max-w-none md:translate-x-0 md:bg-transparent md:p-6 md:shadow-none ${
        mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-[#1D4ED8] p-2 rounded-xl shadow-lg shadow-blue-200">
            <FileText className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-none">DocuMate</h1>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
              Document Manager
            </span>
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          <SidebarLink
            icon={<LayoutGrid size={20} />}
            label="All documents"
            count={documentsLoading ? "—" : documents.length}
            active={activeTab === "all-docs"}
            onClick={() => selectTab("all-docs")}
          />
          <SidebarLink
            icon={<Star size={20} />}
            label="Starred"
            count={documentsLoading ? "—" : documents.filter(doc => doc.starred).length}
            active={activeTab === "starred"}
            onClick={() => selectTab("starred")}
          />
          <SidebarLink
            icon={<Trash2 size={20} />}
            label="Trash"
            count={trashDocuments.length}
            active={activeTab === "trash"}
            onClick={() => selectTab("trash")}
          />

          <div className="pt-8 pb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Folders
            </span>
          </div>

          {documentsLoading && (
            <div aria-label="Loading document categories" className="space-y-3 px-3 py-2">
              {[1, 2, 3].map(item => (
                <div key={item} className="flex animate-pulse items-center justify-between">
                  <span className="h-3 w-28 rounded bg-slate-200" />
                  <span className="h-3 w-5 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          )}
          {Object.entries(categoryCounts).map(([category, count]) => (
            <SidebarLink
              key={category}
              icon={categoryIcons[category.toLowerCase()] || <FileText size={18} className="text-slate-400" />}
              label={category.replace(/[_-]+/g, " ").replace(/\b\w/g, letter => letter.toUpperCase())}
              count={count}
              active={categoryFilter === category}
              onClick={() => selectCategory(category)}
            />
          ))}
        </nav>

        {/* Storage card */}
        <div className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-700">Storage used</span>
            <span className="text-blue-700">
              {storageUsage ? formatBytes(Number(storageUsage.bytes)) : storageError ? "Unavailable" : "Loading..."}
            </span>
          </div>
          <p className="mt-2 text-[10px] font-medium text-slate-500">
            {storageUsage
              ? `${storageUsage.measuredDocuments} of ${storageUsage.documents} documents measured`
              : storageError
                ? "Could not load storage usage"
                : "Calculating document storage"}
          </p>
        </div>

        <button
          onClick={() => navigate("/settings")}
          className="flex items-center gap-3 text-slate-500 hover:text-blue-600 transition-colors px-3 py-2 text-sm font-semibold"
        >
          <Settings size={20} /> Settings
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-50 px-4 py-3 sm:px-6 md:px-8 md:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label={mobileSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileSidebarOpen}
              onClick={() => setMobileSidebarOpen(open => !open)}
              className="rounded-xl p-2 text-slate-600 transition hover:bg-white md:hidden"
            >
              {mobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Live user profile with dropdown */}
          <UserProfile />
        </header>

        {/* Dynamic view */}
        <div className="flex-1 overflow-y-auto bg-slate-50/30">
          {["all-docs", "starred", "category", "trash", "search"].includes(activeTab) ? (
            <div className="p-4 sm:p-6 md:p-8">
              <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{activeTitle}</h2>
                  <p className="text-sm text-slate-400">
                    {activeCount}{" "}
                    {activeTab === "search"
                      ? activeCount === 1 ? "result" : "results"
                      : activeCount === 1 ? "document" : "documents"}
                  </p>
                </div>
                {activeTab !== "search" && (
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <span className="sr-only">Sort documents</span>
                    <select
                      value={sortBy}
                      onChange={event => setSortBy(event.target.value)}
                      disabled={activeTab === "trash" || documents.length === 0}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="newest">Date: newest first</option>
                      <option value="oldest">Date: oldest first</option>
                      <option value="name-asc">Name: A to Z</option>
                      <option value="name-desc">Name: Z to A</option>
                      <option value="category-asc">Category: A to Z</option>
                      <option value="category-desc">Category: Z to A</option>
                    </select>
                  </label>
                )}
              </div>

              <form onSubmit={runSearch} className="relative mb-8 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={event => setSearchInput(event.target.value)}
                    placeholder="Search by document name, text, or keyword..."
                    aria-label="Search documents"
                    className="w-full rounded-2xl border border-slate-100 bg-white py-4 pl-12 pr-4 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="rounded-2xl bg-[#1D4ED8] px-6 py-4 font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {searchLoading ? "Searching..." : "Search"}
                </button>
              </form>

              {activeTab === "search" ? (
                <div className="space-y-4">
                  {searchError && (
                    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {searchError}
                    </div>
                  )}
                  {searchLoading ? (
                    <div className="space-y-4" aria-label="Loading search results">
                      {[1, 2, 3].map(item => (
                        <div key={item} aria-hidden="true" className="flex animate-pulse items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                          <div className="h-12 w-12 shrink-0 rounded-xl bg-slate-100" />
                          <div className="flex-1 space-y-3 py-1">
                            <div className="h-4 w-2/5 rounded bg-slate-100" />
                            <div className="h-3 w-4/5 rounded bg-slate-100" />
                            <div className="h-3 w-1/4 rounded bg-slate-100" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : searchResults.length ? searchResults.map(doc => (
                    <article key={doc.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                          <FileText size={24} className="text-blue-500" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-slate-800">{doc.name}</h3>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">{doc.category}</span>
                          </div>
                          <p className="line-clamp-2 text-sm text-slate-500">
                            {doc.summary || doc.data.ocr.text || "No document preview is available."}
                          </p>
                          <p className="text-xs text-slate-400">
                            {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "Date unavailable"}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/documents/${doc.id}`, { state: doc.data })}
                        className="shrink-0 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                      >
                        View document
                      </button>
                    </article>
                  )) : !searchError && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                        <Search size={26} className="text-blue-500" />
                      </div>
                      <h3 className="font-semibold text-slate-700">
                        {searchInput.trim() ? "No matching documents" : "Search your documents"}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {searchInput.trim()
                          ? "Try another name, keyword, or phrase."
                          : "Enter a search term to find documents by name or content."}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <Documents
                  view={activeTab}
                  categoryFilter={categoryFilter}
                  sortBy={sortBy}
                  onDocumentsChange={setDocuments}
                  onTrashDocumentsChange={setTrashDocuments}
                  onDocumentsLoadingChange={setDocumentsLoading}
                  onCategoryFilterChange={selectCategory}
                />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              Select a document section to view your files.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────
   SidebarLink sub-component
────────────────────────────────────────────────────────── */
const SidebarLink = ({ icon, label, count, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all ${
      active
        ? "bg-blue-50 text-blue-600"
        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
    }`}
  >
    <div className="flex items-center gap-3 font-semibold text-sm">
      {icon}
      {label}
    </div>
    {count !== undefined && count !== null && (
      <span
        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
          active ? "bg-blue-100 text-blue-600" : "text-slate-300"
        }`}
      >
        {count}
      </span>
    )}
  </button>
);

export default Dashboard;
