import React, { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { dataService } from '../services/dataService';
import { Order } from '../types';
import { STATUS_COLORS } from '../constants';

interface DashboardProps {
  onEditOrder: (orderId: string) => void;
  onAuthError?: () => void;
}

// Sub-component for individual table rows
const OrderRow = React.memo(({ order, onEdit }: { order: Order; onEdit: (id: string) => void }) => {
  const formattedDate = order.due_date
    ? new Date(order.due_date).toLocaleDateString('en-IN')
    : 'TBD';

  return (
    <tr className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
      <td className="px-6 py-4 font-black text-slate-800">{order.customer_name}</td>
      <td className="px-6 py-4 text-slate-500 font-bold">{order.showroom}</td>
      <td className="px-6 py-4">
        <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase text-white ${STATUS_COLORS[order.status]}`}>
          {order.status}
        </span>
      </td>
      <td className="px-6 py-4 font-bold text-slate-700">{formattedDate}</td>
      <td className="px-6 py-4 text-right">
        <button
          onClick={() => onEdit(order.order_id)}
          className="p-2 bg-[#002d62] text-white rounded-lg hover:bg-black transition-all"
        >
          <i className="fas fa-arrow-right text-[10px]"></i>
        </button>
      </td>
    </tr>
  );
});

// Sub-component for KPI Statistics
const KPICard = React.memo(({ title, value, color }: { title: string; value: number; color: string }) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-50">
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
    <h3 className="text-2xl font-black" style={{ color: value > 0 ? color : '#cbd5e1' }}>
      {value}
    </h3>
  </div>
));

export const Dashboard: React.FC<DashboardProps> = ({ onEditOrder, onAuthError }) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: orders, error: orderError, mutate: refreshOrders, isValidating: isSyncing } = useSWR(
    ['orders-list', debouncedSearch], 
    () => dataService.getOrders(debouncedSearch),
    {
      revalidateOnFocus: false,
      dedupingInterval: 3000,
      onError: (err) => {
        if (err.message === 'AUTH_REQUIRED' && onAuthError) onAuthError();
      }
    }
  );

  const { data: kpis } = useSWR('kpi-stats', () => dataService.getKPIs());

  if (!orders && !orderError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#002d62] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Production...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1700px] mx-auto space-y-6 md:space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-[#002d62]">Operations Command</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[8px] md:text-[9px] mt-1">
            Active production: Anna Nagar & Valasaravakkam
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
          <div className="relative">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
            <input
              type="text"
              placeholder="Search Name or Phone..."
              className="w-full md:w-80 pl-10 pr-6 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#002d62]/10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            onClick={() => refreshOrders()}
            className={`flex w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl items-center justify-center transition-all ${isSyncing ? 'animate-pulse' : ''}`}
          >
            <i className={`fas fa-sync-alt text-slate-400 text-xs ${isSyncing ? 'fa-spin' : ''}`}></i>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <KPICard title="Portfolio" value={kpis?.orders || 0} color="#002d62" />
        <KPICard title="Fabric" value={kpis?.fabric_pending || 0} color="#d97706" />
        <KPICard title="Tailoring" value={kpis?.stitching || 0} color="#4338ca" />
        <KPICard title="Deployment" value={kpis?.installation || 0} color="#c5a059" />
        <KPICard title="Fulfilled" value={kpis?.completed || 0} color="#059669" />
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50 text-[#002d62] uppercase font-black tracking-widest text-[9px]">
              <tr>
                <th className="px-6 py-5">Client</th>
                <th className="px-6 py-5">Showroom</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5">Due Date</th>
                <th className="px-6 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders && orders.length > 0 ? (
                orders.map(order => (
                  <OrderRow key={order.order_id} order={order} onEdit={onEditOrder} />
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {isSyncing ? "Searching..." : "No active orders matching this search"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="bg-slate-50/50 p-4 text-center border-t border-slate-50">
           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
             Showing latest 15 active orders. Use search for Name/Phone to find older records.
           </p>
        </div>
      </div>
    </div>
  );
};