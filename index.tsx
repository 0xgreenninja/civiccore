import React, { useState, useRef, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Connection } from '@solana/web3.js';

// --- Types & Constants ---
export interface Milestone {
  id: string;
  index: number;
  description: string;
  amount: number;
  proofHash: string | null;
  approvals: string[];
  isReleased: boolean;
  status: 'pending' | 'submitted' | 'approved' | 'released';
  confidenceScore?: number;
}

export interface Vault {
  id: string;
  name: string;
  description: string;
  authority: string;
  totalAmount: number;
  releasedAmount: number;
  milestones: Milestone[];
  category: 'Education' | 'Healthcare' | 'Agriculture' | 'Infrastructure';
  location: string;
  createdAt: number;
}

export interface UserWallet {
  publicKey: string | null;
  connected: boolean;
  balance: number;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Education: <i className="fas fa-graduation-cap text-orange-500"></i>,
  Healthcare: <i className="fas fa-hospital text-green-600"></i>,
  Agriculture: <i className="fas fa-seedling text-green-700"></i>,
  Infrastructure: <i className="fas fa-bridge text-blue-500"></i>,
};

// --- Services ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const verifyImpactProof = async (description: string, files: {data: string, mimeType: string}[] = []) => {
  const model = 'gemini-3-pro-preview';
  const systemInstruction = `
    Act as a Senior Forensic Data Auditor specializing in blockchain impact verification.
    Analyze visual evidence for consistency, check geo-tagging indicators, and verify metadata forests for manipulation.
    Output Strictly JSON with: isValid (boolean), confidenceScore (0-100), hash (string), analysis (string), 
    detectedGeoLocation (object: {latitude, longitude, locationName, isConsistent}), forensicFlags (array of strings).
  `;

  const parts = [
    { text: `Milestone Claim: "${description}"` },
    ...files.map(file => ({ inlineData: { mimeType: file.mimeType, data: file.data } }))
  ];

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isValid: { type: Type.BOOLEAN },
          confidenceScore: { type: Type.NUMBER },
          hash: { type: Type.STRING },
          analysis: { type: Type.STRING },
          detectedGeoLocation: { 
            type: Type.OBJECT,
            properties: { latitude: { type: Type.NUMBER }, longitude: { type: Type.NUMBER }, locationName: { type: Type.STRING }, isConsistent: { type: Type.BOOLEAN } },
            required: ["isConsistent"]
          },
          forensicFlags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["isValid", "confidenceScore", "hash", "analysis", "detectedGeoLocation"]
      }
    }
  });

  const result = JSON.parse(response.text || "{}");
  return {
    isValid: result.isValid,
    confidenceScore: result.confidenceScore,
    hash: result.hash,
    analysis: result.analysis,
    metadata: {
      gps: result.detectedGeoLocation.locationName || `lat: ${result.detectedGeoLocation.latitude || 0}, lng: ${result.detectedGeoLocation.longitude || 0}`,
      timestamp: Date.now(),
      forensicFlags: result.forensicFlags
    }
  };
};

// --- Components ---

