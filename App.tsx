
import React, { useState } from 'react';
import { Vault, UserWallet } from './types';
import Dashboard from './components/Dashboard';
import CreateVault from './components/CreateVault';
import ProjectDetails from './components/ProjectDetails';
import ValidatorPortal from './components/ValidatorPortal';
import Header from './components/Header';

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'create' | 'details' | 'validator'>('dashboard');
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null);
  const [userRole, setUserRole] = useState<'maker' | 'validator'>('maker');
  const [wallet, setWallet] = useState<UserWallet>({
    publicKey: null,
    connected: false,
    balance: 0,
  });

  const [vaults, setVaults] = useState<Vault[]>([
    {
      id: 'v1',
      name: 'Nairobi Water Access Project',
      description: 'Building 5 sustainable water kiosks in informal settlements.',
      authority: '8x5...4k2',
      totalAmount: 50000,
      releasedAmount: 20000,
      category: 'Infrastructure',
      location: 'Nairobi, Kenya',
      createdAt: Date.now() - 86400000 * 10,
      milestones: [
        { id: 'm1', index: 0, description: 'Borehole Drilling', amount: 10000, proofHash: 'hash123', approvals: ['val1', 'val2', 'val3'], isReleased: true, status: 'released', confidenceScore: 98 },
        { id: 'm2', index: 1, description: 'Pump Installation', amount: 10000, proofHash: 'hash456', approvals: ['val1', 'val2', 'val4'], isReleased: true, status: 'released', confidenceScore: 95 },
        { id: 'm3', index: 2, description: 'Storage Tanks', amount: 10000, proofHash: null, approvals: [], isReleased: false, status: 'pending' },
        { id: 'm4', index: 3, description: 'Piping Network', amount: 10000, proofHash: null, approvals: [], isReleased: false, status: 'pending' },
        { id: 'm5', index: 4, description: 'Commissioning', amount: 10000, proofHash: null, approvals: [], isReleased: false, status: 'pending' },
      ]
    },
    {
      id: 'v2',
      name: 'Mombasa Tech Hub Support',
      description: 'Laptops and high-speed internet for local developers.',
      authority: '3y1...9m4',
      totalAmount: 25000,
      releasedAmount: 0,
      category: 'Education',
      location: 'Mombasa, Kenya',
      createdAt: Date.now() - 86400000 * 2,
      milestones: [
        { id: 'm21', index: 0, description: 'Procure 20 Laptops', amount: 15000, proofHash: null, approvals: [], isReleased: false, status: 'pending' },
        { id: 'm22', index: 1, description: 'ISP Setup', amount: 10000, proofHash: null, approvals: [], isReleased: false, status: 'pending' },
      ]
    }
  ]);

  const connectWallet = () => {
    setWallet({
      publicKey: userRole === 'validator' ? 'ValidatorAlpha222222222222222' : 'CivicCoreUser1234567890ABCDEF',
      connected: true,
      balance: userRole === 'validator' ? 540.20 : 1520.45,
    });
  };

  const handleCreateVault = (newVault: Vault) => {
    setVaults([newVault, ...vaults]);
    setView('dashboard');
  };

  const handleSelectVault = (vault: Vault) => {
    setSelectedVault(vault);
    setView('details');
  };

  const toggleRole = () => {
    const newRole = userRole === 'maker' ? 'validator' : 'maker';
    setUserRole(newRole);
    if (newRole === 'validator') {
      setView('validator');
    } else {
      setView('dashboard');
    }
    // Auto-reconnect with different mock wallet for demo
    if (wallet.connected) connectWallet();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header 
        wallet={wallet} 
        onConnect={connectWallet} 
        userRole={userRole} 
        onToggleRole={toggleRole} 
        currentView={view}
        onNavigate={(v) => setView(v as any)}
      />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {view === 'dashboard' && (
          <Dashboard 
            vaults={vaults} 
            onSelectVault={handleSelectVault} 
            onCreateClick={() => setView('create')}
          />
        )}
        
        {view === 'create' && (
          <CreateVault 
            onSubmit={handleCreateVault} 
            onCancel={() => setView('dashboard')} 
          />
        )}

        {view === 'details' && selectedVault && (
          <ProjectDetails 
            vault={selectedVault} 
            userRole={userRole}
            onBack={() => setView(userRole === 'validator' ? 'validator' : 'dashboard')}
            onUpdate={(updatedVault) => {
              setVaults(vaults.map(v => v.id === updatedVault.id ? updatedVault : v));
              setSelectedVault(updatedVault);
            }}
          />
        )}

        {view === 'validator' && (
          <ValidatorPortal 
            vaults={vaults} 
            onSelectVault={handleSelectVault}
            onUpdateVaults={setVaults}
          />
        )}
      </main>

      <footer className="bg-gray-800 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 border-b border-gray-700 pb-8">
            <div className="col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
                  <i className="fas fa-landmark text-white"></i>
                </div>
                <h2 className="text-xl font-bold">CivicCore</h2>
              </div>
              <p className="text-gray-400 max-w-sm text-sm">
                The world's first programmable impact infrastructure. Ensuring every dollar reaches its destination through Solana-powered smart contracts and Gemini AI verification.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-orange-500">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Developer Docs</a></li>
                <li><a href="#" className="hover:text-white">Whitepaper</a></li>
                <li><a href="#" className="hover:text-white">API Reference</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-orange-500">Community</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Discord</a></li>
                <li><a href="#" className="hover:text-white">Governance</a></li>
                <li><a href="#" className="hover:text-white">Impact Reports</a></li>
              </ul>
            </div>
          </div>
          <div className="text-center">
            <p className="text-gray-500 text-xs">&copy; 2025 CivicCore Protocol. Built for communities in Africa on Solana.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
