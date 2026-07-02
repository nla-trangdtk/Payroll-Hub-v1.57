import React from "react";
import { formatMoneyVND } from "../../../lib/utils/data-utils";

interface MktLocalNorthPivotTableRow {
  business: string;
  center: string;
  chargeToCenterMkt: string;
  values: Record<string, number>;
  total: number;
  [key: string]: unknown;
}

interface MktLocalNorthPivotTableProps {
  rows: MktLocalNorthPivotTableRow[];
  types: string[];
  grandTotals: {
    totals: Record<string, number>;
    grandTotal: number;
  };
}

export const MktLocalNorthPivotTable: React.FC<MktLocalNorthPivotTableProps> = ({
  rows,
  types,
  grandTotals,
}) => {
  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-sm" style={{ borderWidth: '0px' }}>
      {/* Header Info - Consistent with other tables */}
      <div 
        className="bg-orange-50/50 border-b border-orange-100 flex items-center justify-between"
        style={{ height: "64px", paddingLeft: "20px", paddingRight: "20px" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          <h3 
            className="font-black uppercase tracking-widest text-orange-900/70 text-[12px]"
          >
            BẢNG PIVOT PHÍ MKT LOCAL NORTH (ĐƠN GIÁ: SỐ GIỜ LÀM * 20.000Đ)
          </h3>
        </div>
        <div 
          className="flex items-center gap-6"
        >
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">SỐ DÒNG</span>
            <span className="text-sm font-black text-slate-700">{rows.length}</span>
          </div>
          <div className="flex flex-col items-end border-l border-slate-200 pl-6">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">TỔNG PHÍ</span>
            <div className="bg-accent/10 px-2.5 py-0.5 rounded-lg border border-accent/20">
                <span className="text-sm font-black text-accent tracking-tight">{formatMoneyVND(grandTotals.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full border-collapse text-[11px]">
          <thead className="sticky top-0 z-20">
            <tr className="bg-slate-50 shadow-sm">
              <th className="px-4 py-3 text-center font-black uppercase tracking-wider text-slate-500 border border-slate-200 bg-slate-50/95 backdrop-blur min-w-[120px]">
                BUSINESS
              </th>
              <th className="px-4 py-3 text-center font-black uppercase tracking-wider text-slate-500 border border-slate-200 bg-slate-50/95 backdrop-blur min-w-[200px]">
                CHARGE TO CENTER MKT
              </th>
              {types.map((type) => (
                <th key={type} className="px-4 py-3 text-center font-black uppercase tracking-wider text-slate-500 border border-slate-200 bg-slate-50/95 backdrop-blur min-w-[100px]">
                  {type}
                </th>
              ))}
              <th className="px-4 py-3 text-center font-black uppercase tracking-wider text-slate-500 border border-slate-200 bg-slate-50/95 backdrop-blur min-w-[120px]">
                GRAND TOTAL
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-4 py-3 font-bold text-slate-600 border border-slate-200">
                  {row.business}
                </td>
                <td className="px-4 py-3 font-bold text-slate-700 border border-slate-200">
                  {row.chargeToCenterMkt}
                </td>
                {types.map((type) => (
                  <td key={type} className={`px-4 py-3 text-right font-medium border border-slate-200 ${row.values[type] ? "text-slate-600" : "text-slate-300"}`}>
                    {row.values[type] ? formatMoneyVND(row.values[type]) : "0"}
                  </td>
                ))}
                <td className="px-4 py-3 text-right font-black text-slate-900 bg-slate-50/20 border border-slate-200">
                  {formatMoneyVND(row.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 z-20">
            <tr className="bg-accent/10 backdrop-blur font-black uppercase tracking-widest text-[11px] border-t-2 border-accent/30 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
              <td colSpan={2} className="px-6 py-4 text-accent border border-accent/20">
                TỔNG CỘNG / GRAND TOTAL
              </td>
              {types.map((type) => (
                <td key={type} className="px-4 py-4 text-right text-accent border border-accent/20">
                  {formatMoneyVND(grandTotals.totals[type] || 0)}
                </td>
              ))}
              <td className="px-4 py-4 text-right text-accent underline decoration-accent/30 decoration-2 underline-offset-4 border border-accent/20">
                {formatMoneyVND(grandTotals.grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