const Header = ({ wallet, onConnect, userRole, onToggleRole, currentView, onNavigate }: any) => (
  <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm glass">
    <div className="container mx-auto px-4 h-20 flex items-center justify-between">
      <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate(userRole === 'validator' ? 'validator' : 'dashboard')}>
        <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-civic transform hover:rotate-6 transition-transform">
          <i className="fas fa-landmark text-white text-2xl"></i>
        </div>
        <div className="hidden sm:block">
          <h1 className="text-2xl font-black tracking-tighter">Civic<span className="text-orange-500">Core</span></h1>
          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest -mt-1">Impact Protocol</p>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        <button 
          onClick={onToggleRole}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
            userRole === 'validator' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'
          }`}
        >
          <i className={`fas ${userRole === 'validator' ? 'fa-shield-alt' : 'fa-seedling'}`}></i>
          <span>{userRole === 'validator' ? 'Validator' : 'Maker'}</span>
        </button>

        {wallet.connected ? (
          <div className="flex items-center space-x-4">
            <div className="hidden md:block text-right">
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-tighter">USDC Balance</p>
              <p className="text-sm font-black text-gray-900">${wallet.balance.toFixed(2)}</p>
            </div>
            <div className="bg-gray-900 px-5 py-2.5 rounded-2xl border border-gray-800 flex items-center space-x-3 shadow-xl">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-black text-white font-mono">{wallet.publicKey?.substring(0, 6)}...</span>
            </div>
          </div>
        ) : (
          <button onClick={onConnect} className="bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl">
            Connect
          </button>
        )}
      </div>
    </div>
  </header>
);

const Dashboard = ({ vaults, onSelectVault, onCreateClick }: any) => {
  const chartData = [
    { name: 'Jan', amount: 4000 }, { name: 'Feb', amount: 3000 }, { name: 'Mar', amount: 2000 }, 
    { name: 'Apr', amount: 2780 }, { name: 'May', amount: 1890 }, { name: 'Jun', amount: 2390 }, { name: 'Jul', amount: 3490 }
  ];

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-civic card-hover">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Staked Impact</p>
          <h3 className="text-4xl font-black text-gray-900">${vaults.reduce((a, v) => a + v.totalAmount, 0).toLocaleString()}</h3>
          <p className="text-green-600 text-[10px] font-black mt-2 uppercase">On-Chain Locked <i className="fas fa-lock ml-1"></i></p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-civic card-hover">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Verified Payouts</p>
          <h3 className="text-4xl font-black text-gray-900">${vaults.reduce((a, v) => a + v.releasedAmount, 0).toLocaleString()}</h3>
          <p className="text-blue-600 text-[10px] font-black mt-2 uppercase">Proof Authenticated <i className="fas fa-check-circle ml-1"></i></p>
        </div>
        <div className="bg-gray-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
          <div className="relative z-10">
            <h3 className="text-2xl font-black text-white mt-2 leading-tight">{vaults.length} Active Vaults</h3>
            <button onClick={onCreateClick} className="mt-6 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
              Initialize New Vault
            </button>
          </div>
          <i className="fas fa-globe-africa absolute -bottom-8 -right-8 text-white/5 text-[180px] group-hover:rotate-12 transition-transform duration-700"></i>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <h4 className="font-black text-gray-900 mb-8 uppercase tracking-widest text-sm"><i className="fas fa-chart-line mr-3 text-orange-500"></i>Impact Distribution</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs><linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FF8C00" stopOpacity={0.2}/><stop offset="95%" stopColor="#FF8C00" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} />
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}} />
                <Area type="monotone" dataKey="amount" stroke="#FF8C00" strokeWidth={4} fillOpacity={1} fill="url(#colorAmt)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-center text-center">
           <i className="fas fa-microchip text-orange-500 text-5xl mb-6 pulse-soft"></i>
           <h4 className="text-xl font-black text-gray-900 mb-2">Civic Intelligence</h4>
           <p className="text-sm text-gray-500 leading-relaxed font-medium">Real-time auditing nodes are currently monitoring 5 locations in Kenya.</p>
           <button className="mt-8 text-[10px] font-black text-orange-600 uppercase tracking-widest hover:text-orange-700 transition-colors">Protocol Live Feed <i className="fas fa-arrow-right ml-2"></i></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {vaults.map((vault: Vault) => (
          <div key={vault.id} onClick={() => onSelectVault(vault)} className="group bg-white rounded-[3rem] border border-gray-100 p-8 card-hover cursor-pointer relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                  {CATEGORY_ICONS[vault.category]}
                </div>
                <div>
                  <h5 className="text-xl font-black text-gray-900 group-hover:text-orange-500 transition-colors">{vault.name}</h5>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest"><i className="fas fa-map-marker-alt mr-2 text-orange-500"></i>{vault.location}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-gray-900">${vault.totalAmount.toLocaleString()}</p>
                <p className="text-[9px] text-gray-400 font-black uppercase tracking-tighter">USDC Secured</p>
              </div>
            </div>
            <div className="w-full bg-gray-50 h-3 rounded-full overflow-hidden mb-4">
              <div className="bg-green-600 h-full transition-all duration-1000" style={{ width: `${(vault.releasedAmount / vault.totalAmount) * 100}%` }}></div>
            </div>
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
              <span className="text-green-600">{Math.round((vault.releasedAmount / vault.totalAmount) * 100)}% Verified</span>
              <span className="text-gray-400">{vault.milestones.length} Milestones</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CreateVault = ({ onSubmit, onCancel }: any) => {
  const [formData, setFormData] = useState({ name: '', description: '', totalAmount: 0, category: 'Education' as any, location: '', milestoneCount: 3 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const milestones = Array.from({ length: formData.milestoneCount }).map((_, i) => ({
      id: Math.random().toString(36).substring(7), index: i, description: `Milestone ${i+1}: Targeted Goal for ${formData.name}`,
      amount: formData.totalAmount / formData.milestoneCount, proofHash: null, approvals: [], isReleased: false, status: 'pending' as const
    }));
    onSubmit({ id: Math.random().toString(36).substring(7), ...formData, authority: 'DEMO_USER', releasedAmount: 0, createdAt: Date.now(), milestones });
  };

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <div className="bg-white rounded-[3.5rem] shadow-2xl border border-gray-100 overflow-hidden">
        <div className="bg-gray-900 p-12 text-white relative">
          <h2 className="text-4xl font-black tracking-tight mb-2">Initialize Impact Vault</h2>
          <p className="text-gray-400 font-medium italic">Programmable escrow logic for transparent community funding.</p>
          <i className="fas fa-code-branch absolute top-12 right-12 text-white/5 text-[120px]"></i>
        </div>
        <form onSubmit={handleSubmit} className="p-12 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-3">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Project Narrative</label>
               <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Solar Borehole Node-1" className="w-full p-5 border border-gray-100 rounded-2xl text-sm font-bold bg-gray-50/50" />
             </div>
             <div className="space-y-3">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">USDC Commitment</label>
               <input type="number" required value={formData.totalAmount || ''} onChange={e => setFormData({...formData, totalAmount: Number(e.target.value)})} placeholder="50000" className="w-full p-5 border border-gray-100 rounded-2xl text-sm font-bold bg-gray-50/50" />
             </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Impact Mechanics</label>
            <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Describe how the programmable releases will improve community resilience..." className="w-full h-32 p-5 border border-gray-100 rounded-2xl text-sm font-bold bg-gray-50/50 resize-none" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} className="p-5 border border-gray-100 rounded-2xl bg-gray-50/50 text-sm font-bold outline-none">
              <option>Education</option><option>Healthcare</option><option>Agriculture</option><option>Infrastructure</option>
            </select>
            <input type="text" required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Region / City" className="p-5 border border-gray-100 rounded-2xl bg-gray-50/50 text-sm font-bold" />
            <input type="number" min="1" max="10" value={formData.milestoneCount} onChange={e => setFormData({...formData, milestoneCount: Number(e.target.value)})} className="p-5 border border-gray-100 rounded-2xl bg-gray-50/50 text-sm font-bold" />
          </div>
          <div className="flex gap-4 pt-8">
            <button type="button" onClick={onCancel} className="flex-1 py-5 text-sm font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors">Cancel</button>
            <button type="submit" className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white py-5 rounded-[2rem] text-sm font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 transition-all">Secure Protocol Vault</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Consolidating ProjectDetails for clean architecture
const ProjectDetails = ({ vault, userRole, onBack, onUpdate }: any) => {
  const [activeTab, setActiveTab] = useState('milestones');
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [proofText, setProofText] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<{data: string, mimeType: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const prompt = `Synthesize an impact report for project "${vault.name}" in ${vault.location}. Total ${vault.totalAmount} USDC. Use Markdown with high-end headers. Detail verified milestones and trust scores.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
      setAiReport(response.text || "Report generation failed.");
    } finally { setGeneratingReport(false); }
  };

  const handleAudit = async (milestone: Milestone) => {
    setSubmitting(milestone.id);
    try {
      const verification = await verifyImpactProof(proofText, evidenceFiles);
      if (!verification.isValid) return alert(`Rejected: ${verification.analysis}`);
      const updated = vault.milestones.map(m => m.id === milestone.id ? { ...m, status: 'submitted' as const, proofHash: verification.hash, confidenceScore: verification.confidenceScore, description: JSON.stringify({ summary: verification.analysis, gps: verification.metadata.gps, flags: verification.metadata.forensicFlags }) } : m);
      onUpdate({ ...vault, milestones: updated });
      alert("AI Audit Complete. Consensus Initiated.");
    } finally { setSubmitting(null); }
  };

  const handleRelease = (milestone: Milestone) => {
    const updated = vault.milestones.map(m => m.id === milestone.id ? { ...m, isReleased: true, status: 'released' as const } : m);
    onUpdate({ ...vault, milestones: updated, releasedAmount: vault.releasedAmount + milestone.amount });
    alert("Funds Released via Smart Contract.");
  };

  return (
    <div className="space-y-10 animate-fade-in">
      <button onClick={onBack} className="bg-white px-8 py-3 rounded-2xl border border-gray-100 shadow-sm text-xs font-black uppercase tracking-widest text-gray-500 hover:text-orange-500 transition-colors">
        <i className="fas fa-arrow-left mr-2"></i> Back
      </button>

      <div className="bg-white rounded-[3.5rem] p-12 border border-gray-100 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-orange-500/5 rounded-full -mr-[200px] -mt-[200px]"></div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12 relative z-10">
          <div className="flex items-center space-x-10">
            <div className="w-32 h-32 bg-gray-50 rounded-[3rem] flex items-center justify-center text-6xl shadow-inner border border-gray-100 text-orange-500">
              {CATEGORY_ICONS[vault.category]}
            </div>
            <div className="space-y-4">
              <h2 className="text-5xl font-black text-gray-900 tracking-tighter">{vault.name}</h2>
              <p className="text-xl text-gray-500 italic max-w-xl font-medium">{vault.description}</p>
              <div className="flex gap-4">
                <span className="bg-gray-50 px-5 py-2 rounded-full border border-gray-100 text-[10px] font-black uppercase tracking-widest"><i className="fas fa-map-marker-alt mr-2 text-orange-500"></i>{vault.location}</span>
                <span className="bg-green-50 px-5 py-2 rounded-full border border-green-100 text-[10px] font-black uppercase tracking-widest text-green-700">Verified Protocol</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-900 p-12 rounded-[3.5rem] shadow-2xl text-white min-w-[360px]">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Total Liquidity</p>
            <div className="flex items-baseline space-x-3">
              <span className="text-6xl font-black">${vault.releasedAmount.toLocaleString()}</span>
              <span className="text-gray-500 text-lg font-bold">/ ${vault.totalAmount.toLocaleString()}</span>
            </div>
            <div className="mt-8 w-full bg-gray-800 h-3 rounded-full overflow-hidden">
               <div className="bg-orange-500 h-full shadow-[0_0_20px_rgba(255,140,0,0.5)] transition-all duration-1000" style={{ width: `${(vault.releasedAmount / vault.totalAmount) * 100}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-200 bg-white rounded-[2rem] p-2 shadow-sm px-8 gap-8 overflow-x-auto no-scrollbar">
        {['milestones', 'report', 'audit'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`py-6 px-4 text-[10px] font-black uppercase tracking-widest border-b-4 transition-all whitespace-nowrap ${activeTab === tab ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            {tab.replace('milestones', 'Evidence Stream').replace('report', 'Impact Summary').replace('audit', 'Protocol Audit')}
          </button>
        ))}
      </div>

      {activeTab === 'milestones' && (
        <div className="space-y-8">
          {vault.milestones.map((milestone: Milestone, idx: number) => {
             const aiData = milestone.proofHash ? JSON.parse(milestone.description) : null;
             return (
               <div key={milestone.id} className="bg-white rounded-[3.5rem] border border-gray-100 p-12 flex flex-col lg:flex-row gap-12 relative card-hover">
                 <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center font-black text-3xl text-orange-500 border border-gray-100 flex-shrink-0">{idx + 1}</div>
                 <div className="flex-1 space-y-6">
                   <div className="flex justify-between items-center">
                     <div>
                       <h4 className="text-3xl font-black text-gray-900 tracking-tight">{milestone.proofHash ? 'Assessed Milestone' : milestone.description}</h4>
                       <p className="text-sm font-black text-orange-500 mt-2 uppercase tracking-widest">${milestone.amount.toLocaleString()} USDC Allocated</p>
                     </div>
                     <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${milestone.isReleased ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {milestone.status === 'released' ? 'Disbursed' : milestone.status === 'submitted' ? 'Validating' : 'Pending Proof'}
                     </span>
                   </div>

                   {milestone.status === 'pending' && userRole === 'maker' && (
                     <div className="bg-gray-50 rounded-[2.5rem] p-10 space-y-6 shadow-inner">
                        <textarea value={proofText} onChange={(e) => setProofText(e.target.value)} placeholder="Provide evidence summary and data logs..." className="w-full h-32 p-6 rounded-2xl border border-gray-100 bg-white font-bold text-sm outline-none" />
                        <div className="flex justify-between items-center">
                           <button onClick={() => fileInputRef.current?.click()} className="text-xs font-black text-orange-600 uppercase tracking-widest flex items-center"><i className="fas fa-camera mr-2"></i> Attach Proof</button>
                           <input type="file" ref={fileInputRef} className="hidden" />
                           <button onClick={() => handleAudit(milestone)} disabled={submitting === milestone.id} className="bg-gray-900 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">
                             {submitting === milestone.id ? <i className="fas fa-atom fa-spin mr-2"></i> : null} AI Forensic Audit
                           </button>
                        </div>
                     </div>
                   )}

                   {milestone.proofHash && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-orange-50/50 p-8 rounded-[2.5rem] border border-orange-100">
                           <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2">AI Forensic Result</p>
                           <p className="text-sm font-bold text-gray-800 leading-relaxed italic">{aiData?.summary}</p>
                        </div>
                        <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 flex flex-col justify-between">
                           <div className="flex justify-between items-center mb-4">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Trust Integrity</span>
                              <span className="text-2xl font-black text-green-600">{milestone.confidenceScore}%</span>
                           </div>
                           <div className="space-y-2">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Location: {aiData?.gps}</p>
                              <code className="text-[8px] block truncate text-gray-400 font-mono">{milestone.proofHash}</code>
                           </div>
                           {userRole === 'maker' && milestone.status === 'submitted' && (
                             <button onClick={() => handleRelease(milestone)} className="mt-6 w-full bg-green-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-100">Claim Payout</button>
                           )}
                        </div>
                     </div>
                   )}
                 </div>
               </div>
             );
          })}
        </div>
      )}

      {activeTab === 'report' && (
        <div className="bg-white rounded-[3.5rem] p-16 shadow-xl border border-gray-100 animate-slide-up">
           <div className="flex justify-between items-center mb-12">
              <h3 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">Impact Narrative</h3>
              <button onClick={handleGenerateReport} disabled={generatingReport} className="bg-orange-500 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">
                 {generatingReport ? <i className="fas fa-brain fa-spin mr-2"></i> : <i className="fas fa-magic mr-2"></i>} Generate Summary
              </button>
           </div>
           {aiReport ? (
             <div className="prose prose-orange max-w-none text-gray-700 bg-gray-50 p-12 rounded-[2.5rem] border border-gray-100 font-medium leading-relaxed whitespace-pre-wrap">
               {aiReport}
             </div>
           ) : (
             <div className="p-32 text-center border-2 border-dashed border-gray-200 rounded-[2.5rem] text-gray-300">
               <i className="fas fa-file-invoice text-[80px] mb-8 opacity-20"></i>
               <p className="text-lg font-black uppercase tracking-widest">Awaiting Data Synthesis</p>
             </div>
           )}
        </div>
      )}
    </div>
  );
};

