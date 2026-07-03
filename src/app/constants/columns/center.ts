export const CENTER_COLUMNS = [
  { key: "business", label: "Business", type: "text" as const, width: 120, cellClassName: "font-bold text-slate-400" },
  { key: "l07", label: "L07", type: "text" as const, width: 150, cellClassName: "font-black text-slate-800" },
  {
    key: "salaryScale",
    label: "Salary Scale",
    type: "text" as const,
    width: 120,
    cellClassName: "font-medium text-slate-500"
  },
  { key: "from", label: "From", type: "date" as const, width: 100, cellClassName: "text-slate-400" },
  { key: "to", label: "To", type: "date" as const, width: 100, cellClassName: "text-slate-400" },
  {
    key: "chargeLxo",
    label: "Charge LXO",
    type: "currency" as const,
    width: 140,
  },
  {
    key: "chargeEc",
    label: "Charge EC",
    type: "currency" as const,
    width: 140,
  },
  {
    key: "chargePtDemo",
    label: "Charge PT-DEMO",
    type: "currency" as const,
    width: 140,
  },
  {
    key: "chargeMktLocal",
    label: "Charge MKT Local",
    type: "currency" as const,
    width: 140,
  },
  {
    key: "chargeOther",
    label: "CHARGE TO OTHER",
    type: "currency" as const,
    width: 140,
  },
  {
    key: "chargeRenewalProjects",
    label: "Charge Renewal",
    type: "currency" as const,
    width: 140,
  },
  {
    key: "chargeDiscoveryCamp",
    label: "Charge Discovery",
    type: "currency" as const,
    width: 140,
  },
  {
    key: "chargeSummerOuting",
    label: "Charge Summer Outing",
    type: "currency" as const,
    width: 140,
  },
  {
    key: "chargeSummerInstructors",
    label: "Charge Summer Instructors",
    type: "currency" as const,
    width: 140,
  },
  {
    key: "totalSalary",
    label: "Total Salary",
    type: "currency" as const,
    width: 160,
    cellClassName: "font-black text-indigo-700 bg-indigo-50/50"
  },
];
