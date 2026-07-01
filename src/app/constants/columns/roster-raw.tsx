import React from "react";

export const ROSTER_RAW_COLUMNS = [
  { key: "center", label: "Center/Mã AE", type: "text" as const, width: 120 },
  { key: "l07", label: "L07", type: "text" as const, width: 140 },
  { key: "chargeToCenterMkt", label: "Charge to Center MKT", type: "text" as const, width: 160 },
  { key: "business", label: "Business", type: "text" as const, width: 100 },
  { key: "ma_nv", label: "ID Number", type: "text" as const, width: 120 },
  { key: "full_name", label: "Full Name", type: "text" as const, width: 180 },
  { key: "ngay", label: "Date", type: "date" as const, width: 100 },
  { 
    key: "type", 
    label: "Type", 
    type: "text" as const, 
    width: 120,
    render: (val: string) => {
      if (!val) return null;
      const isMkt = val.startsWith("LPAR") || val.startsWith("LRET") || val.startsWith("LDEM") || val.startsWith("LDEC") || val.startsWith("MOTH");
      return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight ${isMkt ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"}`}>
          {val}
        </span>
      );
    }
  },
  { key: "class", label: "Class", type: "text" as const, width: 140, cellClassName: "font-mono text-[11px] text-slate-500" },
  { key: "gio_vao", label: "From", type: "text" as const, width: 90, cellClassName: "font-medium text-slate-400" },
  { key: "gio_ra", label: "To", type: "text" as const, width: 90, cellClassName: "font-medium text-slate-400" },
  { key: "duration", label: "Duration", type: "number" as const, width: 90, cellClassName: "font-black text-slate-900" },
  { 
    key: "overlap_check", 
    label: "Check", 
    type: "text" as const, 
    width: 120,
    render: (val: string) => {
      if (!val) return null;
      const isOverlap = val === "Trùng lịch";
      return (
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${isOverlap ? "bg-rose-100 text-rose-600 border border-rose-200" : "bg-emerald-100 text-emerald-600 border border-emerald-200"}`}>
          {val}
        </span>
      );
    }
  },
  { key: "notes", label: "Notes", type: "text" as const, width: 250, cellClassName: "text-slate-800 whitespace-pre-wrap leading-relaxed font-medium" },
];
