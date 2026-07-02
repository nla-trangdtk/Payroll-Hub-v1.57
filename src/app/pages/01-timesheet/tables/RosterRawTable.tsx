/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo } from "react";
import { DataTable } from "../../../components/DataTable";
import { DETAIL_COLUMNS } from "../../../constants/timesheet-columns";

interface RosterRawTableProps {
  data: Record<string, unknown>[];
  onFilteredDataChange?: (data: any[]) => void;
  onCellChange?: (row: any, colKey: string, value: any) => void;
}

export function RosterRawTable({ data, onFilteredDataChange, onCellChange }: RosterRawTableProps) {
  const sanitizedData = useMemo(() => {
    return data.map(row => ({
      ...row,
      ma_nv: row.ma_nv !== undefined && row.ma_nv !== null ? String(row.ma_nv) : row.ma_nv,
    }));
  }, [data]);

  return (
    <div 
      className="flex flex-col h-full bg-white overflow-hidden shadow-sm"
      style={{ borderRadius: '48px', borderWidth: '0px' }}
    >
      <div className="flex-1 flex flex-col overflow-hidden">
        <DataTable
          columns={DETAIL_COLUMNS as any}
          data={sanitizedData as any}
          isEditable={true}
          showRowNumber={true}
          selectable={false}
          striped={false}
          storageKey="timesheet_roster_raw"
          className="rounded-none border-none"
          headerClassName="bg-transparent text-slate-800 border-slate-200"
          footerClassName="bg-transparent text-slate-900 font-black border-t border-slate-200"
          showFooter={true}
          onFilteredDataChange={onFilteredDataChange}
          onCellChange={onCellChange}
        />
      </div>
    </div>
  );
}
