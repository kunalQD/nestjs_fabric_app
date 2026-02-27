
import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { OrderBilling } from '../types';

export const Settlements: React.FC = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [billingData, setBillingData] = useState<OrderBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);

  const fetchSettlements = () => {
    setLoading(true);
    dataService.getBillingData(startDate, endDate)
      .then(data => {
        setBillingData(data);
        setError(null);
      })
      .catch(err => {
        console.error("Settlements fetch error:", err);
        setError("Failed to load settlement data.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSettlements();
  }, [startDate, endDate]);

  const totals = billingData.reduce((acc, b) => {
    acc.totalBilling += b.total_bill;
    acc.totalPaid += b.paid_total;
    
    b.payments.forEach(p => {
      const method = (p.method || '').toUpperCase();
      if (method === 'CASH') acc.cash += p.amount;
      else if (method === 'CARD') acc.card += p.amount;
      else if (['UPI', 'BANK', 'TRANSFER', 'ONLINE'].some(m => method.includes(m))) acc.upi += p.amount;
      else acc.others += p.amount;
    });
    
    return acc;
  }, {
    totalBilling: 0,
    totalPaid: 0,
    cash: 0,
    card: 0,
    upi: 0,
    others: 0
  });

  const balanceToReceive = totals.totalBilling - totals.totalPaid;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-[#002d62] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Auditing Accounts...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-[#002d62] brand-font mb-2">Customer Settlements</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] md:text-[10px]">Payment tracking & balance reconciliation</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">From</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-[#002d62] outline-none focus:border-[#002d62]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">To</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-[#002d62] outline-none focus:border-[#002d62]"
            />
          </div>
          <button 
            onClick={fetchSettlements}
            className="px-6 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all mt-auto"
          >
            <i className="fas fa-sync-alt mr-2"></i> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SummaryCard title="Total Billing" value={totals.totalBilling} color="#002d62" icon="fa-file-invoice" />
        <SummaryCard title="Balance to Receive" value={balanceToReceive} color="#ef4444" icon="fa-hand-holding-dollar" />
        <SummaryCard title="Cash Received" value={totals.cash} color="#059669" icon="fa-money-bill-wave" />
        <SummaryCard title="Card Received" value={totals.card} color="#3b82f6" icon="fa-credit-card" />
        <SummaryCard title="UPI / Bank Received" value={totals.upi} color="#8b5cf6" icon="fa-mobile-screen-button" />
        <SummaryCard title="Other Received" value={totals.others} color="#64748b" icon="fa-wallet" />
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold border border-red-100 flex items-center gap-3">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50/50 text-[#002d62] text-[9px] font-black uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 md:px-10 py-6">Customer Name</th>
                <th className="px-6 md:px-10 py-6 text-center">Total Bill Value</th>
                <th className="px-6 md:px-10 py-6 text-center">Paid Amount</th>
                <th className="px-6 md:px-10 py-6 text-right">Balance Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {billingData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-10 py-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-[0.2em]">
                    No settlement records found
                  </td>
                </tr>
              ) : (
                billingData.map((bill, idx) => {
                  const balance = bill.total_bill - bill.paid_total;
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 md:px-10 py-6">
                        <div className="font-black text-slate-800 text-base">{bill.customer_name}</div>
                        <div className="text-[9px] font-black uppercase text-slate-400 mt-0.5">
                          ORD-{bill.order_id.substring(0, 8).toUpperCase()}
                        </div>
                      </td>
                      <td className="px-6 md:px-10 py-6 text-center font-mono font-black text-slate-600">
                        ₹{bill.total_bill.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 md:px-10 py-6 text-center font-mono font-black text-emerald-600">
                        ₹{bill.paid_total.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 md:px-10 py-6 text-right font-mono font-black text-red-500 text-lg">
                        ₹{balance.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SummaryCard: React.FC<{ title: string; value: number; color: string; icon: string }> = ({ title, value, color, icon }) => (
  <div className="bg-white p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-100 flex justify-between items-center group hover:shadow-md transition-all">
    <div className="space-y-1">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
      <h3 className="text-xl md:text-2xl font-black text-slate-900 group-hover:scale-105 transition-transform origin-left">₹ {value.toLocaleString('en-IN')}</h3>
    </div>
    <div className="w-10 h-10 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all group-hover:rotate-12" style={{ backgroundColor: `${color}08`, color }}>
      <i className={`fas ${icon} text-lg md:text-xl`}></i>
    </div>
  </div>
);