const ValidatorPortal = ({ vaults, onSelectVault }: any) => {
  const pending = vaults.flatMap((v: Vault) => v.milestones.filter(m => m.status === 'submitted').map(m => ({ vault: v, milestone: m })));
  return (
    <div className="space-y-10 animate-fade-in">
       <div className="bg-white p-12 rounded-[3.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-12">
          <div>
             <h2 className="text-5xl font-black text-gray-900 tracking-tighter italic">CONSENSUS<span className="text-blue-600">.NODE</span></h2>
             <p className="text-lg text-gray-500 mt-2 font-medium italic">Validate ground-truth impact proofs and secure protocol releases.</p>
          </div>
          <div className="flex gap-6">
             <div className="bg-blue-50 px-10 py-5 rounded-3xl border border-blue-100 text-center">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Queue</p>
                <p className="text-4xl font-black text-blue-900">{pending.length}</p>
             </div>
             <div className="bg-green-50 px-10 py-5 rounded-3xl border border-green-100 text-center">
                <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Reputation</p>
                <p className="text-4xl font-black text-green-900">9.92</p>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 gap-8">
          {pending.length === 0 ? (
            <div className="bg-white rounded-[3.5rem] p-32 text-center border-2 border-dashed border-gray-200">
               <i className="fas fa-shield-check text-[100px] text-gray-100 mb-8"></i>
               <h4 className="text-2xl font-black text-gray-400 uppercase tracking-widest">Quorum Maintained</h4>
               <p className="text-gray-400 mt-2">All submitted proofs have been signed and committed.</p>
            </div>
          ) : (
            pending.map(({ vault, milestone }: any) => (
              <div key={milestone.id} onClick={() => onSelectVault(vault)} className="bg-white p-10 rounded-[3rem] border-l-[16px] border-blue-500 shadow-sm card-hover cursor-pointer flex justify-between items-center">
                 <div className="flex items-center space-x-8">
                    <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center text-4xl text-blue-500"><i className="fas fa-satellite-dish"></i></div>
                    <div>
                       <h5 className="text-2xl font-black text-gray-900 mb-1">{vault.name}</h5>
                       <p className="text-sm font-black text-blue-500 uppercase tracking-widest">Milestone Assess #0{milestone.index + 1}</p>
                    </div>
                 </div>
                 <div className="text-right flex items-center space-x-8">
                    <div>
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Impact Confidence</p>
                       <p className="text-3xl font-black text-gray-900">{milestone.confidenceScore}%</p>
                    </div>
                    <button className="bg-gray-900 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">Execute Sig</button>
                 </div>
              </div>
            ))
          )}
       </div>
    </div>
  );
};

