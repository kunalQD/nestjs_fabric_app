
import React, { useState, useEffect, useRef } from 'react';
import { dataService } from '../services/dataService';
import { WindowEntry, OrderStatus, Order } from '../types';
import { SHOWROOMS, STITCH_TYPES, LINING_TYPES, TAILORS, FITTERS, BRAND_COLORS } from '../constants';

interface CalculatorProps {
  orderId: string | null;
  onSave: () => void;
}

const compressImage = (base64Str: string, maxWidth = 1200): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(base64Str);
  });
};

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
    for (const file of Array.from(files) as File[]) {
      const reader = new FileReader();
      const promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
      });
      reader.readAsDataURL(file);
      const rawBase64 = await promise;
      if (rawBase64) {
        const compressed = await compressImage(rawBase64);
        uploadedImages.push(compressed);
      }
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-10 pb-24 relative">
      {/* Screen Interface */}
      <div className="no-print space-y-6 md:space-y-10">
        <div className="flex flex-col gap-6 border-b border-slate-100 pb-8">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-[#002d62] brand-font mb-1">Project Studio</h2>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] md:text-[10px]">Technical Project Specification</p>
            </div>
            <button 
              disabled={loading}
              onClick={handleSaveOrder}
              className="md:hidden px-6 py-3 bg-[#002d62] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2"
            >
              {loading ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-check"></i>}
              SAVE
            </button>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <button 
              onClick={() => window.print()}
              className="w-full md:w-auto px-6 py-4 bg-white text-[#002d62] border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <i className="fas fa-file-pdf"></i> Generate Job Sheet
            </button>
            <button 
              disabled={loading}
              onClick={handleSaveOrder}
              className="hidden md:flex flex-1 md:flex-none px-10 py-4 bg-[#002d62] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl items-center justify-center hover:bg-black transition-all"
            >
              {loading ? 'Processing Cloud Sync...' : 'Authorize Project'}
            </button>
          </div>
        </div>

        <section className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-sm border border-slate-50">
          <h3 className="text-lg md:text-xl font-black mb-6 md:mb-8 text-[#002d62] flex items-center gap-4">
            <span className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-[#002d62] text-white flex items-center justify-center text-xs">01</span>
            Core Identity
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8">
            <Input label="Client Name" value={customer.name} onChange={v => setCustomer({...customer, name: v})} />
            <Input label="Phone" value={customer.phone} onChange={v => setCustomer({...customer, phone: v})} />
            <Input label="Site Address" value={customer.address} onChange={v => setCustomer({...customer, address: v})} />
            <Select label="Showroom" options={SHOWROOMS} value={customer.showroom} onChange={v => setCustomer({...customer, showroom: v})} />
            <Select label="Stage" options={Object.values(OrderStatus)} value={customer.status} onChange={v => setCustomer({...customer, status: v as OrderStatus})} />
            <Input type="date" label="Deadline" value={customer.due_date} onChange={v => setCustomer({...customer, due_date: v})} />
            <Select label="Tailor" options={TAILORS} value={customer.tailor} onChange={v => setCustomer({...customer, tailor: v})} />
            <Select label="Fitter" options={FITTERS} value={customer.fitter} onChange={v => setCustomer({...customer, fitter: v})} />
          </div>
        </section>

        <section className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-sm border border-slate-50">
          <h3 className="text-lg md:text-xl font-black mb-6 md:mb-8 text-[#002d62] flex items-center gap-4">
            <span className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-[#c5a059] text-white flex items-center justify-center text-xs">02</span>
            Unit Parameters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 md:gap-8 mb-8">
            <div className="md:col-span-2">
              <Input label="Unit Name (e.g. Master Bedroom)" value={currentEntry.window_name || ''} onChange={v => setCurrentEntry({...currentEntry, window_name: v})} />
            </div>
            <Select label="Stitch Type" options={STITCH_TYPES} value={currentEntry.stitch_type || STITCH_TYPES[0]} onChange={v => setCurrentEntry({...currentEntry, stitch_type: v})} />
            <Select label="Lining Type" options={LINING_TYPES} value={currentEntry.lining_type || LINING_TYPES[0]} onChange={v => setCurrentEntry({...currentEntry, lining_type: v})} />
            <Input type="number" label="Width (Inches)" value={currentEntry.width || 0} onChange={v => setCurrentEntry({...currentEntry, width: parseFloat(v) || 0})} />
            <Input type="number" label="Height (Inches)" value={currentEntry.height || 0} onChange={v => setCurrentEntry({...currentEntry, height: parseFloat(v) || 0})} />
            <div className="md:col-span-2">
              <Input label="Execution Notes" value={currentEntry.notes || ''} onChange={v => setCurrentEntry({...currentEntry, notes: v})} />
            </div>
          </div>
          <div className="mb-8 p-6 md:p-8 bg-slate-50 rounded-[1.5rem] md:rounded-[2.5rem] border-2 border-dashed border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Site Visuals</p>
            <div className="flex flex-wrap gap-4 md:gap-6">
              {currentEntry.images?.map((img, idx) => (
                <div key={idx} className="relative w-24 h-24 md:w-32 md:h-32 group animate-in zoom-in duration-300">
                  <div className="w-full h-full rounded-xl md:rounded-2xl overflow-hidden border-2 md:border-4 border-white shadow-lg bg-white">
                    <img src={img} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 w-7 h-7 md:w-8 md:h-8 bg-red-500 text-white rounded-full shadow-lg flex items-center justify-center text-[10px] hover:bg-black transition-colors">
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-24 h-24 md:w-32 md:h-32 rounded-xl md:rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-300 hover:text-[#002d62] hover:border-[#002d62] transition-all bg-white group">
                {uploading ? <div className="w-6 h-6 border-3 border-[#002d62] border-t-transparent rounded-full animate-spin"></div> : <><i className="fas fa-camera text-xl md:text-2xl group-hover:scale-110 transition-transform"></i><span className="text-[8px] font-black uppercase">Attach</span></>}
              </button>
              <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handleImageUpload} />
            </div>
          </div>
          <button 
            onClick={addOrUpdateWindow} 
            className={`w-full py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-[10px] md:text-[11px] tracking-widest transition-all shadow-xl ${isEditWindow !== null ? 'bg-[#c5a059] text-white hover:bg-[#a38345]' : 'bg-[#002d62] text-white hover:bg-black'}`}
          >
            {isEditWindow !== null ? 'UPDATE SPECIFICATION' : 'ADD UNIT TO PROJECT'}
          </button>
        </section>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-50 overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[700px]">
            <thead className="bg-slate-50/50 text-[#002d62] uppercase text-[9px] font-black tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 md:px-10 py-5">Identity</th>
                <th className="px-6 md:px-10 py-5 text-center">Dimensions</th>
                <th className="px-6 md:px-10 py-5 text-center">Fabric Required</th>
                <th className="px-6 md:px-10 py-5 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-10 py-20 text-center">
                    <p className="text-slate-300 font-black uppercase text-[10px] tracking-widest">No units registered for this project</p>
                  </td>
                </tr>
              ) : entries.map((e, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 md:px-10 py-6">
                    <div className="font-black text-slate-800 text-base">{e.window_name}</div>
                    <div className="text-[9px] text-[#c5a059] font-black uppercase tracking-widest">{e.stitch_type} • {e.lining_type}</div>
                  </td>
                  <td className="px-6 md:px-10 py-6 text-center">
                    <div className="font-black text-slate-700">{e.width}" x {e.height}"</div>
                    <div className="text-[8px] text-slate-400 font-bold uppercase">{e.panels} Panels</div>
                  </td>
                  <td className="px-6 md:px-10 py-6 text-center font-mono font-black text-[#002d62] text-lg">{e.quantity.toFixed(2)} M</td>
                  <td className="px-6 md:px-10 py-6 text-right">
                    <button 
                      onClick={() => { setCurrentEntry({...entries[idx]}); setIsEditWindow(idx); }} 
                      className="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl hover:bg-[#002d62] hover:text-white transition-all flex items-center justify-center mx-auto mr-0"
                    >
                      <i className="fas fa-pen text-[10px]"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dedicated Print View (A4 Job Sheet) */}
      <div className="only-print bg-white p-12 min-h-screen font-sans text-slate-900">
        <div className="flex justify-between items-start mb-12 border-b-8 border-[#002d62] pb-10">
          <div>
            <h1 className="text-5xl font-black text-[#002d62] tracking-tighter mb-1">QUILT & DRAPES</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Fabrication Work Order</p>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-black text-[#c5a059] mb-1">JOB SHEET</h2>
            <p className="text-xs font-bold text-slate-500">{new Date().toLocaleDateString('en-GB')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-12 bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
          <div>
            <p className="text-[10px] font-black text-[#c5a059] uppercase tracking-widest mb-4">Production Context</p>
            <p className="text-3xl font-black text-slate-900 mb-2">{customer.name || 'N/A'}</p>
            <p className="text-sm font-bold text-slate-500">{customer.phone}</p>
            <p className="text-sm text-slate-400 mt-2 italic">{customer.address}</p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Showroom</p>
              <p className="text-sm font-black text-slate-800">{customer.showroom}</p>
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Date</p>
              <p className="text-sm font-black text-slate-800">{customer.due_date || 'TBD'}</p>
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Master Tailor</p>
              <p className="text-sm font-black text-slate-800">{customer.tailor || 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Site Fitter</p>
              <p className="text-sm font-black text-slate-800">{customer.fitter || 'Unassigned'}</p>
            </div>
          </div>
        </div>

        <table className="w-full mb-12 border border-slate-200 rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-[#002d62] text-white">
              <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest">Window Unit</th>
              <th className="p-4 text-center text-[10px] font-black uppercase tracking-widest">Dimensions (W x H)</th>
              <th className="p-4 text-center text-[10px] font-black uppercase tracking-widest">Specs</th>
              <th className="p-4 text-right text-[10px] font-black uppercase tracking-widest">Fabric (M)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((e, idx) => (
              <React.Fragment key={idx}>
                <tr className="bg-white">
                  <td className="p-4 font-black text-slate-800">{e.window_name}</td>
                  <td className="p-4 text-center font-bold text-slate-600">{e.width}" x {e.height}"</td>
                  <td className="p-4 text-center text-xs text-slate-500 font-bold uppercase">
                    {e.stitch_type}<br/>{e.lining_type}
                  </td>
                  <td className="p-4 text-right font-black text-[#002d62]">{e.quantity.toFixed(2)} M</td>
                </tr>
                {e.notes && (
                  <tr className="bg-slate-50/50">
                    <td colSpan={4} className="p-4 text-[10px] text-slate-400 font-bold italic">
                      Note: {e.notes}
                    </td>
                  </tr>
                )}
                {e.images && e.images.length > 0 && (
                  <tr className="bg-white">
                    <td colSpan={4} className="p-4">
                      <div className="flex gap-4">
                        {e.images.slice(0, 3).map((img, i) => (
                          <img key={i} src={img} className="w-24 h-24 object-cover rounded-lg border border-slate-200" />
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900 text-white">
              <td colSpan={3} className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-right">Project Total Fabric Required</td>
              <td className="p-4 text-right font-black text-xl">
                {entries.reduce((sum, e) => sum + e.quantity, 0).toFixed(2)} M
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-auto border-t border-slate-100 pt-8 flex justify-between">
          <p className="text-[9px] text-slate-400 uppercase font-black">Authorized by Quilt & Drapes Production Control</p>
          <div className="flex gap-12">
            <div className="w-32 border-b border-slate-300 h-10 flex items-end justify-center text-[8px] font-black text-slate-300 uppercase">Supervisor</div>
            <div className="w-32 border-b border-slate-300 h-10 flex items-end justify-center text-[8px] font-black text-slate-300 uppercase">Quality Check</div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .only-print { display: block !important; visibility: visible !important; }
          body { background: white !important; margin: 0; padding: 0; }
          html, body { height: 100%; }
        }
        @media screen {
          .only-print { display: none !important; }
        }
      `}</style>
    </div>
  );
};

const Input: React.FC<{ label: string; value: any; onChange: (v: string) => void; type?: string }> = ({ label, value, onChange, type = 'text' }) => (
  <div className="space-y-2">
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:border-[#c5a059] focus:bg-white outline-none text-sm font-bold transition-all" 
    />
  </div>
);

const Select: React.FC<{ label: string; value: string; options: string[]; onChange: (v: string) => void }> = ({ label, value, options, onChange }) => (
  <div className="space-y-2">
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <select 
      value={value || options[0]} 
      onChange={(e) => onChange(e.target.value)} 
      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black text-[#002d62] cursor-pointer outline-none focus:border-[#c5a059] transition-all"
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);
