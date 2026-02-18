
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
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [kpis, setKpis] = useState({
    orders: 0,
    fabric_pending: 0,
    stitching: 0,
    completed: 0,
    installation: 0
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [orderList, stats] = await Promise.all([
        dataService.getOrders(),
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
    fetchData();
    // Reduced frequency to improve background performance on mobile
    const interval = setInterval(fetchData, 30000); 
    return () => clearInterval(interval);
  }, []);

  const filteredOrders = orders.filter(o => 
    (o.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.phone || '').includes(search) ||
    (o.showroom || '').toLowerCase().includes(search.toLowerCase())
  );

  const statuses = Object.values(OrderStatus);

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
              placeholder="Search clients..."
              className="w-full md:w-64 pl-10 pr-6 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#002d62]/10 transition-all outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('board')}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'board' ? 'bg-[#002d62] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Workflow
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-[#002d62] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Order List
            </button>
          </div>
          <button 
            onClick={fetchData}
            className="hidden md:flex w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl items-center justify-center transition-all"
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

      {viewMode === 'board' ? (
        <div className="kanban-scroll flex gap-4 md:gap-6 overflow-x-auto pb-6 items-start touch-pan-x cursor-grab active:cursor-grabbing">
          {statuses.map(status => {
            const statusOrders = filteredOrders.filter(o => o.status === status);
            return (
              <div key={status} className="min-w-[280px] md:min-w-[320px] max-w-[320px] flex-shrink-0">
                <div className="flex justify-between items-center mb-4 px-2">
                  <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{status}</h3>
                  <span className="bg-slate-200 text-slate-600 px-2.5 py-1 rounded-lg text-[9px] font-black">
                    {statusOrders.length}
                  </span>
                </div>
                <div className="space-y-4 min-h-[500px]">
                  {statusOrders.length === 0 ? (
                    <div className="border-2 border-dashed border-slate-100 rounded-[2rem] h-24 flex items-center justify-center opacity-40 bg-white/50">
                      <p className="text-[8px] font-black uppercase tracking-widest">Stage Empty</p>
                    </div>
                  ) : (
                    statusOrders.map(order => {
                      const totalSqft = order.entries.reduce((sum, entry) => sum + (entry.sqft || 0), 0);
                      return (
                        <div 
                          key={order.order_id} 
                          onClick={() => onEditOrder(order.order_id)}
                          className="bg-white p-4 md:p-5 rounded-[1.5rem] shadow-sm border border-slate-100 hover:shadow-xl hover:border-[#c5a059]/40 cursor-pointer transition-all group relative overflow-hidden"
                        >
                          <div className={`absolute top-0 left-0 w-1 md:w-1.5 h-full ${STATUS_COLORS[status] || 'bg-slate-300'}`}></div>
                          <div className="mb-3">
                            <h4 className="font-black text-slate-800 text-sm md:text-base group-hover:text-[#002d62] transition-colors tracking-tight truncate">
                              {order.customer_name}
                            </h4>
                            <div className="flex justify-between items-center mt-1">
                              <p className="text-[8px] md:text-[9px] font-black text-[#c5a059] uppercase tracking-widest">{order.showroom}</p>
                              <p className="text-[8px] md:text-[9px] font-bold text-slate-400">#{order.order_id.substring(0,6)}</p>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                            <div className="text-[8px] md:text-[9px] font-bold text-slate-400 flex items-center gap-1.5">
                              <i className="fas fa-maximize text-[9px] md:text-[10px]"></i>
                              {totalSqft > 0 ? `${totalSqft.toFixed(1)} SQFT` : 'TBD'}
                            </div>
                            <div className="text-right">
                               <p className="text-[8px] md:text-[9px] font-black text-slate-700">{order.due_date ? new Date(order.due_date).toLocaleDateString('en-GB') : 'No Date'}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead className="bg-slate-50 text-[#002d62] uppercase font-black tracking-widest text-[9px]">
              <tr>
                <th className="px-6 md:px-8 py-5">Order Context</th>
                <th className="px-6 md:px-8 py-5">Status</th>
                <th className="px-6 md:px-8 py-5">Timeline</th>
                <th className="px-6 md:px-8 py-5">Team</th>
                <th className="px-6 md:px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.map(order => (
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
                  <td className="px-6 md:px-8 py-4 text-[10px] font-black">
                    <span className="text-slate-600">T: {order.tailor || '-'}</span><br/>
                    <span className="text-[#c5a059]">F: {order.fitter || '-'}</span>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
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
