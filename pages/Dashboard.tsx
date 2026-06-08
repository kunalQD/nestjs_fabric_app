
import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { Order, OrderStatus } from '../types';
import { STATUS_COLORS, BRAND_COLORS } from '../constants';

interface DashboardProps {
  onEditOrder: (orderId: string) => void;
  onAuthError?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onEditOrder, onAuthError }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [kpis, setKpis] = useState({
    orders: 0,
    fabric_pending: 0,
    stitching: 0,
    completed: 0,
    installation: 0
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async (searchQuery = '') => {
    try {
      const [orderList, stats] = await Promise.all([
        dataService.getOrders(searchQuery),
        dataService.getKPIs()
      ]);
      setOrders(orderList);
      if (stats) setKpis(stats);
    } catch (err: any) {
      console.error("Dashboard Sync Error:", err);
      if (err.message === 'AUTH_REQUIRED' && onAuthError) {
        onAuthError();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetchData(search);
    }, 450); // 450ms debounce
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!search) {
        fetchData();
      }
    }, 30000); 
    return () => clearInterval(interval);
  }, [search]);

  const filteredOrders = orders.filter(o => 
    (o.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.phone || '').includes(search) ||
    (o.showroom || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#002d62] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Production Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1700px] mx-auto space-y-6 md:space-y-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-[#002d62] brand-font">Operations Command</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[8px] md:text-[9px] mt-1">Real-time production & logistics monitoring</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
          <div className="relative">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
            <input 
              type="text" 
              placeholder="Search clients, showroom, ids..."
              className="w-full md:w-80 pl-10 pr-6 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#002d62]/10 transition-all outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => fetchData(search)}
            className="flex w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl items-center justify-center transition-all"
          >
            <i className="fas fa-sync-alt text-slate-400 text-xs"></i>
          </button>
        </div>
      </div>

      {/* KPI Section - Responsive Grids */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <KPICard title="Portfolio" value={kpis.orders} color="#002d62" icon="fa-layer-group" />
        <KPICard title="Fabric" value={kpis.fabric_pending} color="#d97706" icon="fa-clock-rotate-left" />
        <KPICard title="Tailoring" value={kpis.stitching} color="#4338ca" icon="fa-scissors" />
        <KPICard title="Deployment" value={kpis.installation} color="#c5a059" icon="fa-truck-fast" />
        <div className="col-span-2 md:col-span-1">
          <KPICard title="Fulfilled" value={kpis.completed} color="#059669" icon="fa-circle-check" />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-x-auto animate-in fade-in duration-300">
        <table className="w-full text-left text-xs min-w-[600px]">
          <thead className="bg-slate-50 text-[#002d62] uppercase font-black tracking-widest text-[9px]">
            <tr>
              <th className="px-6 md:px-8 py-5">Order Context</th>
              <th className="px-6 md:px-8 py-5">Status</th>
              <th className="px-6 md:px-8 py-5">Timeline</th>
              <th className="px-6 md:px-8 py-5">Completed Date</th>
              <th className="px-6 md:px-8 py-5">Assignment</th>
              <th className="px-6 md:px-8 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  No matching orders found
                </td>
              </tr>
            ) : (
              filteredOrders.map(order => (
                <tr key={order.order_id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 md:px-8 py-4">
                    <div className="font-black text-slate-800 text-sm">{order.customer_name}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase">{order.showroom} • {order.phone}</div>
                  </td>
                  <td className="px-6 md:px-8 py-4">
                    <span className={`px-2 py-1 rounded-full text-[7px] font-black uppercase tracking-wider text-white ${STATUS_COLORS[order.status]}`}>
                      {order.status.split(' ')[0]}
                    </span>
                  </td>
                  <td className="px-6 md:px-8 py-4">
                    <div className="font-bold text-slate-700">{order.due_date ? new Date(order.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'TBD'}</div>
                  </td>
                  <td className="px-6 md:px-8 py-4">
                    <div className="font-bold text-emerald-600">
                      {order.completed_at ? new Date(order.completed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </div>
                  </td>
                  <td className="px-6 md:px-8 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black text-slate-400 uppercase">Tailor</span>
                        <span className="text-[10px] font-black text-slate-700">{order.tailor || 'None'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black text-[#c5a059] uppercase">Fitter</span>
                        <span className="text-[10px] font-black text-[#c5a059]">{order.fitter || 'None'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 md:px-8 py-4 text-right">
                    <button 
                      onClick={() => onEditOrder(order.order_id)}
                      className="p-2 bg-[#002d62] text-white rounded-lg hover:bg-black transition-all"
                    >
                      <i className="fas fa-arrow-right text-[10px]"></i>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const KPICard: React.FC<{ title: string; value: number; color: string; icon: string }> = ({ title, value, color, icon }) => (
  <div className="bg-white p-3 md:p-5 rounded-xl md:rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
    <div className="relative flex justify-between items-start">
      <div>
        <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-xl md:text-2xl font-black text-slate-900" style={{ color: value > 0 ? color : '#cbd5e1' }}>{value}</h3>
      </div>
      <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}10`, color }}>
        <i className={`fas ${icon} text-[10px] md:text-sm`}></i>
      </div>
    </div>
  </div>
);
