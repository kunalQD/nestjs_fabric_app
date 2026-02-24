import React from "react";
import { WindowEntry } from "../types";

interface Props {
  customer: any;
  entries: WindowEntry[];
  totalFabric: number;
  onClose: () => void;
}

const PrintLayout: React.FC<Props> = ({
  customer,
  entries,
  totalFabric,
  onClose
}) => {

  React.useEffect(() => {
    setTimeout(() => {
      window.print();
    }, 300);
  }, []);

  return (
    <div className="fixed inset-0 bg-white z-50 p-10 overflow-auto">
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-red-500"
      >
        Close
      </button>

      <h1 className="text-4xl font-black mb-6">
        JOB SHEET
      </h1>

      <p className="mb-6 font-bold">
        {customer.name} | {customer.phone}
      </p>

      <table className="w-full border border-slate-200">
        <thead>
          <tr className="bg-slate-100">
            <th className="p-4 text-left">Window</th>
            <th className="p-4 text-center">Size</th>
            <th className="p-4 text-right">Fabric</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i}>
              <td className="p-4">{e.window_name}</td>
              <td className="p-4 text-center">
                {e.width}" x {e.height}"
              </td>
              <td className="p-4 text-right">
                {e.quantity.toFixed(2)} M
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} className="p-4 font-black text-right">
              Total Fabric
            </td>
            <td className="p-4 text-right font-black">
              {totalFabric.toFixed(2)} M
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default PrintLayout;