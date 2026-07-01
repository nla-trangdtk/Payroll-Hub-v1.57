/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useMemo, useState, useEffect, useRef } from "react";
import localforage from "localforage";
import { useAppData } from "../../lib/contexts/AppDataContext";
import { useUiSettings, UI_SETTINGS_KEY, type UiSettings } from "../../lib/ui-settings";
import {
  Table2,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Settings,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronDown,
  FileText,
  Landmark,
  Trash2,
  X,
  Plus,
} from "lucide-react";
import {
  parseMoneyToNumber,
  formatMoneyVND,
  getVal,
  normalizeId,
  parseTimeStrToHours,
  parseAnyDate,
  prepareDataForExport,
} from "../../lib/utils/data-utils";
import { mapL07, getL07FromFileName, getCenterInfoByAECode, getCenterInfoByL07, getL07FromChargeToCenterMkt, getBusinessFromL07, getAeCodeFromL07, resolveL07BuFromAeCode, resolveL07BuFromFile, resolveL07BuFromChargeToCenter } from "../../lib/utils/center-utils";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "../../components/ui/tooltip";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "../../components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { motion, AnimatePresence } from "motion/react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
} as const;

type PivotRow = {
  center: string;
  business: string;
  totals: Record<string, number>;
  rowTotal: number;
  northMkt?: number;
  mktTotal?: number;
  names?: string[];
  ids?: string[];
  isDiscrepancy?: boolean;
};

import { useBlocker } from "react-router";
import { useTimesheetCalculations } from "../../hooks/useTimesheetCalculations";

