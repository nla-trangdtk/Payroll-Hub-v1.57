/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataTable } from "../../../components/DataTable";
import { CENTER_COLUMNS } from "../../../constants/timesheet-columns";

import { useMemo } from "react";

interface CenterTableProps {
  data: Record<string, unknown>[];
  onFilteredDataChange?: (data: any[]) => void;
}

export function CenterTable({ data, onFilteredDataChange }: CenterTableProps) {
  const totalHours = useMemo(() => {
    return data.reduce((sum, r) => sum + (Number(r.totalHours) || 0), 0);
  }, [data]);

  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <div 
        className="bg-white border-b border-slate-100 flex items-center justify-between"
        style={{ height: "64px", paddingLeft: "20px", paddingRight: "20px" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
          <h3 className="font-black uppercase tracking-widest text-slate-700/80 text-[12px]">
            BẢNG TỔNG HỢP GIỜ LÀM THEO TRUNG TÂM (CENTER)
          </h3>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">TRUNG TÂM</span>
            <span className="text-sm font-black text-slate-700">{data.length}</span>
          </div>
          <div className="flex flex-col items-end border-l border-slate-200 pl-6">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">TỔNG GIỜ LÀM</span>
            <div className="bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-100">
                <span className="text-sm font-black text-slate-700 tracking-tight">{totalHours.toLocaleString()}h</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <DataTable
          columns={CENTER_COLUMNS as any}
          data={data as any}
          isEditable={false}
          showRowNumber={true}
          selectable={false}
          striped={false}
          storageKey="timesheet_center"
          className="rounded-none border-none"
          headerClassName="bg-transparent text-slate-800 border-slate-200"
          footerClassName="bg-transparent text-slate-900 font-black border-t border-slate-200"
          showFooter={true}
          onFilteredDataChange={onFilteredDataChange}
        />
      </div>
    </div>
  );
}
