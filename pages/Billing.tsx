
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
    // Timeout allows DOM to render the printable content before the browser grab
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
    <div className="p-8 max-w-[1000px] mx-auto space-y-10 relative">
      {/* Screen View */}
      <div className="no-print space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8">
          <div>
            <h2 className="text-4xl font-black text-[#002d62] brand-font mb-2">Financial Ledger</h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Accounts receivable audit</p>
          </div>
          <button 
            onClick={fetchBilling}
            className="px-6 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <i className="fas fa-sync-alt mr-2"></i> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SummaryCard title="Total Projected" value={totals.revenue} color="#002d62" icon="fa-vault" />
          <SummaryCard title="Total Paid" value={totals.paid} color="#059669" icon="fa-circle-check" />
          <SummaryCard title="Outstanding" value={totals.pending} color="#c5a059" icon="fa-hourglass-start" />
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden mt-10">
          <table className="w-full text-left">
            <thead className="bg-white text-[#002d62] text-[10px] font-black uppercase tracking-widest border-b border-slate-50">
              <tr>
                <th className="px-8 py-6">Client & Assignment</th>
                <th className="px-8 py-6 text-center">Settlement</th>
                <th className="px-8 py-6 text-center">Status</th>
                <th className="px-8 py-6 text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {billingData.map((bill, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="font-black text-slate-800 text-lg">{bill.customer_name}</div>
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
                      <i className="fas fa-file-invoice-dollar"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDF Generation View (Rendered only for Print) */}
      {selectedBill && (
        <div className={`printable-container ${isPrintingInvoice ? 'only-print' : 'hidden no-print'}`}>
          <div className="print-page bg-white p-16 min-h-screen">
            <div className="flex justify-between items-start mb-12 border-b-8 border-[#002d62] pb-10">
              <div>
                <h1 className="text-5xl font-black text-[#002d62] tracking-tighter mb-1">QUILT & DRAPES</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Official Technical Invoice</p>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-black text-[#c5a059] mb-1">INVOICE</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase">INV-{selectedBill.order_id.substring(0, 8)}</p>
                <p className="text-[10px] font-bold text-slate-500 mt-1">{new Date().toLocaleDateString('en-GB')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-16 mb-16">
              <div>
                <p className="text-[10px] font-black text-[#c5a059] uppercase tracking-widest mb-4">Bill To</p>
                <p className="text-3xl font-black text-slate-900 mb-2">{selectedBill.customer_name}</p>
                <div className="mt-8 pt-6 border-t border-slate-100 flex gap-10">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Tailoring</p>
                    <p className="text-sm font-black text-slate-700">{selectedBill.tailor}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Installation</p>
                    <p className="text-sm font-black text-slate-700">{selectedBill.fitter}</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Status</p>
                  <span className="px-4 py-1.5 bg-[#002d62] text-white text-[9px] font-black rounded-lg uppercase">{selectedBill.payment_status}</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold text-slate-500 uppercase"><span>Stitching Fees</span><span>₹{selectedBill.stitching_total.toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs font-bold text-slate-500 uppercase"><span>Fitting Fees</span><span>₹{selectedBill.fitting_total.toLocaleString()}</span></div>
                  <div className="h-px bg-slate-200 my-4"></div>
                  <div className="flex justify-between items-center text-3xl font-black text-[#002d62]"><span>Total</span><span>₹ {selectedBill.grand_total.toLocaleString()}</span></div>
                </div>
              </div>
            </div>

            <table className="w-full mb-12 border border-slate-200 rounded-xl overflow-hidden border-collapse">
              <thead>
                <tr className="bg-[#002d62] text-white">
                  <th className="p-4 text-left text-[10px] font-black uppercase">Service Entry</th>
                  <th className="p-4 text-center text-[10px] font-black uppercase">Qty</th>
                  <th className="p-4 text-center text-[10px] font-black uppercase">Rate</th>
                  <th className="p-4 text-right text-[10px] font-black uppercase">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedBill.stitching_breakup.map((item, i) => (
                  <tr key={`s-${i}`} className="bg-white">
                    <td className="p-4 font-bold text-slate-800 text-sm">{item.type}</td>
                    <td className="p-4 text-center text-sm">{item.qty}</td>
                    <td className="p-4 text-center text-sm">₹{item.rate}</td>
                    <td className="p-4 text-right font-black text-slate-900">₹{item.amount.toLocaleString()}</td>
                  </tr>
                ))}
                {selectedBill.fitting_breakup.map((item, i) => (
                  <tr key={`f-${i}`} className="bg-white">
                    <td className="p-4 font-bold text-slate-800 text-sm">{item.type} (Installation)</td>
                    <td className="p-4 text-center text-sm">{item.qty}</td>
                    <td className="p-4 text-center text-sm">₹{item.rate}</td>
                    <td className="p-4 text-right font-black text-slate-900">₹{item.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-200 page-break-inside-avoid">
               <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Terms & Conditions</h4>
               <p className="text-[9px] text-slate-400 leading-relaxed font-medium uppercase tracking-tighter">
                 This is an official fabrication audit. Installation warranty valid for 12 months. All measurements factory verified. Payments due immediately upon installation.
               </p>
            </div>
          </div>
        </div>
      )}

      {/* Screen Breakdown Modal */}
      {selectedBill && !isPrintingInvoice && (
        <div className="fixed inset-0 bg-[#002d62]/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 no-print">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col scale-in">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/80">
              <div>
                <h4 className="text-2xl font-black text-[#002d62] brand-font">{selectedBill.customer_name}</h4>
                <p className="text-[9px] font-black text-[#c5a059] uppercase tracking-widest mt-1">Audit Log: {selectedBill.order_id}</p>
              </div>
              <button onClick={() => setSelectedBill(null)} className="w-12 h-12 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors">
                <i className="fas fa-times text-slate-400 text-xl"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <BreakupTable title="Stitching Service" subtotal={selectedBill.stitching_total} items={selectedBill.stitching_breakup} />
                <BreakupTable title="Installation Service" subtotal={selectedBill.fitting_total} items={selectedBill.fitting_breakup} />
              </div>

              <div className="bg-[#002d62] p-10 rounded-[2.5rem] text-white flex justify-between items-center shadow-xl">
                <div>
                  <p className="text-[#c5a059] text-[10px] font-black uppercase tracking-widest mb-1">Final Settlement</p>
                  <h3 className="text-4xl font-black font-mono">₹ {selectedBill.grand_total.toLocaleString('en-IN')}</h3>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={handlePrintInvoice}
                    className="px-8 py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all"
                  >
                    Generate PDF
                  </button>
                  <button className="px-8 py-4 bg-[#c5a059] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg">
                    Mark as Paid
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .only-print { display: block !important; visibility: visible !important; position: static !important; }
          body { background: white !important; margin: 0; padding: 0; }
          .printable-container { width: 100% !important; margin: 0 !important; }
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
    <h5 className="text-[11px] font-black text-[#c5a059] uppercase tracking-widest">{title}</h5>
    <div className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden">
      <table className="w-full text-xs">
        <tbody className="divide-y divide-slate-100">
          {items.map((item, i) => (
            <tr key={i}>
              <td className="px-6 py-4 font-bold text-slate-700">{item.type} (x{item.qty})</td>
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
