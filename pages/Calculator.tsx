
import React, { useState, useEffect, useRef } from 'react';
import { dataService } from '../services/dataService';
import { WindowEntry, OrderStatus, Order } from '../types';
import { SHOWROOMS, STITCH_TYPES, LINING_TYPES, TAILORS, FITTERS, BRAND_COLORS } from '../constants';

interface CalculatorProps {
  orderId: string | null;
  onSave: () => void;
}

export const Calculator: React.FC<CalculatorProps> = ({ orderId, onSave }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    showroom: SHOWROOMS[0],
    status: OrderStatus.FABRIC_PENDING,
    due_date: '',
    tailor: '',
    fitter: ''
  });

  const [entries, setEntries] = useState<WindowEntry[]>([]);
  
  const [currentEntry, setCurrentEntry] = useState<Partial<WindowEntry>>({
    window_name: '',
    stitch_type: STITCH_TYPES[0],
    lining_type: LINING_TYPES[0],
    width: 0,
    height: 0,
    notes: '',
    images: []
  });
  
  const [isEditWindow, setIsEditWindow] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (orderId) {
      setLoading(true);
      dataService.getOrderById(orderId).then(order => {
        if (order) {
          setCustomer({
            name: order.customer_name,
            phone: order.phone,
            address: order.address,
            showroom: order.showroom,
            status: order.status,
            due_date: order.due_date,
            tailor: order.tailor,
            fitter: order.fitter
          });
          setEntries(order.entries);
        }
        setLoading(false);
      });
    }
  }, [orderId]);

  const calculateMetrics = (stitch: string, w: number, h: number) => {
    let panels = 0;
    if (stitch === 'Pleated') panels = Math.round(w / 18);
    else if (stitch === 'Ripple') panels = Math.round(w / 20);
    else if (stitch === 'Eyelet') panels = Math.round(w / 24);
    else panels = 1;

    const hf = (h + 14) / 39;
    const quantity = parseFloat((panels * hf).toFixed(2));
    
    let sqft = 0;
    if (stitch.includes('Roman') || stitch.includes('Blinds')) {
      sqft = parseFloat(((Math.ceil(w / 12 * 2) / 2) * (Math.ceil(h / 12 * 2) / 2)).toFixed(2));
    }

    let track = 0;
    if (!stitch.includes('Roman') && !stitch.includes('Blinds')) {
      track = Math.ceil((w / 12) * 2) / 2;
    }

    return { panels, quantity, sqft, track };
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    const uploadedImages: string[] = [];
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      const promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
      });
      reader.readAsDataURL(file);
      const rawBase64 = await promise;
      if (rawBase64) uploadedImages.push(rawBase64);
    }
    
    setCurrentEntry(prev => ({
      ...prev,
      images: [...(prev.images || []), ...uploadedImages]
    }));
    
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setCurrentEntry(prev => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index)
    }));
  };

  const addOrUpdateWindow = () => {
    const { panels, quantity, sqft, track } = calculateMetrics(
      currentEntry.stitch_type || STITCH_TYPES[0],
      currentEntry.width || 0,
      currentEntry.height || 0
    );

    const windowId = currentEntry.window_id || Math.random().toString(36).substr(2, 9);
    const newEntry: WindowEntry = {
      window_id: windowId,
      window_name: currentEntry.window_name || 'Window',
      stitch_type: currentEntry.stitch_type || STITCH_TYPES[0],
      lining_type: currentEntry.lining_type || LINING_TYPES[0],
      width: currentEntry.width || 0,
      height: currentEntry.height || 0,
      notes: currentEntry.notes || '',
      images: currentEntry.images || [],
      panels,
      quantity,
      sqft,
      track
    } as WindowEntry;

    if (isEditWindow !== null) {
      const newEntries = [...entries];
      newEntries[isEditWindow] = newEntry;
      setEntries(newEntries);
      setIsEditWindow(null);
    } else {
      setEntries([...entries, newEntry]);
    }

    setCurrentEntry({
      window_name: '',
      stitch_type: STITCH_TYPES[0],
      lining_type: LINING_TYPES[0],
      width: 0,
      height: 0,
      notes: '',
      images: []
    });
  };

  const handleSaveOrder = async () => {
    if (!customer.name || !customer.phone) {
      alert("Please enter customer name and phone");
      return;
    }
    
    setLoading(true);
    try {
      await dataService.saveOrder({ 
        customer_name: customer.name,
        phone: customer.phone,
        address: customer.address,
        showroom: customer.showroom,
        status: customer.status,
        due_date: customer.due_date,
        tailor: customer.tailor,
        fitter: customer.fitter,
        order_id: orderId || undefined 
      }, entries);
      onSave();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 pb-24">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8 no-print">
        <div>
          <h2 className="text-4xl font-black text-[#002d62] brand-font mb-2">Design Specification</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Connected to Operations Hub</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => window.print()}
            className="px-6 py-4 bg-white text-[#002d62] border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 shadow-sm"
          >
            <i className="fas fa-file-pdf text-lg"></i> Download PDF Work Order
          </button>
          <button 
            disabled={loading}
            onClick={handleSaveOrder}
            className="px-10 py-4 bg-[#002d62] text-white rounded-2xl hover:bg-black transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Authorize Project'}
          </button>
        </div>
      </div>

      <div className="no-print space-y-10">
        <section className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-50">
          <h3 className="text-xl font-black mb-8 text-[#002d62] flex items-center gap-4">
            <span className="w-10 h-10 rounded-2xl bg-[#002d62] text-white flex items-center justify-center text-xs shadow-lg">01</span>
            Client Context
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Input label="Client Name" value={customer.name} onChange={v => setCustomer({...customer, name: v})} />
            <Input label="Direct Line" value={customer.phone} onChange={v => setCustomer({...customer, phone: v})} />
            <Input label="Installation Site" value={customer.address} onChange={v => setCustomer({...customer, address: v})} />
            <Select label="Assigning Showroom" options={SHOWROOMS} value={customer.showroom} onChange={v => setCustomer({...customer, showroom: v})} />
            <Select label="Project Stage" options={Object.values(OrderStatus)} value={customer.status} onChange={v => setCustomer({...customer, status: v as OrderStatus})} />
            <Input type="date" label="Deadline" value={customer.due_date} onChange={v => setCustomer({...customer, due_date: v})} />
            <Select label="Tailor" options={TAILORS} value={customer.tailor} onChange={v => setCustomer({...customer, tailor: v})} />
            <Select label="Fitter" options={FITTERS} value={customer.fitter} onChange={v => setCustomer({...customer, fitter: v})} />
          </div>
        </section>

        <section className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-50">
          <h3 className="text-xl font-black mb-8 text-[#002d62] flex items-center gap-4">
            <span className="w-10 h-10 rounded-2xl bg-[#c5a059] text-white flex items-center justify-center text-xs shadow-lg">02</span>
            Unit Registration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-2">
              <Input label="Unit Identifier" value={currentEntry.window_name || ''} onChange={v => setCurrentEntry({...currentEntry, window_name: v})} />
            </div>
            <Select label="Stitch Type" options={STITCH_TYPES} value={currentEntry.stitch_type || STITCH_TYPES[0]} onChange={v => setCurrentEntry({...currentEntry, stitch_type: v})} />
            <Select label="Lining Detail" options={LINING_TYPES} value={currentEntry.lining_type || LINING_TYPES[0]} onChange={v => setCurrentEntry({...currentEntry, lining_type: v})} />
            <Input type="number" label="Width (In)" value={currentEntry.width || 0} onChange={v => setCurrentEntry({...currentEntry, width: parseFloat(v) || 0})} />
            <Input type="number" label="Height (In)" value={currentEntry.height || 0} onChange={v => setCurrentEntry({...currentEntry, height: parseFloat(v) || 0})} />
            <div className="md:col-span-2">
              <Input label="Technical Notes" value={currentEntry.notes || ''} onChange={v => setCurrentEntry({...currentEntry, notes: v})} />
            </div>
          </div>

          <div className="mb-10 p-8 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
            <div className="flex flex-wrap gap-6">
              {currentEntry.images?.map((img, idx) => (
                <div key={idx} className="relative w-32 h-32 group">
                  <div className="w-full h-full rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-white flex items-center justify-center">
                    <img 
                      src={img} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f8fafc/002d62?text=Image';
                      }}
                    />
                  </div>
                  <button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full shadow-lg flex items-center justify-center text-xs">
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={uploading}
                className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-300 hover:text-[#002d62] hover:border-[#002d62] transition-all bg-white"
              >
                {uploading ? <div className="w-6 h-6 border-2 border-[#002d62] border-t-transparent rounded-full animate-spin"></div> : <><i className="fas fa-camera text-2xl"></i><span className="text-[9px] font-black uppercase tracking-widest">Add Site Photo</span></>}
              </button>
              <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handleImageUpload} />
            </div>
          </div>
          
          <button onClick={addOrUpdateWindow} className="w-full py-5 rounded-2xl font-black text-[11px] tracking-[0.4em] bg-[#002d62] text-white hover:bg-black transition-all shadow-xl">
            {isEditWindow !== null ? 'UPDATE SPECIFICATION' : 'ADD UNIT TO ORDER'}
          </button>
        </section>

        <section className="bg-white rounded-[3rem] shadow-sm border border-slate-50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-white text-[#002d62] uppercase text-[10px] font-black tracking-[0.3em]">
                <tr>
                  <th className="px-10 py-6">Unit Identity</th>
                  <th className="px-10 py-6 text-center">Size (")</th>
                  <th className="px-10 py-6">Meters Required</th>
                  <th className="px-10 py-6 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {entries.map((e, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 group">
                    <td className="px-10 py-8">
                      <div className="font-black text-slate-800 text-lg">{e.window_name}</div>
                      <div className="text-[10px] text-[#c5a059] font-black uppercase tracking-widest mt-1">{e.stitch_type} • {e.lining_type}</div>
                    </td>
                    <td className="px-10 py-8 text-center font-black text-slate-700">{e.width}" x {e.height}"</td>
                    <td className="px-10 py-8 font-mono font-black text-[#002d62]">{e.quantity.toFixed(2)} M</td>
                    <td className="px-10 py-8 text-right">
                      <button onClick={() => { setCurrentEntry({...entries[idx]}); setIsEditWindow(idx); }} className="w-10 h-10 bg-slate-50 rounded-xl hover:bg-amber-50 hover:text-amber-600 transition-all flex items-center justify-center mx-auto">
                        <i className="fas fa-pen"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* HIDDEN PRINT VIEW */}
      <div className="only-print p-12 bg-white">
        <div className="flex justify-between items-start mb-16 border-b-8 border-[#002d62] pb-10">
          <div>
            <h1 className="text-5xl font-black text-[#002d62] tracking-tighter mb-2">QUILT & DRAPES</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.4em]">Internal Technical Specification</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-[#c5a059] uppercase tracking-widest mb-1">Target Delivery</p>
            <p className="text-2xl font-black">{customer.due_date || 'URGENT'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-20 mb-16">
          <div>
            <h4 className="text-[10px] font-black text-[#c5a059] uppercase tracking-widest mb-4">Project Details</h4>
            <p className="text-3xl font-black text-slate-900 mb-2">{customer.name}</p>
            <p className="font-bold text-slate-500 text-lg mb-4">{customer.phone}</p>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
               <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Site Address</p>
               <p className="text-sm font-bold text-slate-600 leading-relaxed">{customer.address || 'Address not specified'}</p>
            </div>
          </div>
          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-[#c5a059] uppercase tracking-widest mb-4">Assignments</h4>
            <div className="grid grid-cols-2 gap-8">
               <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Tailor</p><p className="text-lg font-black">{customer.tailor || '---'}</p></div>
               <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Fitter</p><p className="text-lg font-black">{customer.fitter || '---'}</p></div>
            </div>
          </div>
        </div>

        <h4 className="text-[10px] font-black text-[#c5a059] uppercase tracking-widest mb-6">Fabrication Matrix</h4>
        <table className="w-full border-collapse mb-16 overflow-hidden rounded-2xl border border-slate-200">
          <thead>
            <tr className="bg-[#002d62] text-white">
              <th className="p-5 text-left text-[11px] font-black uppercase tracking-widest">Unit Identity</th>
              <th className="p-5 text-center text-[11px] font-black uppercase tracking-widest">Dimensions</th>
              <th className="p-5 text-left text-[11px] font-black uppercase tracking-widest">Stitch/Lining</th>
              <th className="p-5 text-center text-[11px] font-black uppercase tracking-widest">Quantity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {entries.map((e, i) => (
              <tr key={i}>
                <td className="p-5"><p className="font-black text-slate-900 text-lg">{e.window_name}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{e.notes}</p></td>
                <td className="p-5 text-center font-bold text-slate-700 text-lg">{e.width}" x {e.height}"</td>
                <td className="p-5 font-bold text-slate-600">{e.stitch_type}<br/><span className="text-[10px] font-normal">{e.lining_type}</span></td>
                <td className="p-5 text-center font-black text-[#002d62] text-lg">{e.quantity} M</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* WINDOW IMAGES SECTION */}
        <div className="page-break-before">
          <h4 className="text-[10px] font-black text-[#c5a059] uppercase tracking-widest mb-10 border-b border-slate-100 pb-4">Technical Reference Imagery</h4>
          <div className="space-y-12">
            {entries.filter(e => e.images && e.images.length > 0).map((e, idx) => (
              <div key={idx} className="page-break-inside-avoid">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-8 w-1 bg-[#002d62] rounded-full"></div>
                  <div>
                    <h5 className="font-black text-slate-800 text-xl">{e.window_name}</h5>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{e.stitch_type} Reference</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  {e.images.map((img, imgIdx) => (
                    <div key={imgIdx} className="aspect-video bg-slate-50 rounded-[2rem] overflow-hidden border-2 border-slate-100 shadow-sm flex items-center justify-center">
                      <img 
                        src={img} 
                        className="w-full h-full object-cover" 
                        onError={(err) => (err.target as HTMLImageElement).src = 'https://placehold.co/800x600/f8fafc/002d62?text=Image+Load+Error'}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-20 pt-16 border-t border-slate-200 flex justify-between">
           <div className="text-center">
             <div className="w-64 h-px bg-slate-300 mb-4"></div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Production Authorization</p>
           </div>
           <div className="text-center">
             <div className="w-64 h-px bg-slate-300 mb-4"></div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Verification</p>
           </div>
        </div>
      </div>
      
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .only-print { display: block !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; }
          .page-break-before { page-break-before: always; }
          .page-break-inside-avoid { page-break-inside: avoid; }
        }
        @media screen {
          .only-print { display: none !important; }
        }
      `}</style>
    </div>
  );
};

const Input: React.FC<{ label: string; value: any; onChange: (v: string) => void; type?: string }> = ({ label, value, onChange, type = 'text' }) => (
  <div className="space-y-3">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-[#c5a059] outline-none transition-all text-sm font-bold" />
  </div>
);

const Select: React.FC<{ label: string; value: string; options: string[]; onChange: (v: string) => void }> = ({ label, value, options, onChange }) => (
  <div className="space-y-3">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative">
      <select 
        value={value || options[0]} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-[#002d62] outline-none focus:border-[#c5a059] transition-all cursor-pointer appearance-none pr-10"
      >
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[#c5a059]">
        <i className="fas fa-chevron-down text-[12px]"></i>
      </div>
    </div>
  </div>
);
