import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QuotationItem, MiscCharge, Quotation as QType } from '../types';
import { dataService } from '../services/dataService';

export const Quotation: React.FC = () => {
  const [view, setView] = useState<'create' | 'list'>('create');
  const [savedQuotes, setSavedQuotes] = useState<QType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
  });

  const [items, setItems] = useState<QuotationItem[]>([]);
  const [miscCharges, setMiscCharges] = useState<MiscCharge[]>([]);
  const [fabricDiscount, setFabricDiscount] = useState<number>(0);
  const [additionalDiscount, setAdditionalDiscount] = useState<number>(0);
  const [gstPercent, setGstPercent] = useState<number>(0);
  const [terms, setTerms] = useState<string>(
    "1. 50% advance to initiate order.\n2. Balance on completion and before delivery.\n3. Goods once sold will not be taken back."
  );

  const fetchQuotations = useCallback(async () => {
    setIsLoading(true);
    try {
      const quotes = await dataService.getQuotations();
      setSavedQuotes(quotes);
    } catch (error) {
      console.error("Failed to fetch quotations", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const calculateItemTotal = useCallback((item: QuotationItem) => {
    let total = 0;
    const factor = item.is_double_curtain ? 2 : 1;
    
    if (item.type === 'Curtain' || item.type === 'Fabric Only') {
      if (item.include_fabric) total += (item.fabric_qty || 0) * (item.fabric_rate || 0) * factor;
      if (item.type === 'Curtain' && item.include_stitching) total += (item.panels || 0) * (item.stitching_rate || 0) * factor;
      if (item.type === 'Curtain' && item.include_hardware) total += (item.track_ft || 0) * (item.track_rate || 0);
    } else if (item.type === 'Roman Blind') {
      if (item.include_fabric) total += (item.fabric_qty || 0) * (item.fabric_rate || 0) * factor;
      if (item.include_stitching) total += (item.panels || 0) * (item.stitching_rate || 0) * factor;
      total += (item.mechanism_cost || 0);
      if (item.include_hardware) total += (item.track_ft || 0) * (item.track_rate || 0);
    } else if (item.type === 'Roller Blind' || item.type === 'Mosquito Net') {
      total += (item.sqft || 0) * (item.blind_rate || 0);
      total += (item.mechanism_cost || 0);
    } else if (item.type === 'Rods Only') {
      total += (item.track_ft || 0) * (item.track_rate || 0);
    } else if (item.type === 'Misc') {
      total += (item.fabric_rate || 0); // Reuse fabric_rate for flat misc amount
    }

    if (item.type !== 'Fabric Only' && item.type !== 'Misc') {
      total += (item.installation_cost || 0);
    }
    
    return total * (item.quantity || 1);
  }, []);

  const fabricOnlyTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const factor = item.is_double_curtain ? 2 : 1;
      if ((item.type === 'Curtain' || item.type === 'Fabric Only' || item.type === 'Roman Blind') && item.include_fabric) {
        return sum + (item.fabric_qty || 0) * (item.fabric_rate || 0) * factor * (item.quantity || 1);
      }
      return sum;
    }, 0);
  }, [items]);

  const rawGrandTotal = useMemo(() => {
    const itemsTotal = items.reduce((sum, item) => {
      const baseTotalWithoutInstallation = calculateItemTotal(item) - ((item.installation_cost || 0) * (item.quantity || 1));
      return sum + baseTotalWithoutInstallation;
    }, 0);
    const miscTotal = miscCharges.reduce((sum, charge) => sum + charge.amount, 0);
    return itemsTotal + miscTotal;
  }, [items, miscCharges, calculateItemTotal]);

  const totalInstallation = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.installation_cost || 0) * (item.quantity || 1), 0);
  }, [items]);

  const fabricDiscountAmount = useMemo(() => {
    return Math.round(fabricOnlyTotal * (fabricDiscount / 100));
  }, [fabricOnlyTotal, fabricDiscount]);

  const totalBeforeGst = useMemo(() => {
    return Math.max(0, rawGrandTotal + totalInstallation - fabricDiscountAmount - additionalDiscount);
  }, [rawGrandTotal, totalInstallation, fabricDiscountAmount, additionalDiscount]);

  const gstAmount = useMemo(() => {
    return Math.round(totalBeforeGst * (gstPercent / 100));
  }, [totalBeforeGst, gstPercent]);

  const finalTotal = useMemo(() => {
    return totalBeforeGst + gstAmount;
  }, [totalBeforeGst, gstAmount]);

  const handleSaveQuotation = async () => {
    if (!customer.name) {
      alert("Please enter customer name before saving.");
      return;
    }

    const payload: QType = {
      id: currentId || `temp_${Date.now()}`,
      customer_name: customer.name,
      phone: customer.phone,
      date: new Date().toISOString(),
      items,
      misc_charges: miscCharges,
      fabric_discount_percent: fabricDiscount,
      additional_discount: additionalDiscount,
      gst_percent: gstPercent,
      terms_conditions: terms,
      total_amount: finalTotal
    };

    try {
      await dataService.saveQuotation(payload);
      alert("Quotation saved successfully!");
      fetchQuotations();
      setView('list');
    } catch (error) {
      console.error("Failed to save quotation", error);
      alert("Error saving quotation. Please try again.");
    }
  };

  const loadQuotation = (q: QType) => {
    setCurrentId(q.id);
    setCustomer({ name: q.customer_name, phone: q.phone });
    
    // Backward compatibility: map old style rooms structure to product level items
    const loadedItems: QuotationItem[] = q.items || (q as any).rooms?.flatMap((r: any) => 
      r.windows?.map((w: any) => ({
        ...w,
        quantity: w.quantity || 1,
        comment: w.comment || `Room: ${r.name}`
      }))
    ) || [];

    setItems(loadedItems);
    setMiscCharges(q.misc_charges || []);
    setFabricDiscount(q.fabric_discount_percent || 0);
    setAdditionalDiscount(q.additional_discount || 0);
    setGstPercent(q.gst_percent || 0);
    setTerms(q.terms_conditions || "1. 50% advance to initiate order.\n2. Balance on completion and before delivery.\n3. Goods once sold will not be taken back.");
    setView('create');
  };

  const deleteQuotation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this quotation?")) return;
    try {
      await dataService.deleteQuotation(id);
      setSavedQuotes(savedQuotes.filter(q => q.id !== id));
    } catch (error) {
      console.error("Failed to delete quotation", error);
      alert("Error deleting quotation.");
    }
  };

  const resetForm = () => {
    setCurrentId(null);
    setCustomer({ name: '', phone: '' });
    setItems([]);
    setMiscCharges([]);
    setFabricDiscount(0);
    setAdditionalDiscount(0);
    setGstPercent(0);
    setView('create');
  };

  const handleAddItem = () => {
    const itemName = prompt("Enter Product / Treatment Name (e.g. Master Bedroom Curtains, Living Room Blind):");
    if (!itemName) return;

    const newItem: QuotationItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: itemName,
      type: 'Curtain',
      quantity: 1,
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

    setItems([...items, newItem]);
  };

  const updateItem = (id: string, updates: Partial<QuotationItem>) => {
    setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleDownloadPDF = useCallback((pdfType: 'quotation' | 'delivery_challan', overrideQuote?: QType) => {
    const doc = new jsPDF();
    const navy: [number, number, number] = [0, 45, 98];
    
    const currentCustomer = overrideQuote ? { name: overrideQuote.customer_name, phone: overrideQuote.phone } : customer;
    
    // Backward-compatible loading for older saved quotations without items array
    let currentItems: QuotationItem[] = [];
    if (overrideQuote) {
      currentItems = overrideQuote.items || (overrideQuote as any).rooms?.flatMap((r: any) => 
        r.windows?.map((w: any) => ({
          ...w,
          quantity: w.quantity || 1,
          comment: w.comment || `Room: ${r.name}`
        }))
      ) || [];
    } else {
      currentItems = items;
    }

    const currentMiscCharges = overrideQuote ? overrideQuote.misc_charges || [] : miscCharges;
    const currentFabricDiscount = overrideQuote ? overrideQuote.fabric_discount_percent || 0 : fabricDiscount;
    const currentAdditionalDiscount = overrideQuote ? overrideQuote.additional_discount || 0 : additionalDiscount;
    const currentGstPercent = overrideQuote ? overrideQuote.gst_percent || 0 : gstPercent;
    const currentTerms = overrideQuote ? overrideQuote.terms_conditions || terms : terms;

    // Header
    doc.setFillColor(navy[0], navy[1], navy[2]);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFontSize(28);
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.text("QUILT & DRAPES", 105, 18, { align: "center" });
    
    doc.setFontSize(9);
    doc.setTextColor(200);
    doc.setFont("helvetica", "normal");
    doc.text("F A B R I C A T I O N S   &   I N T E R I O R S", 105, 26, { align: "center" });
    
    doc.setFontSize(14);
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.text(pdfType === 'quotation' ? "ESTIMATED QUOTATION" : "DELIVERY CHALLAN", 105, 34, { align: "center" });

    // Customer / Info Section
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(pdfType === 'quotation' ? "CUSTOMER DETAILS" : "DELIVERY TO", 15, 55);
    
    doc.setDrawColor(navy[0], navy[1], navy[2]);
    doc.setLineWidth(0.5);
    doc.line(15, 57, 60, 57);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
    doc.text(`Name: ${currentCustomer.name || 'Valued Client'}`, 15, 65);
    doc.text(`Phone: ${currentCustomer.phone || 'N/A'}`, 15, 71);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 195, 65, { align: "right" });
    
    const uniqueId = overrideQuote ? overrideQuote.id : (currentId || 'TEMP');
    doc.text(`${pdfType === 'quotation' ? 'Quote' : 'Challan'} ID: #${uniqueId}`, 195, 71, { align: "right" });

    let currentY = 85;

    // Table Columns
    let tableHead: string[][];
    let tableBody: any[][];

    if (pdfType === 'quotation') {
      tableHead = [['SNo', 'Product Item / Description', 'Type', 'Qty', 'Configuration & Notes', 'Subtotal']];
      tableBody = currentItems.map((item, idx) => {
        let details = [];
        if (item.is_double_curtain) details.push('Double Layer');
        
        if (item.type === 'Curtain') {
          details.push(`${item.fabric_qty}m Fab`, `${item.panels} Pnl`);
        } else if (item.type === 'Roman Blind') {
          details.push(`${item.fabric_qty}m Fab`, 'Roman Mech');
        } else if (item.type === 'Roller Blind' || item.type === 'Mosquito Net') {
          details.push(`${item.sqft} sqft`);
        } else if (item.type === 'Rods Only') {
          details.push(`${item.track_ft} ft Hardware`);
        } else if (item.type === 'Misc') {
          details.push('Flat custom charge');
        }

        if (item.comment) details.push(`Note: ${item.comment}`);
        
        const itemSubtotal = calculateItemTotal(item) - ((item.installation_cost || 0) * (item.quantity || 1));
        
        return [
          idx + 1,
          item.name,
          item.type,
          item.quantity,
          details.join(', '),
          `Rs. ${itemSubtotal.toLocaleString()}`
        ];
      });
    } else {
      // Delivery Challan
      tableHead = [['SNo', 'Product Item / Description', 'Type', 'Quantity Delivered', 'Notes & Room Placement']];
      tableBody = currentItems.map((item, idx) => {
        const details = [];
        if (item.is_double_curtain) details.push('Double Layer');
        if (item.comment) details.push(item.comment);
        return [
          idx + 1,
          item.name,
          item.type,
          `${item.quantity} Unit(s)`,
          details.join(', ') || 'N/A'
        ];
      });
    }

    autoTable(doc, {
      startY: currentY,
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: navy, fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9, textColor: [50, 50, 50] },
      columnStyles: pdfType === 'quotation' ? {
        3: { halign: 'center' },
        5: { halign: 'right', fontStyle: 'bold' }
      } : {
        3: { halign: 'center', fontStyle: 'bold' }
      },
      margin: { left: 15, right: 15 },
      didDrawPage: (data) => {
        currentY = data.cursor?.y || currentY;
      }
    });

    currentY += 12;

    if (pdfType === 'quotation') {
      // Miscellaneous Charges if any
      if (currentMiscCharges.length > 0) {
        if (currentY > 230) {
          doc.addPage();
          currentY = 20;
        }
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(navy[0], navy[1], navy[2]);
        doc.text("MISCELLANEOUS / OTHERS", 15, currentY);
        currentY += 5;
        
        autoTable(doc, {
          startY: currentY,
          head: [['Description', 'Amount']],
          body: currentMiscCharges.map(m => [m.description, `Rs. ${m.amount.toLocaleString()}`]),
          theme: 'striped',
          margin: { left: 15, right: 15 },
          columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
          didDrawPage: (data) => {
            currentY = data.cursor?.y || currentY;
          }
        });
        currentY += 15;
      }

      // Calculations of Totals
      const currentFabricOnlyTotal = currentItems.reduce((sum, item) => {
        const factor = item.is_double_curtain ? 2 : 1;
        if ((item.type === 'Curtain' || item.type === 'Fabric Only' || item.type === 'Roman Blind') && item.include_fabric) {
          return sum + (item.fabric_qty || 0) * (item.fabric_rate || 0) * factor * (item.quantity || 1);
        }
        return sum;
      }, 0);

      const currentRawGrandTotal = currentItems.reduce((sum, item) => {
        const baseTotalWithoutInstallation = calculateItemTotal(item) - ((item.installation_cost || 0) * (item.quantity || 1));
        return sum + baseTotalWithoutInstallation;
      }, 0) + currentMiscCharges.reduce((sum, charge) => sum + charge.amount, 0);

      const currentTotalInstallationAmt = currentItems.reduce((sum, item) => sum + (item.installation_cost || 0) * (item.quantity || 1), 0);
      const currentFabricDiscountAmount = Math.round(currentFabricOnlyTotal * (currentFabricDiscount / 100));
      const currentTotalBeforeGst = Math.max(0, currentRawGrandTotal + currentTotalInstallationAmt - currentFabricDiscountAmount - currentAdditionalDiscount);
      const currentGstAmount = Math.round(currentTotalBeforeGst * (currentGstPercent / 100));
      const currentFinalTotal = currentTotalBeforeGst + currentGstAmount;

      if (currentY > 210) {
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
      doc.text(`Rs. ${currentRawGrandTotal.toLocaleString()}`, 195, currentY, { align: "right" });
      
      if (currentFabricDiscount > 0) {
        currentY += 6;
        doc.setTextColor(200, 0, 0);
        doc.text(`Fabric Discount (${currentFabricDiscount}%):`, 140, currentY);
        doc.text(`- Rs. ${currentFabricDiscountAmount.toLocaleString()}`, 195, currentY, { align: "right" });
      }
      
      if (currentAdditionalDiscount > 0) {
        currentY += 6;
        doc.setTextColor(200, 0, 0);
        doc.text("Additional Discount:", 140, currentY);
        doc.text(`- Rs. ${currentAdditionalDiscount.toLocaleString()}`, 195, currentY, { align: "right" });
      }

      if (currentTotalInstallationAmt > 0) {
        currentY += 6;
        doc.setTextColor(100);
        doc.text("Installation Charges:", 140, currentY);
        doc.text(`Rs. ${currentTotalInstallationAmt.toLocaleString()}`, 195, currentY, { align: "right" });
      }

      if (currentGstPercent > 0) {
        currentY += 6;
        doc.setTextColor(navy[0], navy[1], navy[2]);
        doc.setFont("helvetica", "bold");
        doc.text(`GST (${currentGstPercent}%):`, 140, currentY);
        doc.text(`Rs. ${currentGstAmount.toLocaleString()}`, 195, currentY, { align: "right" });
        doc.setFont("helvetica", "normal");
      }

      currentY += 10;
      doc.setFillColor(navy[0], navy[1], navy[2]);
      doc.rect(130, currentY - 5, 65, 12, 'F');
      doc.setTextColor(255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("FINAL TOTAL:", 135, currentY + 3);
      doc.text(`Rs. ${currentFinalTotal.toLocaleString()}`, 190, currentY + 3, { align: "right" });

      // Terms
      currentY = Math.max(currentY + 25, 235);
      doc.setTextColor(50);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("TERMS & CONDITIONS", 15, currentY);
      
      doc.setDrawColor(navy[0], navy[1], navy[2]);
      doc.setLineWidth(0.3);
      doc.line(15, currentY + 1.5, 50, currentY + 1.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const splitTerms = doc.splitTextToSize(currentTerms, 180);
      doc.text(splitTerms, 15, currentY + 8);
    } else {
      // Delivery Challan Footer
      if (currentY > 210) {
        doc.addPage();
        currentY = 30;
      }

      doc.setTextColor(50);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("TERMS OF DELIVERY", 15, currentY);
      
      doc.setDrawColor(navy[0], navy[1], navy[2]);
      doc.setLineWidth(0.3);
      doc.line(15, currentY + 1.5, 50, currentY + 1.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100);
      doc.text([
        "1. Received the above mentioned items/materials in good condition.",
        "2. Any physical damage or discrepancy must be reported at the time of delivery/installation.",
        "3. Installation will be scheduled as per previously mutually agreed dates.",
      ], 15, currentY + 8);

      currentY += 35;

      // Signature blocks
      doc.setDrawColor(180);
      doc.setLineWidth(0.5);
      doc.line(15, currentY + 15, 75, currentY + 15);
      doc.line(135, currentY + 15, 195, currentY + 15);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50);
      doc.text("Customer's Signature & Date", 15, currentY + 20);
      doc.text("For Quilt & Drapes (Auth. Signatory)", 135, currentY + 20);
    }

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }, [customer, items, miscCharges, fabricDiscount, additionalDiscount, gstPercent, terms, finalTotal, calculateItemTotal, currentId]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
        <div>
          <h2 className="text-3xl font-black text-[#002d62] tracking-tighter uppercase">Quotation Studio</h2>
          <div className="flex gap-4 mt-2">
            <button 
              onClick={resetForm}
              className={`text-[10px] font-black uppercase tracking-[0.2em] pb-1 border-b-2 transition-all ${view === 'create' ? 'text-[#002d62] border-[#002d62]' : 'text-slate-400 border-transparent'}`}
            >
              Draft New Quote
            </button>
            <button 
              onClick={() => { setView('list'); fetchQuotations(); }}
              className={`text-[10px] font-black uppercase tracking-[0.2em] pb-1 border-b-2 transition-all ${view === 'list' ? 'text-[#002d62] border-[#002d62]' : 'text-slate-400 border-transparent'}`}
            >
              Saved Quotations ({savedQuotes.length})
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {view === 'create' && (
            <>
              <button 
                onClick={handleSaveQuotation}
                className="px-6 py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-emerald-600 transition-all flex items-center gap-3 active:scale-95"
              >
                <i className="fas fa-save"></i> Save Draft
              </button>
              <button 
                onClick={() => handleDownloadPDF('quotation')}
                className="px-6 py-4 bg-[#002d62] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-[#003d7a] transition-all flex items-center gap-3 active:scale-95"
              >
                <i className="fas fa-print"></i> Print Quotation
              </button>
              <button 
                onClick={() => handleDownloadPDF('delivery_challan')}
                className="px-6 py-4 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-amber-600 transition-all flex items-center gap-3 active:scale-95"
              >
                <i className="fas fa-truck"></i> Delivery Challan
              </button>
            </>
          )}
        </div>
      </div>

      {view === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-8">
          {isLoading ? (
            <div className="col-span-full py-20 text-center">
              <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Loading Quotations...</p>
            </div>
          ) : savedQuotes.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
               <i className="fas fa-folder-open text-slate-200 text-6xl mb-4"></i>
               <p className="font-black text-slate-300 uppercase tracking-widest">No saved quotations yet</p>
            </div>
          ) : (
            savedQuotes.map(quote => (
              <div key={quote.id} className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-50 relative group flex flex-col justify-between min-h-[300px]">
                <div className="absolute top-4 right-4 flex gap-2">
                   <button onClick={() => deleteQuotation(quote.id)} className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                     <i className="fas fa-trash-alt text-xs"></i>
                   </button>
                </div>
                <div>
                  <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">{quote.id}</div>
                  <h4 className="text-xl font-black text-[#002d62] mb-1">{quote.customer_name}</h4>
                  <p className="text-slate-400 text-xs font-bold mb-6">{quote.phone || 'No phone'}</p>
                </div>
                
                <div>
                  <div className="flex justify-between items-end gap-3">
                     <div>
                       <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Total Value</div>
                       <div className="text-2xl font-black text-[#002d62]">Rs. {quote.total_amount.toLocaleString()}</div>
                     </div>
                     <div className="flex flex-col gap-2">
                       <button 
                         onClick={() => loadQuotation(quote)}
                         className="px-5 py-2.5 bg-[#002d62] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 shadow-md active:scale-95 transition-all text-center"
                       >
                         Reload
                       </button>
                       <button 
                         onClick={() => handleDownloadPDF('delivery_challan', quote)}
                         className="px-5 py-2.5 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 shadow-md active:scale-95 transition-all text-center flex items-center gap-1.5 justify-center"
                       >
                         <i className="fas fa-truck text-[9px]"></i> Delivery Note
                       </button>
                     </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between">
                     <span className="text-[9px] font-bold text-slate-300 uppercase">{new Date(quote.date).toLocaleDateString()}</span>
                     <span className="text-[9px] font-bold text-slate-300 uppercase">
                       {quote.items ? `${quote.items.length} Products` : `${(quote as any).rooms?.length || 0} Rooms`}
                     </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
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
            onClick={handleAddItem}
            className="w-full py-6 bg-blue-50 text-[#002d62] rounded-3xl font-black text-xs uppercase tracking-widest border-2 border-dashed border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all flex flex-col items-center gap-2 group"
          >
            <div className="w-10 h-10 bg-[#002d62] text-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <i className="fas fa-plus"></i>
            </div>
            Add Product Item
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
          
          <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-100">
            <div className="bg-[#002d62] px-8 py-6 flex justify-between items-center">
              <div>
                <h3 className="text-white font-black uppercase tracking-[0.2em] text-sm">Product List</h3>
                <p className="text-blue-300/60 text-[9px] font-bold uppercase tracking-widest">{items.length} Product(s)</p>
              </div>
              <button 
                onClick={handleAddItem}
                className="px-6 py-3 bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 active:scale-95 transition-all"
              >
                + Add Product Item
              </button>
            </div>

            {items.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-300">
                <i className="fas fa-layer-group text-4xl mb-4"></i>
                <p className="font-black uppercase tracking-widest text-xs">No products added. Start by adding a product!</p>
              </div>
            ) : (
              <div className="p-0 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[8px] font-black text-slate-400 uppercase tracking-widest text-left">Treatment / Product Details</th>
                      <th className="px-6 py-4 text-[8px] font-black text-slate-400 uppercase tracking-widest text-left">Quantity</th>
                      <th className="px-6 py-4 text-[8px] font-black text-slate-400 uppercase tracking-widest text-left">Parameters</th>
                      <th className="px-6 py-4 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">Total Cost</th>
                      <th className="px-6 py-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map(item => (
                      <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                        {/* Column 1: Treatment, Name & Comments */}
                        <td className="px-6 py-5 align-top">
                          <div className="flex gap-2 mb-2">
                             <select 
                               value={item.type}
                               onChange={(e) => updateItem(item.id, { type: e.target.value as any })}
                               className="px-2 py-1 bg-slate-100 rounded-lg text-[9px] font-black uppercase outline-none border border-slate-200"
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
                              value={item.name}
                              onChange={(e) => updateItem(item.id, { name: e.target.value })}
                              className="font-bold text-sm text-[#002d62] bg-transparent outline-none border-b border-transparent focus:border-blue-500 flex-1"
                            />
                          </div>
                          <input 
                            type="text" 
                            placeholder="Add room name or notes (e.g., Master Bedroom, First Floor)..."
                            value={item.comment || ''}
                            onChange={(e) => updateItem(item.id, { comment: e.target.value })}
                            className="block text-[11px] text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 outline-none w-full italic"
                          />
                        </td>

                        {/* Column 2: Quantity selector */}
                        <td className="px-6 py-5 align-top w-28">
                          <div className="flex items-center bg-slate-100 rounded-lg p-1 w-fit border border-slate-200">
                            <button 
                              onClick={() => updateItem(item.id, { quantity: Math.max(1, (item.quantity || 1) - 1) })}
                              className="w-6 h-6 rounded bg-white font-black text-slate-600 hover:bg-slate-200"
                            >
                              -
                            </button>
                            <input 
                              type="number"
                              min="1"
                              value={item.quantity || 1}
                              onChange={(e) => updateItem(item.id, { quantity: Math.max(1, Number(e.target.value)) })}
                              className="w-10 text-center font-bold text-xs bg-transparent outline-none"
                            />
                            <button 
                              onClick={() => updateItem(item.id, { quantity: (item.quantity || 1) + 1 })}
                              className="w-6 h-6 rounded bg-white font-black text-slate-600 hover:bg-slate-200"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {/* Column 3: Parameters */}
                        <td className="px-6 py-5 align-top">
                           <div className="flex flex-wrap gap-4 items-start">
                             {/* Fabric Section */}
                             {(item.type === 'Curtain' || item.type === 'Roman Blind' || item.type === 'Fabric Only') && (
                               <div className="space-y-1">
                                 <label className="block text-[7px] font-black text-slate-400 uppercase mb-1">Fabric Qty & Rate</label>
                                 <div className="flex gap-1">
                                   <input 
                                     type="number" 
                                     placeholder="m"
                                     value={item.fabric_qty || ''}
                                     onChange={(e) => updateItem(item.id, { fabric_qty: Number(e.target.value) })}
                                     className="w-16 px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold"
                                   />
                                   <input 
                                     type="number" 
                                     placeholder="Rate"
                                     value={item.fabric_rate || ''}
                                     onChange={(e) => updateItem(item.id, { fabric_rate: Number(e.target.value) })}
                                     className="w-20 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold"
                                   />
                                 </div>
                               </div>
                             )}

                             {/* Blinds / Net Section */}
                             {(item.type === 'Roller Blind' || item.type === 'Mosquito Net') && (
                               <div className="space-y-1">
                                 <label className="block text-[7px] font-black text-slate-400 uppercase mb-1">
                                   {item.type === 'Mosquito Net' ? 'Net SQFT & Rate' : 'Blind SQFT & Rate'}
                                 </label>
                                 <div className="flex gap-1">
                                   <input 
                                     type="number" 
                                     placeholder="sqft"
                                     value={item.sqft || ''}
                                     onChange={(e) => updateItem(item.id, { sqft: Number(e.target.value) })}
                                     className="w-16 px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold"
                                   />
                                   <input 
                                     type="number" 
                                     placeholder="Rate"
                                     value={item.blind_rate || ''}
                                     onChange={(e) => updateItem(item.id, { blind_rate: Number(e.target.value) })}
                                     className="w-20 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold"
                                   />
                                 </div>
                               </div>
                             )}

                             {/* Stitching Section */}
                             {(item.type === 'Curtain' || item.type === 'Roman Blind') && (
                               <div className="space-y-1">
                                 <label className="block text-[7px] font-black text-slate-400 uppercase mb-1">Stitching (Panels)</label>
                                 <div className="flex gap-1 items-center">
                                   <input 
                                     type="number" 
                                     placeholder="Qty"
                                     value={item.panels || ''}
                                     onChange={(e) => updateItem(item.id, { panels: Number(e.target.value) })}
                                     className="w-12 px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold"
                                   />
                                   <input 
                                     type="number" 
                                     placeholder="Rate"
                                     value={item.stitching_rate || ''}
                                     onChange={(e) => updateItem(item.id, { stitching_rate: Number(e.target.value) })}
                                     className="w-16 px-2 py-1 bg-slate-50 rounded-lg text-[10px] font-bold"
                                   />
                                 </div>
                               </div>
                             )}

                             {/* Hardware Section */}
                             {(item.type === 'Curtain' || item.type === 'Roman Blind' || item.type === 'Rods Only') && (
                               <div className="space-y-1">
                                 <label className="block text-[7px] font-black text-slate-400 uppercase mb-1">Hardware (Rod FT)</label>
                                 <div className="flex gap-1 items-center">
                                    <input 
                                     type="number" 
                                     placeholder="ft"
                                     value={item.track_ft || ''}
                                     onChange={(e) => updateItem(item.id, { track_ft: Number(e.target.value) })}
                                     className="w-12 px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold"
                                   />
                                    <input 
                                     type="number" 
                                     placeholder="Rate"
                                     value={item.track_rate || ''}
                                     onChange={(e) => updateItem(item.id, { track_rate: Number(e.target.value) })}
                                     className="w-16 px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold"
                                   />
                                   {(item.type === 'Curtain' || item.type === 'Roman Blind') && (
                                    <label className="flex items-center gap-1 cursor-pointer select-none">
                                      <input 
                                        type="checkbox" 
                                        checked={item.is_double_curtain}
                                        onChange={(e) => updateItem(item.id, { is_double_curtain: e.target.checked })}
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

                        {/* Column 4: Total Cost */}
                        <td className="px-6 py-5 text-right align-top">
                          <div className="text-sm font-black text-[#002d62]">₹{calculateItemTotal(item).toLocaleString()}</div>
                          <div className="text-[9px] font-bold text-slate-400 mt-0.5">₹{(calculateItemTotal(item) / (item.quantity || 1)).toLocaleString()} / unit</div>
                          <div className="flex flex-col items-end gap-1 mt-2">
                            {item.type !== 'Fabric Only' && (
                              <button 
                                onClick={() => {
                                  const cost = prompt("Enter Installation Cost per unit:", item.installation_cost.toString());
                                  if (cost !== null) updateItem(item.id, { installation_cost: Number(cost) });
                                }}
                                className="text-[7px] font-black text-blue-500 uppercase tracking-tighter hover:underline"
                              >
                                + Installation ₹{item.installation_cost}
                              </button>
                            )}
                            {(item.type === 'Roman Blind' || item.type === 'Roller Blind' || item.type === 'Mosquito Net') && (
                               <button 
                                 onClick={() => {
                                   const cost = prompt("Enter Mechanism/Frame Cost per unit:", item.mechanism_cost.toString());
                                   if (cost !== null) updateItem(item.id, { mechanism_cost: Number(cost) });
                                 }}
                                 className="text-[7px] font-black text-emerald-500 uppercase tracking-tighter hover:underline"
                               >
                                 + Mech ₹{item.mechanism_cost}
                               </button>
                            )}
                          </div>
                        </td>

                        {/* Column 5: Actions */}
                        <td className="px-6 py-5 align-top">
                           <button 
                             onClick={() => setItems(items.filter(it => it.id !== item.id))}
                             className="text-red-300 hover:text-red-500 transition-colors"
                           >
                             <i className="fas fa-times"></i>
                           </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Miscellaneous charges section */}
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
                onClick={() => handleDownloadPDF('quotation')}
                className="px-8 py-5 bg-white text-[#002d62] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all shadow-xl active:scale-95"
              >
                Finalize & Print
              </button>
            </div>
          </div>

        </div>
        </div>
      )}
    </div>
  );
};
