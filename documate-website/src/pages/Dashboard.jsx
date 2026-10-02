import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Clock,
  Star,
  Receipt,
  Briefcase,
  FileCode,
  Activity,
  Settings,
  Search,
  LayoutGrid,
  List,
  ChevronDown,
  Plus,
  LogOut,
  User,
} from "lucide-react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
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
  const [activeTab, setActiveTab] = useState("all-docs");

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-100 via-indigo-200 to-purple-200 font-sans text-slate-900">
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-slate-100 flex flex-col p-6">
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

        <nav className="space-y-1 flex-1">
          <SidebarLink
            icon={<LayoutGrid size={20} />}
            label="All documents"
            count={24}
            active={activeTab === "all-docs"}
            onClick={() => setActiveTab("all-docs")}
          />
          <SidebarLink
            icon={<Clock size={20} />}
            label="Recent activity"
            active={activeTab === "recent"}
            onClick={() => setActiveTab("recent")}
          />
          <SidebarLink
            icon={<Star size={20} />}
            label="Starred"
            count={5}
            active={activeTab === "starred"}
            onClick={() => setActiveTab("starred")}
          />

          <div className="pt-8 pb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Folders
            </span>
          </div>

          <SidebarLink icon={<Receipt size={18} className="text-red-400" />}    label="Receipts"  count={12} />
          <SidebarLink icon={<Briefcase size={18} className="text-green-400" />} label="Contracts" count={5}  />
          <SidebarLink icon={<FileCode size={18} className="text-cyan-400" />}   label="Bills"     count={3}  />
          <SidebarLink icon={<Activity size={18} className="text-purple-400" />} label="Medical"   count={6}  />
        </nav>

        {/* Storage card */}
        <div className="bg-blue-50 rounded-2xl p-4 mb-6">
          <div className="flex justify-between text-xs font-bold mb-2">
            <span>Storage used</span>
            <span className="text-slate-400">12.4 / 50 GB</span>
          </div>
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 w-[25%]" />
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">37.6 GB remaining</p>
        </div>

        <button className="flex items-center gap-3 text-slate-500 hover:text-blue-600 transition-colors px-3 py-2 text-sm font-semibold">
          <Settings size={20} /> Settings
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-slate-50">
          <div className="flex gap-8">
            {["Home", "About us", "Features", "Contact us"].map((item) => (
              <button
                key={item}
                className={`text-sm font-medium ${
                  item === "Home"
                    ? "text-blue-600 border-b-2 border-blue-600 pb-1"
                    : "text-slate-500"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Live user profile with dropdown */}
          <UserProfile />
        </header>

        {/* Dynamic view */}
        <div className="flex-1 overflow-y-auto bg-slate-50/30">
          {activeTab === "all-docs" ? (
            <div className="p-8">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="text-2xl font-bold">All documents</h2>
                  <p className="text-sm text-slate-400">24 documents</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button className="p-1.5 bg-white rounded-md shadow-sm text-slate-600">
                      <LayoutGrid size={16} />
                    </button>
                    <button className="p-1.5 text-slate-400">
                      <List size={16} />
                    </button>
                  </div>
                  <button className="flex items-center gap-2 text-sm font-semibold text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg bg-white">
                    Sort by Date <ChevronDown size={14} />
                  </button>
                </div>
              </div>

              {/* Search bar */}
              <div className="relative mb-8">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search documents..."
                  className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-4 mb-8">
                <button className="bg-[#1D4ED8] text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
                  <Plus size={20} /> Upload Document
                </button>
                <button className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-semibold bg-white hover:bg-slate-50 transition-all">
                  + New folder
                </button>
              </div>

              <Documents />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              Select &quot;All documents&quot; to view your files.
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
    {count && (
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