// Inline helper component for performance and focus-management during numerical edits
function EditableNumberCell({
  value,
  onChange,
  className,
  onGridPaste,
}: {
  value: number;
  onChange: (newVal: number) => void;
  className: string;
  onGridPaste?: (text: string) => void;
}) {
  const [prevValue, setPrevValue] = useState(value);
  const [localValue, setLocalValue] = useState<string>(String(value || 0));
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  if (value !== prevValue) {
    setPrevValue(value);
    setLocalValue(String(value || 0));
  }

  const handleBlur = () => {
    setIsFocused(false);
    // Remove anything that isn't a digit, period, or minus for parsing
    const strForParsing = localValue;
    // Keep dots and commas into consideration (assumed no decimal needed since they are VND rounds)
    // If we use formatMoneyVND, it returns 1.234.567. We can use parseMoneyToNumber
    const parsed = parseMoneyToNumber(localValue) || 0;
    if (parsed !== value) {
      onChange(parsed);
    }
    setLocalValue(String(parsed || 0));
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      const activeCell = e.currentTarget.closest("td");
      const activeRow = e.currentTarget.closest("tr");
      if (!activeCell || !activeRow) return;

      const colIndex = Array.from(activeRow.children).indexOf(activeCell);
      const rows = Array.from(activeRow.closest("tbody")?.children || []) as HTMLTableRowElement[];
      const rowIndex = rows.indexOf(activeRow);

      if (e.key === "Enter" || e.key === "ArrowDown") {
        e.preventDefault();
        const nextRow = rows[rowIndex + 1];
        const targetInput = nextRow?.children[colIndex]?.querySelector("input") as HTMLInputElement;
        targetInput?.focus();
        targetInput?.select();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevRow = rows[rowIndex - 1];
        const targetInput = prevRow?.children[colIndex]?.querySelector("input") as HTMLInputElement;
        targetInput?.focus();
        targetInput?.select();
      } else if (e.key === "ArrowRight") {
        const start = e.currentTarget.selectionStart;
        const valLength = e.currentTarget.value.length;
        if (start === valLength || start === null) {
          let nextCell = activeCell.nextElementSibling;
          let targetInput = nextCell?.querySelector("input") as HTMLInputElement;
          while (nextCell && !targetInput) {
            nextCell = nextCell.nextElementSibling;
            targetInput = nextCell?.querySelector("input") as HTMLInputElement;
          }
          if (targetInput) {
            e.preventDefault();
            targetInput.focus();
            targetInput.select();
          }
        }
      } else if (e.key === "ArrowLeft") {
        const start = e.currentTarget.selectionStart;
        if (start === 0 || start === null) {
          let prevCell = activeCell.previousElementSibling;
          let targetInput = prevCell?.querySelector("input") as HTMLInputElement;
          while (prevCell && !targetInput) {
            prevCell = prevCell.previousElementSibling;
            targetInput = prevCell?.querySelector("input") as HTMLInputElement;
          }
          if (targetInput) {
            e.preventDefault();
            targetInput.focus();
            targetInput.select();
          }
        }
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData?.getData("text") || "";
    if (text.includes("\t") || text.includes("\n")) {
      if (onGridPaste) {
        e.preventDefault();
        onGridPaste(text);
      }
    }
  };

  const displayValue = isFocused 
    ? localValue 
    : (localValue === "0" ? "0" : formatMoneyVND(parseMoneyToNumber(localValue) || 0).replace(" ₫", ""));

  return (
    <div className="relative w-full h-full">
      <span className="absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden select-all">{displayValue}</span>
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={`w-full h-[43px] px-2 text-right bg-transparent border-none outline-none focus:bg-slate-50 transition-colors font-mono font-medium ${className}`}
        style={{ textAlign: "right" }}
      />
    </div>
  );
}

// Inline helper component for performance and focus-management during text edits
function EditableTextCell({
  value,
  onBlur,
  className,
  onGridPaste,
}: {
  value: string;
  onBlur: (newVal: string) => void;
  className: string;
  onGridPaste?: (text: string) => void;
}) {
  const [prevValue, setPrevValue] = useState(value);
  const [localVal, setLocalVal] = useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  if (value !== prevValue) {
    setPrevValue(value);
    setLocalVal(value);
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      const activeCell = e.currentTarget.closest("td");
      const activeRow = e.currentTarget.closest("tr");
      if (!activeCell || !activeRow) return;

      const colIndex = Array.from(activeRow.children).indexOf(activeCell);
      const rows = Array.from(activeRow.closest("tbody")?.children || []) as HTMLTableRowElement[];
      const rowIndex = rows.indexOf(activeRow);

      if (e.key === "Enter" || e.key === "ArrowDown") {
        e.preventDefault();
        const nextRow = rows[rowIndex + 1];
        const targetInput = nextRow?.children[colIndex]?.querySelector("input") as HTMLInputElement;
        targetInput?.focus();
        targetInput?.select();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevRow = rows[rowIndex - 1];
        const targetInput = prevRow?.children[colIndex]?.querySelector("input") as HTMLInputElement;
        targetInput?.focus();
        targetInput?.select();
      } else if (e.key === "ArrowRight") {
        const start = e.currentTarget.selectionStart;
        const valLength = e.currentTarget.value.length;
        if (start === valLength || start === null) {
          let nextCell = activeCell.nextElementSibling;
          let targetInput = nextCell?.querySelector("input") as HTMLInputElement;
          while (nextCell && !targetInput) {
            nextCell = nextCell.nextElementSibling;
            targetInput = nextCell?.querySelector("input") as HTMLInputElement;
          }
          if (targetInput) {
            e.preventDefault();
            targetInput.focus();
            targetInput.select();
          }
        }
      } else if (e.key === "ArrowLeft") {
        const start = e.currentTarget.selectionStart;
        if (start === 0 || start === null) {
          let prevCell = activeCell.previousElementSibling;
          let targetInput = prevCell?.querySelector("input") as HTMLInputElement;
          while (prevCell && !targetInput) {
            prevCell = prevCell.previousElementSibling;
            targetInput = prevCell?.querySelector("input") as HTMLInputElement;
          }
          if (targetInput) {
            e.preventDefault();
            targetInput.focus();
            targetInput.select();
          }
        }
      }
    }
  };

  const handleBlur = () => {
    if (localVal !== value) {
      onBlur(localVal);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData?.getData("text") || "";
    if (text.includes("\t") || text.includes("\n")) {
      if (onGridPaste) {
        e.preventDefault();
        onGridPaste(text);
      }
    }
  };

  return (
    <div className="relative w-full h-full">
      <span className="absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden select-all">{localVal}</span>
      <input
        ref={inputRef}
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={`w-full h-[43px] px-4 bg-transparent border-none outline-none focus:bg-slate-50 transition-colors ${className}`}
      />
    </div>
  );
}


export function PivotSheet() {
  const { appData, updateAppData } = useAppData();
  const uiSettings = useUiSettings();
  const handleUpdateUiSettings = async (newPartial: Partial<UiSettings>) => {
    const newSettings = { ...uiSettings, ...newPartial };
    await localforage.setItem(UI_SETTINGS_KEY, newSettings);
    window.dispatchEvent(new Event("ui-settings-changed"));
  };


  const calculatedRosterData = useMemo(() => appData.Q_Roster || [], [appData.Q_Roster]);
  const calculatedSalaryScaleData = useMemo(() => appData.Q_Salary_Scale || [], [appData.Q_Salary_Scale]);
  const calculatedStaffData = useMemo(() => appData.Q_Staff || [], [appData.Q_Staff]);
  const calculatedCacheData = useMemo(() => appData.Q_Cache || [], [appData.Q_Cache]);

  const { processedRosterData } = useTimesheetCalculations(
    calculatedRosterData,
    calculatedSalaryScaleData,
    calculatedStaffData,
    calculatedCacheData,
    appData.Timesheet_Dates?.from || "",
    appData.Timesheet_Dates?.to || "",
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc" | null;
  }>({ key: "center", direction: "asc" });

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const itemsPerPage = 50;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefreshData = () => {
    setIsRefreshing(true);
    // Simulate refresh by updating context data with same object to trigger memo recalculation
    updateAppData((prev) => ({ ...prev }));
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Đã làm mới dữ liệu", {
        description: "Dữ liệu Pivot đã được cập nhật thành công.",
      });
    }, 600);
  };


  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; business?: string; center?: string; colKey?: string } | null>(null);

  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, []);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === "blocked") {
      if (window.confirm("Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn thoát?")) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  const localMktNorthPivotData = useMemo(() => {
    if (!processedRosterData || processedRosterData.length === 0) return null;

    const results: Record<string, any> = {};

    processedRosterData.forEach((row: any) => {
      const center = row.center;
      if (center === "MKT LOCAL NORTH" || (center && typeof center === "string" && center.startsWith("MKT LOCAL NORTH_"))) {
        const finalBU = row.business || "AHN";
        const displayCenter = row.center;
        const groupKey = `${finalBU}_${displayCenter}`;

        if (!results[groupKey]) {
          results[groupKey] = {
            center: displayCenter,
            business: finalBU,
            names: [],
            ids: [],
            grandTotal: 0,
          };
        }

        const rawName = row.fullName || "";
        const rawEid = row.employeeId || "";
        if (rawName && !results[groupKey].names.includes(rawName)) {
          results[groupKey].names.push(rawName);
        }
        if (rawEid && !results[groupKey].ids.includes(rawEid)) {
          results[groupKey].ids.push(rawEid);
        }

        const rawType = String(row.taskType || "").trim();
        const rTypeLower = rawType.toLowerCase();
        let columnKey = "MOTH01";
        if (rTypeLower.startsWith("lpar")) columnKey = "LPAR01";
        else if (rTypeLower.startsWith("lret")) columnKey = "LRET01";
        else if (rTypeLower.startsWith("ldem")) columnKey = "LDEM01";
        else if (rTypeLower.startsWith("ldec")) columnKey = "LDEC01";

        const amount = (row.duration ?? row.workingHours) * 20000;

        if (results[groupKey][columnKey] === undefined) {
          results[groupKey][columnKey] = 0;
        }

        results[groupKey][columnKey] += amount;
        results[groupKey].grandTotal += amount;
      }
    });

    /*
    const rosterData = appData.Q_Roster || [];
    const staffData = appData.Q_Staff || [];
    if (rosterData.length === 0) return null;

    const fromDateStr = appData.Timesheet_Dates?.from || "";
    const toDateStr = appData.Timesheet_Dates?.to || "";
    let fDate: Date | null = null;
    if (fromDateStr) {
      const parts = fromDateStr.split("-");
      if (parts.length === 3) {
        fDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0);
      }
    }
    const preferredYear = uiSettings.defaultAuditYear || (fDate ? fDate.getFullYear() : new Date().getFullYear());
    let tDate: Date | null = null;
    if (toDateStr) {
      const parts = toDateStr.split("-");
      if (parts.length === 3) {
        tDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 23, 59, 59, 999);
      }
    }

    const staffLookup = new Map();
    staffData.forEach((s: any) => {
      const sid = normalizeId(getVal(s, ["id", "id number", "teacher id", "mã nv", "manv"]));
      const sn = String(getVal(s, ["full name", "name", "họ và tên", "teacher name"]))
        .trim()
        .toLowerCase();
      if (sid) staffLookup.set(sid, s);
      if (sn) staffLookup.set(sn, s);
    });

    const getNormCenter = (rCen: string) => {
      if (!rCen) return "";
      let l = mapL07(rCen);
      if (l === rCen) {
        l = rCen.split(".")[0];
        if (l.includes("-")) l = l.split("-")[0];
      }
      return l;
    };

    const results: Record<string, any> = {};

    rosterData.forEach((t: any) => {
      let invalid = false;
      if (String(getVal(t, ["check"]) || "").toUpperCase() === "DUPLICATE")
        invalid = true;
      for (const k in t) {
        if (
          k.toLowerCase().startsWith("check") &&
          String(t[k]).toUpperCase().includes("FALSE")
        ) {
          invalid = true;
        }
      }
      if (invalid) return;

      const rawEid = String(
        getVal(t, ["id", "id number", "teacher id", "emp id", "mã nv", "manv"]) || ""
      ).trim();
      const rawName = String(
        getVal(t, ["full name", "name", "teacher name", "tên", "họ và tên"]) || ""
      ).trim();
      const kId = rawEid.toUpperCase();

      if (
        [
          "ATLS",
          "ECP",
          "KDG",
          "PRI",
          "TOTAL",
          "TỔNG",
          "CLASS",
          "IELTS",
          "LỚP",
        ].some((kw) => kId.includes(kw)) ||
        (kId.includes(".") && !rawName)
      ) {
        return;
      }

      const empId = normalizeId(rawEid);
      if (!empId && !rawName) return;

      // Filter by Date (same as the timesheet calculations)
      const rawDateVal = getVal(t, [
        "date",
        "ngay",
        "ngày",
        "tk_date",
        "session date",
        "sessiondate",
        "ngày học",
        "date of class",
        "scheduledate",
        "ngày làm việc",
        "thời gian",
        "kỳ",
        "ngày trực",
        "ngày tháng",
      ]);
      let rawDate = parseAnyDate(rawDateVal, preferredYear);
      if (!rawDate) return;
      
      // Fix cross-year boundary issue for dates missing the year (e.g., "15/01" -> Jan 15)
      // when the cycle crosses year boundaries (e.g. Dec 21 to Jan 20)
      if (fDate && tDate) {
        if (rawDate < fDate) {
          const nextYearDate = new Date(rawDate);
          nextYearDate.setFullYear(rawDate.getFullYear() + 1);
          if (nextYearDate >= fDate && nextYearDate <= tDate) {
            rawDate = nextYearDate;
          }
        } else if (rawDate > tDate) {
          const prevYearDate = new Date(rawDate);
          prevYearDate.setFullYear(rawDate.getFullYear() - 1);
          if (prevYearDate >= fDate && prevYearDate <= tDate) {
            rawDate = prevYearDate;
          }
        }
      }

      if (fDate && rawDate < fDate) return;
      if (tDate && rawDate > tDate) return;

      const rawType = String(
        getVal(t, ["type", "task type", "task", "code"]) || ""
      ).trim();
      const rTypeLower = rawType.toLowerCase();

      let columnKey = "";
      if (rTypeLower.startsWith("lpar")) columnKey = "LPAR01";
      else if (rTypeLower.startsWith("lret")) columnKey = "LRET01";
      else if (rTypeLower.startsWith("ldem")) columnKey = "LDEM01";
      else if (rTypeLower.startsWith("ldec")) columnKey = "LDEC01";
      else columnKey = "MOTH01"; // Group everything else into MOTH01

      if (!columnKey) return;

      const rCen = String(
        getVal(t, ["center code", "office code", "l07", "center", "cơ sở", "trung tâm", "chi nhánh"]) || ""
      ).trim();
      const rawChargeToCenter = String(
        getVal(t, ["charge to center mkt", "charge to center", "chargetocenter"]) || ""
      ).trim();

      const resolved = resolveL07BuFromAeCode(rCen) || 
                      resolveL07BuFromFile(t._sourceFile || appData?.Q_RosterFileName || "") ||
                      resolveL07BuFromChargeToCenter(rawChargeToCenter);
      
      let l07 = resolved?.l07 || "";
      let originalL07 = l07;

      if (!l07 || l07 === "UNKNOWN") {
        const matchStaff = staffLookup.get(empId) || staffLookup.get(rawName.toLowerCase());
        if (matchStaff) {
          const staffRawCen = String(getVal(matchStaff, ["l07", "center"])).trim();
          const mappedStaffCenter = mapL07(staffRawCen);
          if (mappedStaffCenter && mappedStaffCenter !== "UNKNOWN") {
            l07 = mappedStaffCenter;
            originalL07 = l07;
          }
        }
      }

      const hasMktInCenter =
        l07 &&
        (l07.toUpperCase().includes("MKT") ||
          l07.toUpperCase().includes("LOCAL"));
      const fileUpperName = String(
        t._sourceFile || appData?.Q_RosterFileName || ""
      ).toUpperCase();
      const hasMktInFile =
        fileUpperName.includes("MKT") || fileUpperName.includes("MARKETING");
        
      const isChargeColMkt =
        rawChargeToCenter &&
        (rawChargeToCenter.toUpperCase().includes("MKT") ||
          rawChargeToCenter.toUpperCase().includes("NORTH") ||
          rawChargeToCenter.toUpperCase().includes("SOUTH") ||
          rawChargeToCenter.toUpperCase().includes("AHN") ||
          rawChargeToCenter.toUpperCase().includes("ASH") ||
          !!getL07FromChargeToCenterMkt(rawChargeToCenter));
          
      const isMktLocal = !!(
        hasMktInCenter ||
        isChargeColMkt ||
        hasMktInFile
      );

      let isMktNorthItem = originalL07 === "MKT LOCAL NORTH";
      let isSouthItem = originalL07 === "MKT LOCAL SOUTH";
      
      if (isMktLocal) {
        const rCenUpper = rCen.toUpperCase();
        const chargeUpper = rawChargeToCenter.toUpperCase();

        if (
          fileUpperName.includes("NORTH") ||
          rCenUpper.includes("NORTH") ||
          chargeUpper.includes("NORTH") ||
          fileUpperName.includes("AHN") ||
          rCenUpper.includes("AHN") ||
          !!getL07FromChargeToCenterMkt(rawChargeToCenter)
        ) {
          isMktNorthItem = true;
          if (!l07 || l07 === "UNKNOWN") l07 = "MKT LOCAL NORTH";
        } else if (
          fileUpperName.includes("SOUTH") ||
          rCenUpper.includes("SOUTH") ||
          chargeUpper.includes("SOUTH") ||
          fileUpperName.includes("ASH") ||
          rCenUpper.includes("ASH") ||
          rCenUpper.startsWith("HCM") ||
          chargeUpper.startsWith("HCM") ||
          rCenUpper.startsWith("BD") ||
          chargeUpper.startsWith("BD") ||
          rCenUpper.startsWith("DN") ||
          chargeUpper.startsWith("DN") ||
          rCenUpper.startsWith("CT") ||
          chargeUpper.startsWith("CT") ||
          rCenUpper.startsWith("VT") ||
          chargeUpper.startsWith("VT") ||
          rCenUpper.startsWith("CR") ||
          chargeUpper.startsWith("CR")
        ) {
          isSouthItem = true;
          if (!l07 || l07 === "UNKNOWN") l07 = "MKT LOCAL SOUTH";
        } else {
          isMktNorthItem = true;
          if (!l07 || l07 === "UNKNOWN") l07 = "MKT LOCAL NORTH";
        }
      }

      if (!isMktLocal) return;

      const startVal = getVal(t, ["start", "from", "start time", "từ"]);
      const endVal = getVal(t, ["end", "to", "end time", "đến"]);
      
      let durationHours = 0;
      if (
        startVal !== undefined &&
        startVal !== "" &&
        endVal !== undefined &&
        endVal !== ""
      ) {
        const sH = parseTimeStrToHours(startVal);
        const eH = parseTimeStrToHours(endVal);
        durationHours = eH >= sH ? (eH - sH) * 24 : (eH + 1 - sH) * 24;
      } else {
        const rawDuration = getVal(t, [
          "duration", 
          "quy ra số giờ làm",
          "total",
          "actual hours",
          "working hours",
          "giờ làm",
          "số giờ",
          "hours",
          "tk_duration",
          "total hours",
          "tổng giờ",
          "time",
          "thời lượng"
        ]);
        if (rawDuration !== undefined && rawDuration !== "") {
          const strVal = String(rawDuration).trim();
          if (strVal.includes(":")) {
            const p = strVal.split(":");
            durationHours = (parseInt(p[0]) || 0) + (parseInt(p[1]) || 0) / 60 + parseInt(p[2] || "0") / 3600;
          } else {
            durationHours = parseFloat(strVal) || 0;
          }
        }
      }

      let classSize = 0;
      const classSizeVal = getVal(t, [
        "class size",
        "sĩ số",
        "sỹ số",
        "no of students",
        "number of student",
        "number of students",
        "students",
        "số hv",
        "số học viên",
        "sĩ số lớp",
        "total students",
        "số lượng học viên",
        "sĩ số thực tế",
        "sỹ số thực tế",
        "actual size",
        "size",
        "số lượng",
        "sĩ số cơ sở",
      ]);
      if (classSizeVal) classSize = parseInt(String(classSizeVal), 10) || 0;

      let actHours = durationHours;
      if (
        rawType.toLowerCase() === "tutorial" ||
        rawType.toLowerCase().includes("tutoring")
      ) {
        actHours = 1; 
      } else if (rawType.toLowerCase().includes("club")) {
        if (classSize > 0 && classSize <= 10) actHours = 1;
        else if (classSize > 10) actHours = 1.5;
        else actHours = 1.5;
      } else if (rawType.toLowerCase().includes("demo")) {
        if (classSize > 0) {
          if (classSize <= 5)
            actHours = Math.round((durationHours + 0.25) * 100) / 100;
          else actHours = Math.round((durationHours + 0.5) * 100) / 100;
        } else {
          actHours = Math.round((durationHours + 0.5) * 100) / 100;
        }
      }

      if (rawType.toLowerCase().includes("admin") && !actHours) {
        actHours = 1;
      }

      if (actHours <= 0) return;

      const amount = actHours * 20000;

      let chargeToL07 = "";
      if (rawChargeToCenter) {
        chargeToL07 = resolveL07BuFromChargeToCenter(rawChargeToCenter)?.l07 || rawChargeToCenter;
      } else if (
        originalL07 &&
        originalL07 !== "MKT LOCAL NORTH" &&
        originalL07 !== "MKT LOCAL SOUTH" &&
        originalL07 !== "UNKNOWN"
      ) {
        chargeToL07 = originalL07;
      } else {
        chargeToL07 = l07;
      }

      console.log("PIVOT MKT DEBUG:", { 
        name: rawName,
        rCen,
        originalL07, 
        rawChargeToCenter,
        chargeToL07,
        rawType,
        columnKey, 
        durationHours, 
        amount 
      });

      let displayCenter = chargeToL07 || rawChargeToCenter;

      const rawBUCol = String(getVal(t, ["khối", "business", "bus", "bộ phận", "bu", "khối/bu"]) || "").trim().toUpperCase();
      let finalBU = rawBUCol;

      const mappedL07 = getL07FromChargeToCenterMkt(rawChargeToCenter);
      if (mappedL07) {
        displayCenter = mappedL07;
        finalBU = getBusinessFromL07(mappedL07) || finalBU || "AHN";
      } else {
        const resolvedInfo = resolveL07BuFromAeCode(displayCenter) || getCenterInfoByAECode(displayCenter) || getCenterInfoByL07(displayCenter);
        if (resolvedInfo) {
          displayCenter = resolvedInfo.l07;
          if (!finalBU) {
             finalBU = ("bu" in resolvedInfo ? resolvedInfo.bu : "bus" in resolvedInfo ? resolvedInfo.bus : "AHN");
          }
        } else {
          displayCenter = mapL07(displayCenter);
        }
      }

      if (!finalBU) finalBU = "AHN";
      if (finalBU === "AHN_HP") finalBU = "AHP";

      const groupKey = `${finalBU}_${displayCenter}`;

      if (!results[groupKey]) {
        results[groupKey] = {
          business: finalBU,
          center: displayCenter,
          grandTotal: 0,
          names: [],
          ids: [],
        };
      }

      if (rawName && !results[groupKey].names.includes(rawName)) {
        results[groupKey].names.push(rawName);
      }
      if (rawEid && !results[groupKey].ids.includes(rawEid)) {
        results[groupKey].ids.push(rawEid);
      }

      if (results[groupKey][columnKey] === undefined) {
        results[groupKey][columnKey] = 0;
      }

      results[groupKey][columnKey] += amount;
      results[groupKey].grandTotal += amount;
    });
    */

    const baseOrder = ["LDEC01", "LDEM01", "LPAR01", "LRET01", "MOTH01"];
    const foundCols = new Set<string>(baseOrder);
    Object.values(results).forEach((r: any) => {
      Object.keys(r).forEach((k) => {
        if (k !== "center" && k !== "business" && k !== "grandTotal" && k !== "names" && k !== "ids") {
          foundCols.add(k);
        }
      });
    });

    const activeMktCols = Array.from(foundCols);
    activeMktCols.sort((a, b) => {
      const idxA = baseOrder.indexOf(a);
      const idxB = baseOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    if (activeMktCols.length === 0) {
      activeMktCols.push(...baseOrder);
    }

    const rows = Object.values(results).map((r: any) => {
      activeMktCols.forEach((col) => {
        if (r[col] === undefined) {
          r[col] = 0;
        } else {
          r[col] = Math.round(r[col]);
        }
      });
      r.grandTotal = Math.round(r.grandTotal);
      return r;
    }).filter((r: any) => r.grandTotal !== 0);
    
    rows.sort((a, b) => {
      const busCmp = String(a.business || "").localeCompare(String(b.business || ""));
      if (busCmp !== 0) return busCmp;
      return String(a.center || "").localeCompare(String(b.center || ""), undefined, { numeric: true, sensitivity: 'base' });
    });

    let filteredRows = rows;
    if (debouncedSearchTerm) {
      const s = debouncedSearchTerm.toLowerCase();
      filteredRows = rows.filter(
        (r: any) =>
          r.center.toLowerCase().includes(s) ||
          (r.business && r.business.toLowerCase().includes(s)) ||
          (r.names && r.names.some((name: string) => name.toLowerCase().includes(s))) ||
          (r.ids && r.ids.some((id: string) => id.toLowerCase().includes(s)))
      );
    }

    // Build subtotal rows for each business group
    const finalMktRowsWithSubtotals: any[] = [];
    const busGroups: Record<string, any[]> = {};
    filteredRows.forEach((r: any) => {
      const b = (r.business || "UNKNOWN").toUpperCase();
      if (!busGroups[b]) busGroups[b] = [];
      busGroups[b].push(r);
    });

    const sortedBusKeys = Object.keys(busGroups).sort((a, b) => a.localeCompare(b));
    sortedBusKeys.forEach((busKey) => {
      const groupRows = busGroups[busKey];
      groupRows.forEach((row) => {
        finalMktRowsWithSubtotals.push(row);
      });

      const subtotalRow: any = {
        business: "TOTAL " + busKey,
        center: "TOTAL " + busKey,
        isSubtotal: true,
        grandTotal: 0,
        names: [],
        ids: [],
      };
      activeMktCols.forEach((col) => {
        subtotalRow[col] = 0;
      });

      groupRows.forEach((row) => {
        activeMktCols.forEach((col) => {
          subtotalRow[col] += row[col] || 0;
        });
        subtotalRow.grandTotal += row.grandTotal || 0;
      });

      finalMktRowsWithSubtotals.push(subtotalRow);
    });

    const colTotals: Record<string, number> = {};
    activeMktCols.forEach((col) => {
      colTotals[col] = 0;
    });
    let totalGrand = 0;

    filteredRows.forEach((r: any) => {
      activeMktCols.forEach((col) => {
        colTotals[col] += r[col];
      });
      totalGrand += r.grandTotal;
    });

    return {
      rows: finalMktRowsWithSubtotals,
      normalRows: rows,
      activeMktCols,
      totals: {
        ...colTotals,
        grand: totalGrand,
      } as Record<string, number>,
    };
  }, [
    processedRosterData,
    debouncedSearchTerm,
  ]);

  const pivotData = useMemo(() => {
    const data = appData.Sheet1_AE?.data || [];
    if (!data || data.length === 0) return null;

    const chargeCols = [...(appData.PivotConfig?.chargeCols || [])];

    const result: Record<string, PivotRow> = {};

    data.forEach((row) => {
      const rawCenter = String(row["L07"] || "Unknown").trim();
      const resolvedInfo = resolveL07BuFromAeCode(rawCenter) || getCenterInfoByAECode(rawCenter) || getCenterInfoByL07(rawCenter);
      const center = resolvedInfo ? resolvedInfo.l07 : mapL07(rawCenter);
      
      let business = String(row["Business"] || "").trim();
      if (business === "AHN_HP") business = "AHP";
      if (!business && resolvedInfo) {
        business = ("bu" in resolvedInfo ? resolvedInfo.bu : "bus" in resolvedInfo ? resolvedInfo.bus : "") || business;
      }
      if (!business) business = "UNKNOWN";
      
      const uCenter = center.toUpperCase();
      const key = `${center}_${business}`;

      if (!result[key]) {
        result[key] = {
          center: center,
          business: business,
          totals: {},
          rowTotal: 0,
          names: [],
          ids: [],
        };
        chargeCols.forEach((c) => (result[key].totals[c.key] = 0));
      }

      // Collect names and IDs for search/filtering
      const fullName = row["Full name"];
      if (fullName) {
        result[key].names?.push(String(fullName).trim());
      }
      const idNum = row["ID Number"];
      if (idNum) {
        result[key].ids?.push(String(idNum).trim());
      }

      chargeCols.forEach((c) => {
        const amount = parseMoneyToNumber(row[c.key]);
        result[key].totals[c.key] += amount;
      });
      const rawTotal = parseMoneyToNumber(row["TOTAL PAYMENT"] || row["Grand Total"] || row["GRAND TOTAL"] || 0);
      result[key].rowTotal += rawTotal;
    });

    // Ensure Mkt Local North rows exist in result to guarantee no dropped MKT sums
    // Only merge if the center actually belongs to MKT to avoid polluting Sheet 1 AE with unrelated centers from Charge to Center MKT
    if (localMktNorthPivotData && localMktNorthPivotData.normalRows) {
      localMktNorthPivotData.normalRows.forEach(m => {
        const isMktCenter = m.center.toUpperCase().includes("MKT") || m.center === "NTW";
        const key = `${m.center}_${m.business}`;
        if (!result[key] && isMktCenter) {
          result[key] = {
            center: m.center,
            business: m.business,
            totals: {},
            rowTotal: 0,
            names: [],
            ids: []
          };
          chargeCols.forEach((c) => (result[key].totals[c.key] = 0));
        }
      });
    }

  let sortedRows = Object.values(result);

  // 1. Calculate original Row Total for "MKT LOCAL NORTH" globally
  let globalHrNorthTotal = 0;
  sortedRows.forEach(r => {
    if (r.center.startsWith("MKT LOCAL")) {
      const originalTotal = chargeCols.reduce((sum, col) => sum + (r.totals[col.key] || 0), 0);
      globalHrNorthTotal += originalTotal;
    }
  });

  const mktCol = chargeCols.find(c => 
    c.key === "Charge MKT Local" || 
    c.key.toUpperCase().includes("MKT") || 
    c.code === "E1"
  );
  const mktColKey = mktCol ? mktCol.key : "Charge MKT Local";

  if (localMktNorthPivotData && localMktNorthPivotData.normalRows) {
    const existingCenters = new Set(sortedRows.map(r => r.center.toUpperCase().trim()));
    localMktNorthPivotData.normalRows.forEach(m => {
      const centerKey = m.center.toUpperCase().trim();
      if (!existingCenters.has(centerKey)) {
        const newRow = {
          center: m.center,
          business: m.business,
          totals: {} as Record<string, number>,
          rowTotal: 0,
          mktTotal: 0,
          northMkt: 0,
          names: m.names || [],
          ids: m.ids || [],
        };
        chargeCols.forEach((c) => (newRow.totals[c.key] = 0));
        sortedRows.push(newRow as any);
        existingCenters.add(centerKey);
      }
    });
  }

  sortedRows.forEach((r) => {
    let timesheetMktSum = 0;
    
    // Explicitly align with Table 2 by taking the grandTotal from localMktNorthPivotData
    if (localMktNorthPivotData && localMktNorthPivotData.normalRows) {
      localMktNorthPivotData.normalRows.forEach(m => {
        if (m.center.toUpperCase().trim() === r.center.toUpperCase().trim()) {
          timesheetMktSum += m.grandTotal || 0;
        }
      });
    }

    // Set mktTotal for visual alignment under "LOCAL MKT" on UI
    r.mktTotal = timesheetMktSum;

    if (r.center.startsWith("MKT LOCAL NORTH")) {
      // Keep columns but force GRAND TOTAL to 0
      r.rowTotal = 0;
      // Do not force mktTotal or northMkt to 0 so we see the MKT cost mapped to these centers
      r.northMkt = r.rowTotal + (r.mktTotal || 0);
    } else {
      // Recompute rowTotal as sum of its columns
      r.rowTotal = chargeCols.reduce((sum, col) => sum + (r.totals[col.key] || 0), 0);
      r.northMkt = r.rowTotal + (r.mktTotal || 0);
    }
  });

  // 2. Calculate MKT LOCAL NORTH in B (Timesheet_Pivot Phí) globally
  let globalTimesheetNorthTotal = 0;
  if (localMktNorthPivotData && localMktNorthPivotData.normalRows) {
    localMktNorthPivotData.normalRows.forEach(m => {
      globalTimesheetNorthTotal += m.grandTotal || 0;
    });
  }

  // 3. Compare and add Discrepancy Row if difference exists
  const diffAmount = globalHrNorthTotal - globalTimesheetNorthTotal;
  if (Math.abs(diffAmount) > 0.01) {
    sortedRows.push({
      center: `LỆCH MKT LOCAL`,
      business: "ALL",
      totals: chargeCols.reduce((acc, col) => ({ ...acc, [col.key]: 0 }), {} as Record<string, number>),
      rowTotal: diffAmount,
      mktTotal: 0,
      northMkt: diffAmount,
      isDiscrepancy: true,
      names: [],
      ids: []
    });
  }

  if (debouncedSearchTerm) {
      const s = debouncedSearchTerm.toLowerCase();
      sortedRows = sortedRows.filter(
        (r) =>
          r.center.toLowerCase().includes(s) ||
          r.business.toLowerCase().includes(s) ||
          (r.names && r.names.some((name) => name.toLowerCase().includes(s))) ||
          (r.ids && r.ids.some((id) => id.toLowerCase().includes(s))),
      );
    }

    if (sortConfig.key && sortConfig.direction) {
      sortedRows.sort((a, b) => {
        if (a.isDiscrepancy && !b.isDiscrepancy) return 1;
        if (!a.isDiscrepancy && b.isDiscrepancy) return -1;
        
        let valA: any;
        let valB: any;

        if (sortConfig.key === "center") {
          valA = a.center;
          valB = b.center;
        } else if (sortConfig.key === "business") {
          valA = a.business;
          valB = b.business;
        } else if (sortConfig.key === "rowTotal") {
          valA = a.rowTotal;
          valB = b.rowTotal;
        } else if (sortConfig.key === "northMkt") {
          valA = a.northMkt;
          valB = b.northMkt;
        } else if (sortConfig.key === "mktTotal") {
          valA = a.mktTotal || 0;
          valB = b.mktTotal || 0;
        } else {
          valA = a.totals[sortConfig.key] || 0;
          valB = b.totals[sortConfig.key] || 0;
        }

        if (typeof valA === "string" && typeof valB === "string") {
            const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
            return sortConfig.direction === "asc" ? cmp : -cmp;
        }

        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    } else {
      sortedRows.sort((a, b) => {
        if (a.isDiscrepancy && !b.isDiscrepancy) return 1;
        if (!a.isDiscrepancy && b.isDiscrepancy) return -1;
        return a.center.localeCompare(b.center);
      });
    }

    const colTotals: Record<string, number> = {};
    let plainGrandTotal = 0;
    chargeCols.forEach((c) => (colTotals[c.key] = 0));

    sortedRows.forEach((row) => {
      chargeCols.forEach((c) => {
        colTotals[c.key] += row.totals[c.key];
      });
      plainGrandTotal += row.rowTotal;
    });

    // Group sortedRows by Business and add subtotal rows
    const groups: Record<string, any[]> = {};
    sortedRows.forEach((r) => {
      const bKey = (r.business || "UNKNOWN").toUpperCase().trim();
      if (!groups[bKey]) groups[bKey] = [];
      groups[bKey].push(r);
    });

    const sortedBusinessKeys = Object.keys(groups);
    
    // Calculate business group totals for outer sorting
    const businessGroupTotals: Record<string, { rowTotal: number; totals: Record<string, number> }> = {};
    sortedBusinessKeys.forEach((bKey) => {
      let rt = 0;
      let mt = 0;
      const ts: Record<string, number> = {};
      chargeCols.forEach((c) => (ts[c.key] = 0));
      groups[bKey].forEach((r) => {
        rt += r.rowTotal;
        mt += r.mktTotal || 0;
        chargeCols.forEach((c) => (ts[c.key] += r.totals[c.key]));
      });
      businessGroupTotals[bKey] = { rowTotal: rt, totals: ts };
    });

    if (sortConfig.key && sortConfig.direction) {
      sortedBusinessKeys.sort((a, b) => {
        let valA: any;
        let valB: any;

        if (sortConfig.key === "center" || sortConfig.key === "business") {
          valA = a;
          valB = b;
        } else if (sortConfig.key === "rowTotal") {
          valA = businessGroupTotals[a].rowTotal;
          valB = businessGroupTotals[b].rowTotal;
        } else {
          valA = businessGroupTotals[a].totals[sortConfig.key] || 0;
          valB = businessGroupTotals[b].totals[sortConfig.key] || 0;
        }

        if (typeof valA === "string" && typeof valB === "string") {
          const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: "base" });
          return sortConfig.direction === "asc" ? cmp : -cmp;
        }

        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    } else {
      sortedBusinessKeys.sort();
    }

    const finalRowsWithSubtotals: any[] = [];

    sortedBusinessKeys.forEach((bKey) => {
      const groupRows = groups[bKey];

      // Inside each group, we sort the rows by center or sortConfig
      if (sortConfig.key && sortConfig.direction) {
        groupRows.sort((a, b) => {
          let valA: any;
          let valB: any;

          if (sortConfig.key === "center") {
            valA = a.center;
            valB = b.center;
          } else if (sortConfig.key === "business") {
            valA = a.business;
            valB = b.business;
          } else if (sortConfig.key === "rowTotal") {
            valA = a.rowTotal;
            valB = b.rowTotal;
          } else if (sortConfig.key === "northMkt") {
            valA = a.northMkt;
            valB = b.northMkt;
          } else if (sortConfig.key === "mktTotal") {
            valA = a.mktTotal || 0;
            valB = b.mktTotal || 0;
          } else {
            valA = a.totals[sortConfig.key] || 0;
            valB = b.totals[sortConfig.key] || 0;
          }

          if (typeof valA === "string" && typeof valB === "string") {
              const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
              return sortConfig.direction === "asc" ? cmp : -cmp;
          }

          if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
          if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
          return 0;
        });
      } else {
        groupRows.sort((a, b) => a.center.localeCompare(b.center, undefined, { numeric: true, sensitivity: 'base' }));
      }

      // Add normal rows of this business group
      finalRowsWithSubtotals.push(...groupRows);

      if (uiSettings.showPivotSubtotals !== false) {
        // Add subtotal row for this business group
        const subTotalRow: any = {
          business: bKey,
          center: `TOTAL ${bKey}`,
          totals: {},
          rowTotal: 0,
          mktTotal: 0,
          northMkt: 0,
          isSubtotal: true,
        };

        chargeCols.forEach((c) => {
          subTotalRow.totals[c.key] = 0;
        });

        let sumRowTotal = 0;
        let sumMktTotal = 0;
        groupRows.forEach((r) => {
          chargeCols.forEach((c) => {
            subTotalRow.totals[c.key] += r.totals[c.key];
          });
          sumRowTotal += r.rowTotal;
          sumMktTotal += r.mktTotal || 0;
        });

        subTotalRow.mktTotal = sumMktTotal;
        subTotalRow.rowTotal = sumRowTotal;
        subTotalRow.northMkt = subTotalRow.rowTotal + subTotalRow.mktTotal;

        finalRowsWithSubtotals.push(subTotalRow);
      }
    });

    const activeCols = chargeCols;

    // Calculate exact mkt grand total from direct rows
    let mktGrandTotal = 0;
    sortedRows.forEach((r) => {
      mktGrandTotal += r.mktTotal || 0;
    });
    const grandTotal = plainGrandTotal;
    const northMktGrandTotal = plainGrandTotal + mktGrandTotal;

    return { sortedRows, finalRowsWithSubtotals, colTotals, grandTotal, mktGrandTotal, activeCols, northMktGrandTotal };
  }, [
    appData.Sheet1_AE.data,
    appData.PivotConfig?.chargeCols,
    sortConfig,
    debouncedSearchTerm,
    localMktNorthPivotData,
    uiSettings
  ]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" };
        if (prev.direction === "desc")
          return { key: "center", direction: "asc" };
      }
      return { key, direction: "asc" };
    });
    setCurrentPage(1);
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key)
      return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    if (sortConfig.direction === "asc")
      return <ArrowUp className="w-3 h-3 text-primary" />;
    return <ArrowDown className="w-3 h-3 text-primary" />;
  };

  const totalPages = pivotData
    ? Math.ceil(pivotData.finalRowsWithSubtotals.length / itemsPerPage)
    : 0;
  const paginatedRows = pivotData
    ? pivotData.finalRowsWithSubtotals.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage,
      )
    : [];

  const pivotDataRef = useRef(pivotData);
  const appDataRef = useRef(appData);

  useEffect(() => {
    pivotDataRef.current = pivotData;
  }, [pivotData]);

  useEffect(() => {
    appDataRef.current = appData;
  }, [appData]);

  const handleExportExcel = () => {
    const currentPivotData = pivotDataRef.current;
    if (!currentPivotData) return;

    // Create a simple table for export
    const exportData = currentPivotData.finalRowsWithSubtotals.map((row: any) => {
      const exportRow: any = {
        [appDataRef.current.PivotConfig?.headers?.["Business"] || "Business"]: row.business,
        [appDataRef.current.PivotConfig?.headers?.["L07"] || "L07"]: row.center,
      };
      currentPivotData.activeCols.forEach((c: any) => {
        exportRow[`${c.code} - ${c.label}`] = row.totals[c.key];
      });
      exportRow[appDataRef.current.PivotConfig?.headers?.["GRAND_TOTAL"] || "GRAND TOTAL"] = row.rowTotal;
      exportRow["LOCAL_MKT"] = row.mktTotal || 0;
      exportRow["NORTH+MKT"] = row.northMkt || 0;
      return exportRow;
    });

    // Add total row
    const totalRow: any = {
      [appDataRef.current.PivotConfig?.headers?.["Business"] || "Business"]: "GRAND TOTAL",
      [appDataRef.current.PivotConfig?.headers?.["L07"] || "L07"]: "",
    };
    currentPivotData.activeCols.forEach((c: any) => {
      totalRow[`${c.code} - ${c.label}`] = currentPivotData.colTotals[c.key];
    });
    totalRow[appDataRef.current.PivotConfig?.headers?.["GRAND_TOTAL"] || "GRAND TOTAL"] = currentPivotData.grandTotal;
    totalRow["LOCAL_MKT"] = currentPivotData.mktGrandTotal;
    totalRow["NORTH+MKT"] = currentPivotData.northMktGrandTotal;
    exportData.push(totalRow);

    const ws = XLSX.utils.json_to_sheet(prepareDataForExport(exportData));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pivot Report");
    XLSX.writeFile(wb, "Pivot_Report.xlsx");
  };




  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn thoát?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Inside handleUpdateHeader and handleUpdateChargeCode handlers (lines 257-289), trigger:
  // setHasUnsavedChanges(true);
  
  const [headerValues, setHeaderValues] = useState(appData.PivotConfig?.headers || { Business: "Business", L07: "L07", GRAND_TOTAL: "GRAND TOTAL" });
  const [chargeCodeValues, setChargeCodeValues] = useState(() => {
    return Object.fromEntries((appData.PivotConfig?.chargeCols || []).map(c => [c.key, c.code]));
  });
  const [chargeLabelValues, setChargeLabelValues] = useState(() => {
    return Object.fromEntries((appData.PivotConfig?.chargeCols || []).map(c => [c.key, c.label]));
  });

  // Sync local state if appData changes from outside (optional, but good practice)
  useEffect(() => {
    setTimeout(() => {
      setHeaderValues(appData.PivotConfig?.headers || { Business: "Business", L07: "L07", GRAND_TOTAL: "GRAND TOTAL" });
      setChargeCodeValues(() => {
        return Object.fromEntries((appData.PivotConfig?.chargeCols || []).map(c => [c.key, c.code]));
      });
      setChargeLabelValues(() => {
        return Object.fromEntries((appData.PivotConfig?.chargeCols || []).map(c => [c.key, c.label]));
      });
    }, 0);
  }, [appData]);

  const handleUpdateHeaderBlur = (key: string, value: string) => {
    setHasUnsavedChanges(true);
    updateAppData((prev) => ({
      ...prev,
      PivotConfig: {
        ...prev.PivotConfig,
        headers: { ...prev.PivotConfig.headers, [key]: value },
      },
    }));
  };

  const handleUpdateChargeCodeBlur = (key: string, value: string) => {
    setHasUnsavedChanges(true);
    updateAppData((prev) => ({
      ...prev,
      PivotConfig: {
        ...prev.PivotConfig,
        chargeCols: prev.PivotConfig.chargeCols.map((c) =>
          c.key === key ? { ...c, code: value } : c,
        ),
      },
    }));
  };

  const handleUpdateChargeLabelBlur = (key: string, value: string) => {
    setHasUnsavedChanges(true);
    updateAppData((prev) => ({
      ...prev,
      PivotConfig: {
        ...prev.PivotConfig,
        chargeCols: prev.PivotConfig.chargeCols.map((c) =>
          c.key === key ? { ...c, label: value } : c,
        ),
      },
    }));
  };

  const handleTableCellChange = (business: string, center: string, key: string, val: string) => {
    setHasUnsavedChanges(true);
    updateAppData((prev) => {
      const data = [...prev.Sheet1_AE.data];
      // Find matching row(s) in raw data
      const matches = data.filter(row => {
        const rowBiz = String(row["Business"] || "").trim();
        const rawCenter = String(row["L07"] || "Unknown").trim();
        const resolvedInfo = resolveL07BuFromAeCode(rawCenter) || getCenterInfoByAECode(rawCenter) || getCenterInfoByL07(rawCenter);
        const rowCenter = resolvedInfo ? resolvedInfo.l07 : mapL07(rawCenter);
        return rowBiz === business && rowCenter === center;
      });

      if (matches.length > 0) {
        // Update the value
        matches.forEach((match, index) => {
          if (key === "business") {
            match["Business"] = val;
          } else if (key === "center") {
            match["L07"] = val;
          } else {
            const numericVal = parseMoneyToNumber(val) || 0;
            if (index === 0) {
              match[key] = numericVal;
            } else {
              match[key] = 0;
            }
          }
        });
      } else {
        // No match found, create a new row
        const newRow: any = { Business: business, L07: center };
        if (key === "business") newRow["Business"] = val;
        else if (key === "center") newRow["L07"] = val;
        else newRow[key] = val;
        data.push(newRow);
      }

      return {
        ...prev,
        Sheet1_AE: {
          ...prev.Sheet1_AE,
          data
        }
      };
    });
  };

  const handlePivotGridPaste = (text: string, startRowIdx: number, startColIdx: number) => {
    if (!pivotData) return;
    const rows = text.split("\n");
    if (rows.length > 1 && rows[rows.length - 1].trim() === "") {
      rows.pop();
    }

    const colKeys = [
      "business",
      "center",
      ...pivotData.activeCols.map(c => c.key)
    ];

    setHasUnsavedChanges(true);
    updateAppData((prev) => {
      const data = [...prev.Sheet1_AE.data];

      rows.forEach((rowText, rOffset) => {
        const targetRowIdx = startRowIdx + rOffset;
        if (targetRowIdx >= paginatedRows.length) return;
        const rowData = paginatedRows[targetRowIdx];
        if (rowData.isSubtotal) return;

        const cells = rowText.split("\t");
        cells.forEach((cellText, cOffset) => {
          const targetColIdx = startColIdx + cOffset;
          if (targetColIdx >= colKeys.length) return;
          const colKey = colKeys[targetColIdx];
          const val = cellText.trim();

          const matches = data.filter(row => {
            const rowBiz = String(row["Business"] || "").trim();
            const rawCenter = String(row["L07"] || "Unknown").trim();
            const resolvedInfo = resolveL07BuFromAeCode(rawCenter) || getCenterInfoByAECode(rawCenter) || getCenterInfoByL07(rawCenter);
            const rowCenter = resolvedInfo ? resolvedInfo.l07 : mapL07(rawCenter);
            return rowBiz === rowData.business && rowCenter === rowData.center;
          });

          if (matches.length > 0) {
            matches.forEach((match, index) => {
              if (colKey === "business") {
                match["Business"] = val;
              } else if (colKey === "center") {
                match["L07"] = val;
              } else {
                const numericVal = parseMoneyToNumber(val) || 0;
                if (index === 0) {
                  match[colKey] = numericVal;
                } else {
                  match[colKey] = 0;
                }
              }
            });
          } else {
            const newRow: any = { Business: rowData.business, L07: rowData.center };
            if (colKey === "business") newRow["Business"] = val;
            else if (colKey === "center") newRow["L07"] = val;
            else newRow[colKey] = parseMoneyToNumber(val) || 0;
            data.push(newRow);
          }
        });
      });

      return {
        ...prev,
        Sheet1_AE: {
          ...prev.Sheet1_AE,
          data
        }
      };
    });

    toast.success("Đã dán dữ liệu vào Pivot");
  };

  const handleDeleteRow = (business: string, center: string) => {
    setHasUnsavedChanges(true);
    updateAppData((prev) => {
      const data = prev.Sheet1_AE.data.filter((row) => {
        const rowBiz = String(row["Business"] || "").trim();
        const rawCenter = String(row["L07"] || "Unknown").trim();
        const resolvedInfo = resolveL07BuFromAeCode(rawCenter) || getCenterInfoByAECode(rawCenter) || getCenterInfoByL07(rawCenter);
        const rowCenter = resolvedInfo ? resolvedInfo.l07 : mapL07(rawCenter);
        return !(rowBiz === business && rowCenter === center);
      });
      return {
        ...prev,
        Sheet1_AE: {
          ...prev.Sheet1_AE,
          data,
        },
      };
    });
    toast.success(`Đã xóa dòng ${center} (${business})`);
  };

  const handleAddRow = () => {
    setHasUnsavedChanges(true);
    updateAppData((prev) => {
      const newRow: any = {
        Business: "AHN",
        L07: "NEW_CENTER_CODE",
      };
      (prev.PivotConfig?.chargeCols || []).forEach((c) => {
        newRow[c.key] = 0;
      });
      return {
        ...prev,
        Sheet1_AE: {
          ...prev.Sheet1_AE,
          data: [...prev.Sheet1_AE.data, newRow],
        },
      };
    });
    toast.success("Đã thêm dòng mới. Vui lòng chỉnh sửa trực tiếp.");
  };

  const handleDeleteColumn = (colKey: string) => {
    setHasUnsavedChanges(true);
    updateAppData((prev) => {
      const newChargeCols = (prev.PivotConfig?.chargeCols || []).filter((c) => c.key !== colKey);
      return {
        ...prev,
        PivotConfig: {
          ...(prev.PivotConfig || { headers: { Business: "Business", L07: "L07", GRAND_TOTAL: "GRAND TOTAL" } }),
          chargeCols: newChargeCols,
        },
      };
    });
    toast.success("Đã xóa cột thành công");
  };

  const handleInsertColumn = () => {
    setHasUnsavedChanges(true);
    updateAppData((prev) => {
      const chargeCols = prev.PivotConfig?.chargeCols || [];
      let colIdx = chargeCols.length + 1;
      let newCode = `E${colIdx}`;
      while (chargeCols.some(c => c.code === newCode)) {
        colIdx++;
        newCode = `E${colIdx}`;
      }
      const newKey = `col_${Date.now()}`;
      const newCol = {
        key: newKey,
        code: newCode,
        label: `NEW CHARGE ${colIdx}`,
      };
      
      const newChargeCols = [...chargeCols, newCol];
      
      setChargeCodeValues(prevVals => ({ ...prevVals, [newKey]: newCode }));
      setChargeLabelValues(prevVals => ({ ...prevVals, [newKey]: newCol.label }));

      return {
        ...prev,
        PivotConfig: {
          ...(prev.PivotConfig || { headers: { Business: "Business", L07: "L07", GRAND_TOTAL: "GRAND TOTAL" } }),
          chargeCols: newChargeCols,
        },
      };
    });
    toast.success("Đã chèn thêm cột mới");
  };

  useEffect(() => {
    const onAddRow = () => handleAddRow();
    const onInsertCol = () => handleInsertColumn();
    const onRefresh = () => handleRefreshData();
    const onExport = () => handleExportExcel();

    window.addEventListener("trigger-pivot-add-row", onAddRow);
    window.addEventListener("trigger-pivot-insert-col", onInsertCol);
    window.addEventListener("trigger-pivot-refresh", onRefresh);
    window.addEventListener("trigger-pivot-export", onExport);

    return () => {
      window.removeEventListener("trigger-pivot-add-row", onAddRow);
      window.removeEventListener("trigger-pivot-insert-col", onInsertCol);
      window.removeEventListener("trigger-pivot-refresh", onRefresh);
      window.removeEventListener("trigger-pivot-export", onExport);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  // ... In table headers (lines 429-582), adjust className:
  // Use "font-sans font-medium uppercase tracking-wider text-muted-foreground" for headers.

  const dataColWidth = uiSettings.colWidthPreference === "narrow" ? "120px" : uiSettings.colWidthPreference === "wide" ? "200px" : "160px";
  const mktColWidth = uiSettings.colWidthPreference === "narrow" ? "120px" : uiSettings.colWidthPreference === "wide" ? "200px" : "150px";

  return (
    <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="absolute inset-0 flex flex-col min-h-0 bg-transparent px-[0px] pt-[0px] pb-0 gap-8 items-center overflow-hidden custom-scrollbar"
        style={{ paddingTop: "0px", paddingBottom: "0px" }}
      >
        {/* Decorative Background Elements */}
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px] -z-10" />

        {/* Main Content Card */}
        <div 
          className="bg-transparent flex-1 flex flex-col min-h-0 relative z-10 w-full"
        >

          {/* Content Display */}
          <div className="flex-1 flex flex-col min-h-0 relative z-10">
              <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-transparent">
                {pivotData ? (
                <>
                  <div
                    className="flex-1 overflow-auto custom-scrollbar relative bg-card"
                    style={{ overscrollBehavior: "contain", fontSize: uiSettings.fontSize || "var(--font-size, 13px)", fontFamily: uiSettings.tableFont || "var(--font-table, var(--font-main))" }}
                  >
                    <table
                      onContextMenu={(e) => {
                        e.preventDefault();
                        let business = undefined;
                        let center = undefined;
                        let colKey = undefined;

                        let target = e.target as HTMLElement | null;
                        while (target && target !== e.currentTarget) {
                          if (target.getAttribute("data-business")) {
                            business = target.getAttribute("data-business") || undefined;
                          }
                          if (target.getAttribute("data-center")) {
                            center = target.getAttribute("data-center") || undefined;
                          }
                          if (target.getAttribute("data-colkey")) {
                            colKey = target.getAttribute("data-colkey") || undefined;
                          }
                          if (target.dataset.business) {
                            business = target.dataset.business;
                          }
                          if (target.dataset.center) {
                            center = target.dataset.center;
                          }
                          target = target.parentElement;
                        }

                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          business,
                          center,
                          colKey,
                        });
                      }}
                      className="w-full text-left border-separate min-w-max relative bg-white border border-[#E2E8F0]"
                      style={{ tableLayout: "fixed", borderSpacing: 0 }}
                    >
                      <thead className="sticky top-0 z-[100] text-slate-500 bg-white border-b border-[#E2E8F0]">
                        <tr className="bg-white border-b border-[#E2E8F0]">
                          <th
                            rowSpan={2}
                            style={{ width: "120px" }}
                            className="border-r border-b border-[#E2E8F0] px-4 text-center text-[11px] font-black uppercase tracking-widest text-slate-500 bg-white shadow-[inset_-1px_0_0_#E2E8F0,inset_0_-1px_0_#E2E8F0]"
                          >
                            <div className="flex items-center justify-between gap-1 group/header w-full">
                              <input
                                aria-label="Tên cột Business"
                                value={headerValues["Business"]}
                                onChange={(e) => setHeaderValues(prev => ({...prev, Business: e.target.value}))}
                                onBlur={(e) => handleUpdateHeaderBlur("Business", e.target.value)}
                                className="bg-transparent border-none outline-none w-full text-left text-[11px] font-bold tracking-widest text-slate-500 cursor-pointer focus:cursor-text uppercase placeholder:text-slate-400"
                                placeholder="..."
                              />
                              <button
                                onClick={() => handleSort("business")}
                                className={`p-1 hover:bg-slate-100 rounded transition-colors ${sortConfig.key === "business" ? "bg-slate-100 text-slate-700" : "opacity-0 group-hover/header:opacity-100 text-slate-400 hover:text-slate-600"}`}
                              >
                                {getSortIcon("business")}
                              </button>
                            </div>
                          </th>
                          <th
                            rowSpan={2}
                            style={{ width: "200px" }}
                            className="border-r border-b border-[#E2E8F0] px-4 text-center text-[11px] font-black uppercase tracking-widest text-slate-500 bg-white shadow-[inset_-1px_0_0_#E2E8F0,inset_0_-1px_0_#E2E8F0]"
                          >
                            <div className="flex items-center justify-between gap-1 group/header w-full">
                              <input
                                aria-label="Tên cột L07"
                                value={headerValues["L07"]}
                                onChange={(e) => setHeaderValues(prev => ({...prev, L07: e.target.value}))}
                                onBlur={(e) => handleUpdateHeaderBlur("L07", e.target.value)}
                                className="bg-transparent border-none outline-none w-full text-center text-[11px] font-bold tracking-widest text-slate-500 cursor-pointer focus:cursor-text uppercase placeholder:text-slate-400"
                                placeholder="..."
                              />
                              <button
                                onClick={() => handleSort("center")}
                                className={`p-1 hover:bg-slate-100 rounded transition-colors ${sortConfig.key === "center" ? "bg-slate-100 text-slate-700" : "opacity-0 group-hover/header:opacity-100 text-slate-400 hover:text-slate-600"}`}
                              >
                                {getSortIcon("center")}
                              </button>
                            </div>
                          </th>
                          {pivotData.activeCols.map((c) => (
                            <th
                              key={c.key}
                              style={{ width: dataColWidth }}
                              className="border-b border-r border-[#E2E8F0] text-center px-1 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 bg-white shadow-[inset_-1px_0_0_#E2E8F0]"
                            >
                              <input
                                value={chargeCodeValues[c.key]}
                                onChange={(e) => setChargeCodeValues(prev => ({...prev, [c.key]: e.target.value}))}
                                onBlur={(e) => handleUpdateChargeCodeBlur(c.key, e.target.value)}
                                className="bg-transparent border-none outline-none w-full text-center text-[11px] font-bold tracking-widest text-slate-500 cursor-pointer focus:cursor-text uppercase placeholder:text-slate-400"
                                placeholder="..."
                              />
                            </th>
                          ))}
                          <th
                            rowSpan={2}
                            style={{ width: "150px" }}
                            className="border-r border-b border-[#E2E8F0] text-center px-2 text-[11px] font-black uppercase tracking-widest text-slate-500 bg-white shadow-[inset_-1px_0_0_#E2E8F0,inset_0_-1px_0_#E2E8F0]"
                          >
                            <input
                              aria-label="Tên cột Tổng cộng"
                              value={headerValues["GRAND_TOTAL"]}
                              onChange={(e) => setHeaderValues(prev => ({...prev, GRAND_TOTAL: e.target.value}))}
                              onBlur={(e) => handleUpdateHeaderBlur("GRAND_TOTAL", e.target.value)}
                              className="bg-transparent border-none outline-none w-full text-center text-[11px] font-bold tracking-widest text-slate-500 cursor-pointer focus:cursor-text uppercase p-1 placeholder:text-slate-400"
                              placeholder="..."
                            />
                          </th>
                          {uiSettings.showMktCols !== false && (
                            <>
                              <th
                                rowSpan={2}
                                style={{ width: "150px" }}
                                className="border-r border-b border-[#E2E8F0] text-center px-2 text-[11px] font-bold uppercase tracking-widest text-sky-600 bg-slate-50 shadow-[inset_-1px_0_0_#E2E8F0,inset_0_-1px_0_#E2E8F0]"
                              >
                                LOCAL MKT
                              </th>
                              <th
                                rowSpan={2}
                                style={{ width: "150px" }}
                                className="border-r border-b border-[#E2E8F0] text-center px-2 text-[11px] font-bold uppercase tracking-widest text-[#059669] bg-slate-50 shadow-[inset_-1px_0_0_#E2E8F0,inset_0_-1px_0_#E2E8F0]"
                              >
                                NORTH+MKT
                              </th>
                            </>
                          )}

                        </tr>
                        <tr className="bg-white border-b border-[#E2E8F0]">
                          {pivotData.activeCols.map((c) => (
                            <th
                              key={c.key}
                              data-colkey={c.key}
                              style={{ width: dataColWidth }}
                              className="border-r border-b border-[#E2E8F0] text-center px-1 pb-3 pt-1 text-[11px] font-black tracking-widest text-slate-500 bg-white shadow-[inset_-1px_0_0_#E2E8F0,inset_0_-1px_0_#E2E8F0]"
                            >
                              <div className="flex items-center justify-center gap-1 group/sub relative pr-4">
                                <button
                                  onClick={() => handleSort(c.key)}
                                  className={`p-0.5 hover:bg-slate-100 rounded transition-colors ${sortConfig.key === c.key ? "bg-slate-100 text-[#475569]" : "opacity-0 group-hover/sub:opacity-100 text-slate-400 hover:text-slate-600"}`}
                                >
                                  {getSortIcon(c.key)}
                                </button>
                                <input
                                  value={chargeLabelValues[c.key]}
                                  onChange={(e) => setChargeLabelValues(prev => ({...prev, [c.key]: e.target.value}))}
                                  onBlur={(e) => handleUpdateChargeLabelBlur(c.key, e.target.value)}
                                  className="bg-transparent border-none outline-none w-full text-center text-[11px] text-[#94a3b8] font-bold cursor-pointer focus:cursor-text uppercase tracking-widest placeholder:text-slate-400"
                                  placeholder="..."
                                />
                                <button
                                  onClick={() => handleDeleteColumn(c.key)}
                                  className="opacity-0 group-hover/sub:opacity-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all p-0.5 rounded cursor-pointer absolute right-0.5 top-1/2 -translate-y-1/2 shrink-0"
                                  title="Xóa cột này"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="z-0">
                        {paginatedRows.map((row, idx) => {
                          const isSub = row.isSubtotal;
                          const isBusinessFirstRow = idx === 0 || row.business !== paginatedRows[idx - 1].business;
                          return (
                            <tr
                              key={idx}
                              data-business={row.business}
                              data-center={row.center}
                              className={
                                isSub
                                  ? "bg-white font-bold border-b-4 border-[#E2E8F0] text-[#0f172a]"
                                  : row.isDiscrepancy
                                  ? "bg-rose-50/50 text-rose-800 border-b border-rose-100 font-semibold h-12"
                                  : "bg-white text-[#334155] border-b border-[#f1f5f9] h-12"
                              }
                            >
                              <td className={`px-4 text-[13px] font-bold border-r border-b border-[#E2E8F0] ${isSub ? "text-[#0f172a]" : "text-[#1e293b] p-0"}`}>
                                {isSub ? "" : (
                                  row.isDiscrepancy ? (
                                    <span className="px-4 py-2 block text-rose-800 font-bold">{row.business}</span>
                                  ) : (
                                    <EditableTextCell
                                      value={row.business}
                                      onBlur={(newVal) => handleTableCellChange(row.business, row.center, "business", newVal)}
                                      className="font-bold text-[#1e293b] uppercase"
                                      onGridPaste={(text) => handlePivotGridPaste(text, idx, 0)}
                                    />
                                  )
                                )}
                              </td>
                              <td className={`px-4 text-[13px] border-r border-b border-[#E2E8F0] ${isSub ? "text-[#0f172a] uppercase tracking-wider text-[12px] flex items-center gap-2" : "text-[#334155] font-medium p-0"}`}>
                                {isSub ? (
                                  <div className="flex items-center gap-2 px-4 py-2">
                                    <div className="h-4 w-4 rounded-sm border border-[#E2E8F0] grid place-items-center"><div className="w-2 h-2 bg-slate-300 rounded-sm"></div></div>
                                    {row.center}
                                  </div>
                                ) : (
                                  row.isDiscrepancy ? (
                                    <span className="px-4 py-2 block text-rose-700 italic font-bold">{row.center}</span>
                                  ) : (
                                    <EditableTextCell
                                      value={row.center}
                                      onBlur={(newVal) => handleTableCellChange(row.business, row.center, "center", newVal)}
                                      className="font-medium text-[#334155] uppercase"
                                      onGridPaste={(text) => handlePivotGridPaste(text, idx, 1)}
                                    />
                                  )
                                )}
                              </td>
                              {pivotData.activeCols.map((c, cIdx) => {
                                const val = row.totals[c.key] || 0;
                                if (isSub || row.isDiscrepancy) {
                                  return (
                                    <td
                                      key={c.key}
                                      className={`px-3 text-right text-[13px] border-r border-b border-[#E2E8F0] ${row.isDiscrepancy ? "text-rose-700 bg-rose-50/10" : "font-bold text-[#0f172a]"}`}
                                    >
                                      {val !== 0 ? formatMoneyVND(val) : "0"}
                                    </td>
                                  );
                                }
                                return (
                                  <td
                                    key={c.key}
                                    className="p-0 text-right text-[13px] border-r border-b border-[#E2E8F0]"
                                  >
                                    <EditableNumberCell
                                      value={val}
                                      onChange={(newVal) => handleTableCellChange(row.business, row.center, c.key, String(newVal))}
                                      className="text-[#475569] hover:bg-slate-50"
                                      onGridPaste={(text) => handlePivotGridPaste(text, idx, 2 + cIdx)}
                                    />
                                  </td>
                                );
                              })}
                              <td className={`px-3 text-right text-[13px] font-bold border-r border-b border-[#E2E8F0] ${isSub ? "text-[#0f172a]" : row.isDiscrepancy ? "text-rose-800" : "text-slate-700"}`}>
                                {formatMoneyVND(row.rowTotal)}
                              </td>
                              {uiSettings.showMktCols !== false && (
                                <>
                                  <td className={`px-3 text-right text-[13px] font-bold border-r border-b border-[#E2E8F0] ${isSub ? "text-[#0f172a]" : row.isDiscrepancy ? "text-rose-600 font-black bg-rose-50/10" : "text-slate-700"} bg-slate-50`}>
                                    {formatMoneyVND(row.mktTotal || 0)}
                                  </td>
                                  <td className={`px-3 text-right text-[13px] font-bold border-b border-[#E2E8F0] ${isSub ? "text-[#0f172a]" : row.isDiscrepancy ? "text-rose-800 font-extrabold bg-rose-50/20" : "text-slate-700"} bg-slate-50`}>
                                    {formatMoneyVND(row.northMkt)}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                      {uiSettings.showGrandTotals !== false && (
                        <tfoot className="sticky bottom-0 z-[42] bg-slate-50 font-bold border-t-2 border-[#E2E8F0]">
                          <tr className="bg-slate-50">
                            <td
                              colSpan={2}
                              className="px-6 py-4 text-right text-[13px] font-black uppercase tracking-widest text-slate-800 border-r border-b border-[#E2E8F0] bg-slate-50"
                            >
                              <div className="flex items-center justify-end gap-3 font-sans font-black">
                                <span className="uppercase tracking-widest">TỔNG CỘNG CHUNG</span>
                              </div>
                            </td>
                            {pivotData.activeCols.map((c) => (
                              <td
                                key={c.key}
                                className="px-3 py-4 text-right text-[13px] font-black text-slate-800 border-r border-b border-[#E2E8F0] bg-slate-50"
                              >
                                {formatMoneyVND(pivotData.colTotals[c.key])}
                              </td>
                            ))}
                            <td className="px-3 py-4 text-right text-[13px] font-black text-slate-800 border-r border-b border-[#E2E8F0] bg-slate-50">
                              {formatMoneyVND(pivotData.grandTotal)}
                            </td>
                            {uiSettings.showMktCols !== false && (
                              <>
                                <td className="px-3 py-4 text-right text-[13px] font-black text-slate-800 bg-slate-50 border-r border-b border-[#E2E8F0]">
                                  {formatMoneyVND(pivotData.mktGrandTotal)}
                                </td>
                                <td className="px-3 py-4 text-right text-[13px] font-black text-slate-800 bg-slate-50 border-r border-b border-[#E2E8F0]">
                                  {formatMoneyVND(pivotData.northMktGrandTotal)}
                                </td>
                              </>
                            )}
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>

                  {totalPages >= 1 && (
                    <div
                      className="flex justify-between items-center px-8 bg-muted/5 border-t border-border shrink-0"
                      style={{ paddingTop: "9px", paddingBottom: "9px" }}
                    >
                      <div className="flex items-center gap-6">
                        <span className="text-[0.6rem] font-black text-muted-foreground uppercase tracking-[0.2em]">
                          Trang{" "}
                          <span className="text-primary text-xs">{currentPage}</span> /{" "}
                          {totalPages || 1}
                        </span>
                        <div className="w-px h-4 bg-border" />
                        <span className="text-[0.6rem] font-black text-muted-foreground uppercase tracking-[0.2em]">
                          Tổng cộng{" "}
                          <span className="text-primary text-xs">
                            {pivotData.sortedRows.length}
                          </span>{" "}
                          Bản ghi
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          aria-label="Trang trước"
                          disabled={currentPage === 1}
                          className="flex items-center justify-center border border-border rounded-xl disabled:opacity-30 bg-white text-muted-foreground hover:text-primary hover:border-primary transition-all shadow-sm group cursor-pointer"
                          style={{ width: "32.9884px", height: "32.9884px" }}
                        >
                          <ChevronLeft className="w-5 h-5 group-active:scale-95" />
                        </button>
                        <div 
                          className="flex items-center justify-center bg-primary/5 rounded-xl border border-primary/10 px-0"
                          style={{ height: "32.9884px", width: "32.6111px" }}
                        >
                          <span 
                            className="text-xs font-black text-primary"
                            style={{ marginLeft: "-2px", marginRight: "0px", paddingRight: "0px", lineHeight: "19px" }}
                          >
                            {currentPage}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          aria-label="Trang tiếp theo"
                          disabled={currentPage === totalPages || totalPages === 0}
                          className="flex items-center justify-center border border-border rounded-xl disabled:opacity-30 bg-white text-muted-foreground hover:text-primary hover:border-primary transition-all shadow-sm group cursor-pointer"
                          style={{ width: "32.9884px", height: "32.9884px" }}
                        >
                          <ChevronRight className="w-5 h-5 group-active:scale-95" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                  <Table2 className="w-16 h-16 mx-auto text-primary/20 mb-4" />
                  <p className="text-primary/60 italic font-bold uppercase tracking-widest">
                    Chưa có dữ liệu Sheet 1 AE để tạo Pivot.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        {contextMenu && (
          <div
            className="fixed z-[99999] bg-white/95 backdrop-blur-md border border-[#e6dfd3] shadow-lg rounded-2xl p-2 min-w-[210px] text-[#2b1a0f]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[10px] uppercase font-black tracking-widest text-[#2b1a0f] px-3 py-1.5 opacity-60 border-b border-[#e6dfd3] mb-1">
              Thao tác nhanh
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => {
                  handleAddRow();
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-xl transition-colors hover:bg-[#F3EFE0] text-emerald-700 text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" /> Thêm Dòng mới
              </button>
              <button
                onClick={() => {
                  handleInsertColumn();
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-xl transition-colors hover:bg-[#F3EFE0] text-sky-700 text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-sky-600" /> Chèn Cột mới
              </button>
              <button
                onClick={() => {
                  handleRefreshData();
                  setContextMenu(null);
                }}
                disabled={isRefreshing}
                className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-xl transition-colors hover:bg-[#F3EFE0] text-slate-700 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? "animate-spin" : ""}`} /> Làm mới dữ liệu
              </button>

              <div className="h-px bg-[#e6dfd3] my-1" />
              <div className="text-[9px] uppercase font-bold tracking-widest text-slate-400 px-3 py-1">
                Cài đặt bảng
              </div>

              <label className="w-full flex items-center justify-between px-3 py-1.5 text-left rounded-xl transition-colors hover:bg-[#F3EFE0] text-slate-700 text-xs font-medium cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Hiện Tiểu tổng
                </span>
                <input
                  type="checkbox"
                  checked={uiSettings.showPivotSubtotals ?? true}
                  onChange={(e) => handleUpdateUiSettings({ showPivotSubtotals: e.target.checked })}
                  className="rounded border-[#e6dfd3] text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer accent-primary"
                />
              </label>

              <label className="w-full flex items-center justify-between px-3 py-1.5 text-left rounded-xl transition-colors hover:bg-[#F3EFE0] text-slate-700 text-xs font-medium cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Hiện Tổng cộng
                </span>
                <input
                  type="checkbox"
                  checked={uiSettings.showGrandTotals ?? true}
                  onChange={(e) => handleUpdateUiSettings({ showGrandTotals: e.target.checked })}
                  className="rounded border-[#e6dfd3] text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer accent-primary"
                />
              </label>

              <label 
                className="w-full flex items-center justify-between px-3 py-1.5 text-left rounded-xl transition-colors hover:bg-[#F3EFE0] text-slate-700 text-xs font-medium cursor-pointer"
                style={{ borderColor: "#ffffff" }}
              >
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Hiện Cột MKT
                </span>
                <input
                  type="checkbox"
                  checked={uiSettings.showMktCols ?? true}
                  onChange={(e) => handleUpdateUiSettings({ showMktCols: e.target.checked })}
                  className="rounded border-[#ffffff] text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer accent-primary"
                  style={{ borderColor: "#ffffff" }}
                />
              </label>

              {contextMenu.business && contextMenu.center && (
                <>
                  <div className="h-px bg-[#e6dfd3] my-1" />
                  <button
                    onClick={() => {
                      if (contextMenu.business && contextMenu.center) {
                        handleDeleteRow(contextMenu.business, contextMenu.center);
                      }
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-xl transition-colors hover:bg-rose-50 text-rose-600 text-xs font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Xoá Hàng ({contextMenu.center})
                  </button>
                </>
              )}

              {contextMenu.colKey && (
                <>
                  <div className="h-px bg-[#e6dfd3] my-1" />
                  <button
                    onClick={() => {
                      if (contextMenu.colKey) {
                        handleDeleteColumn(contextMenu.colKey);
                      }
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-xl transition-colors hover:bg-rose-50 text-rose-600 text-[#ea580c] text-xs font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Xoá Cột này
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
