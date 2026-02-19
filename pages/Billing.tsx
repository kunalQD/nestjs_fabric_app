
import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { OrderBilling, BillingLineItem } from '../types';

export const Billing: React.FC = () => {
  const [billingData, setBillingData] = useState<OrderBilling[]>([]);
  const [selectedBill, setSelectedBill] = useState<OrderBilling | null>(null);
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
    window.print();
  };

  const totals = {
    revenue: billingData.reduce((sum, b) => sum + b.grand_total, 0),
    paid: billingData.filter(b => b.payment_status === 'Paid').reduce((sum, b) => sum + b.grand_total, 0),
    pending: billingData.filter(b => b.payment_status === 'Pending').reduce((sum, b) => sum + b.grand_total, 0),
  };

  const getUnitLabel = (type: string, subtype?: string) => {
    const t = (subtype || type).toLowerCase();
    if (t.includes('blind') || t.includes('roman')) return 'Sqft';
    return 'Panels';
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
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6 md:space-y-10 relative">
      <div className="no-print space-y-6 md:space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-[#002d62] brand-font mb-2">Financial Ledger</h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] md:text-[10px]">Accounts receivable audit & settlement</p>
          </div>
          <button 
            onClick={fetchBilling}
            className="px-6 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <i className="fas fa-sync-alt mr-2"></i> Refresh Ledger
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <SummaryCard title="Total Projected" value={totals.revenue} color="#002d62" icon="fa-vault" />
          <SummaryCard title="Total Paid" value={totals.paid} color="#059669" icon="fa-circle-check" />
          <SummaryCard title="Outstanding" value={totals.pending} color="#c5a059" icon="fa-hourglass-start" />
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
                  <th className="px-6 md:px-10 py-6">Client & Project ID</th>
                  <th className="px-6 md:px-10 py-6 text-center">Settlement Amount</th>
                  <th className="px-6 md:px-10 py-6 text-center">Payment Status</th>
                  <th className="px-6 md:px-10 py-6 text-right">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {billingData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-10 py-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-[0.2em]">
                      No financial records found
                    </td>
                  </tr>
                ) : (
                  billingData.map((bill, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 md:px-10 py-6">
                        <div className="font-black text-slate-800 text-base">{bill.customer_name}</div>
                        <div className="text-[9px] font-black uppercase text-slate-400 mt-0.5">
                          ORD-{bill.order_id.substring(0, 8).toUpperCase()} • {bill.tailor || 'TBD'}
                        </div>
                      </td>
                      <td className="px-6 md:px-10 py-6 text-center font-mono font-black text-[#002d62] text-lg">
                        ₹{bill.grand_total.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 md:px-10 py-6 text-center">
                        <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${bill.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                          {bill.payment_status}
                        </span>
                      </td>
                      <td className="px-6 md:px-10 py-6 text-right">
                        <button 
                          onClick={() => setSelectedBill(bill)} 
                          className="w-10 h-10 bg-[#002d62]/5 text-[#002d62] rounded-xl hover:bg-[#002d62] hover:text-white transition-all flex items-center justify-center ml-auto"
                        >
                          <i className="fas fa-file-invoice-dollar text-[12px]"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Audit Detail Overlay */}
      {selectedBill && (
        <div className="no-print fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-[#002d62]/40 backdrop-blur-sm" onClick={() => setSelectedBill(null)}></div>
          
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in duration-300">
            {/* Header */}
            <div className="bg-[#002d62] p-10 text-white flex justify-between items-start">
              <div>
                <h3 className="text-3xl font-black brand-font mb-1">{selectedBill.customer_name}</h3>
                <p className="text-white/50 text-[11px] font-black uppercase tracking-[0.2em]">Settlement Audit | #{selectedBill.order_id.substring(0,8).toUpperCase()}</p>
              </div>
              <button 
                onClick={() => setSelectedBill(null)}
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="px-10 py-8 overflow-y-auto space-y-12">
              {/* Stitching Section */}
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-2">
                  <h4 className="text-[12px] font-black text-[#c5a059] uppercase tracking-[0.1em]">
                    STITCHING CHARGES ({selectedBill.tailor?.toUpperCase() || 'UNASSIGNED'})
                  </h4>
                  <span className="font-black text-slate-900 text-2xl">₹{selectedBill.stitching_total.toLocaleString('en-IN')}</span>
                </div>
                <div className="space-y-5">
                  {selectedBill.stitching_breakup.map((item, i) => (
                    <div key={i} className="flex justify-between items-center group">
                      <div className="flex flex-col">
                        <span className="text-[15px] font-black text-slate-700">
                          {item.type} <span className="text-[#cbd5e1] font-bold ml-1">× {item.qty} {getUnitLabel(item.type, item.subtype)}</span>
                        </span>
                        <span className="text-[10px] font-bold text-[#cbd5e1] uppercase tracking-widest mt-0.5">{item.subtype || 'Window Allocation'}</span>
                      </div>
                      <span className="font-bold text-slate-500 text-lg">₹{item.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  {selectedBill.stitching_breakup.length === 0 && (
                    <p className="text-[11px] text-slate-300 font-bold italic">No stitching records found</p>
                  )}
                </div>
              </div>

              {/* Fitting Section */}
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-2">
                  <h4 className="text-[12px] font-black text-[#c5a059] uppercase tracking-[0.1em]">
                    FITTING & HARDWARE ({selectedBill.fitter?.toUpperCase() || 'UNASSIGNED'})
                  </h4>
                  <span className="font-black text-slate-900 text-2xl">₹{selectedBill.fitting_total.toLocaleString('en-IN')}</span>
                </div>
                <div className="space-y-5">
                  {selectedBill.fitting_breakup.map((item, i) => (
                    <div key={i} className="flex justify-between items-center group">
                      <div className="flex flex-col">
                        <span className="text-[15px] font-black text-slate-700">
                          {item.type} <span className="text-[#cbd5e1] font-bold ml-1">× {item.qty} Units</span>
                        </span>
                      </div>
                      <span className="font-bold text-slate-500 text-lg">₹{item.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                   {selectedBill.fitting_breakup.length === 0 && (
                    <p className="text-[11px] text-slate-300 font-bold italic">No fitting records found</p>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-50"></div>
            </div>

            {/* Footer Actions */}
            <div className="p-10 bg-[#fcfcfc] flex gap-4">
              <button 
                onClick={handlePrintInvoice}
                className="flex-1 py-5 bg-[#c5a059] text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest hover:bg-[#a38345] transition-all shadow-xl flex items-center justify-center gap-2"
              >
                <i className="fas fa-print"></i> Generate Job Report
              </button>
              <button 
                onClick={() => setSelectedBill(null)}
                className="px-10 py-5 bg-white border border-slate-200 text-[#cbd5e1] rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest hover:bg-slate-100 transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Invoice View */}
      {selectedBill && (
        <div className="only-print p-12 bg-white min-h-screen text-slate-900 font-sans">
          <div className="flex justify-between items-start border-b-8 border-[#002d62] pb-10 mb-10">
            <div>
              <h1 className="text-5xl font-black text-[#002d62] tracking-tighter mb-1">QUILT & DRAPES</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Operational Settlement Invoice</p>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-black text-[#c5a059] mb-1">AUDIT</h2>
              <p className="text-xs font-bold text-slate-500">#{selectedBill.order_id.substring(0,12).toUpperCase()}</p>
              <p className="text-xs text-slate-400 mt-1">{new Date().toLocaleDateString('en-GB')}</p>
            </div>
          </div>

          <div className="bg-slate-50 p-8 rounded-3xl mb-10 grid grid-cols-2 gap-10">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Project Client</p>
              <p className="text-3xl font-black text-slate-900">{selectedBill.customer_name}</p>
              <p className="text-sm text-slate-500 font-bold mt-1 italic">Internal ID: {selectedBill.order_id}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-right self-end">
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tailoring</p>
                <p className="text-sm font-black">{selectedBill.tailor}</p>
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Installation</p>
                <p className="text-sm font-black">{selectedBill.fitter}</p>
              </div>
            </div>
          </div>

          <div className="space-y-10">
            <section>
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#c5a059] mb-4 border-b border-slate-100 pb-2">Stitching Breakdown</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 text-[9px] uppercase font-black">
                    <th className="py-2">Description</th>
                    <th className="py-2 text-center">Qty / {getUnitLabel('Curtain')}</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {selectedBill.stitching_breakup.map((item, i) => (
                    <tr key={i}>
                      <td className="py-3 font-bold">{item.type} {item.subtype ? `(${item.subtype})` : ''}</td>
                      <td className="py-3 text-center">{item.qty} {getUnitLabel(item.type, item.subtype)}</td>
                      <td className="py-3 text-right font-mono">₹{item.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section>
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#c5a059] mb-4 border-b border-slate-100 pb-2">Fitting & Hardware Breakdown</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 text-[9px] uppercase font-black">
                    <th className="py-2">Description</th>
                    <th className="py-2 text-center">Qty / Units</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {selectedBill.fitting_breakup.map((item, i) => (
                    <tr key={i}>
                      <td className="py-3 font-bold">{item.type}</td>
                      <td className="py-3 text-center">{item.qty}</td>
                      <td className="py-3 text-right font-mono">₹{item.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <div className="bg-[#002d62] text-white p-8 rounded-3xl flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Project Completion Audit</p>
                <h4 className="text-sm font-black uppercase tracking-[0.3em]">Total Settlement Value</h4>
              </div>
              <h3 className="text-4xl font-black">₹{selectedBill.grand_total.toLocaleString('en-IN')}</h3>
            </div>
          </div>

          <div className="mt-20 flex justify-between items-end">
            <div className="max-w-xs">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Verification</p>
              <p className="text-[9px] text-slate-400 leading-relaxed italic">
                This document serves as an official internal audit for project #{selectedBill.order_id.substring(0,8)}. 
                Subject to Quilt & Drapes quality control protocols.
              </p>
            </div>
            <div className="w-48 border-b border-slate-200 h-12 flex items-end justify-center">
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Operational Approval</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .only-print { display: block !important; visibility: visible !important; position: static !important; }
          body { background: white !important; }
        }
        @media screen {
          .only-print { display: none !important; }
        }
      `}</style>
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
