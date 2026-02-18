
import React from 'react';
import { UserRole } from '../types';

interface NavbarProps {
  currentPage: string;
  setCurrentPage: (page: any) => void;
  userRole: UserRole;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, setCurrentPage, userRole, onLogout }) => {
  return (
    <nav className="bg-[#002d62] text-white px-8 py-5 flex items-center justify-between shadow-2xl sticky top-0 z-50 no-print">
      <div className="flex items-center gap-12">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setCurrentPage('dashboard')}
        >
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-all">
            <i className="fas fa-couch text-white text-lg"></i>
          </div>
          <h1 className="text-xl font-black tracking-tighter brand-font">
            QUILT & DRAPES
          </h1>
        </div>
        
        <div className="hidden lg:flex items-center gap-8">
          <button 
            onClick={() => setCurrentPage('dashboard')}
            className={`text-[11px] font-black uppercase tracking-widest transition-all hover:text-[#c5a059] ${currentPage === 'dashboard' ? 'text-[#c5a059] border-b-2 border-[#c5a059] pb-1' : 'text-white/60'}`}
          >
            Dashboard
          </button>
          
          {userRole === UserRole.ADMIN && (
            <button 
              onClick={() => setCurrentPage('billing')}
              className={`text-[11px] font-black uppercase tracking-widest transition-all hover:text-[#c5a059] ${currentPage === 'billing' ? 'text-[#c5a059] border-b-2 border-[#c5a059] pb-1' : 'text-white/60'}`}
            >
              Billing
            </button>
          )}
          
          <button 
            onClick={() => setCurrentPage('calendar')}
            className={`text-[11px] font-black uppercase tracking-widest transition-all hover:text-[#c5a059] ${currentPage === 'calendar' ? 'text-[#c5a059] border-b-2 border-[#c5a059] pb-1' : 'text-white/60'}`}
          >
            Schedule
          </button>
          
          <button 
            onClick={() => setCurrentPage('calculator')}
            className={`px-4 py-2 bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white/20 ${currentPage === 'calculator' ? 'ring-2 ring-[#c5a059]' : ''}`}
          >
            + Create Order
          </button>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[10px] text-white/70 font-black uppercase tracking-widest">Live Sync</span>
        </div>
        <button 
          onClick={onLogout}
          className="text-[11px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};
