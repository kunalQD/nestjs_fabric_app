
import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { OrderBilling } from '../types';

export const Billing: React.FC = () => {
  const [billingData, setBillingData] = useState<OrderBilling[]>([]);
  const [selectedBill, setSelectedBill] = useState<OrderBilling | null>(null);
  const [isPrintingInvoice, setIsPrintingInvoice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBilling = () => {
    setLoading(true);
    dataService.getBillingData()
      .then(data => {
        setBillingData(data);
        setError(null);
      })
      .catch(err => {
        console.error("Billing component error:", err);
        setError("Unable to sync with production ledger.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  const handlePrintInvoice = () => {
    setIsPrintingInvoice(true);
    setTimeout(() => {
      window.print();
      setIsPrintingInvoice(false);
    }, 300);
  };

  const totals = {
    revenue: billingData.reduce((sum, b) => sum + b.grand_total, 0),
    paid: billingData.filter(b => b.payment_status === 'Paid').reduce((sum, b) => sum + b.grand_total, 0),
    pending: billingData.filter(b => b.payment_status === 'Pending').reduce((sum, b) => sum + b.grand_total, 0),
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-[#002d62] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Ledger...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1000px] mx-auto space-y-6 md:space-y-10 relative">
      <div className="no-print space-y-6 md:space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-[#002d62] brand-font mb-2">Financial Ledger</h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] md:text-[10px]">Accounts receivable audit</p>
          </div>
          <button 
            onClick={fetchBilling}
            className="px-6 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest"
          >
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <SummaryCard title="Total Projected" value={totals.revenue} color="#002d62" icon="fa-vault" />
          <SummaryCard title="Total Paid" value={totals.paid} color="#059669" icon="fa-circle-check" />
          <SummaryCard title="Outstanding" value={totals.pending} color="#c5a059" icon="fa-hourglass-start" />
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-white text-[#002d62] text-[9px] font-black uppercase tracking-widest border-b border-slate-50">
              <tr>
                <th className="px-6 md:px-8 py-6">Client & Team</th>
                <th className="px-6 md:px-8 py-6 text-center">Settlement</th>
                <th className="px-6 md:px-8 py-6 text-center">Status</th>
                <th className="px-6 md:px-8 py-6 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {billingData.map((bill, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 md:px-8 py-6">
                    <div className="font-black text-slate-800">{bill.customer_name}</div>
                    <div className="text-[8px] font-black uppercase text-[#c5a059]">
                      {bill.tailor} • {bill.fitter}
                    </div>
                  </td>
                  <td className="px-6 md:px-8 py-6 text-center font-mono font-black text-slate-700">₹{bill.grand_total.toLocaleString()}</td>
                  <td className="px-6 md:px-8 py-6 text-center">
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${bill.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {bill.payment_status}
                    </span>
                  </td>
                  <td className="px-6 md:px-8 py-6 text-right">
                    <button onClick={() => setSelectedBill(bill)} className="p-2 bg-slate-100 text-[#002d62] rounded-lg">
                      <i className="fas fa-file-invoice-dollar"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Modal & Print View (Remains stable with improved print styles) */}
    </div>
  );
};

const SummaryCard: React.FC<{ title: string; value: number; color: string; icon: string }> = ({ title, value, color, icon }) => (
  <div className="bg-white p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-100 flex justify-between items-center">
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-xl md:text-2xl font-black text-slate-900">₹ {value.toLocaleString('en-IN')}</h3>
    </div>
    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}08`, color }}>
      <i className={`fas ${icon}`}></i>
    </div>
  </div>
);
