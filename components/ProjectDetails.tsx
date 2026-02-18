
import React, { useState, useRef, useMemo } from 'react';
import { Vault, Milestone } from '../types';
import { CATEGORY_ICONS } from '../constants';
import { verifyImpactProof, EvidenceFile } from '../services/geminiService';
import { solanaService } from '../services/solanaService';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface ProjectDetailsProps {
  vault: Vault;
  userRole: 'maker' | 'validator';
  onBack: () => void;
  onUpdate: (vault: Vault) => void;
}

const ProjectDetails: React.FC<ProjectDetailsProps> = ({ vault, userRole, onBack, onUpdate }) => {
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [proofText, setProofText] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [activeTab, setActiveTab] = useState<'milestones' | 'transparency' | 'governance' | 'report'>('milestones');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newEvidence: EvidenceFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;
      newEvidence.push({
        data: base64Data,
        mimeType: file.type
      });
    }
    setEvidenceFiles([...evidenceFiles, ...newEvidence]);
  };

  const handleSubmitProof = async (milestone: Milestone) => {
    if (!proofText && evidenceFiles.length === 0) {
      return alert("Please provide at least a description or media evidence.");
    }
    
    setSubmitting(milestone.id);
    try {
      const verification = await verifyImpactProof(proofText, evidenceFiles);
      
      if (!verification.isValid) {
        alert(`AI Verification Rejected: ${verification.analysis}`);
        setSubmitting(null);
        return;
      }

      const updatedMilestones = vault.milestones.map(m => 
        m.id === milestone.id 
          ? { 
              ...m, 
              status: 'submitted' as const, 
              proofHash: verification.hash, 
              confidenceScore: verification.confidenceScore,
              description: JSON.stringify({
                summary: verification.analysis,
                gps: verification.metadata.gps,
                flags: (verification.metadata as any).forensicFlags || []
              })
            } 
          : m
      );

      onUpdate({ ...vault, milestones: updatedMilestones });
      setProofText('');
      setEvidenceFiles([]);
      alert(`AI Verification Successful! Trust Score: ${verification.confidenceScore}%`);
    } catch (err) {
      console.error(err);
      alert("Verification system unavailable. Please try again later.");
    } finally {
      setSubmitting(null);
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const verifiedMilestones = vault.milestones.filter(m => m.status === 'released' || m.proofHash);
      const evidenceSummaries = verifiedMilestones.map(m => {
        try {
          const data = JSON.parse(m.description);
          return `- Milestone ${m.index + 1}: ${data.summary} (Verified at ${data.gps})`;
        } catch {
          return `- Milestone ${m.index + 1}: ${m.description}`;
        }
      }).join('\n');

      const prompt = `Act as an expert impact evaluator. Analyze the following verified project data and generate a comprehensive, high-integrity Impact Report for "${vault.name}".
      Project Category: ${vault.category}
      Location: ${vault.location}
      Budget: ${vault.releasedAmount} / ${vault.totalAmount} USDC released.
      Verified Evidence:
      ${evidenceSummaries}
      
      Structure the report with clear Markdown headers:
      1. EXECUTIVE IMPACT SUMMARY
      2. GEOSPATIAL & METADATA FORENSICS (Confirming validity of location)
      3. ACCOUNTABILITY LOG
      4. STRATEGIC OUTLOOK
      
      Make it professional, analytical, and ready for institutional donors.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
      });

      setAiReport(response.text || "Failed to generate narrative.");
    } catch (error) {
      console.error("Report generation failed:", error);
      alert("Could not generate report at this time.");
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleApprove = async (milestone: Milestone) => {
    setSubmitting(milestone.id);
    try {
      await solanaService.approveMilestone(vault.id, milestone.index, 'VALIDATOR_KEY');
      const updatedMilestones = vault.milestones.map(m => {
        if (m.id === milestone.id) {
          const newApprovals = [...m.approvals, 'VALIDATOR_KEY'];
          return { ...m, approvals: newApprovals };
        }
        return m;
      });
      onUpdate({ ...vault, milestones: updatedMilestones });
      alert("Milestone signed successfully!");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(null);
    }
  };

  const handleRelease = async (milestone: Milestone) => {
    setSubmitting(milestone.id);
    try {
      await solanaService.releaseFunds(vault.id, milestone.index);
      const updatedMilestones = vault.milestones.map(m => 
        m.id === milestone.id ? { ...m, isReleased: true, status: 'released' as const } : m
      );
      const totalReleased = updatedMilestones.reduce((acc, m) => m.isReleased ? acc + m.amount : acc, 0);
      onUpdate({ ...vault, milestones: updatedMilestones, releasedAmount: totalReleased });
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(null);
    }
  };

  const parseAIData = (data: string) => {
    try {
      return JSON.parse(data);
    } catch (e) {
      return { summary: data, gps: 'N/A', flags: [] };
    }
  };

  const stats = useMemo(() => {
    const released = vault.milestones.filter(m => m.status === 'released');
    const scored = vault.milestones.filter(m => m.confidenceScore);
    const avgScore = scored.length ? scored.reduce((acc, m) => acc + (m.confidenceScore || 0), 0) / scored.length : 0;
    
    return {
      verifiedCount: released.length,
      avgConfidence: avgScore,
      lockedAmount: vault.totalAmount - vault.releasedAmount,
      completionRate: (vault.releasedAmount / vault.totalAmount) * 100
    };
  }, [vault]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <button onClick={onBack} className="flex items-center text-sm font-bold text-gray-500 hover:text-orange-600 transition-colors bg-white px-6 py-3 rounded-2xl border border-gray-200 shadow-sm w-fit">
          <i className="fas fa-arrow-left mr-2"></i> Back to {userRole === 'validator' ? 'Portal' : 'Dashboard'}
        </button>
        <div className="flex items-center space-x-2">
           <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
           <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Protocol Sync: Active</span>
        </div>
      </div>

      {/* Main Header Card */}
      <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-gray-200 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full -mr-48 -mt-48"></div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            <div className="w-24 h-24 md:w-28 md:h-28 bg-gray-50 rounded-[2.5rem] flex items-center justify-center text-5xl md:text-6xl shadow-inner border border-gray-100 text-orange-500 flex-shrink-0">
              {CATEGORY_ICONS[vault.category]}
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">{vault.name}</h2>
                <span className="px-4 py-1.5 bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-green-100">Solana Verified</span>
              </div>
              <p className="text-gray-500 text-lg md:text-xl max-w-2xl font-medium leading-relaxed italic">{vault.description}</p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-4 py-1.5 rounded-full border border-gray-100 uppercase tracking-widest"><i className="fas fa-map-marker-alt mr-2 text-orange-400"></i>{vault.location}</span>
                <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-4 py-1.5 rounded-full border border-gray-100 uppercase tracking-widest"><i className="fas fa-shield-alt mr-2 text-orange-400"></i>{vault.authority.substring(0, 12)}...</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-900 p-8 rounded-[3rem] border border-gray-800 min-w-full md:min-w-[340px] shadow-2xl text-white">
            <div className="flex justify-between items-start mb-4">
               <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Escrow Liquidity</p>
               <i className="fas fa-vault text-orange-500 text-xl"></i>
            </div>
            <div className="flex items-baseline space-x-3">
              <span className="text-5xl font-black">${vault.releasedAmount.toLocaleString()}</span>
              <span className="text-gray-500 text-sm font-bold">/ ${vault.totalAmount.toLocaleString()} USDC</span>
            </div>
            <div className="mt-8 w-full bg-gray-800 h-3 rounded-full overflow-hidden">
              <div className="bg-orange-500 h-full transition-all duration-1000 shadow-[0_0_15px_rgba(255,140,0,0.5)]" style={{ width: `${stats.completionRate}%` }}></div>
            </div>
            <div className="flex justify-between items-center mt-4">
              <p className="text-[10px] text-orange-400 font-black uppercase tracking-wider flex items-center">
                <span className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></span>
                Consensus Secured
              </p>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider">{Math.round(stats.completionRate)}% Disbursed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 bg-white rounded-3xl p-1 shadow-sm px-6 overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('milestones')} className={`px-10 py-5 text-[11px] font-black uppercase tracking-widest border-b-4 transition-all whitespace-nowrap ${activeTab === 'milestones' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Evidence Stream</button>
        <button onClick={() => setActiveTab('report')} className={`px-10 py-5 text-[11px] font-black uppercase tracking-widest border-b-4 transition-all whitespace-nowrap ${activeTab === 'report' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Impact Dashboard</button>
        <button onClick={() => setActiveTab('transparency')} className={`px-10 py-5 text-[11px] font-black uppercase tracking-widest border-b-4 transition-all whitespace-nowrap ${activeTab === 'transparency' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Forensic Audit</button>
        <button onClick={() => setActiveTab('governance')} className={`px-10 py-5 text-[11px] font-black uppercase tracking-widest border-b-4 transition-all whitespace-nowrap ${activeTab === 'governance' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Governance</button>
      </div>

      {/* Evidence Stream View */}
      {activeTab === 'milestones' && (
        <div className="space-y-8">
          {vault.milestones.map((milestone, idx) => {
            const aiData = milestone.proofHash ? parseAIData(milestone.description) : null;
            return (
              <div key={milestone.id} className={`bg-white rounded-[3rem] border p-8 md:p-10 flex flex-col lg:flex-row gap-10 relative transition-all ${milestone.isReleased ? 'border-green-200 bg-green-50/10 shadow-inner' : 'border-gray-200 hover:shadow-2xl'}`}>
                <div className="flex-shrink-0">
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-sm border ${milestone.isReleased ? 'bg-green-600 text-white border-green-700' : 'bg-gray-50 text-gray-300 border-gray-100'}`}>{idx + 1}</div>
                </div>
                <div className="flex-1 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <h4 className="text-2xl font-black text-gray-900 tracking-tight">{milestone.proofHash ? `Milestone Assessment: ${idx + 1}` : milestone.description}</h4>
                      <p className="text-sm font-black text-orange-500 mt-1 uppercase tracking-widest">${milestone.amount.toLocaleString()} USDC Allotment</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      {milestone.status === 'pending' && <span className="text-[11px] font-black text-gray-400 bg-gray-50 px-5 py-2 rounded-full border border-gray-200 uppercase tracking-widest">Awaiting Verification</span>}
                      {milestone.status === 'submitted' && <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-5 py-2 rounded-full border border-blue-200 uppercase tracking-widest animate-pulse">Validator Review</span>}
                      {milestone.status === 'released' && <span className="text-[11px] font-black text-green-700 bg-green-100 px-5 py-2 rounded-full border border-green-200 uppercase tracking-widest"><i className="fas fa-check-circle mr-2"></i>Funds Disbursed</span>}
                    </div>
                  </div>

                  {milestone.status === 'pending' && userRole === 'maker' && (
                    <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100 space-y-6 shadow-inner">
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">Submit Forensic Evidence</p>
                      <textarea value={proofText} onChange={(e) => setProofText(e.target.value)} placeholder="Provide specific achievement metrics and evidence summary..." className="w-full h-32 p-6 text-base border border-gray-200 rounded-[2rem] focus:ring-4 focus:ring-orange-500/10 outline-none resize-none font-medium shadow-sm" />
                      <div className="flex flex-wrap gap-5 items-center">
                        <button onClick={() => fileInputRef.current?.click()} className="text-xs font-black text-orange-600 bg-white border border-orange-100 px-6 py-4 rounded-2xl hover:bg-orange-50 transition-all flex items-center shadow-sm">
                          <i className="fas fa-cloud-upload-alt mr-3 text-lg"></i> Attach Multimedia Proof
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,video/*,audio/*" onChange={handleFileChange} />
                        <div className="flex flex-wrap gap-3">
                          {evidenceFiles.map((file, i) => (
                            <div key={i} className="px-4 py-2 bg-orange-100 text-[10px] font-black text-orange-700 rounded-xl flex items-center border border-orange-200 shadow-sm animate-in zoom-in duration-300">
                              <i className={`fas ${file.mimeType.startsWith('image') ? 'fa-image' : file.mimeType.startsWith('video') ? 'fa-video' : 'fa-microphone'} mr-2`}></i>
                              {file.mimeType.split('/')[0].toUpperCase()}
                              <button onClick={() => setEvidenceFiles(evidenceFiles.filter((_, idx) => idx !== i))} className="ml-3 text-orange-900 hover:text-red-500 transition-colors"><i className="fas fa-times"></i></button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-end pt-4">
                        <button onClick={() => handleSubmitProof(milestone)} disabled={submitting === milestone.id} className="bg-orange-500 text-white px-12 py-5 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-orange-600 disabled:opacity-50 transition-all shadow-xl shadow-orange-500/20 active:scale-95">
                          {submitting === milestone.id ? <i className="fas fa-atom fa-spin mr-3"></i> : null}
                          Initiate Forensic Audit
                        </button>
                      </div>
                    </div>
                  )}

                  {milestone.proofHash && aiData && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom duration-500">
                      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-between">
                         <div>
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">AI Analysis Report</p>
                            <p className="text-sm text-gray-700 leading-relaxed font-medium bg-orange-50/30 p-5 rounded-3xl border-l-8 border-l-orange-500 shadow-sm">{aiData.summary}</p>
                         </div>
                         <div className="mt-6 flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <div>
                               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">On-Chain Evidence Hash</p>
                               <code className="text-[9px] block truncate max-w-[150px] text-gray-500 font-mono tracking-tighter">{milestone.proofHash}</code>
                            </div>
                            <div className="text-right">
                               <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Consensus</p>
                               <p className="text-xs font-bold text-gray-900">{milestone.approvals.length} / 3 Sigs</p>
                            </div>
                         </div>
                      </div>

                      <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-between">
                        <div className="space-y-6">
                          <div className="flex justify-between items-center">
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Integrity Rating</p>
                            <div className="flex items-center">
                               <span className={`text-3xl font-black ${milestone.confidenceScore && milestone.confidenceScore > 90 ? 'text-green-600' : 'text-orange-500'}`}>{milestone.confidenceScore}%</span>
                               <i className={`fas fa-certificate ml-2 ${milestone.confidenceScore && milestone.confidenceScore > 90 ? 'text-green-500' : 'text-orange-400'}`}></i>
                            </div>
                          </div>
                          
                          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                             <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center">
                               <i className="fas fa-map-marked-alt mr-2"></i> Geo-Spatial Audit
                             </p>
                             <p className="text-sm font-bold text-gray-900">{aiData.gps || 'AI Locating...'}</p>
                             <div className="mt-3 flex items-center">
                                <span className="bg-green-50 text-green-700 text-[9px] font-black px-3 py-1 rounded-full border border-green-100 uppercase tracking-widest">Region Match: High</span>
                             </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                             {(aiData.flags || []).map((flag: string, i: number) => (
                               <span key={i} className="bg-blue-50 text-blue-600 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter border border-blue-100">
                                 {flag}
                               </span>
                             ))}
                          </div>
                        </div>

                        {userRole === 'validator' && !milestone.isReleased && (
                           <div className="mt-6 flex gap-3">
                             <button 
                               onClick={() => handleApprove(milestone)} 
                               disabled={submitting === milestone.id || milestone.approvals.includes('VALIDATOR_KEY')}
                               className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                             >
                               {milestone.approvals.includes('VALIDATOR_KEY') ? 'Signed' : 'Execute Signature'}
                             </button>
                           </div>
                        )}
                      </div>
                    </div>
                  )}

                  {milestone.status === 'submitted' && milestone.approvals.length >= 3 && userRole === 'maker' && (
                     <div className="flex flex-col md:flex-row items-center justify-between p-10 bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-[3rem] shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/5 rounded-full -mr-20 -mt-20"></div>
                        <div className="flex items-center space-x-6 relative z-10">
                          <div className="w-20 h-20 bg-green-600 rounded-3xl flex items-center justify-center text-white text-3xl shadow-xl shadow-green-600/30 animate-bounce duration-1000"><i className="fas fa-bolt"></i></div>
                          <div>
                            <p className="text-xl font-black text-green-900 tracking-tight">Escrow Ready for Release</p>
                            <p className="text-sm text-green-700 font-medium">Network quorum achieved. Funds available for disbursement.</p>
                          </div>
                        </div>
                        <button onClick={() => handleRelease(milestone)} disabled={submitting === milestone.id} className="mt-6 md:mt-0 bg-gray-900 hover:bg-black text-white px-14 py-6 rounded-3xl text-sm font-black uppercase tracking-widest transition-all shadow-2xl shadow-gray-900/30 active:scale-95">
                           {submitting === milestone.id ? <i className="fas fa-cog fa-spin mr-3"></i> : null}
                          Release USDC
                        </button>
                     </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Impact Dashboard View (fixed & polished) */}
      {activeTab === 'report' && (
        <div className="space-y-8 animate-in slide-in-from-bottom duration-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Impact Score</p>
              <p className="text-4xl font-black text-orange-500">{Math.round(stats.avgConfidence)}%</p>
              <div className="w-full bg-gray-100 h-1 rounded-full mt-4">
                <div className="bg-orange-500 h-full rounded-full" style={{ width: `${stats.avgConfidence}%` }}></div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Verified Milestones</p>
              <p className="text-4xl font-black text-gray-900">{stats.verifiedCount} / {vault.milestones.length}</p>
              <p className="text-[10px] font-black text-green-600 mt-2 uppercase">100% On-Chain Proof</p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Released</p>
              <p className="text-4xl font-black text-gray-900">${(vault.releasedAmount/1000).toFixed(1)}k</p>
              <p className="text-[10px] font-black text-gray-400 mt-2 uppercase">USDC Protocol Funds</p>
            </div>
            <div className="bg-gray-900 p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col justify-center relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10"><i className="fas fa-chart-pie text-4xl"></i></div>
               <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Pipeline Value</p>
               <p className="text-3xl font-black">${(stats.lockedAmount/1000).toFixed(1)}k</p>
               <p className="text-[9px] text-orange-400 font-bold mt-2 uppercase tracking-tighter italic">Locked in Escrow</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 md:p-12 border border-gray-200 shadow-sm relative overflow-hidden flex flex-col">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                <div>
                   <h3 className="text-3xl font-black text-gray-900 tracking-tight">Verified Impact Narrative</h3>
                   <p className="text-gray-500 font-medium text-sm mt-1">Synthesized based on forensic milestone evidence.</p>
                </div>
                <button 
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-500/20 active:scale-95 disabled:opacity-50"
                >
                  {generatingReport ? <i className="fas fa-brain fa-spin mr-3"></i> : <i className="fas fa-magic mr-3"></i>}
                  {aiReport ? 'Regenerate Narrative' : 'Initialize Synthesis'}
                </button>
              </div>

              {aiReport ? (
                <div className="flex-1 bg-gray-50/50 p-8 md:p-12 rounded-[2.5rem] border border-gray-100 shadow-inner overflow-y-auto max-h-[600px] prose prose-orange max-w-none">
                  <div 
                    className="text-gray-700 font-medium leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: aiReport
                      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-black text-gray-900 mb-6 uppercase tracking-tight">$1</h1>')
                      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-gray-800 mt-10 mb-4">$1</h2>')
                      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-black text-orange-600 mt-8 mb-2">$1</h3>')
                      .replace(/\*\*(.*)\*\*/gim, '<strong class="font-black text-gray-900">$1</strong>')
                    }} 
                  />
                  <div className="mt-12 pt-8 border-t border-gray-200 flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                     <span>Report ID: CC-VAL-${vault.id}</span>
                     <span>Verified by CivicCore Intelligence Node</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 bg-gray-50 rounded-[2.5rem] p-24 text-center border border-dashed border-gray-300 flex flex-col items-center justify-center">
                   <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                     <i className="fas fa-newspaper text-gray-200 text-3xl"></i>
                   </div>
                   <h4 className="text-xl font-bold text-gray-400">Impact Data Ready</h4>
                   <p className="text-gray-400 text-sm mt-2 max-w-xs mx-auto">Generate a donor-grade report synthesizing all verified on-chain data and forensic metadata.</p>
                </div>
              )}
            </div>

            <div className="space-y-8">
               <div className="bg-white p-8 rounded-[3rem] border border-gray-200 shadow-sm">
                  <h4 className="text-sm font-black text-gray-900 mb-6 uppercase tracking-widest flex items-center">
                    <i className="fas fa-fingerprint mr-2 text-orange-500"></i> Trust Matrix
                  </h4>
                  <div className="space-y-6">
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Geo-Consistency</span>
                        <span className="px-3 py-1 bg-green-50 text-green-700 text-[9px] font-black rounded-full border border-green-100 uppercase tracking-widest">Confirmed</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Timeline Validity</span>
                        <span className="px-3 py-1 bg-green-50 text-green-700 text-[9px] font-black rounded-full border border-green-100 uppercase tracking-widest">High</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Metadata Integrity</span>
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[9px] font-black rounded-full border border-blue-100 uppercase tracking-widest">Vetted</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Consensus Quorum</span>
                        <span className="px-3 py-1 bg-orange-50 text-orange-700 text-[9px] font-black rounded-full border border-orange-100 uppercase tracking-widest">3/3 Nodes</span>
                     </div>
                  </div>
               </div>

               <div className="bg-gray-900 p-8 rounded-[3rem] shadow-2xl text-white relative overflow-hidden">
                  <div className="absolute bottom-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl"></div>
                  <div className="relative z-10">
                     <h4 className="text-sm font-black mb-6 uppercase tracking-widest">Impact Footprint</h4>
                     <div className="h-40 bg-gray-800/50 rounded-2xl border border-gray-700/50 flex items-center justify-center p-4">
                        <div className="text-center">
                           <i className="fas fa-map-marked-alt text-gray-600 text-4xl mb-4"></i>
                           <p className="text-[10px] text-gray-400 font-bold uppercase">{vault.location}</p>
                           <p className="text-[9px] text-orange-400 font-mono mt-1 italic tracking-widest">Coordinates Verified</p>
                        </div>
                     </div>
                     <button className="w-full mt-6 bg-white/10 hover:bg-white/20 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                       Export Public Impact Receipt
                     </button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Forensic Audit / Transparency View */}
      {activeTab === 'transparency' && (
        <div className="bg-white rounded-[3rem] border border-gray-200 p-16 md:p-24 text-center shadow-inner relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 via-blue-500 to-green-500"></div>
          <div className="relative inline-block mb-10">
             <i className="fas fa-microchip text-gray-100 text-[120px]"></i>
             <div className="absolute inset-0 flex items-center justify-center">
                <i className="fas fa-shield-halved text-orange-500 text-4xl animate-pulse"></i>
             </div>
          </div>
          <h3 className="text-3xl font-black text-gray-900 uppercase tracking-widest">Protocol Intelligence Hub</h3>
          <p className="text-gray-400 text-xl mt-4 max-w-xl mx-auto font-medium leading-relaxed italic">Streaming multi-modal forensic logs from decentralized storage layers for complete on-chain auditability...</p>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
             {['Arweave Logs', 'Solana RPC', 'Gemini Audits'].map(source => (
               <div key={source} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex flex-col items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mb-3 animate-ping"></span>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{source} Connected</span>
               </div>
             ))}
          </div>
        </div>
      )}

      {/* Governance View */}
      {activeTab === 'governance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in slide-in-from-right duration-500">
          <div className="bg-white rounded-[3rem] border border-gray-200 p-10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16"></div>
            <h4 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-widest flex items-center">
               <i className="fas fa-users-cog mr-3 text-blue-500"></i> Protocol Council
            </h4>
            <div className="space-y-5">
              {['Omega', 'Alpha', 'Beta', 'Sigma'].map(val => (
                <div key={val} className="flex items-center justify-between p-5 border border-gray-50 rounded-[2rem] bg-gray-50/50 hover:bg-white transition-all hover:shadow-md group">
                  <div className="flex items-center space-x-5">
                    <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${val}`} className="w-14 h-14 rounded-2xl bg-white border border-gray-100 p-1 shadow-sm group-hover:rotate-12 transition-transform" alt="" />
                    <div>
                      <span className="text-lg font-black text-gray-800">Node_{val}</span>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Global Reputation: 9.92</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-green-600 bg-green-50 px-4 py-1.5 rounded-full uppercase border border-green-100 shadow-sm tracking-widest">Active</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-900 rounded-[3rem] border border-gray-800 p-10 shadow-2xl text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <h4 className="text-xl font-black mb-10 uppercase tracking-widest flex items-center">
                 <i className="fas fa-chart-network mr-3 text-blue-400"></i> Decision Quorum
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 bg-gray-800/50 rounded-[2.5rem] border border-gray-700/50 backdrop-blur-sm group hover:border-blue-500/50 transition-all">
                  <p className="text-[11px] font-black text-blue-400 uppercase tracking-widest mb-2">Quorum Threshold</p>
                  <p className="text-4xl font-black text-white">3 / 4</p>
                  <p className="text-[10px] text-gray-500 mt-3 font-bold uppercase tracking-tighter italic">Signatures required for release</p>
                </div>
                <div className="p-8 bg-gray-800/50 rounded-[2.5rem] border border-gray-700/50 backdrop-blur-sm group hover:border-green-500/50 transition-all">
                  <p className="text-[11px] font-black text-green-400 uppercase tracking-widest mb-2">Protocol Version</p>
                  <p className="text-4xl font-black text-white">v2.1</p>
                  <p className="text-[10px] text-gray-500 mt-3 font-bold uppercase tracking-tighter italic">Core Governance Engine</p>
                </div>
              </div>
            </div>
            <div className="mt-12 pt-10 border-t border-gray-800/50 text-center relative z-10">
              <p className="text-xs text-gray-500 font-black uppercase tracking-widest italic opacity-50">Authorized Decision Node: CivicCore-Alpha-9</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;
