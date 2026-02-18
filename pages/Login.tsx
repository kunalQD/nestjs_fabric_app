
import React, { useState } from 'react';
import { UserRole } from '../types';
import { dataService } from '../services/dataService';

interface LoginProps {
  onLogin: (username: string, role: UserRole) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const success = await dataService.login(username, password);
      
      if (success) {
        const role = username.includes('admin') ? UserRole.ADMIN : UserRole.STAFF;
        onLogin(username, role);
      } else {
        setError('Credentials verification failed');
      }
    } catch (err: any) {
      setError('Connection Error: Could not reach fabrication server. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#002d62] flex items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden select-none text-[30rem] font-black text-white flex items-center justify-center leading-none">
        QD
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#c5a059]/5 rounded-full -mr-24 -mt-24"></div>
        
        <div className="relative">
          <div className="w-24 h-24 bg-[#002d62] rounded-3xl mx-auto flex items-center justify-center mb-8 shadow-2xl rotate-3 transform transition-transform hover:rotate-0 cursor-default">
            <i className="fas fa-couch text-white text-4xl"></i>
          </div>
          
          <h2 className="text-4xl font-black text-center text-[#002d62] mb-3 brand-font tracking-tight">QUILT & DRAPES</h2>
          <p className="text-center text-slate-400 mb-10 font-bold uppercase tracking-[0.2em] text-[10px]">Internal Control Unit</p>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access ID</label>
              <div className="relative">
                <i className="fas fa-shield-halved absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-14 pr-6 py-4.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#002d62] transition-all font-bold text-slate-700"
                  placeholder="Enter Username"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Security Key</label>
              <div className="relative">
                <i className="fas fa-key absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-14 pr-6 py-4.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#002d62] transition-all font-bold text-slate-700"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-5 py-4 rounded-xl text-xs font-black uppercase tracking-widest flex flex-col gap-1 border border-red-100">
                <div className="flex items-center gap-3">
                   <i className="fas fa-exclamation-triangle"></i>
                   <span className="font-black">{error}</span>
                </div>
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#002d62] hover:bg-black text-white font-black py-5 rounded-2xl shadow-2xl shadow-[#002d62]/20 transition-all transform active:scale-95 text-xs uppercase tracking-[0.3em] disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Verify & Enter'}
            </button>
          </form>
          
          <div className="mt-12 pt-8 border-t border-slate-50 flex justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Architecture</p>
              <span className="text-[10px] font-bold text-[#c5a059]">Native Cloud Sync</span>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Production</p>
              <span className="text-[10px] font-bold text-slate-600">v2.4.0L</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
