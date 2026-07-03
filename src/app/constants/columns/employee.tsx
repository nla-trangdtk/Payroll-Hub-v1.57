import { BASE_TASK_COLUMNS } from "./base-task";

export const EMPLOYEE_COLUMNS = [
  { key: "center", label: "L07", type: "text" as const, width: 100, cellClassName: "font-bold text-slate-500" },
  {
    key: "employeeId",
    label: "ID Number",
    type: "text" as const,
    width: 120,
    headerClassName: "leading-[16.4px]",
    cellClassName: "font-mono font-bold text-sky-700 bg-sky-50/30"
  },
  { key: "fullName", label: "Name", type: "text" as const, width: 220, cellClassName: "font-black text-slate-800" },
  { key: "bankAccountNumber", label: "Bank Account", type: "text" as const, width: 140, cellClassName: "font-mono text-slate-500 text-[11px]" },
  {
    key: "salaryScale",
    label: "Salary Scale",
    type: "text" as const,
    width: 120,
    cellClassName: "font-bold text-slate-600"
  },
  { key: "from", label: "From", type: "date" as const, width: 100, cellClassName: "text-slate-400" },
  { key: "to", label: "To", type: "date" as const, width: 100, cellClassName: "text-slate-400" },
  ...BASE_TASK_COLUMNS,
  { key: "chargeMktLocal", label: "Charge MKT Local", type: "currency" as const, width: 150, cellClassName: "bg-emerald-50/50 font-bold text-emerald-700" },
  { key: "chargeOther", label: "Charge to Other", type: "currency" as const, width: 150, cellClassName: "bg-amber-50/50 font-bold text-amber-700" },
  { key: "className", label: "Class Name", type: "text" as const, width: 150, cellClassName: "font-bold text-slate-500 italic" },
  { key: "noteDays", label: "Note", type: "text" as const, width: 220, cellClassName: "text-slate-800 whitespace-pre-wrap leading-relaxed font-medium" },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getDynamicEmployeeColumns(_rosterData: Record<string, unknown>[]) {
  const found = new Set<string>();
  
  const standards = ["LPAR01", "LRET01", "LDEM01", "LDEC01"];
  const extras = Array.from(found).filter(x => !standards.includes(x));
  extras.sort();

  const extraCols = extras.map(type => ({
    key: type.toLowerCase(),
    label: type,
    type: "number" as const,
    width: 90,
    headerSpanClassName: "text-[0.7rem] font-bold text-slate-800",
    cellClassName: "bg-slate-50/50"
  }));

  const baseTaskCols: Record<string, unknown>[] = [];
  BASE_TASK_COLUMNS.forEach(col => {
    if (col.key === "totalHours") {
      baseTaskCols.push(...extraCols);
    }
    baseTaskCols.push(col);
  });

  return [
    { key: "business", label: "Business", type: "text" as const, width: 100, cellClassName: "font-bold text-slate-400" },
    { key: "center", label: "L07", type: "text" as const, width: 100, cellClassName: "font-bold text-slate-500" },
    {
      key: "employeeId",
      label: "ID Number",
      type: "text" as const,
      width: 120,
      headerClassName: "leading-[16.4px]",
      cellClassName: "font-mono font-bold text-sky-700 bg-sky-50/30"
    },
    { key: "fullName", label: "Name", type: "text" as const, width: 220, cellClassName: "font-black text-slate-800" },
    { key: "bankAccountNumber", label: "Bank Account", type: "text" as const, width: 140, cellClassName: "font-mono text-slate-500 text-[11px]" },
    {
      key: "salaryScale",
      label: "Salary Scale",
      type: "text" as const,
      width: 120,
      cellClassName: "font-bold text-slate-600"
    },
    { key: "from", label: "From", type: "date" as const, width: 100, cellClassName: "text-slate-400" },
    { key: "to", label: "To", type: "date" as const, width: 100, cellClassName: "text-slate-400" },
    ...baseTaskCols,
    { key: "chargeMktLocal", label: "Charge MKT Local", type: "currency" as const, width: 150, cellClassName: "bg-emerald-50/50 font-bold text-emerald-700" },
    { key: "chargeOther", label: "Charge to Other", type: "currency" as const, width: 150, cellClassName: "bg-amber-50/50 font-bold text-amber-700" },
    { key: "className", label: "Class Name", type: "text" as const, width: 150, cellClassName: "font-bold text-slate-500 italic" },
    { key: "noteDays", label: "Note", type: "text" as const, width: 220, cellClassName: "text-slate-800 whitespace-pre-wrap leading-relaxed font-medium" },
  ];
}
