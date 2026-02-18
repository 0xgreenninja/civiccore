
import React from 'react';
import { UserWallet } from '../types';

interface HeaderProps {
  wallet: UserWallet;
  onConnect: () => void;
  userRole: 'maker' | 'validator';
  onToggleRole: () => void;
  currentView: string;
  onNavigate: (view: string) => void;
}

const Header: React.FC<HeaderProps> = ({ wallet, onConnect, userRole, onToggleRole, currentView, onNavigate }) => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => onNavigate(userRole === 'validator' ? 'validator' : 'dashboard')}>
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
            <i className="fas fa-landmark text-white text-xl"></i>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-bold tracking-tight">Civic<span className="text-orange-500">Core</span></h1>
            <p className="text-[10px] text-gray-500 uppercase font-semibold">Impact Infrastructure</p>
          </div>
        </div>

        <div className="hidden lg:flex items-center space-x-6">
          <button 
            onClick={() => onNavigate(userRole === 'validator' ? 'validator' : 'dashboard')}
            className={`text-sm font-semibold ${currentView === 'dashboard' || currentView === 'validator' ? 'text-orange-600' : 'text-gray-500 hover:text-gray-800'}`}
          >
            {userRole === 'validator' ? 'Queue' : 'Projects'}
          </button>
          <a href="#" className="text-sm font-semibold text-gray-500 hover:text-gray-800">Explorer</a>
          <a href="#" className="text-sm font-semibold text-gray-500 hover:text-gray-800">Grants</a>
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={onToggleRole}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
              userRole === 'validator' 
              ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' 
              : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
            }`}
          >
            <i className={`fas ${userRole === 'validator' ? 'fa-shield-alt' : 'fa-seedling'}`}></i>
            <span>{userRole === 'validator' ? 'Validator Mode' : 'Maker Mode'}</span>
          </button>

          {wallet.connected ? (
            <div className="flex items-center space-x-3">
              <div className="hidden md:block text-right">
                <p className="text-[9px] text-gray-400 font-bold uppercase">Balance</p>
                <p className="text-xs font-bold text-gray-900">{wallet.balance.toFixed(2)} USDC</p>
              </div>
              <div className="bg-gray-100 px-4 py-2 rounded-xl border border-gray-200 flex items-center space-x-2 group cursor-pointer hover:bg-gray-200 transition-colors">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-bold font-mono">{wallet.publicKey?.substring(0, 4)}...{wallet.publicKey?.substring(wallet.publicKey.length - 4)}</span>
              </div>
            </div>
          ) : (
            <button 
              onClick={onConnect}
              className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95"
            >
              Connect
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
