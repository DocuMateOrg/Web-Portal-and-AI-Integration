import React from "react";
import { useNavigate } from "react-router-dom";

import {
  FileText,
  Search,
  Cloud,
  ShieldCheck,
  Zap,
  LayoutGrid,
  ArrowRight,
  Facebook,
  Twitter,
  Github,
  Phone,
  Mail,
  Scan,
} from "lucide-react";

const LandingPage = () => {
  
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-indigo-200 to-purple-200 font-sans text-black">
      {/* --- NAVBAR --- */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="bg-[#1D4ED8] p-1.5 rounded-lg">
            <FileText className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">DocuMate</span>
        </div>

        <div className="hidden md:flex items-center gap-8 bg-slate-50 px-8 py-2.5 rounded-full border border-slate-100">
          {["Home", "About us", "Features", "Contact us"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(" ", "")}`}
              className="text-sm font-medium text-slate-600 hover:text-[#1D4ED8] transition-colors"
            >
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
         
          <button
            onClick={() => navigate("/signup")}
            className="text-sm font-semibold text-[#1D4ED8] px-4 py-2 hover:bg-blue-50 rounded-lg transition-all"
          >
            SignUp
          </button>

          
          <button
            onClick={() => navigate("/login")}
            className="text-sm font-semibold bg-[#1D4ED8] text-white px-5 py-2 rounded-lg shadow-md shadow-blue-200 hover:bg-blue-700 transition-all"
          >
            Login
          </button>
        </div>
      </nav>

     
      <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-24 overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl lg:text-6xl font-bold leading-[1.1] mb-6">
              Document Digitization <br /> & <br />
              <span className="text-[#1D4ED8]">Simple Search Engine</span>
            </h1>

            <p className="text-lg text-slate-500 mb-10 max-w-lg leading-relaxed">
              Transform your physical documents into searchable digital assets.
              Find what you need in seconds with our powerful AI-driven search.
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
            
              <button
                onClick={() => navigate("/signup")}
                className="bg-[#60A5FA] hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-100"
              >
                Get Started Free <ArrowRight size={18} />
              </button>

              <button className="border border-slate-200 px-6 py-3 rounded-lg font-semibold hover:bg-slate-50 transition-all">
                Watch Demo
              </button>
            </div>

            <div className="flex gap-12 border-t border-slate-100 pt-8">
              <div>
                <div className="text-3xl font-bold">10K+</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">
                  Active Users
                </div>
              </div>

              <div className="border-x border-slate-100 px-12">
                <div className="text-3xl font-bold">1M+</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">
                  Docs Scanned
                </div>
              </div>

              <div>
                <div className="text-3xl font-bold">99%</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">
                  Accuracy Rate
                </div>
              </div>
            </div>
          </div>

          <div className="relative h-[500px] lg:h-[600px] flex items-center justify-center">
            {/* The Blue Background Blob from your design */}
            <div className="absolute top-0 right-[-10%] w-[120%] h-full rounded-l-[100px] -z-0 transform rotate-3" />

            {/* Left Phone (Scanning Interface) */}
            <div className="absolute z-10 transform -rotate-[12deg] -translate-x-32 scale-90 opacity-90 transition-transform hover:rotate-0 hover:z-40">
              <img 
                src="/assets/phoneleft.png" 
                alt="Scanning Interface" 
                className="w-[220px] lg:w-[280px] drop-shadow-2xl"
              />
            </div>

            {/* Center Phone (Main Dashboard) */}
            <div className="relative z-30 transform scale-100 drop-shadow-[0_35px_35px_rgba(0,0,0,0.25)]">
              <img 
                src="/assets/phone1.png" 
                alt="Main Dashboard" 
                className="w-[240px] lg:w-[300px]"
              />
            </div>

            {/* Right Phone (Recent Files) */}
            <div className="absolute z-20 transform rotate-[12deg] translate-x-32 scale-95 opacity-90 transition-transform hover:rotate-0 hover:z-40">
              <img 
                src="/assets/phoneright.png" 
                alt="Recent Documents" 
                className="w-[220px] lg:w-[280px] drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* --- FEATURES --- */}
      <section className="bg-[#F1F5F9] py-24 px-6">
        <div className="max-w-7xl mx-auto text-center mb-16">
          <h4 className="text-[#1D4ED8] font-bold text-4xl mb-4">FEATURES</h4>
          <h2 className="text-3xl font-bold mb-4">
            Everything you need to digitize your documents
          </h2>
          <p className="text-slate-500">
            Powerful features designed for effortless document management
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          <FeatureCard icon={<Scan />} title="Smart Scanning" desc="Advanced OCR with 99% accuracy." bgColor="bg-blue-200" />
          <FeatureCard icon={<Search />} title="Instant Search" desc="Find documents in milliseconds." bgColor="bg-blue-200" />
          <FeatureCard icon={<Cloud />} title="Cloud Storage" desc="Access files anytime, anywhere." bgColor="bg-blue-200" />
          <FeatureCard icon={<ShieldCheck />} title="Secure" desc="Enterprise-grade encryption." bgColor="bg-blue-200" />
          <FeatureCard icon={<Zap />} title="Fast Processing" desc="Batch scan hundreds of pages." bgColor="bg-blue-200" />
          <FeatureCard icon={<LayoutGrid />} title="Auto Organization" desc="AI-powered document sorting." bgColor="bg-blue-200" />
        </div>
      </section>

      {/* --- HOW IT WORKS SECTION --- */}
      <section className="py-24 px-6 max-w-7xl mx-auto bg-gradient-to-br from-blue-100 via-indigo-200 to-purple-200">
        <div className="text-center mb-20">
          <h4 className="text-[#1D4ED8] font-bold text-4xl uppercase tracking-[0.05em] mb-4">How It Works</h4>
          <h2 className="text-4xl lg:text-3xl font-bold mb-4">Three simple steps to digital freedom</h2>
          <p className="text-slate-500 font-medium">Get started in minutes and experience the future of document management</p>
        </div>

        <div className="grid md:grid-cols-3 gap-12 relative">
          {/* Connector Line */}
          <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-slate-100 -z-0" />
          
          <Step 
            number="01" 
            title="Scan or Import" 
            icon={<Scan size={32} />} 
            desc="Take a photo with your phone or upload existing documents from your device"
          />
          <Step 
            number="02" 
            title="AI processing" 
            icon={<FileText size={32} />} 
            desc="Our AI extracts text, identifies key information, and organizes your documents."
          />
          <Step 
            number="03" 
            title="Search and Access" 
            icon={<Search size={32} />} 
            desc="Find any document instantly with powerful search and smart filters."
          />
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-gradient-to-br from-blue-100 via-indigo-200 to-purple-200 pt-16 pb-8 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-[#1D4ED8] p-1.5 rounded-lg">
                <FileText className="text-white w-5 h-5" />
              </div>
              <span className="text-lg font-bold">DocuMate</span>
            </div>
            <p className="text-sm text-slate-500 mb-6">Document Manager</p>
            <div className="flex gap-4">
              <Facebook className="w-5 h-5 text-slate-600 cursor-pointer hover:text-blue-600" />
              <Twitter className="w-5 h-5 text-slate-600 cursor-pointer hover:text-blue-400" />
              <Github className="w-5 h-5 text-slate-600 cursor-pointer hover:text-black" />
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-6">Company</h4>
            <ul className="space-y-3 text-sm text-slate-600 font-medium">
              <li className="hover:text-blue-600 cursor-pointer">Home</li>
              <li className="hover:text-blue-600 cursor-pointer">About Us</li>
              <li className="hover:text-blue-600 cursor-pointer">Features</li>
              <li className="hover:text-blue-600 cursor-pointer">Contact Us</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6">Contact</h4>
            <ul className="space-y-4 text-sm text-slate-600 font-medium">
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4" /> +94 712567890
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4" /> documate@gmail.com
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-200 flex flex-col md:row justify-between gap-4 text-xs text-slate-500 font-medium items-center">
          <p >© 2025 DocuMate. All rights reserved</p>
          <div className="flex gap-8 ">
            <span className="cursor-pointer hover:underline">Privacy Policy</span>
            <span className="cursor-pointer hover:underline">Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
    
  
  );
};

const FeatureCard = ({ icon, title, desc, bgColor = "bg-white" }) => (
  <div className={`${bgColor} p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}>
    <div className="bg-white/60 w-12 h-12 rounded-xl flex items-center justify-center mb-6 shadow-sm">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-3 text-slate-900">{title}</h3>
    <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
  </div>
);
const Step = ({ number, title, icon, desc }) => (
  <div className="text-center group relative z-10">
    <div className="bg-[#A5D1FF] w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-100 group-hover:scale-110 transition-transform duration-300 text-[#1D4ED8]">
      {icon}
    </div>
    <div className="text-4xl font-black text-slate-100 mb-2">{number}</div>
    <h3 className="text-2xl font-extrabold mb-4">{title}</h3>
    <p className="text-slate-500 text-sm max-w-[250px] mx-auto leading-relaxed">{desc}</p>
  </div>
);

export default LandingPage;