// --- App Entry Point ---

const App = () => {
  const [view, setView] = useState('dashboard');
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null);
  const [userRole, setUserRole] = useState<'maker' | 'validator'>('maker');
  const [wallet, setWallet] = useState<UserWallet>({ publicKey: null, connected: false, balance: 0 });

  const [vaults, setVaults] = useState<Vault[]>([
    {
      id: 'v1', name: 'Nairobi Clean Water Node-5', description: 'Sustainable borehole drilling and kiosk installation in Kibera.',
      authority: 'DEMO_USER', totalAmount: 50000, releasedAmount: 20000, category: 'Infrastructure', location: 'Nairobi, Kenya', createdAt: Date.now() - 864000000,
      milestones: [
        { id: 'm1', index: 0, description: 'Geological Audit', amount: 10000, proofHash: 'hash_abc', approvals: ['val1','val2','val3'], isReleased: true, status: 'released', confidenceScore: 98 },
        { id: 'm2', index: 1, description: 'Borehole Sinking', amount: 10000, proofHash: 'hash_def', approvals: ['val1','val3','val4'], isReleased: true, status: 'released', confidenceScore: 95 },
        { id: 'm3', index: 2, description: 'Tank Commissioning', amount: 10000, proofHash: null, approvals: [], isReleased: false, status: 'pending' },
        { id: 'm4', index: 3, description: 'Final Distribution Network', amount: 20000, proofHash: null, approvals: [], isReleased: false, status: 'pending' },
      ]
    },
    {
       id: 'v2', name: 'Mombasa Tech Hub Laptops', description: 'Providing high-end workstations for local developer talent.',
       authority: 'DEMO_USER', totalAmount: 25000, releasedAmount: 0, category: 'Education', location: 'Mombasa, Kenya', createdAt: Date.now() - 172800000,
       milestones: [
         { id: 'm21', index: 0, description: 'Hardware Procurement', amount: 15000, proofHash: null, approvals: [], isReleased: false, status: 'pending' },
         { id: 'm22', index: 1, description: 'Lab Setup', amount: 10000, proofHash: null, approvals: [], isReleased: false, status: 'pending' },
       ]
    }
  ]);

  const connectWallet = () => {
    setWallet({ publicKey: 'CivicCoreUser_0x8x5k2l9p4m1', connected: true, balance: userRole === 'validator' ? 420.50 : 15200.45 });
  };

  const handleCreateVault = (nv: Vault) => { setVaults([nv, ...vaults]); setView('dashboard'); };
  const toggleRole = () => {
    const nr = userRole === 'maker' ? 'validator' : 'maker';
    setUserRole(nr);
    setView(nr === 'validator' ? 'validator' : 'dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 selection:bg-orange-100">
      <Header wallet={wallet} onConnect={connectWallet} userRole={userRole} onToggleRole={toggleRole} currentView={view} onNavigate={setView} />
      <main className="flex-1 container mx-auto px-6 py-12">
        {view === 'dashboard' && <Dashboard vaults={vaults} onSelectVault={(v: Vault) => { setSelectedVault(v); setView('details'); }} onCreateClick={() => setView('create')} />}
        {view === 'create' && <CreateVault onSubmit={handleCreateVault} onCancel={() => setView('dashboard')} />}
        {view === 'details' && selectedVault && <ProjectDetails vault={selectedVault} userRole={userRole} onBack={() => setView(userRole === 'validator' ? 'validator' : 'dashboard')} onUpdate={(uv: Vault) => { setVaults(vaults.map(v => v.id === uv.id ? uv : v)); setSelectedVault(uv); }} />}
        {view === 'validator' && <ValidatorPortal vaults={vaults} onSelectVault={(v: Vault) => { setSelectedVault(v); setView('details'); }} />}
      </main>
      <footer className="bg-gray-900 text-white py-20">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-2 space-y-6">
            <h2 className="text-3xl font-black tracking-tighter">Civic<span className="text-orange-500">Core</span></h2>
            <p className="text-gray-400 font-medium max-w-sm italic">Programmable impact infrastructure for a transparent future. Every dollar verified. Every milestone on-chain.</p>
          </div>
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Ecosystem</h4>
            <ul className="space-y-2 text-sm font-bold text-gray-500"><li><a href="#" className="hover:text-white transition-colors">Arweave Audits</a></li><li><a href="#" className="hover:text-white transition-colors">Solana Devnet</a></li><li><a href="#" className="hover:text-white transition-colors">Gemini Nodes</a></li></ul>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">&copy; 2025 CivicCore Protocol</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);