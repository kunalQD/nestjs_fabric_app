
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
        setError("Unable to sync with production ledger. Please verify backend connection.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  const handlePrintInvoice = () => {
    setIsPrintingInvoice(true);
    // Use a slight delay to ensure the DOM is ready for printing
    setTimeout(() => {
      window.print();
      setIsPrintingInvoice(false);
    }, 250);
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
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Auditing Ledger...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1000px] mx-auto space-y-10 relative">
      {/* Screen View */}
      <div className="no-print space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8">
          <div>
            <h2 className="text-4xl font-black text-[#002d62] brand-font mb-2">Financial Ledger</h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Accounts receivable and fabrication billing</p>
          </div>
          <button 
            onClick={fetchBilling}
            className="px-6 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <i className="fas fa-sync-alt mr-2"></i> Refresh Data
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 p-6 rounded-[2rem] flex items-center gap-4 text-red-600">
            <i className="fas fa-exclamation-circle text-xl"></i>
            <p className="text-xs font-black uppercase tracking-widest">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SummaryCard title="Total Projected" value={totals.revenue} color="#002d62" icon="fa-vault" />
          <SummaryCard title="Verified Paid" value={totals.paid} color="#059669" icon="fa-circle-check" />
          <SummaryCard title="Outstanding" value={totals.pending} color="#c5a059" icon="fa-hourglass-start" />
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden mt-10">
          <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-black text-[#002d62] uppercase tracking-widest text-xs">Active Accounts</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{billingData.length} Entries</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white text-[#002d62] text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-6">Client & Team</th>
                  <th className="px-8 py-6 text-center">Settlement</th>
                  <th className="px-8 py-6 text-center">Status</th>
                  <th className="px-8 py-6 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {billingData.map((bill, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="font-black text-slate-800 text-lg tracking-tight">{bill.customer_name}</div>
                      <div className="text-[9px] font-black uppercase text-[#c5a059] tracking-widest mt-0.5">
                        Tailor: {bill.tailor} • Fitter: {bill.fitter}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="font-mono font-black text-slate-700 text-xl">₹ {bill.grand_total.toLocaleString('en-IN')}</div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${bill.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        {bill.payment_status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => setSelectedBill(bill)}
                        className="p-3 bg-slate-100 text-[#002d62] rounded-xl hover:bg-[#002d62] hover:text-white transition-all"
                      >
                        <i className="fas fa-receipt"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Breakdown Modal */}
      {selectedBill && !isPrintingInvoice && (
        <div className="fixed inset-0 bg-[#002d62]/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 no-print">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col scale-in">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/80">
              <div>
                <h4 className="text-2xl font-black text-[#002d62] brand-font">{selectedBill.customer_name}</h4>
                <div className="flex items-center gap-3 mt-1">
                   <p className="text-[9px] font-black text-[#c5a059] uppercase tracking-widest">Team: {selectedBill.tailor} & {selectedBill.fitter}</p>
                </div>
              </div>
              <button onClick={() => setSelectedBill(null)} className="w-12 h-12 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors">
                <i className="fas fa-times text-slate-400 text-xl"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <BreakupTable title="Fabrication (Stitching)" subtotal={selectedBill.stitching_total} items={selectedBill.stitching_breakup} />
                <BreakupTable title="Deployment (Installation)" subtotal={selectedBill.fitting_total} items={selectedBill.fitting_breakup} />
              </div>

              <div className="bg-[#002d62] p-10 rounded-[2.5rem] text-white flex justify-between items-center shadow-xl">
                <div>
                  <p className="text-[#c5a059] text-[10px] font-black uppercase tracking-widest mb-1">Total Receivable</p>
                  <h3 className="text-4xl font-black font-mono">₹ {selectedBill.grand_total.toLocaleString('en-IN')}</h3>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={handlePrintInvoice}
                    className="px-8 py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all"
                  >
                    Generate Invoice
                  </button>
                  <button className="px-8 py-4 bg-[#c5a059] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg">
                    Mark as Collected
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT VIEW - OPTIMIZED FOR A4 PDF */}
      {selectedBill && (
        <div className="only-print bg-white p-0 m-0 w-full min-h-screen">
          <div className="p-12 max-w-[800px] mx-auto">
            <div className="flex justify-between items-start mb-12 border-b-8 border-[#002d62] pb-10">
              <div>
                <h1 className="text-4xl font-black text-[#002d62] tracking-tighter mb-1">QUILT & DRAPES</h1>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Official Billing Statement</p>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-black text-[#c5a059] mb-1 uppercase tracking-widest">Invoice</h2>
                <p className="text-[10px] font-bold text-slate-400">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-12">
              <div>
                <p className="text-[9px] font-black text-[#c5a059] uppercase tracking-widest mb-3">Bill To</p>
                <p className="text-2xl font-black text-slate-900 mb-1">{selectedBill.customer_name}</p>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Project Team</p>
                  <div className="flex gap-6">
                    <div><p className="text-[8px] font-bold text-slate-400 uppercase">Fabrication</p><p className="text-xs font-black text-slate-700">{selectedBill.tailor}</p></div>
                    <div><p className="text-[8px] font-bold text-slate-400 uppercase">Installation</p><p className="text-xs font-black text-slate-700">{selectedBill.fitter}</p></div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col justify-between">
                 <div className="flex justify-between items-center mb-4">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Account Status</p>
                   <span className="px-3 py-1 bg-[#002d62] text-white text-[8px] font-black rounded-lg uppercase">{selectedBill.payment_status}</span>
                 </div>
                 <div className="space-y-1.5">
                   <div className="flex justify-between text-xs font-bold text-slate-600 uppercase"><span>Subtotal</span><span>₹ {selectedBill.grand_total.toLocaleString()}</span></div>
                   <div className="h-px bg-slate-200 my-3"></div>
                   <div className="flex justify-between items-center text-xl font-black text-[#002d62] uppercase"><span>Total Due</span><span>₹ {selectedBill.grand_total.toLocaleString()}</span></div>
                 </div>
              </div>
            </div>

            <table className="w-full mb-12 rounded-xl overflow-hidden border border-slate-200 border-collapse">
              <thead>
                <tr className="bg-[#002d62] text-white">
                  <th className="p-3 text-left text-[9px] font-black uppercase">Service Description</th>
                  <th className="p-3 text-center text-[9px] font-black uppercase">Qty</th>
                  <th className="p-3 text-center text-[9px] font-black uppercase">Rate</th>
                  <th className="p-3 text-right text-[9px] font-black uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedBill.stitching_breakup.map((item, i) => (
                  <tr key={`s-${i}`}>
                    <td className="p-3 text-xs font-bold">{item.type}</td>
                    <td className="p-3 text-center text-xs">{item.qty}</td>
                    <td className="p-3 text-center text-xs">₹{item.rate}</td>
                    <td className="p-3 text-right text-xs font-bold">₹{item.amount.toLocaleString()}</td>
                  </tr>
                ))}
                {selectedBill.fitting_breakup.map((item, i) => (
                  <tr key={`f-${i}`}>
                    <td className="p-3 text-xs font-bold">{item.type}</td>
                    <td className="p-3 text-center text-xs">{item.qty}</td>
                    <td className="p-3 text-center text-xs">₹{item.rate}</td>
                    <td className="p-3 text-right text-xs font-bold">₹{item.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200">
               <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3">Terms & Conditions</h4>
               <p className="text-[8px] text-slate-400 leading-relaxed">This is an automated production log. All dimensions and units are factory verified. Payments due upon deployment.</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .only-print { 
            display: block !important; 
            visibility: visible !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          body { background: white !important; margin: 0; padding: 0; }
        }
        @media screen {
          .only-print { display: none !important; }
        }
        .scale-in { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
};

const BreakupTable: React.FC<{ title: string; items: any[]; subtotal: number }> = ({ title, items, subtotal }) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <h5 className="text-[11px] font-black text-[#c5a059] uppercase tracking-widest">{title}</h5>
      <span className="text-[10px] font-black text-slate-300 uppercase">{items.length} units</span>
    </div>
    <div className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden">
      <table className="w-full text-xs">
        <tbody className="divide-y divide-slate-100">
          {items.length === 0 ? (
            <tr><td className="px-6 py-4 text-slate-400 italic">No items recorded</td></tr>
          ) : items.map((item, i) => (
            <tr key={i}>
              <td className="px-6 py-4">
                <p className="font-bold text-slate-700">{item.type}</p>
                <p className="text-[8px] text-slate-400 uppercase mt-0.5">Qty: {item.qty} | Rate: ₹{item.rate}</p>
              </td>
              <td className="px-6 py-4 text-right font-mono font-bold text-slate-600">₹{item.amount.toLocaleString()}</td>
            </tr>
          ))}
          <tr className="bg-slate-100/50">
            <td className="px-6 py-4 font-black text-[#002d62] uppercase text-[9px]">Subtotal</td>
            <td className="px-6 py-4 text-right font-black text-[#002d62] font-mono text-base">₹ {subtotal.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const SummaryCard: React.FC<{ title: string; value: number; color: string; icon: string }> = ({ title, value, color, icon }) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex justify-between items-center group">
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-2xl font-black text-slate-900 tracking-tight">₹ {value.toLocaleString('en-IN')}</h3>
    </div>
    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}08`, color }}>
      <i className={`fas ${icon}`}></i>
    </div>
  </div>
);
