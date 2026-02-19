
import React, { useState } from 'react';
import { UserRole } from '../types';

interface NavbarProps {
  currentPage: string;
  setCurrentPage: (page: any) => void;
  userRole: UserRole;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, setCurrentPage, userRole, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', roles: [UserRole.ADMIN, UserRole.STAFF] },
    { id: 'visualizer', label: 'AI Visualizer', roles: [UserRole.ADMIN, UserRole.STAFF] },
    { id: 'billing', label: 'Billing', roles: [UserRole.ADMIN] },
    { id: 'calendar', label: 'Schedule', roles: [UserRole.ADMIN, UserRole.STAFF] },
    { id: 'calculator', label: 'Create Order', roles: [UserRole.ADMIN, UserRole.STAFF], highlight: true },
  ];

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setIsOpen(false);
  };

  return (
    <nav className="bg-[#002d62] text-white px-4 md:px-8 py-4 flex items-center justify-between shadow-2xl sticky top-0 z-[100] no-print">
      <div className="flex items-center gap-4 md:gap-12">
        <div 
          className="flex items-center gap-2 md:gap-3 cursor-pointer group"
          onClick={() => handleNavigate('dashboard')}
        >
          <div className="w-8 h-8 md:w-10 md:h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-all">
            <i className="fas fa-couch text-white text-base md:text-lg"></i>
          </div>
          <h1 className="text-lg md:text-xl font-black tracking-tighter brand-font">
            QUILT & DRAPES
          </h1>
        </div>
        
        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-8">
          {navItems.filter(item => item.roles.includes(userRole)).map(item => (
            <button 
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`text-[11px] font-black uppercase tracking-widest transition-all hover:text-[#c5a059] ${item.highlight ? 'px-4 py-2 bg-white/10 rounded-lg' : ''} ${currentPage === item.id ? 'text-[#c5a059] border-b-2 border-[#c5a059] pb-1' : 'text-white/60'}`}
            >
              {item.highlight ? `+ ${item.label}` : item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-6">
        <div className="hidden sm:flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[9px] md:text-[10px] text-white/70 font-black uppercase tracking-widest">Live Sync</span>
        </div>

        {/* Mobile Toggle */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-white/10"
        >
          <i className={`fas ${isOpen ? 'fa-times' : 'fa-bars'}`}></i>
        </button>

        <button 
          onClick={onLogout}
          className="hidden lg:block text-[11px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-[#001a3a] border-t border-white/10 p-6 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-top duration-200">
          {navItems.filter(item => item.roles.includes(userRole)).map(item => (
            <button 
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`w-full text-left py-4 px-6 rounded-2xl text-[12px] font-black uppercase tracking-widest ${currentPage === item.id ? 'bg-[#c5a059] text-white' : 'bg-white/5 text-white/70'}`}
            >
              {item.label}
            </button>
          ))}
          <button 
            onClick={onLogout}
            className="w-full text-center py-4 text-[10px] font-black uppercase tracking-widest text-red-400 mt-4"
          >
            Logout Session
          </button>
        </div>
      )}
    </nav>
  );
};
