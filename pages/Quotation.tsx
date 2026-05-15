
import React, { useState, useCallback, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QuotationRoom, QuotationWindow, MiscCharge } from '../types';

export const Quotation: React.FC = () => {
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
  });

  const [rooms, setRooms] = useState<QuotationRoom[]>([]);
  const [miscCharges, setMiscCharges] = useState<MiscCharge[]>([]);
  const [fabricDiscount, setFabricDiscount] = useState<number>(0);
  const [additionalDiscount, setAdditionalDiscount] = useState<number>(0);
  const [gstPercent, setGstPercent] = useState<number>(0);
  const [terms, setTerms] = useState<string>(
    "1. 50% advance to initiate order.\n2. Balance on completion and before delivery.\n3. Goods once sold will not be taken back.\n4. Subject to Jaipur Jurisdiction."
  );
  
  const handleAddRoom = () => {
    const roomName = prompt("Enter Room Name (e.g. Master Bedroom):");
    if (!roomName) return;
    
    const newRoom: QuotationRoom = {
      id: Math.random().toString(36).substr(2, 9),
      name: roomName,
      windows: []
    };
    setRooms([...rooms, newRoom]);
  };

  const handleAddWindow = (roomId: string) => {
    const windowName = prompt("Enter Window Name (e.g. Main Window):");
    if (!windowName) return;

    const newWindow: QuotationWindow = {
      id: Math.random().toString(36).substr(2, 9),
      name: windowName,
      type: 'Curtain',
      fabric_qty: 0,
      fabric_rate: 0,
      panels: 1,
      stitching_rate: 200,
      track_ft: 0,
      track_rate: 250,
      sqft: 0,
      blind_rate: 0,
      mechanism_cost: 0,
      installation_cost: 0,
      include_stitching: true,
      include_fabric: true,
      include_hardware: true,
      is_double_curtain: false,
      comment: ''
    };

    setRooms(rooms.map(room => {
      if (room.id === roomId) {
        return { ...room, windows: [...room.windows, newWindow] };
      }
      return room;
    }));
  };

  const updateWindow = (roomId: string, windowId: string, updates: Partial<QuotationWindow>) => {
    setRooms(rooms.map(room => {
      if (room.id === roomId) {
        return {
          ...room,
          windows: room.windows.map(w => w.id === windowId ? { ...w, ...updates } : w)
        };
      }
      return room;
    }));
  };

  const calculateWindowTotal = (w: QuotationWindow) => {
    let total = 0;
    const factor = w.is_double_curtain ? 2 : 1;
    
    if (w.type === 'Curtain' || w.type === 'Fabric Only') {
      if (w.include_fabric) total += (w.fabric_qty || 0) * (w.fabric_rate || 0) * factor;
      if (w.type === 'Curtain' && w.include_stitching) total += (w.panels || 0) * (w.stitching_rate || 0) * factor;
      if (w.type === 'Curtain' && w.include_hardware) total += (w.track_ft || 0) * (w.track_rate || 0);
    } else if (w.type === 'Roman Blind') {
      if (w.include_fabric) total += (w.fabric_qty || 0) * (w.fabric_rate || 0) * factor;
      if (w.include_stitching) total += (w.panels || 0) * (w.stitching_rate || 0) * factor;
      total += (w.mechanism_cost || 0);
      if (w.include_hardware) total += (w.track_ft || 0) * (w.track_rate || 0);
    } else if (w.type === 'Roller Blind' || w.type === 'Mosquito Net') {
      total += (w.sqft || 0) * (w.blind_rate || 0);
      total += (w.mechanism_cost || 0);
    } else if (w.type === 'Rods Only') {
      total += (w.track_ft || 0) * (w.track_rate || 0);
    } else if (w.type === 'Misc') {
      total += (w.fabric_rate || 0); // Reuse fabric_rate for flat misc amount
    }

    if (w.type !== 'Fabric Only' && w.type !== 'Misc') {
      total += (w.installation_cost || 0);
    }
    
    return total;
  };

  const fabricOnlyTotal = useMemo(() => {
    return rooms.reduce((sum, room) => 
      sum + room.windows.reduce((wSum, w) => {
        const factor = w.is_double_curtain ? 2 : 1;
        if ((w.type === 'Curtain' || w.type === 'Fabric Only' || w.type === 'Roman Blind') && w.include_fabric) {
          return wSum + (w.fabric_qty || 0) * (w.fabric_rate || 0) * factor;
        }
        return wSum;
      }, 0)
    , 0);
  }, [rooms]);

  const rawGrandTotal = useMemo(() => {
    const roomsTotal = rooms.reduce((sum, room) => 
      sum + room.windows.reduce((wSum, w) => wSum + calculateWindowTotal(w), 0)
    , 0);
    const miscTotal = miscCharges.reduce((sum, charge) => sum + charge.amount, 0);
    return roomsTotal + miscTotal;
  }, [rooms, miscCharges]);

  const fabricDiscountAmount = useMemo(() => {
    return Math.round(fabricOnlyTotal * (fabricDiscount / 100));
  }, [fabricOnlyTotal, fabricDiscount]);

  const totalBeforeGst = useMemo(() => {
    return Math.max(0, rawGrandTotal - fabricDiscountAmount - additionalDiscount);
  }, [rawGrandTotal, fabricDiscountAmount, additionalDiscount]);

  const gstAmount = useMemo(() => {
    return Math.round(totalBeforeGst * (gstPercent / 100));
  }, [totalBeforeGst, gstPercent]);

  const finalTotal = useMemo(() => {
    return totalBeforeGst + gstAmount;
  }, [totalBeforeGst, gstAmount]);

  const handleDownloadQuotation = useCallback(() => {
    const doc = new jsPDF();
    const navy: [number, number, number] = [0, 45, 98];
    
    // Header
    doc.setFillColor(navy[0], navy[1], navy[2]);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFontSize(28);
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.text("QUILT & DRAPES", 105, 20, { align: "center" });
    
    doc.setFontSize(9);
    doc.setTextColor(200);
    doc.setFont("helvetica", "normal");
    doc.text("F A B R I C A T I O N S   &   I N T E R I O R S", 105, 28, { align: "center" });
    doc.text("Professional Estimation Portal", 105, 33, { align: "center" });

    // Info Section
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("CUSTOMER DETAILS", 15, 55);
    
    doc.setDrawColor(navy[0], navy[1], navy[2]);
    doc.setLineWidth(0.5);
    doc.line(15, 57, 60, 57);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
    doc.text(`Name: ${customer.name || 'Valued Client'}`, 15, 65);
    doc.text(`Phone: ${customer.phone || 'N/A'}`, 15, 71);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 195, 65, { align: "right" });
    doc.text(`Quote ID: #QD-${Math.floor(Math.random()*10000)}`, 195, 71, { align: "right" });

    let currentY = 85;
    let totalMosquitoNetInstall = 0;

    rooms.forEach(room => {
      // Room Header
      doc.setFillColor(navy[0], navy[1], navy[2]);
      doc.roundedRect(15, currentY, 180, 10, 2, 2, 'F');
      doc.setTextColor(255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`ROOM: ${room.name.toUpperCase()}`, 20, currentY + 7);
      
      currentY += 12;

      const tableData = room.windows.map((w, idx) => {
        let details = [];
        if (w.is_double_curtain) details.push('Double Layer');
        if (w.type === 'Curtain') details.push(`${w.fabric_qty}m Fab`, `${w.panels} Pnl`);
        else if (w.type === 'Roman Blind') details.push(`${w.fabric_qty}m Fab`, 'Roman Mechanism');
        else if (w.type === 'Roller Blind' || w.type === 'Mosquito Net') details.push(`${w.sqft} sqft`);
        else if (w.type === 'Rods Only') details.push(`${w.track_ft} ft Hardware`);

        let windowSubtotal = calculateWindowTotal(w);
        if (w.type === 'Mosquito Net') {
          totalMosquitoNetInstall += (w.installation_cost || 0);
          windowSubtotal -= (w.installation_cost || 0);
        }
        
        return [
          idx + 1,
          `${w.name}`,
          w.type,
          details.join(', '),
          `Rs. ${windowSubtotal.toLocaleString()}`
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [['SNo', 'Element', 'Type', 'Description', 'Subtotal']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [70, 70, 70], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9, textColor: [50, 50, 50] },
        columnStyles: {
          4: { halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 15, right: 15 },
        didDrawPage: (data) => {
          currentY = data.cursor?.y || currentY;
        }
      });
      
      currentY += 12;
      
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
    });

    if (miscCharges.length > 0) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(navy[0], navy[1], navy[2]);
      doc.text("MISCELLANEOUS / OTHERS", 15, currentY);
      currentY += 5;
      
      autoTable(doc, {
        startY: currentY,
        head: [['Description', 'Amount']],
        body: miscCharges.map(m => [m.description, `Rs. ${m.amount.toLocaleString()}`]),
        theme: 'striped',
        margin: { left: 15, right: 15 },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
        didDrawPage: (data) => {
          currentY = data.cursor?.y || currentY;
        }
      });
      currentY += 15;
    }

    // Totals Section
    if (currentY > 230) {
      doc.addPage();
      currentY = 30;
    }

    doc.setDrawColor(200);
    doc.line(120, currentY, 195, currentY);
    currentY += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Estimate Total:", 140, currentY);
    doc.text(`Rs. ${rawGrandTotal.toLocaleString()}`, 195, currentY, { align: "right" });
    
    if (fabricDiscount > 0) {
      currentY += 6;
      doc.setTextColor(200, 0, 0);
      doc.text(`Fabric Discount (${fabricDiscount}%):`, 140, currentY);
      doc.text(`- Rs. ${fabricDiscountAmount.toLocaleString()}`, 195, currentY, { align: "right" });
    }
    
    if (additionalDiscount > 0) {
      currentY += 6;
      doc.setTextColor(200, 0, 0);
      doc.text("Additional Discount:", 140, currentY);
      doc.text(`- Rs. ${additionalDiscount.toLocaleString()}`, 195, currentY, { align: "right" });
    }

    if (totalMosquitoNetInstall > 0) {
      currentY += 6;
      doc.setTextColor(100);
      doc.text("Mosquito Net Installation:", 140, currentY);
      doc.text(`Rs. ${totalMosquitoNetInstall.toLocaleString()}`, 195, currentY, { align: "right" });
    }

    if (gstPercent > 0) {
      currentY += 6;
      doc.setTextColor(navy[0], navy[1], navy[2]);
      doc.setFont("helvetica", "bold");
      doc.text(`GST (${gstPercent}%):`, 140, currentY);
      doc.text(`Rs. ${gstAmount.toLocaleString()}`, 195, currentY, { align: "right" });
      doc.setFont("helvetica", "normal");
    }

    currentY += 10;
    doc.setFillColor(navy[0], navy[1], navy[2]);
    doc.rect(130, currentY - 5, 65, 12, 'F');
    doc.setTextColor(255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("FINAL TOTAL:", 135, currentY + 3);
    doc.text(`Rs. ${finalTotal.toLocaleString()}`, 190, currentY + 3, { align: "right" });

    // Terms
    currentY = Math.max(currentY + 30, 240);
    doc.setTextColor(50);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("TERMS & CONDITIONS", 15, currentY);
    
    doc.setDrawColor(navy[0], navy[1], navy[2]);
    doc.setLineWidth(0.3);
    doc.line(15, currentY + 1.5, 50, currentY + 1.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const splitTerms = doc.splitTextToSize(terms, 180);
    doc.text(splitTerms, 15, currentY + 8);

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }, [customer, rooms, miscCharges, rawGrandTotal, fabricDiscountAmount, additionalDiscount, finalTotal, terms, fabricDiscount, gstPercent, gstAmount]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
        <div>
          <h2 className="text-3xl font-black text-[#002d62] tracking-tighter uppercase">Professional Quote</h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Structured Room-wise Breakdown</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleDownloadQuotation}
            className="px-8 py-4 bg-[#002d62] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-[#003d7a] transition-all flex items-center gap-3 active:scale-95"
          >
            <i className="fas fa-print"></i> Print Quotation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Column: Management */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-black text-[#002d62] uppercase tracking-[0.2em] mb-6">Customer Details</h3>
            <div className="space-y-4">
              <input 
                type="text"
                value={customer.name}
                onChange={(e) => setCustomer({...customer, name: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-sm outline-none focus:ring-2 ring-blue-500/20"
                placeholder="Client name"
              />
              <input 
                type="text"
                value={customer.phone}
                onChange={(e) => setCustomer({...customer, phone: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-sm outline-none focus:ring-2 ring-blue-500/20"
                placeholder="Phone No"
              />
            </div>
          </div>

          <button 
            onClick={handleAddRoom}
            className="w-full py-6 bg-blue-50 text-[#002d62] rounded-3xl font-black text-xs uppercase tracking-widest border-2 border-dashed border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all flex flex-col items-center gap-2 group"
          >
            <div className="w-10 h-10 bg-[#002d62] text-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <i className="fas fa-plus"></i>
            </div>
            Add New Room
          </button>

          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-6">Global Adjustments</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Fabric Discount (%)</label>
                <input 
                  type="number"
                  value={fabricDiscount || ''}
                  onChange={(e) => setFabricDiscount(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-emerald-50 text-emerald-700 rounded-xl font-black text-sm outline-none"
                  placeholder="e.g. 10"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Additional Discount (Rs.)</label>
                <input 
                  type="number"
                  value={additionalDiscount || ''}
                  onChange={(e) => setAdditionalDiscount(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-yellow-50 text-yellow-700 rounded-xl font-black text-sm outline-none"
                  placeholder="e.g. 5000"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">GST (%)</label>
                <select 
                  value={gstPercent}
                  onChange={(e) => setGstPercent(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-xl font-black text-sm outline-none appearance-none"
                >
                  <option value={0}>0% (No GST)</option>
                  <option value={5}>5% GST</option>
                  <option value={12}>12% GST</option>
                  <option value={18}>18% GST</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Terms & Conditions</label>
                <textarea 
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-medium text-[10px] outline-none min-h-[120px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Build Area */}
        <div className="lg:col-span-3 space-y-8">
          {rooms.length === 0 && (
            <div className="h-64 border-4 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center text-slate-300">
              <i className="fas fa-layer-group text-4xl mb-4"></i>
              <p className="font-black uppercase tracking-widest text-xs">Start by adding a room</p>
            </div>
          )}

          {rooms.map(room => (
            <div key={room.id} className="bg-white rounded-[2rem] shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500 border border-slate-100">
              <div className="bg-[#002d62] px-8 py-6 flex justify-between items-center">
                <div>
                  <h3 className="text-white font-black uppercase tracking-[0.2em] text-sm">{room.name}</h3>
                  <p className="text-blue-300/60 text-[9px] font-bold uppercase tracking-widest">{room.windows.length} Window(s)</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleAddWindow(room.id)}
                    className="px-4 py-2 bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20"
                  >
                    Add Window
                  </button>
                  <button 
                    onClick={() => setRooms(rooms.filter(r => r.id !== room.id))}
                    className="px-3 py-2 bg-red-500/20 text-red-300 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>

              <div className="p-0 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[8px] font-black text-slate-400 uppercase tracking-widest text-left">Treatment & Details</th>
                      <th className="px-6 py-4 text-[8px] font-black text-slate-400 uppercase tracking-widest text-left">Parameters</th>
                      <th className="px-6 py-4 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">Total Cost</th>
                      <th className="px-6 py-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {room.windows.map(window => (
                      <tr key={window.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex gap-2 mb-2">
                             <select 
                               value={window.type}
                               onChange={(e) => updateWindow(room.id, window.id, { type: e.target.value as any })}
                               className="px-2 py-1 bg-slate-100 rounded-lg text-[9px] font-black uppercase outline-none"
                             >
                               <option value="Curtain">Curtain</option>
                               <option value="Roman Blind">Roman Blind</option>
                               <option value="Roller Blind">Roller Blind</option>
                               <option value="Mosquito Net">Mosquito Net</option>
                               <option value="Rods Only">Rods Only</option>
                               <option value="Fabric Only">Fabric Only</option>
                               <option value="Misc">Misc</option>
                             </select>
                             <input 
                              type="text" 
                              value={window.name}
                              onChange={(e) => updateWindow(room.id, window.id, { name: e.target.value })}
                              className="font-bold text-sm text-[#002d62] bg-transparent outline-none border-b border-transparent focus:border-blue-500 flex-1"
                            />
                          </div>
                          <input 
                            type="text" 
                            placeholder="Tweak notes for window..."
                            value={window.comment}
                            onChange={(e) => updateWindow(room.id, window.id, { comment: e.target.value })}
                            className="block text-[9px] text-slate-400 bg-transparent outline-none w-full italic"
                          />
                        </td>
                        <td className="px-6 py-5">
                           <div className="flex flex-wrap gap-4 items-start">
                             {/* Fabric Section */}
                             {(window.type === 'Curtain' || window.type === 'Roman Blind' || window.type === 'Fabric Only') && (
                               <div className="space-y-1">
                                 <label className="block text-[7px] font-black text-slate-400 uppercase mb-1">Fabric Qty & Rate</label>
                                 <div className="flex gap-1">
                                   <input 
                                     type="number" 
                                     placeholder="m"
                                     value={window.fabric_qty || ''}
                                     onChange={(e) => updateWindow(room.id, window.id, { fabric_qty: Number(e.target.value) })}
                                     className="w-16 px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold"
                                   />
                                   <input 
                                     type="number" 
                                     placeholder="Rate"
                                     value={window.fabric_rate || ''}
                                     onChange={(e) => updateWindow(room.id, window.id, { fabric_rate: Number(e.target.value) })}
                                     className="w-20 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold"
                                   />
                                 </div>
                               </div>
                             )}

                             {/* Blinds / Net Section */}
                             {(window.type === 'Roller Blind' || window.type === 'Mosquito Net') && (
                               <div className="space-y-1">
                                 <label className="block text-[7px] font-black text-slate-400 uppercase mb-1">
                                   {window.type === 'Mosquito Net' ? 'Net SQFT & Rate' : 'Blind SQFT & Rate'}
                                 </label>
                                 <div className="flex gap-1">
                                   <input 
                                     type="number" 
                                     placeholder="sqft"
                                     value={window.sqft || ''}
                                     onChange={(e) => updateWindow(room.id, window.id, { sqft: Number(e.target.value) })}
                                     className="w-16 px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold"
                                   />
                                   <input 
                                     type="number" 
                                     placeholder="Rate"
                                     value={window.blind_rate || ''}
                                     onChange={(e) => updateWindow(room.id, window.id, { blind_rate: Number(e.target.value) })}
                                     className="w-20 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold"
                                   />
                                 </div>
                               </div>
                             )}

                             {/* Stitching Section */}
                             {(window.type === 'Curtain' || window.type === 'Roman Blind') && (
                               <div className="space-y-1">
                                 <label className="block text-[7px] font-black text-slate-400 uppercase mb-1">Stitching (Panels)</label>
                                 <div className="flex gap-1 items-center">
                                   <input 
                                     type="number" 
                                     placeholder="Qty"
                                     value={window.panels || ''}
                                     onChange={(e) => updateWindow(room.id, window.id, { panels: Number(e.target.value) })}
                                     className="w-12 px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold"
                                   />
                                   <input 
                                     type="number" 
                                     placeholder="Rate"
                                     value={window.stitching_rate || ''}
                                     onChange={(e) => updateWindow(room.id, window.id, { stitching_rate: Number(e.target.value) })}
                                     className="w-16 px-2 py-1 bg-slate-50 rounded-lg text-[10px] font-bold"
                                   />
                                 </div>
                               </div>
                             )}

                             {/* Hardware Section */}
                             {(window.type === 'Curtain' || window.type === 'Roman Blind' || window.type === 'Rods Only') && (
                               <div className="space-y-1">
                                 <label className="block text-[7px] font-black text-slate-400 uppercase mb-1">Hardware (Rod FT)</label>
                                 <div className="flex gap-1 items-center">
                                    <input 
                                     type="number" 
                                     placeholder="ft"
                                     value={window.track_ft || ''}
                                     onChange={(e) => updateWindow(room.id, window.id, { track_ft: Number(e.target.value) })}
                                     className="w-12 px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold"
                                   />
                                   <input 
                                     type="number" 
                                     placeholder="Rate"
                                     value={window.track_rate || ''}
                                     onChange={(e) => updateWindow(room.id, window.id, { track_rate: Number(e.target.value) })}
                                     className="w-16 px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold"
                                   />
                                   {(window.type === 'Curtain' || window.type === 'Roman Blind') && (
                                    <label className="flex items-center gap-1 cursor-pointer select-none">
                                      <input 
                                        type="checkbox" 
                                        checked={window.is_double_curtain}
                                        onChange={(e) => updateWindow(room.id, window.id, { is_double_curtain: e.target.checked })}
                                        className="w-3 h-3 rounded"
                                      />
                                      <span className="text-[7px] font-black text-[#002d62] uppercase leading-none">Double</span>
                                    </label>
                                   )}
                                 </div>
                               </div>
                             )}
                           </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="text-sm font-black text-[#002d62]">₹{calculateWindowTotal(window).toLocaleString()}</div>
                          <div className="flex flex-col items-end gap-1 mt-1">
                            {window.type !== 'Fabric Only' && (
                              <button 
                                onClick={() => {
                                  const cost = prompt("Enter Installation Cost:", window.installation_cost.toString());
                                  if (cost !== null) updateWindow(room.id, window.id, { installation_cost: Number(cost) });
                                }}
                                className="text-[7px] font-black text-blue-500 uppercase tracking-tighter hover:underline"
                              >
                                + Installation ₹{window.installation_cost}
                              </button>
                            )}
                            {(window.type === 'Roman Blind' || window.type === 'Roller Blind' || window.type === 'Mosquito Net') && (
                               <button 
                               onClick={() => {
                                 const cost = prompt("Enter Mechanism/Frame Cost:", window.mechanism_cost.toString());
                                 if (cost !== null) updateWindow(room.id, window.id, { mechanism_cost: Number(cost) });
                               }}
                               className="text-[7px] font-black text-emerald-500 uppercase tracking-tighter hover:underline"
                             >
                               + Mechanism/Frame ₹{window.mechanism_cost}
                             </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <button 
                             onClick={() => setRooms(rooms.map(r => r.id === room.id ? { ...r, windows: r.windows.filter(w => w.id !== window.id) } : r))}
                             className="text-red-200 hover:text-red-500 transition-colors"
                           >
                             <i className="fas fa-times"></i>
                           </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Misc Section */}
          <div className="bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-boxes"></i> Miscellaneous Charges
              </h3>
              <button 
                 onClick={() => {
                   const desc = prompt('Description:');
                   const amt = prompt('Amount:');
                   if (desc && amt) setMiscCharges([...miscCharges, { id: Math.random().toString(36).substr(2, 9), description: desc, amount: Number(amt), comment: '' }]);
                 }}
                className="px-4 py-2 bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-300"
              >
                Add Charge
              </button>
            </div>
            
            <div className="space-y-3">
              {miscCharges.map(m => (
                <div key={m.id} className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                  <div>
                    <div className="font-bold text-sm text-slate-700">{m.description}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="font-black text-slate-900">₹{m.amount.toLocaleString()}</div>
                    <button onClick={() => setMiscCharges(miscCharges.filter(it => it.id !== m.id))} className="text-red-300 hover:text-red-500"><i className="fas fa-trash-alt"></i></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grand Summary */}
          <div className="bg-[#002d62] rounded-[2.5rem] p-10 text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="z-10">
              <div className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-300">Quotation Summary</div>
              <div className="text-4xl font-black mt-2 tracking-tighter">Rs. {finalTotal.toLocaleString()}</div>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <span className="text-[10px] font-bold text-blue-200/50 uppercase">Subtotal Rs. {rawGrandTotal.toLocaleString()}</span>
                {(fabricDiscountAmount + additionalDiscount) > 0 && (
                  <span className="text-[10px] font-bold text-red-300 uppercase">
                    Savings Rs. {(fabricDiscountAmount + additionalDiscount).toLocaleString()}
                  </span>
                )}
                {gstPercent > 0 && (
                  <span className="text-[10px] font-bold text-emerald-300 uppercase">
                    GST Rs. {gstAmount.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            <div className="z-10 flex gap-4">
              <button 
                onClick={handleDownloadQuotation}
                className="px-10 py-5 bg-white text-[#002d62] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all shadow-xl active:scale-95"
              >
                Finalize & Print
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};