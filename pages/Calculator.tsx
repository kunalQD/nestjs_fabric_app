import React,
{
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  lazy,
  Suspense
} from "react";

import { dataService } from "../services/dataService";
import { WindowEntry, OrderStatus } from "../types";
import {
  SHOWROOMS,
  STITCH_TYPES,
  LINING_TYPES,
  TAILORS,
  FITTERS
} from "../constants";

/* ================= LAZY PRINT COMPONENT ================= */

const PrintLayout = lazy(() => import("./PrintLayout"));

interface CalculatorProps {
  orderId: string | null;
  onSave: () => void;
}

/* ================= IMAGE COMPRESSION ================= */

const compressImage = (base64Str: string, maxWidth = 1200): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };

    img.onerror = () => resolve(base64Str);
  });
};

export const Calculator: React.FC<CalculatorProps> = ({
  orderId,
  onSave
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showPrint, setShowPrint] = useState(false);

  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    showroom: SHOWROOMS[0],
    status: OrderStatus.FABRIC_PENDING,
    due_date: "",
    tailor: TAILORS[0],
    fitter: FITTERS[0]
  });

  const [entries, setEntries] = useState<WindowEntry[]>([]);
  const [isEditWindow, setIsEditWindow] = useState<number | null>(null);

  const [currentEntry, setCurrentEntry] =
    useState<Partial<WindowEntry>>({
      window_name: "",
      stitch_type: STITCH_TYPES[0],
      lining_type: LINING_TYPES[0],
      width: 0,
      height: 0,
      notes: "",
      images: [],
      is_double_layer: false
    });

  const [payments, setPayments] = useState<
    { amount: number; date: string; method: string }[]
  >([]);

  const [totalBill, setTotalBill] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  /* ================= FETCH ================= */

  useEffect(() => {
    if (!orderId) return;

    let mounted = true;
    setLoading(true);

    dataService.getOrderById(orderId).then((order) => {
      if (!mounted) return;

      if (order) {
        setCustomer({
          name: order.customer_name,
          phone: order.phone,
          address: order.address,
          showroom: order.showroom,
          status: order.status,
          due_date: order.due_date,
          tailor: order.tailor || TAILORS[0],
          fitter: order.fitter || FITTERS[0]
        });

        setEntries(order.entries || []);
        setPayments(order.payments || []);
        setTotalBill(order.total_bill || 0);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [orderId]);

  /* ================= MEMO VALUES ================= */

  const paidAmount = useMemo(
    () => payments.reduce((s, p) => s + (Number(p.amount) || 0), 0),
    [payments]
  );

  const balanceAmount = useMemo(
    () => totalBill - paidAmount,
    [totalBill, paidAmount]
  );

  const totalFabric = useMemo(
    () => entries.reduce((sum, e) => sum + e.quantity, 0),
    [entries]
  );

  /* ================= SAVE ================= */

  const handleSaveOrder = useCallback(async () => {
    if (!customer.name || !customer.phone) {
      alert("Please enter customer name and phone");
      return;
    }

    setLoading(true);

    try {
      await dataService.saveOrder(
        {
          customer_name: customer.name,
          phone: customer.phone,
          address: customer.address,
          showroom: customer.showroom,
          status: customer.status,
          due_date: customer.due_date,
          tailor: customer.tailor,
          fitter: customer.fitter,
          payments,
          total_bill: totalBill,
          order_id: orderId || undefined
        },
        entries
      );

      onSave();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [customer, payments, totalBill, orderId, entries, onSave]);

  /* ================= ENTRY TABLE MEMO ================= */

  const renderedEntries = useMemo(() => {
    if (entries.length === 0) {
      return (
        <tr>
          <td colSpan={4} className="px-10 py-20 text-center">
            <p className="text-slate-300 font-black uppercase text-[10px] tracking-widest">
              No units registered for this project
            </p>
          </td>
        </tr>
      );
    }

    return entries.map((e, idx) => (
      <tr key={e.window_id || idx}>
        <td className="px-6 md:px-10 py-6 font-black">
          {e.window_name}
        </td>
        <td className="px-6 md:px-10 py-6 text-center">
          {e.width}" x {e.height}"
        </td>
        <td className="px-6 md:px-10 py-6 text-center">
          {e.quantity.toFixed(2)} M
        </td>
        <td className="px-6 md:px-10 py-6 text-right">
          <button
            onClick={() => {
              setCurrentEntry({ ...entries[idx] });
              setIsEditWindow(idx);
            }}
            className="text-sm text-[#002d62]"
          >
            Edit
          </button>
        </td>
      </tr>
    ));
  }, [entries]);

  /* ================= RETURN ================= */

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* SAVE + PRINT */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={handleSaveOrder}
          disabled={loading}
          className="px-6 py-3 bg-[#002d62] text-white rounded-xl"
        >
          {loading ? "Saving..." : "Save"}
        </button>

        <button
          onClick={() => setShowPrint(true)}
          className="px-6 py-3 border border-[#002d62] rounded-xl"
        >
          Generate Job Sheet
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-6 py-4">Window</th>
              <th className="px-6 py-4 text-center">Size</th>
              <th className="px-6 py-4 text-center">Fabric</th>
              <th className="px-6 py-4 text-right">Edit</th>
            </tr>
          </thead>
          <tbody>{renderedEntries}</tbody>
        </table>
      </div>

      {/* ================= LAZY PRINT ================= */}

      {showPrint && (
        <Suspense fallback={<div className="p-10 text-center">Preparing Print Layout...</div>}>
          <PrintLayout
            customer={customer}
            entries={entries}
            totalFabric={totalFabric}
            onClose={() => setShowPrint(false)}
          />
        </Suspense>
      )}
    </div>
  );
};