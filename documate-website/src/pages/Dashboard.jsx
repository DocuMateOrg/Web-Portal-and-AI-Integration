import React, { useState } from 'react';
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
  Plus
} from 'lucide-react';
import Documents from './Documents'; 

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('all-docs');

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-100 via-indigo-200 to-purple-200 font-sans text-slate-900">
      {/* --- SIDEBAR --- */}
      <aside className="w-64 border-r border-slate-100 flex flex-col p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-[#1D4ED8] p-2 rounded-xl shadow-lg shadow-blue-200">
            <FileText className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-none">DocuMate</h1>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Document Manager</span>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          <SidebarLink 
            icon={<LayoutGrid size={20} />} 
            label="All documents" 
            count={24} 
            active={activeTab === 'all-docs'}
            onClick={() => setActiveTab('all-docs')}
          />
          <SidebarLink 
            icon={<Clock size={20} />} 
            label="Recent activity" 
            active={activeTab === 'recent'}
            onClick={() => setActiveTab('recent')}
          />
          <SidebarLink 
            icon={<Star size={20} />} 
            label="Starred" 
            count={5} 
            active={activeTab === 'starred'}
            onClick={() => setActiveTab('starred')}
          />

          <div className="pt-8 pb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Folders</span>
          </div>
          
          <SidebarLink icon={<Receipt size={18} className="text-red-400" />} label="Receipts" count={12} />
          <SidebarLink icon={<Briefcase size={18} className="text-green-400" />} label="Contracts" count={5} />
          <SidebarLink icon={<FileCode size={18} className="text-cyan-400" />} label="Bills" count={3} />
          <SidebarLink icon={<Activity size={18} className="text-purple-400" />} label="Medical" count={6} />
        </nav>

        {/* Storage Card */}
        <div className="bg-blue-50 rounded-2xl p-4 mb-6">
          <div className="flex justify-between text-xs font-bold mb-2">
            <span>Storage used</span>
            <span className="text-slate-400">12.4/50 GB</span>
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

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-slate-50">
          <div className="flex gap-8">
            {['Home', 'About us', 'Features', 'Contact us'].map(item => (
              <button key={item} className={`text-sm font-medium ${item === 'Home' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-slate-500'}`}>
                {item}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                 <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
              </div>
            </div>
            <ChevronDown size={16} className="text-slate-400" />
          </div>
        </header>

        {/* Dynamic View Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50/30">
          {activeTab === 'all-docs' ? (
            <div className="p-8">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="text-2xl font-bold">All documents</h2>
                  <p className="text-sm text-slate-400">24 documents</p>
                </div>
                <div className="flex items-center gap-3">
                   <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button className="p-1.5 bg-white rounded-md shadow-sm text-slate-600"><LayoutGrid size={16} /></button>
                      <button className="p-1.5 text-slate-400"><List size={16} /></button>
                   </div>
                   <button className="flex items-center gap-2 text-sm font-semibold text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg bg-white">
                     Sort by Date <ChevronDown size={14} />
                   </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Search documents..." 
                  className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mb-8">
                <button className="bg-[#1D4ED8] text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
                  <Plus size={20} /> Upload Document
                </button>
                <button className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-semibold bg-white hover:bg-slate-50 transition-all">
                  + New folder
                </button>
              </div>

              {/* Render your Documents.jsx content here */}
              <Documents />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              Select "All documents" to view your files.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Sub-component for Sidebar Links
const SidebarLink = ({ icon, label, count, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all ${
      active ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
    }`}
  >
    <div className="flex items-center gap-3 font-semibold text-sm">
      {icon}
      {label}
    </div>
    {count && (
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${active ? 'bg-blue-100 text-blue-600' : 'text-slate-300'}`}>
        {count}
      </span>
    )}
  </button>
);

export default Dashboard;