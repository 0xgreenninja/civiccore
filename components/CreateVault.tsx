
import React, { useState } from 'react';
import { Vault, Milestone } from '../types';

interface CreateVaultProps {
  onSubmit: (vault: Vault) => void;
  onCancel: () => void;
}

const CreateVault: React.FC<CreateVaultProps> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    totalAmount: 0,
    category: 'Education' as any,
    location: '',
    milestoneCount: 2
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate dummy milestones
    const milestones: Milestone[] = Array.from({ length: formData.milestoneCount }).map((_, i) => ({
      id: Math.random().toString(36).substring(7),
      index: i,
      description: `Milestone #${i + 1} for ${formData.name}`,
      amount: formData.totalAmount / formData.milestoneCount,
      proofHash: null,
      approvals: [],
      isReleased: false,
      status: 'pending'
    }));

    const newVault: Vault = {
      id: Math.random().toString(36).substring(7),
      name: formData.name,
      description: formData.description,
      authority: 'DEMO_USER_KEY',
      totalAmount: formData.totalAmount,
      releasedAmount: 0,
      category: formData.category,
      location: formData.location,
      createdAt: Date.now(),
      milestones
    };

    onSubmit(newVault);
  };

  return (
    <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom duration-500">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-8 text-white">
          <h2 className="text-3xl font-bold">Launch Impact Vault</h2>
          <p className="text-orange-50/80 mt-2">Initialize a programmable funding contract for your community.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Project Name</label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Clean Energy Microgrid"
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Target Amount (USDC)</label>
              <input 
                type="number" 
                required
                value={formData.totalAmount || ''}
                onChange={e => setFormData({...formData, totalAmount: Number(e.target.value)})}
                placeholder="10000"
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
            <textarea 
              required
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Detail the impact goals and how funds will be used..."
              className="w-full h-32 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none resize-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
              <select 
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value as any})}
                className="w-full p-4 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all appearance-none"
              >
                <option>Education</option>
                <option>Healthcare</option>
                <option>Agriculture</option>
                <option>Infrastructure</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Location</label>
              <input 
                type="text" 
                required
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
                placeholder="Lagos, Nigeria"
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Milestones (1-10)</label>
              <input 
                type="number" 
                min="1" 
                max="10"
                required
                value={formData.milestoneCount}
                onChange={e => setFormData({...formData, milestoneCount: Number(e.target.value)})}
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 flex items-start space-x-4">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
              <i className="fas fa-info"></i>
            </div>
            <div>
              <p className="text-sm font-bold text-orange-900">Protocol Transparency Note</p>
              <p className="text-xs text-orange-700 mt-1 leading-relaxed">
                By launching this vault, you agree that funds will remain locked in a multi-signature escrow. 
                Release of funds occurs only upon AI verification and validator consensus on submitted impact proofs.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4 pt-4">
            <button 
              type="button"
              onClick={onCancel}
              className="flex-1 px-8 py-4 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl text-sm font-bold shadow-lg shadow-green-100 transition-all active:scale-95"
            >
              Initialize On-Chain Vault
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateVault;
