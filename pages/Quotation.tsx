import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QuotationItem, MiscCharge, Quotation as QType } from '../types';
import { dataService } from '../services/dataService';

const PRODUCT_CATEGORIES = [
  'Curtain Fabric',
  'Blinds',
  'Tracks',
  'Lining',
  'Sofa Labour',
  'Sofa Fabric',
  'Stitching Charges',
  'Installation Charges',
  'Other'
] as const;

type CategoryType = typeof PRODUCT_CATEGORIES[number];

export const Quotation: React.FC = () => {
  const [view, setView] = useState<'create' | 'list'>('create');
  const [savedQuotes, setSavedQuotes] = useState<QType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentId, setCurrentId] = useState<string | null>(null);
  
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [items, setItems] = useState<QuotationItem[]>([]);
  const [additionalDiscount, setAdditionalDiscount] = useState<number>(0);
  const [gstPercent, setGstPercent] = useState<number>(0);
  const [terms, setTerms] = useState<string>(
    "1. 50% advance to initiate order.\n2. Balance on completion and before delivery.\n3. Goods once sold will not be taken back.\n4. Subject to Jaipur Jurisdiction."
  );

  const fetchQuotations = useCallback(async (search?: string) => {
    setIsLoading(true);
    try {
      const quotes = await dataService.getQuotations(search);
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

  const handleSearch = () => {
    fetchQuotations(searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    fetchQuotations('');
  };

  // Get default unit when category is changed
  const getDefaultUnit = (category: CategoryType): string => {
    switch (category) {
      case 'Curtain Fabric':
      case 'Lining':
      case 'Sofa Fabric':
        return 'Mtrs';
      case 'Tracks':
        return 'FT';
      case 'Stitching Charges':
        return 'Panels';
      case 'Installation Charges':
        return 'Nos';
      case 'Blinds':
        return 'Sqft';
      case 'Sofa Labour':
        return 'Seats';
      default:
        return 'Nos';
    }
  };

  const handleAddItem = () => {
    const defaultCategory: CategoryType = 'Curtain Fabric';
    const newItem: QuotationItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      type: defaultCategory,
      qty: 1,
      unit: getDefaultUnit(defaultCategory),
      rate: 0,
      discount_percent: 0,
      comment: ''
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, updates: Partial<QuotationItem>) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        // If type changed and unit was not custom modified, set default unit
        if (updates.type && updates.type !== item.type) {
          updated.unit = getDefaultUnit(updates.type as CategoryType);
        }
        return updated;
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  // Calculate totals
  const totalCostBeforeDiscount = useMemo(() => {
    return items.reduce((sum, item) => sum + ((item.qty || 0) * (item.rate || 0)), 0);
  }, [items]);

  const totalCostPostDiscount = useMemo(() => {
    return items.reduce((sum, item) => {
      const base = (item.qty || 0) * (item.rate || 0);
      const disc = base * ((item.discount_percent || 0) / 100);
      return sum + (base - disc);
    }, 0);
  }, [items]);

  const finalTotalBeforeGst = useMemo(() => {
    return Math.max(0, totalCostPostDiscount - (additionalDiscount || 0));
  }, [totalCostPostDiscount, additionalDiscount]);

  const gstAmount = useMemo(() => {
    return Math.round(finalTotalBeforeGst * ((gstPercent || 0) / 100));
  }, [finalTotalBeforeGst, gstPercent]);

  const finalTotalAmount = useMemo(() => {
    return finalTotalBeforeGst + gstAmount;
  }, [finalTotalBeforeGst, gstAmount]);

  const handleSaveQuotation = async () => {
    if (!customer.name) {
      alert("Please enter customer name before saving.");
      return;
    }
    if (items.length === 0) {
      alert("Please add at least one line item before saving.");
      return;
    }

    const payload: QType = {
      id: currentId || `temp_${Date.now()}`,
      customer_name: customer.name,
      phone: customer.phone,
      date: customer.date || new Date().toISOString().split('T')[0],
      items,
      misc_charges: [], // preserved for DB compatibility
      fabric_discount_percent: 0, // row-level is used instead
      additional_discount: additionalDiscount,
      gst_percent: gstPercent,
      terms_conditions: terms,
      total_amount: finalTotalAmount
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
    setCustomer({
      name: q.customer_name,
      phone: q.phone || '',
      date: q.date ? q.date.split('T')[0] : new Date().toISOString().split('T')[0]
    });
    
    // Backward compatibility mapping
    let loadedItems: QuotationItem[] = [];
    if (q.items && q.items.length > 0) {
      loadedItems = q.items.map(item => ({
        ...item,
        // fallback values just in case
        qty: item.qty ?? (item as any).quantity ?? 1,
        unit: item.unit ?? 'Nos',
        rate: item.rate ?? 0,
        discount_percent: item.discount_percent ?? 0
      }));
    } else if ((q as any).rooms && (q as any).rooms.length > 0) {
      // Map old nested room & window model to linear flat items
      loadedItems = (q as any).rooms.flatMap((r: any) => 
        r.windows?.map((w: any) => {
          let itemType: CategoryType = 'Curtain Fabric';
          let itemQty = w.fabric_qty || w.quantity || 1;
          let itemUnit = 'Mtrs';
          let itemRate = w.fabric_rate || 0;

          if (w.type === 'Curtain') {
            itemType = 'Curtain Fabric';
            itemUnit = 'Mtrs';
            itemRate = w.fabric_rate || 0;
          } else if (w.type === 'Roman Blind' || w.type === 'Roller Blind') {
            itemType = 'Blinds';
            itemUnit = 'Sqft';
            itemRate = w.blind_rate || 0;
            itemQty = w.sqft || w.quantity || 1;
          } else if (w.type === 'Rods Only') {
            itemType = 'Tracks';
            itemUnit = 'FT';
            itemRate = w.track_rate || 0;
            itemQty = w.track_ft || 1;
          } else if (w.type === 'Mosquito Net') {
            itemType = 'Blinds';
            itemUnit = 'Sqft';
            itemRate = w.blind_rate || 0;
            itemQty = w.sqft || 1;
          }

          return {
            id: w.id || Math.random().toString(36).substr(2, 9),
            name: `${r.name} - ${w.name || 'Window'}`,
            type: itemType,
            qty: itemQty,
            unit: itemUnit,
            rate: itemRate,
            discount_percent: q.fabric_discount_percent || 0,
            comment: w.comment || ''
          };
        }) || []
      );
    }

    setItems(loadedItems);
    setAdditionalDiscount(q.additional_discount || 0);
    setGstPercent(q.gst_percent || 0);
    setTerms(q.terms_conditions || "1. 50% advance to initiate order.\n2. Balance on completion and before delivery.\n3. Goods once sold will not be taken back.\n4. Subject to Jaipur Jurisdiction.");
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
    setCustomer({
      name: '',
      phone: '',
      date: new Date().toISOString().split('T')[0]
    });
    setItems([]);
    setAdditionalDiscount(0);
    setGstPercent(0);
    setView('create');
  };

  const handleDownloadPDF = useCallback((pdfType: 'quotation' | 'delivery_challan', overrideQuote?: QType) => {
    const doc = new jsPDF();
    const navy: [number, number, number] = [0, 45, 98];
    
    const currentCustomer = overrideQuote ? { name: overrideQuote.customer_name, phone: overrideQuote.phone, date: overrideQuote.date } : customer;
    
    // Load items for PDF (handles override/older types too)
    let currentItems: QuotationItem[] = [];
    if (overrideQuote) {
      if (overrideQuote.items && overrideQuote.items.length > 0) {
        currentItems = overrideQuote.items;
      } else {
        // Fallback for old style rooms in overrideQuote
        currentItems = (overrideQuote as any).rooms?.flatMap((r: any) => 
          r.windows?.map((w: any) => ({
            id: w.id || Math.random().toString(36).substr(2, 9),
            name: `${r.name} - ${w.name}`,
            type: 'Curtain Fabric',
            qty: w.fabric_qty || w.quantity || 1,
            unit: w.type === 'Curtain' ? 'Mtrs' : (w.type === 'Rods Only' ? 'FT' : 'Nos'),
            rate: w.fabric_rate || w.blind_rate || 0,
            discount_percent: overrideQuote.fabric_discount_percent || 0,
            comment: w.comment || ''
          }))
        ) || [];
      }
    } else {
      currentItems = items;
    }

    const currentAdditionalDiscount = overrideQuote ? overrideQuote.additional_discount || 0 : additionalDiscount;
    const currentGstPercent = overrideQuote ? overrideQuote.gst_percent || 0 : gstPercent;
    const currentTerms = overrideQuote ? overrideQuote.terms_conditions || terms : terms;

    // Header Background Accent
    doc.setFillColor(navy[0], navy[1], navy[2]);
    doc.rect(0, 0, 210, 42, 'F');
    
    doc.setFontSize(26);
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.text("QUILT & DRAPES", 105, 16, { align: "center" });
    
    doc.setFontSize(9);
    doc.setTextColor(200);
    doc.setFont("helvetica", "normal");
    doc.text("F A B R I C A T I O N S   &   I N T E R I O R S", 105, 24, { align: "center" });
    
    doc.setFontSize(13);
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.text(pdfType === 'quotation' ? "ESTIMATED QUOTATION" : "DELIVERY CHALLAN", 105, 33, { align: "center" });

    // Client/Metadata Section
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(pdfType === 'quotation' ? "CLIENT ESTIMATE DETAILS" : "DELIVERY CHALLAN FOR", 15, 54);
    
    doc.setDrawColor(navy[0], navy[1], navy[2]);
    doc.setLineWidth(0.5);
    doc.line(15, 56, 65, 56);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
    doc.text(`Name: ${currentCustomer.name || 'Valued Client'}`, 15, 64);
    doc.text(`Phone: ${currentCustomer.phone || 'N/A'}`, 15, 70);
    
    const displayDate = currentCustomer.date ? new Date(currentCustomer.date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
    doc.setFont("helvetica", "bold");
    doc.text(`Date: ${displayDate}`, 195, 64, { align: "right" });
    
    const uniqueId = overrideQuote ? overrideQuote.id : (currentId || 'TEMP-DRAFT');
    doc.text(`ID: #${uniqueId}`, 195, 70, { align: "right" });

    let currentY = 82;

    // Table Columns & Body
    let tableHead: string[][];
    let tableBody: any[][];

    if (pdfType === 'quotation') {
      tableHead = [['SNo', 'Products', 'Total QTY', 'Total Cost', 'Total Cost Post Discount']];
      
      tableBody = currentItems.map((item, idx) => {
        const cost = (item.qty || 0) * (item.rate || 0);
        const discountAmt = cost * ((item.discount_percent || 0) / 100);
        const postDiscount = cost - discountAmt;
        
        return [
          idx + 1,
          item.name || `${item.type}`,
          `${item.qty} ${item.unit || ''}`.trim(),
          `Rs. ${Math.round(cost).toLocaleString()}`,
          `Rs. ${Math.round(postDiscount).toLocaleString()}`
        ];
      });
    } else {
      // Delivery Challan
      tableHead = [['SNo', 'Products', 'Total QTY', 'Delivered Status', 'Notes / Remarks']];
      tableBody = currentItems.map((item, idx) => {
        return [
          idx + 1,
          item.name || `${item.type}`,
          `${item.qty} ${item.unit || ''}`.trim(),
          "Pending Delivery / Handed Over",
          item.comment || ''
        ];
      });
    }

    autoTable(doc, {
      startY: currentY,
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: navy, fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9, textColor: [40, 40, 40] },
      columnStyles: pdfType === 'quotation' ? {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 85 },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
      } : {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 95 },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 30, halign: 'center' },
        4: { cellWidth: 30 }
      },
      margin: { left: 15, right: 15 },
      didDrawPage: (data) => {
        currentY = data.cursor?.y || currentY;
      }
    });

    currentY += 10;

    if (pdfType === 'quotation') {
      // Recalculate values for current list
      const sumCost = currentItems.reduce((sum, item) => sum + ((item.qty || 0) * (item.rate || 0)), 0);
      const sumPostDiscount = currentItems.reduce((sum, item) => {
        const base = (item.qty || 0) * (item.rate || 0);
        return sum + (base - (base * ((item.discount_percent || 0) / 100)));
      }, 0);

      const beforeGst = Math.max(0, sumPostDiscount - currentAdditionalDiscount);
      const gstAmt = Math.round(beforeGst * (currentGstPercent / 100));
      const totalAmount = beforeGst + gstAmt;

      if (currentY > 210) {
        doc.addPage();
        currentY = 25;
      }

      // Add Grand Total summary block
      doc.setDrawColor(220);
      doc.line(110, currentY, 195, currentY);
      currentY += 6;

      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text("Sum of Total Cost:", 120, currentY);
      doc.text(`Rs. ${Math.round(sumCost).toLocaleString()}`, 195, currentY, { align: "right" });
      
      currentY += 6;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(navy[0], navy[1], navy[2]);
      doc.text("Post Discount Subtotal:", 120, currentY);
      doc.text(`Rs. ${Math.round(sumPostDiscount).toLocaleString()}`, 195, currentY, { align: "right" });

      if (currentAdditionalDiscount > 0) {
        currentY += 6;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(190, 0, 0);
        doc.text("Less Additional Discount:", 120, currentY);
        doc.text(`- Rs. ${currentAdditionalDiscount.toLocaleString()}`, 195, currentY, { align: "right" });
      }

      if (currentGstPercent > 0) {
        currentY += 6;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(`GST (${currentGstPercent}%):`, 120, currentY);
        doc.text(`Rs. ${gstAmt.toLocaleString()}`, 195, currentY, { align: "right" });
      }

      currentY += 9;
      doc.setFillColor(254, 240, 138); // Yellow background like sample image
      doc.rect(115, currentY - 5, 80, 10, 'F');
      doc.setDrawColor(234, 179, 8);
      doc.rect(115, currentY - 5, 80, 10, 'S');
      
      doc.setTextColor(0);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Grand Total:", 120, currentY + 1.5);
      doc.text(`Rs. ${Math.round(totalAmount).toLocaleString()}`, 190, currentY + 1.5, { align: "right" });

      // Terms Box
      currentY = Math.max(currentY + 22, 230);
      doc.setTextColor(50);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("TERMS & CONDITIONS", 15, currentY);
      
      doc.setDrawColor(navy[0], navy[1], navy[2]);
      doc.setLineWidth(0.3);
      doc.line(15, currentY + 1.5, 55, currentY + 1.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(80);
      const splitTerms = doc.splitTextToSize(currentTerms, 180);
      doc.text(splitTerms, 15, currentY + 7);
    } else {
      // Delivery Challan Footer
      if (currentY > 210) {
        doc.addPage();
        currentY = 25;
      }

      doc.setTextColor(50);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("TERMS OF MATERIAL DELIVERY", 15, currentY);
      
      doc.setDrawColor(navy[0], navy[1], navy[2]);
      doc.setLineWidth(0.3);
      doc.line(15, currentY + 1.5, 65, currentY + 1.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100);
      doc.text([
        "1. Material/Goods received in complete and pristine physical condition.",
        "2. Any damages, scratches or discrepancies must be highlighted immediately upon handover.",
        "3. Installation schedule depends on ready physical conditions of site.",
      ], 15, currentY + 8);

      currentY += 38;

      // Signature Blocks
      doc.setDrawColor(180);
      doc.setLineWidth(0.4);
      doc.line(15, currentY + 12, 75, currentY + 12);
      doc.line(135, currentY + 12, 195, currentY + 12);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60);
      doc.text("Receiver's Signature & Date", 15, currentY + 17);
      doc.text("For Quilt & Drapes (Authorized Signature)", 135, currentY + 17);
    }

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }, [customer, items, additionalDiscount, gstPercent, terms, currentId]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header section with view switching */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
        <div>
          <h2 className="text-3xl font-black text-[#002d62] tracking-tighter uppercase">Quotation Studio</h2>
          <div className="flex gap-6 mt-3">
            <button 
              onClick={resetForm}
              className={`text-xs font-black uppercase tracking-[0.2em] pb-1.5 border-b-2 transition-all ${view === 'create' ? 'text-[#002d62] border-[#002d62]' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
            >
              Draft New Quote
            </button>
            <button 
              onClick={() => { setView('list'); fetchQuotations(); }}
              className={`text-xs font-black uppercase tracking-[0.2em] pb-1.5 border-b-2 transition-all ${view === 'list' ? 'text-[#002d62] border-[#002d62]' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
            >
              Saved Estimates ({savedQuotes.length})
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {view === 'create' && (
            <>
              <button 
                onClick={handleSaveQuotation}
                className="px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95"
              >
                <i className="fas fa-save"></i> Save Quotation
              </button>
              <button 
                onClick={() => handleDownloadPDF('quotation')}
                className="px-6 py-3.5 bg-[#002d62] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-[#003d7a] transition-all flex items-center gap-2 active:scale-95"
              >
                <i className="fas fa-print"></i> Download PDF
              </button>
              <button 
                onClick={() => handleDownloadPDF('delivery_challan')}
                className="px-6 py-3.5 bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-amber-700 transition-all flex items-center gap-2 active:scale-95"
              >
                <i className="fas fa-truck"></i> Delivery Challan
              </button>
            </>
          )}
        </div>
      </div>

      {view === 'list' ? (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="flex gap-2 max-w-md bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
            <input 
              type="text"
              placeholder="Search customer, phone, or estimate ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-4 py-2 bg-transparent border-none text-sm font-semibold outline-none"
            />
            {searchQuery && (
              <button 
                onClick={handleClearSearch}
                className="px-3 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Clear
              </button>
            )}
            <button 
              onClick={handleSearch}
              className="px-5 py-2 bg-[#002d62] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-800 transition-all"
            >
              Search
            </button>
          </div>

          {/* List layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-8">
            {isLoading ? (
              <div className="col-span-full py-20 text-center">
                <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Loading Estimations...</p>
              </div>
            ) : savedQuotes.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border border-slate-100">
                 <i className="fas fa-folder-open text-slate-200 text-6xl mb-4"></i>
                 <p className="font-black text-slate-300 uppercase tracking-widest">No saved quotations found</p>
              </div>
            ) : (
              savedQuotes.map(quote => (
                <div key={quote.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:border-[#002d62]/20 transition-all flex flex-col justify-between min-h-[250px] group relative">
                  <div className="absolute top-4 right-4">
                     <button 
                       onClick={() => deleteQuotation(quote.id)} 
                       className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                     >
                       <i className="fas fa-trash-alt text-xs"></i>
                     </button>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">
                      ID: #{quote.id}
                    </span>
                    <h4 className="text-xl font-black text-[#002d62] mt-4 mb-1">{quote.customer_name}</h4>
                    <p className="text-slate-400 text-xs font-bold mb-6">{quote.phone || 'No phone number available'}</p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-end gap-3 border-t border-slate-50 pt-4">
                       <div>
                         <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Final Total</div>
                         <div className="text-2xl font-black text-[#002d62]">₹{Math.round(quote.total_amount || 0).toLocaleString()}</div>
                       </div>
                       <div className="flex flex-col gap-1.5">
                         <button 
                           onClick={() => loadQuotation(quote)}
                           className="px-4 py-2 bg-[#002d62] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-800 transition-all text-center"
                         >
                           Edit
                         </button>
                         <button 
                           onClick={() => handleDownloadPDF('quotation', quote)}
                           className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all text-center"
                         >
                           Print PDF
                         </button>
                       </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
          {/* Left Column: Client metadata & adjustments */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
              <h3 className="text-xs font-black text-[#002d62] uppercase tracking-[0.2em] mb-4">Client Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer Name</label>
                  <input 
                    type="text"
                    value={customer.name}
                    onChange={(e) => setCustomer({...customer, name: e.target.value})}
                    className="w-full px-4 py-3 mt-1 bg-slate-50 border-none rounded-xl font-bold text-sm outline-none focus:ring-2 ring-blue-500/20"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Phone Number</label>
                  <input 
                    type="text"
                    value={customer.phone}
                    onChange={(e) => setCustomer({...customer, phone: e.target.value})}
                    className="w-full px-4 py-3 mt-1 bg-slate-50 border-none rounded-xl font-bold text-sm outline-none focus:ring-2 ring-blue-500/20"
                    placeholder="Enter contact No"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</label>
                  <input 
                    type="date"
                    value={customer.date}
                    onChange={(e) => setCustomer({...customer, date: e.target.value})}
                    className="w-full px-4 py-3 mt-1 bg-slate-50 border-none rounded-xl font-bold text-sm outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
              <h3 className="text-xs font-black text-amber-600 uppercase tracking-[0.2em] mb-4">Global Adjustments</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Additional Discount (₹)</label>
                  <input 
                    type="number"
                    value={additionalDiscount || ''}
                    onChange={(e) => setAdditionalDiscount(Number(e.target.value))}
                    className="w-full px-4 py-3 mt-1 bg-yellow-50 text-yellow-800 rounded-xl font-black text-sm outline-none"
                    placeholder="Flat discount amount"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">GST (%)</label>
                  <select 
                    value={gstPercent}
                    onChange={(e) => setGstPercent(Number(e.target.value))}
                    className="w-full px-4 py-3 mt-1 bg-blue-50 text-blue-800 rounded-xl font-black text-sm outline-none appearance-none cursor-pointer"
                  >
                    <option value={0}>No GST (0%)</option>
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Terms & Conditions</label>
                  <textarea 
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    className="w-full px-4 py-3 mt-1 bg-slate-50 border-none rounded-xl font-semibold text-xs outline-none min-h-[120px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Build estimate table */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-100">
              <div className="bg-[#002d62] px-8 py-5 flex justify-between items-center">
                <div>
                  <h3 className="text-white font-black uppercase tracking-[0.2em] text-sm">Products & Estimations</h3>
                  <p className="text-blue-200/60 text-[10px] font-bold uppercase tracking-widest mt-0.5">{items.length} line item(s)</p>
                </div>
                <button 
                  onClick={handleAddItem}
                  className="px-5 py-2.5 bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/20 active:scale-95 transition-all flex items-center gap-2"
                >
                  <i className="fas fa-plus"></i> Add Line Item
                </button>
              </div>

              {items.length === 0 ? (
                <div className="h-80 flex flex-col items-center justify-center text-slate-300 p-8">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 text-2xl mb-4 border border-dashed border-slate-200">
                    <i className="fas fa-clipboard-list"></i>
                  </div>
                  <p className="font-black uppercase tracking-widest text-xs text-slate-400 mb-4">Estimate sheet is empty</p>
                  <button 
                    onClick={handleAddItem}
                    className="px-6 py-3 bg-[#002d62] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-800 transition-all shadow-md"
                  >
                    Add First Item
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-left">
                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center w-12">SNo</th>
                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-48">Category</th>
                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Product Details / Description</th>
                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-28">Total Qty</th>
                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-24">Unit</th>
                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-28">Rate (₹)</th>
                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-24 text-center">Disc (%)</th>
                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-28 text-right">Total Cost</th>
                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-32 text-right">Cost Post Disc</th>
                        <th className="px-5 py-4 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, idx) => {
                        const rowCost = (item.qty || 0) * (item.rate || 0);
                        const rowDisc = rowCost * ((item.discount_percent || 0) / 100);
                        const rowPostDisc = rowCost - rowDisc;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-all">
                            
                            {/* Serial Number */}
                            <td className="px-5 py-4 text-center text-xs font-bold text-slate-400">
                              {idx + 1}
                            </td>

                            {/* Dropdown product categories */}
                            <td className="px-5 py-4">
                              <select 
                                value={item.type}
                                onChange={(e) => updateItem(item.id, { type: e.target.value as CategoryType })}
                                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 ring-blue-500/20"
                              >
                                {PRODUCT_CATEGORIES.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </td>

                            {/* Description / Products */}
                            <td className="px-5 py-4">
                              <input 
                                type="text"
                                value={item.name}
                                onChange={(e) => updateItem(item.id, { name: e.target.value })}
                                placeholder="e.g. Living Room - Main Fabric - 4th Floor"
                                className="w-full px-3 py-2 bg-slate-50 border border-transparent rounded-xl font-semibold text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-slate-200"
                              />
                              <input 
                                type="text"
                                value={item.comment || ''}
                                onChange={(e) => updateItem(item.id, { comment: e.target.value })}
                                placeholder="Optional placement note..."
                                className="w-full px-3 py-1 mt-1 bg-transparent text-[10px] text-slate-400 italic outline-none"
                              />
                            </td>

                            {/* Quantity */}
                            <td className="px-5 py-4">
                              <input 
                                type="number"
                                step="any"
                                value={item.qty ?? ''}
                                onChange={(e) => updateItem(item.id, { qty: Number(e.target.value) })}
                                placeholder="1"
                                className="w-full px-3 py-2 bg-slate-50 border border-transparent rounded-xl font-bold text-xs text-slate-800 outline-none text-center focus:bg-white focus:border-slate-200"
                              />
                            </td>

                            {/* Unit (with quick change options) */}
                            <td className="px-5 py-4">
                              <div className="relative group/unit">
                                <input 
                                  type="text"
                                  value={item.unit}
                                  onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                                  placeholder="e.g. Mtrs"
                                  className="w-full px-2 py-2 bg-slate-50 border border-transparent rounded-xl font-bold text-xs text-slate-800 text-center outline-none focus:bg-white focus:border-slate-200"
                                />
                                {/* Quick select pills */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-slate-100 rounded-lg shadow-md p-1.5 hidden group-focus-within/unit:flex gap-1 z-30">
                                  {['Mtrs', 'FT', 'Panels', 'Nos', 'Sqft', 'Seats'].map(unitPill => (
                                    <button 
                                      key={unitPill}
                                      type="button"
                                      onClick={() => updateItem(item.id, { unit: unitPill })}
                                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-500 hover:text-white rounded text-[8px] font-black uppercase transition-colors"
                                    >
                                      {unitPill}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </td>

                            {/* Rate */}
                            <td className="px-5 py-4">
                              <div className="relative">
                                <span className="absolute left-2 top-2.5 text-[10px] font-bold text-slate-400">₹</span>
                                <input 
                                  type="number"
                                  value={item.rate ?? ''}
                                  onChange={(e) => updateItem(item.id, { rate: Number(e.target.value) })}
                                  placeholder="0"
                                  className="w-full pl-5 pr-2 py-2 bg-slate-50 border border-transparent rounded-xl font-bold text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-200"
                                />
                              </div>
                            </td>

                            {/* Row Discount */}
                            <td className="px-5 py-4">
                              <input 
                                type="number"
                                value={item.discount_percent ?? ''}
                                onChange={(e) => updateItem(item.id, { discount_percent: Math.min(100, Math.max(0, Number(e.target.value))) })}
                                placeholder="0"
                                className="w-full px-1 py-2 bg-emerald-50 border border-transparent rounded-xl font-bold text-xs text-emerald-800 text-center outline-none focus:bg-white focus:border-slate-200"
                              />
                            </td>

                            {/* Total Cost before discount */}
                            <td className="px-5 py-4 text-right text-xs font-bold text-slate-600">
                              ₹{Math.round(rowCost).toLocaleString()}
                            </td>

                            {/* Cost post discount */}
                            <td className="px-5 py-4 text-right text-xs font-black text-[#002d62]">
                              ₹{Math.round(rowPostDisc).toLocaleString()}
                            </td>

                            {/* Remove button */}
                            <td className="px-5 py-4 text-center">
                              <button 
                                onClick={() => removeItem(item.id)}
                                className="text-slate-300 hover:text-red-500 transition-colors text-xs"
                              >
                                <i className="fas fa-trash-alt"></i>
                              </button>
                            </td>

                          </tr>
                        );
                      })}

                      {/* Yellow highlighted summary row matching sample */}
                      <tr className="bg-yellow-50 border-t-2 border-yellow-300 font-black">
                        <td colSpan={2} className="px-5 py-4 text-xs uppercase tracking-widest text-slate-500">
                          Summary Row
                        </td>
                        <td colSpan={5} className="px-5 py-4 text-sm text-[#002d62] text-right font-black uppercase tracking-tighter">
                          Grand Total (Estimates Sum)
                        </td>
                        <td className="px-5 py-4 text-right text-xs text-slate-700">
                          ₹{Math.round(totalCostBeforeDiscount).toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-right text-sm text-yellow-950 font-black">
                          ₹{Math.round(totalCostPostDiscount).toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick Summary Panels */}
            {items.length > 0 && (
              <div className="bg-[#002d62] rounded-[2.5rem] p-8 text-white shadow-xl grid grid-cols-1 md:grid-cols-3 gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-2xl"></div>
                
                <div className="flex flex-col justify-center">
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-200">Total Post-Discount</span>
                  <div className="text-2xl font-black mt-1">₹{Math.round(totalCostPostDiscount).toLocaleString()}</div>
                </div>

                <div className="flex flex-col justify-center">
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-200">Adjustments & GST</span>
                  <div className="text-sm font-semibold mt-1 space-y-1">
                    <div>Less Disc: -₹{additionalDiscount.toLocaleString()}</div>
                    <div>GST ({gstPercent}%): +₹{gstAmount.toLocaleString()}</div>
                  </div>
                </div>

                <div className="flex flex-col justify-center md:items-end border-t md:border-t-0 md:border-l border-blue-800/60 pt-4 md:pt-0 md:pl-6">
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-300">Final Estimated Amount</span>
                  <div className="text-3xl font-black mt-1 text-yellow-300">₹{Math.round(finalTotalAmount).toLocaleString()}</div>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
};
