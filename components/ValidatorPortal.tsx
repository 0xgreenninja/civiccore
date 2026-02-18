
import React, { useState } from 'react';
import { Vault, Milestone } from '../types';

interface ValidatorPortalProps {
  vaults: Vault[];
  onSelectVault: (vault: Vault) => void;
  onUpdateVaults: (vaults: Vault[]) => void;
}

const ValidatorPortal: React.FC<ValidatorPortalProps> = ({ vaults, onSelectVault, onUpdateVaults }) => {
  const [inspecting, setInspecting] = useState<{vault: Vault, milestone: Milestone} | null>(null);

  const pendingReviews = vaults.flatMap(vault => 
    vault.milestones
      .filter(m => m.status === 'submitted' || (m.status === 'pending' && m.proofHash))
      .map(m => ({ vault, milestone: m }))
  );

  const stats = {
    pending: pendingReviews.length,
    totalVerified: vaults.reduce((acc, v) => acc + v.milestones.filter(m => m.status === 'released').length, 0),
    stakedAmount: vaults.reduce((acc, v) => acc + (v.totalAmount - v.releasedAmount), 0),
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full -mr-40 -mt-40"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div>
            <h2 className="text-4xl font-black text-gray-900 tracking-tight italic">VALIDATOR<span className="text-blue-600">.OPS</span></h2>
            <p className="text-gray-500 mt-2 max-w-lg font-medium text-lg">Immutable impact verification terminal. Execute protocol-level consensus based on AI forensic data.</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-blue-50/80 backdrop-blur px-8 py-4 rounded-3xl border border-blue-100 text-center shadow-sm">
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Queue Size</p>
              <p className="text-3xl font-black text-blue-700">{stats.pending}</p>
            </div>
            <div className="bg-green-50/80 backdrop-blur px-8 py-4 rounded-3xl border border-green-100 text-center shadow-sm">
              <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">Impact Verified</p>
              <p className="text-3xl font-black text-green-700">{stats.totalVerified}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Verification Queue */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center">
              <i className="fas fa-microchip mr-3 text-blue-500"></i>
              High-Confidence Queue
            </h3>
            <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Live Streams</span>
          </div>

          {pendingReviews.length === 0 ? (
            <div className="bg-white rounded-[2rem] border border-dashed border-gray-300 p-24 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-check-double text-gray-200 text-3xl"></i>
              </div>
              <h4 className="text-xl font-bold text-gray-400">Consensus Achieved</h4>
              <p className="text-gray-400 text-sm mt-2 max-w-xs mx-auto">All cryptographic proofs have been signed and committed to the ledger.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {pendingReviews.map(({ vault, milestone }) => (
                <div 
                  key={milestone.id} 
                  className="group bg-white rounded-[2rem] border border-gray-200 p-8 hover:shadow-2xl transition-all border-l-[12px] border-l-blue-500 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4">
                     <span className="bg-green-100 text-green-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-green-200">
                       <i className="fas fa-fingerprint mr-1"></i> AI Pass
                     </span>
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-blue-600 border border-gray-100 shadow-inner group-hover:scale-110 transition-transform">
                          <i className="fas fa-server"></i>
                        </div>
                        <div>
                          <h5 className="text-xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">{vault.name}</h5>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest flex items-center">
                            <i className="fas fa-globe-africa mr-2 text-orange-400"></i> {vault.location}
                          </p>
                        </div>
                      </div>

                      <div className="bg-blue-50/30 rounded-2xl p-6 border border-blue-50/50">
                        <p className="text-sm font-black text-blue-900 mb-2">CLAIM: {milestone.description}</p>
                        <div className="flex flex-wrap gap-3">
                          <span className="bg-white px-3 py-1.5 rounded-lg border border-blue-100 text-[9px] font-black text-blue-600 uppercase tracking-tighter">
                            Geo-Tag: Nairobi-SEC-4
                          </span>
                          <span className="bg-white px-3 py-1.5 rounded-lg border border-blue-100 text-[9px] font-black text-blue-600 uppercase tracking-tighter">
                            Timeline Coherent: 99.8%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="md:w-48 w-full flex-shrink-0 space-y-4">
                      <div className="text-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Release Value</p>
                        <p className="text-3xl font-black text-gray-900">${milestone.amount.toLocaleString()}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">USDC-SPL</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => onSelectVault(vault)}
                          className="w-full bg-gray-900 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95"
                        >
                          Forensic Inspection
                        </button>
                        <button 
                          onClick={() => {
                            onSelectVault(vault);
                          }}
                          className="w-full bg-blue-600 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                        >
                          Execute Signature
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Validator Intelligence Side Panel */}
        <div className="space-y-8">
          <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <h4 className="text-xl font-black mb-6 uppercase tracking-widest flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse"></span>
                Node Intelligence
              </h4>
              <div className="space-y-6">
                <div className="bg-gray-800/50 p-5 rounded-3xl border border-gray-700/50">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Protocol Status</p>
                  <div className="flex justify-between items-baseline">
                    <p className="text-2xl font-black">SOL-NRT</p>
                    <span className="text-xs text-green-400 font-bold">Latency: 4ms</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Recent Consensus</p>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center space-x-3 text-xs border-l border-gray-800 pl-4 py-1">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                      <p className="font-medium text-gray-300">Block <span className="font-mono text-blue-400">#29402..</span> signed by Node-Epsilon</p>
                    </div>
                  ))}
                </div>
              </div>
              <button className="w-full mt-10 bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20">
                Synchronize Blockchain Ledger
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-200 shadow-sm">
            <h4 className="text-sm font-black text-gray-900 mb-6 uppercase tracking-widest">Validator Incentives</h4>
            <div className="p-6 bg-green-50 rounded-3xl border border-green-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Accrued Rewards</p>
                <p className="text-2xl font-black text-green-700">420.50 USDC</p>
              </div>
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-green-600 border border-green-100 shadow-sm">
                <i className="fas fa-wallet"></i>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 font-bold mt-6 text-center leading-relaxed">
              Consensus participation increases your Node Reputation Score. High reputation enables priority validation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidatorPortal;
