
import React from 'react';
import { Vault } from '../types';
import { CATEGORY_ICONS } from '../constants';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  vaults: Vault[];
  onSelectVault: (vault: Vault) => void;
  onCreateClick: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ vaults, onSelectVault, onCreateClick }) => {
  const chartData = [
    { name: 'Jan', amount: 4000 },
    { name: 'Feb', amount: 3000 },
    { name: 'Mar', amount: 2000 },
    { name: 'Apr', amount: 2780 },
    { name: 'May', amount: 1890 },
    { name: 'Jun', amount: 2390 },
    { name: 'Jul', amount: 3490 },
  ];

  const totalImpact = vaults.reduce((acc, v) => acc + v.totalAmount, 0);
  const totalReleased = vaults.reduce((acc, v) => acc + v.releasedAmount, 0);

  return (
    <div className="space-y-8">
      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Staked Impact</p>
            <div className="p-2 bg-orange-100 rounded-lg"><i className="fas fa-coins text-orange-600"></i></div>
          </div>
          <h3 className="text-3xl font-bold">${totalImpact.toLocaleString()} USDC</h3>
          <p className="text-green-600 text-xs mt-2 font-semibold"><i className="fas fa-arrow-up mr-1"></i> 12% vs last month</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Verified Releases</p>
            <div className="p-2 bg-green-100 rounded-lg"><i className="fas fa-check-circle text-green-600"></i></div>
          </div>
          <h3 className="text-3xl font-bold">${totalReleased.toLocaleString()} USDC</h3>
          <p className="text-green-600 text-xs mt-2 font-semibold"><i className="fas fa-check mr-1"></i> 100% On-chain Transparency</p>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-green-700 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-white/80 text-sm font-medium uppercase tracking-wider">Active Projects</p>
            <h3 className="text-3xl font-bold mt-2">{vaults.length} Active Vaults</h3>
            <button 
              onClick={onCreateClick}
              className="mt-4 bg-white text-green-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-50 transition-colors"
            >
              + Create New Vault
            </button>
          </div>
          <i className="fas fa-globe-africa absolute -bottom-4 -right-4 text-white/10 text-9xl"></i>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Funding Trends */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h4 className="font-bold text-gray-800 mb-6 flex items-center">
            <i className="fas fa-chart-line mr-2 text-orange-500"></i>
            Protocol Distribution Volume
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF8C00" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#FF8C00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} 
                />
                <Area type="monotone" dataKey="amount" stroke="#FF8C00" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Governance Alerts */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h4 className="font-bold text-gray-800 mb-6 flex items-center">
            <i className="fas fa-bell mr-2 text-orange-500"></i>
            Live Gov Feed
          </h4>
          <div className="space-y-4">
            <div className="flex space-x-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs">
                <i className="fas fa-gavel"></i>
              </div>
              <div>
                <p className="text-xs font-bold text-orange-900">Milestone Approved</p>
                <p className="text-[10px] text-orange-700">Project: Nairobi Water #M2</p>
                <p className="text-[10px] text-gray-400 mt-1">2 mins ago</p>
              </div>
            </div>
            <div className="flex space-x-3 p-3 bg-green-50 rounded-xl border border-green-100">
              <div className="w-8 h-8 bg-green-600 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs">
                <i className="fas fa-check"></i>
              </div>
              <div>
                <p className="text-xs font-bold text-green-900">Funds Released</p>
                <p className="text-[10px] text-green-700">10,000 USDC transferred to recipient.</p>
                <p className="text-[10px] text-gray-400 mt-1">15 mins ago</p>
              </div>
            </div>
            <div className="flex space-x-3 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group">
              <div className="w-8 h-8 bg-blue-100 group-hover:bg-blue-200 rounded-full flex-shrink-0 flex items-center justify-center text-blue-600 text-xs">
                <i className="fas fa-file-alt"></i>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800">New Proof Submitted</p>
                <p className="text-[10px] text-gray-500">Mombasa Tech Hub - Milestone #M1</p>
                <p className="text-[10px] text-gray-400 mt-1">1 hour ago</p>
              </div>
            </div>
          </div>
          <button className="w-full mt-6 text-sm font-semibold text-orange-600 hover:text-orange-700">
            View All Events
          </button>
        </div>
      </div>

      {/* Vault List */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-xl font-bold text-gray-900">Active Impact Vaults</h4>
          <div className="flex items-center space-x-2">
            <button className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50">Filter</button>
            <button className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50">Sort</button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {vaults.map((vault) => (
            <div 
              key={vault.id}
              onClick={() => onSelectVault(vault)}
              className="group bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-xl hover:border-orange-200 transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-xl">
                    {CATEGORY_ICONS[vault.category]}
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{vault.name}</h5>
                    <p className="text-xs text-gray-500"><i className="fas fa-map-marker-alt mr-1"></i> {vault.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">${vault.totalAmount.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">Total USDC</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-6 line-clamp-2">{vault.description}</p>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-gray-500">Progress</span>
                  <span className="text-green-600">
                    {Math.round((vault.releasedAmount / vault.totalAmount) * 100)}% Released
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-green-600 h-full transition-all duration-1000" 
                    style={{ width: `${(vault.releasedAmount / vault.totalAmount) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                      <img src={`https://picsum.photos/seed/${vault.id}${i}/30/30`} alt="Validator" />
                    </div>
                  ))}
                  <div className="w-6 h-6 rounded-full border-2 border-white bg-orange-100 flex items-center justify-center text-[8px] font-bold text-orange-600">
                    +12
                  </div>
                </div>
                <div className="text-[10px] font-bold text-gray-400">
                  <i className="fas fa-shield-alt mr-1"></i>
                  {vault.milestones.length} Milestones
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
