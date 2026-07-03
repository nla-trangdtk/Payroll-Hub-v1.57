/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { PuppyLogo } from "../../components/shared/PuppyLogo";
import React, { useState, useMemo, useEffect, useCallback, useTransition, useDeferredValue } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAppData } from "../../lib/contexts/AppDataContext";
import { useTeacherTaAuditLogic } from "../../hooks/useTeacherTaAuditLogic";
import { DataTable, Column } from "./AuditDataTable";
import {
  ShieldCheck,
  PlayCircle,
  Calendar,
  Trash2,
  Settings,
  Search,
  UploadCloud,
  ChevronRight,
  ChevronDown,
  FileSpreadsheet,
  Download,
  AlertCircle,
  FileText,
  PlusCircle,
  CheckCircle2,
  Users,
  Wrench,
  BadgeCheck,
  RefreshCw,
} from "lucide-react";
import { parseAnyDate, getVal } from "../../lib/utils/data-utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "../../components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import { prepareDataForExport } from "../../lib/utils/data-utils";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const;

function DebouncedSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const [localValue, setLocalValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    if (value === "") {
      setLocalValue("");
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localValue, value, onChange]);

  return (
    <input
      type="text"
      placeholder={placeholder}
      value={localValue}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setLocalValue(e.target.value)}
      onKeyDown={(e) => e.stopPropagation()}
      className="w-full bg-primary/5 border border-primary/10 rounded-xl pl-9 pr-3 py-2 text-xs uppercase font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-inner h-9 text-foreground"
      autoFocus
    />
  );
}

export function Audit() {
  const { appData, updateAppData } = useAppData();
  const navigate = useNavigate();

  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"main" | "detail">("main");
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [detailManualFilter, setDetailManualFilter] = useState("");
  const deferredDetailFilter = useDeferredValue(detailManualFilter);
  const [isConfigHidden, setIsConfigHidden] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // GIẢI PHÁP CHỐNG LAG 1: Dùng useTransition để nhường luồng xử lý UI (Không làm kẹt/đơ nút bấm)
  const [isPending, startTransition] = useTransition();

  const [tableFilteredCount, setTableFilteredCount] = useState<number | null>(null);

  const handleFilteredDataChange = useCallback((data: any[]) => {
    setTableFilteredCount(data.length);
  }, []);

  const handleRefreshData = () => {
    setIsRefreshing(true);
    updateAppData((prev) => ({ ...prev }));
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Đã làm mới dữ liệu", {
        description: "Dữ liệu AUDIT đã được làm mới thành công.",
      });
    }, 600);
  };

  const handleMainRowClick = useCallback((row: any) => {
    if (row.className) {
      startTransition(() => {
        setSearchTerm(row.className);
        setDetailManualFilter(row.className);
        setActiveTab("detail");
        setIsConfigHidden(true);
      });
    }
  }, []);

  const handleDetailRowClick = useCallback((row: any, columnKey?: string) => {
    const targetClassName = row._fullClassName || row.className;
    if (targetClassName) {
      const navigateState: any = {
        activeTab: "roster_raw",
        from: "audit",
      };

      // Apply filter based on clicked column
      if (columnKey === "className") {
        navigateState.searchTerm = targetClassName;
      } else if (columnKey === "dateStr") {
        navigateState.filterDate = row._fullDate;
        navigateState.searchTerm = targetClassName; // Set class filter active as well
      } else if (columnKey === "taId" || columnKey === "taName") {
        const idStr = String(row.taId || "").trim();
        const nameStr = String(row.taName || "").trim();
        let query = "";
        
        if (columnKey === "taId") {
           query = (idStr && idStr !== "-") ? idStr : ((nameStr && nameStr !== "-") ? nameStr : "");
        } else {
           query = (nameStr && nameStr !== "-") ? nameStr : ((idStr && idStr !== "-") ? idStr : "");
        }
        
        if (query) {
           navigateState.searchTerm = query;
        } else {
           // Skip filtering if both are "-"
           navigateState.searchTerm = "";
        }
      }

      startTransition(() => {
        navigate("/centers", {
          state: navigateState,
        });
        toast.success(
          `Đang chuyển đến dữ liệu nguồn...`
        );
      });
    }
  }, [navigate]);

  const fromDate = appData.Timesheet_Dates?.from || "";
  const toDate = appData.Timesheet_Dates?.to || "";
  const rosterData = useMemo(() => appData.Q_Roster || [], [appData.Q_Roster]);

  const { state, computed, actions } = useTeacherTaAuditLogic(
    rosterData,
    fromDate,
    toDate,
  );
  const { fileNameA, fileNameConfig, isProcessing, errorMsg } = state;
  const { auditResults } = computed;
  const { handleUploadFileA, handleUploadFileConfig, clearData } = actions;

  // Helper for date range calculation
  const teacherDateRange = useMemo(() => {
    const { min, max } = auditResults.fileDateRangeA || { min: null, max: null };

    if (min === null || max === null) return "";
    
    const fmt = (ts: number) => {
      const d = new Date(ts);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }
    return `${fmt(min)} - ${fmt(max)}`;
  }, [auditResults.fileDateRangeA]);

  // Gộp 2 useMemo thành 1 — chỉ lặp rosterData 1 lần thay vì 2 lần
  const { taDateRange, commonDateRange } = useMemo(() => {
    let minB: number | null = null;
    let maxB: number | null = null;

    rosterData.forEach((row: any) => {
      const dv = getVal(row, ["date", "ngày", "tk_date", "session date"]);
      const d = parseAnyDate(dv);
      if (d && !isNaN(d.getTime())) {
        const ts = d.getTime();
        if (minB === null || ts < minB) minB = ts;
        if (maxB === null || ts > maxB) maxB = ts;
      }
    });

    const fmt = (ts: number) => {
      const d = new Date(ts);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };

    const taRange = (minB === null || maxB === null) ? "" : `${fmt(minB)} - ${fmt(maxB)}`;

    // commonDateRange: intersection of A and B
    const minA: number | null = auditResults.fileDateRangeA?.min ?? null;
    const maxA: number | null = auditResults.fileDateRangeA?.max ?? null;

    let commonRange = "";
    if (minA !== null && maxA !== null && minB !== null && maxB !== null) {
      const commonMin = Math.max(minA, minB);
      const commonMax = Math.min(maxA, maxB);
      commonRange = commonMin > commonMax ? "Không khớp thời gian" : `${fmt(commonMin)} - ${fmt(commonMax)}`;
    }

    return { taDateRange: taRange, commonDateRange: commonRange };
  }, [rosterData, auditResults.fileDateRangeA]);

  const teacherGroupLabel = "TOTAL PAYMENT";
  const taGroupLabel = "TA";

  const location = useLocation();

  // Handle deep linking for tabs
  useEffect(() => {
    if (location.state?.activeTab) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(location.state.activeTab);
      if (location.state.activeTab === "detail") {
        setIsConfigHidden(true);
      }
    }
  }, [location]);

  const clearAllFilters = () => {
    startTransition(() => {
      setSearchTerm("");
      setDetailManualFilter("");
      setSelectedDetailRow(null);
    });
  };

  const onFileAChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleUploadFileA(file);
    e.target.value = "";
    toast.success("Đã tải File Timesheet Giáo Viên");
  };

  const onFileConfigChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleUploadFileConfig(file);
    e.target.value = "";
    toast.success("Đã tải File Cấu Hình Sĩ Số");
  };

  const handleClearAudit = () => {
    clearData();
    setShowClearDialog(false);
    toast.success("Đã xoá dữ liệu đối soát");
  };

  // ----- MAIN DATA -----
  const mainData = useMemo(() => {
    return (
      auditResults.results?.map((r: any) => {
        let cName = (r.className || "").toString().trim();
        if (!cName || cName === "-" || cName === "") cName = "KHÔNG CÓ LỚP HỌC";
        
        return {
          ...r,
          className: cName,
          diffValue: r.actualTA - r.expected,
        };
      }) || []
    );
  }, [auditResults.results]);

  const mainColumns: Column[] = useMemo(() => [
    {
      key: "displayCenter",
      label: "Mã AE",
      sortable: true,
      filterable: true,
      width: 120,
      headerClassName: "bg-[#F3EFE0] border-r border-[#E2E8F0]",
      cellClassName: "bg-white border-r border-[#E2E8F0]",
      render: (val: string) => (
        <span
          className="font-bold text-primary cursor-pointer hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            startTransition(() => {
              setDetailManualFilter(val);
              setActiveTab("detail");
              setIsConfigHidden(true);
            });
          }}
        >
          {val}
        </span>
      ),
    },
    {
      key: "bu",
      label: "BU",
      sortable: true,
      filterable: true,
      width: 80,
      render: (val: string, row: any) => (
        <span className="font-bold text-slate-500">{val || row.bu || ""}</span>
      )
    },
    {
      key: "type",
      label: "Nghiệp vụ",
      sortable: true,
      filterable: true,
      width: 110,
      render: (val: string, row: any) => {
        const displayType = val || row.teacherDetails?.[0]?.type || row.taDetails?.[0]?.type || "";
        const source = row.sourceSheet || row.teacherDetails?.[0]?.sourceSheet || row.taDetails?.[0]?.sourceSheet || "";
        const isBonus = displayType === "Bonus" || (source && (source.includes("Bonus") || source.includes("Summer") || source.includes("Instructors")));
        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 ${isBonus ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
            {isBonus && <span>⏩</span>}
            {displayType}
          </span>
        );
      }
    },
    {
      key: "className",
      label: "Lớp",
      sortable: true,
      filterable: true,
      width: 200,
      headerClassName: "bg-[#F3EFE0] border-r border-[#E2E8F0]",
      cellClassName: "bg-white border-r border-[#E2E8F0]",
      render: (val: string, row: any) => (
        <div
          className="font-bold text-foreground flex items-center gap-1.5 whitespace-nowrap cursor-pointer hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
            startTransition(() => {
              setDetailManualFilter(val);
              setActiveTab("detail");
              setIsConfigHidden(true);
            });
          }}
        >
          {val}
          {row.isKDG && (
            <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded-md text-[9px] font-black uppercase tracking-widest border border-primary/20">
              KDG
            </span>
          )}
        </div>
      ),
    },
    {
      key: "teacherHours",
      label: teacherGroupLabel,
      sortable: true,
      type: "number",
      width: 150,
      headerStyle: { backgroundColor: "#f8f8f8" },
      render: (val: any) => (
        <span className="tabular-nums font-bold text-primary">
          {(() => {
            const n = Number(val);
            return (val && val !== "-" && !isNaN(n) && n !== 0) ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
          })()}
        </span>
      ),
    },

    {
      key: "actualTA",
      label: taGroupLabel,
      sortable: true,
      type: "number",
      width: 207,
      headerStyle: {
        fontSize: "0.65rem",
        padding: "0.5rem",
      },
      render: (val: any) => (
        <span className="tabular-nums text-emerald-600 font-bold bg-emerald-50/50 px-2 py-1 rounded">
          {(() => {
            const n = Number(val);
            return (val && val !== "-" && !isNaN(n) && n !== 0) ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
          })()}
        </span>
      ),
    },
    {
      key: "numStudents",
      label: "STUDENTS",
      sortable: true,
      width: 100,
      align: "center",
      render: (val: any) => (
        <span
          className={`tabular-nums font-bold ${val && val !== 0 ? "text-primary" : "text-muted-foreground/30"}`}
        >
          {val && val !== 0 ? val : ""}
        </span>
      ),
    },
    {
      key: "expected",
      label: "ALLOWED TAs",
      sortable: true,
      type: "number",
      width: 140,
      render: (val: any, row: any) => (
        <div className="flex flex-col">
          <span className="text-slate-700 font-bold text-xs">
            {(() => {
              const n = Number(val);
              return (val && val !== "-" && !isNaN(n) && n !== 0) ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
            })()}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">
            {row.teacherHours > 0
              ? Number(row.expected / row.teacherHours || 0).toFixed(1)
              : 0}{" "}
            TAs Rule
          </span>
        </div>
      ),
    },
    
    {
      key: "diffValue",
      label: "Độ Lệch",
      sortable: true,
      type: "number",
      width: 150,
      render: (_: any, row: any) => (
        <span
          className={`font-bold ${row.statusColor === "emerald" ? "text-emerald-600" : row.statusColor === "amber" ? "text-amber-600" : "text-rose-600"}`}
        >
          {row.diffText}
        </span>
      ),
    },
    {
      key: "status",
      label: "TRẠNG THÁI",
      sortable: true,
      filterable: true,
      width: 150,
      headerStyle: {
        fontSize: "0.65rem",
        padding: "0.5rem",
      },
      render: (val: string, row: any) => (
        <div className="flex items-center gap-2 w-full pr-2">
          <span
            className={`px-3 py-1 rounded-full text-[0.625rem] font-bold uppercase tracking-widest flex items-center justify-center truncate tabular-nums shrink-0 ${
              row.statusColor === "emerald"
                ? "bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm w-[75px]"
                : row.statusColor === "amber"
                  ? "bg-amber-100 text-amber-700 border border-amber-200 shadow-sm flex-1 min-w-[120px]"
                  : "bg-rose-100 text-rose-700 border border-rose-200 shadow-sm flex-1 min-w-[120px]"
            }`}
            title={val}
          >
            {val}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      width: 76,
      headerClassName: "bg-slate-50 border-l border-slate-200",
      cellClassName: "bg-white border-l border-slate-200",
      render: (_: any, row: any) => (
        <div className="flex items-center justify-center w-full h-full gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              startTransition(() => {
                setDetailManualFilter(row.className || row.displayCenter);
                setActiveTab("detail");
                setIsConfigHidden(true);
              });
            }}
            title="Nhấp vào đây để xem chi tiết đối soát (chuyển sang tab Chi Tiết Lệch)"
            className={`p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer flex items-center justify-center border shadow-sm active:scale-95 ${
              row.statusColor === "emerald" 
                ? "hover:bg-emerald-100 text-emerald-600 border-emerald-200 bg-emerald-50/50" 
                : row.statusColor === "amber"
                  ? "hover:bg-amber-100 text-amber-600 border-amber-200 bg-amber-50/50"
                  : "hover:bg-rose-100 text-rose-600 border-rose-200 bg-rose-50/50"
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDetailRowClick(row, "className");
            }}
            title="Nhảy ra bảng dữ liệu Timesheet Cột O (Dữ liệu gốc ở cuối trang nguồn)"
            className="p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer flex items-center justify-center border shadow-sm active:scale-95 text-primary bg-primary/5 hover:bg-primary/20 border-primary/20"
          >
            <AlertCircle className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ], [setActiveTab, setDetailManualFilter, setIsConfigHidden, teacherGroupLabel, taGroupLabel, handleDetailRowClick]);

  // ----- DETAIL DATA -----
  const [selectedDetailRow, setSelectedDetailRow] = useState<any>(null);

  const detailData = useMemo(() => {
    // Flatmap details - keeping all rows for detailed view, especially those with discrepancies
    const resultsToMap = auditResults.results || [];

    // 1. Flatten all sessions
    const allSessions: any[] = [];
    resultsToMap.forEach((row: any) => {
      row.alignedRows?.forEach((r: any) => {
        let parentClassName = (row.className || "").toString().trim();
        if (!parentClassName || parentClassName === "-") {
          parentClassName = "KHÔNG CÓ LỚP HỌC";
        }
        
        const fallbackTeacherName = row.teacherDetails?.length > 0
          ? Array.from(new Set(row.teacherDetails.map((td: any) => td.name).filter(Boolean))).join(', ')
          : "Không có giáo viên";

        allSessions.push({
          ...r,
          _parentClassName: parentClassName,
          _parentCenter: row.displayCenter || row.center,
          _parentStatus: row.status,
          _fallbackTeacherName: fallbackTeacherName,
          _type: r.teacher?.type || r.ta?.type || ""
        });
      });
    });

    // 2. Sort by Center, Class then Date (Using faster compare to prevent cross-center merging)
    allSessions.sort((a, b) => {
      const ctrA = a._parentCenter || "";
      const ctrB = b._parentCenter || "";
      if (ctrA !== ctrB) return ctrA < ctrB ? -1 : 1;
      const clsA = a._parentClassName || "";
      const clsB = b._parentClassName || "";
      if (clsA !== clsB) return clsA < clsB ? -1 : 1;
      const dateA = a.fullDate || "";
      const dateB = b.fullDate || "";
      return dateA < dateB ? -1 : 1;
    });

    // 3. Map with merge logic via rowSpans
    const finalData: any[] = [];
    const len = allSessions.length;
    let i = 0;
    while (i < len) {
      const current = allSessions[i];
      let j = i + 1;

      while (
        j < len &&
        allSessions[j].fullDate === current.fullDate &&
        allSessions[j]._parentClassName === current._parentClassName &&
        allSessions[j]._parentCenter === current._parentCenter
      ) {
        j++;
      }

      const span = j - i;
      let totalTaHoursForSpan = 0;
      let totalTeacherHoursForSpan = 0;
      let allowedTAs = 0;
      let maxStudentsInSpan = 0;
      const uniqueTAs = new Set();

      for (let k = i; k < j; k++) {
        const sess = allSessions[k];

        if (sess.ta) {
          if (sess.ta.hours) {
            totalTaHoursForSpan += sess.ta.hours;
            if (sess.ta.id) uniqueTAs.add(sess.ta.id);
          }
          const sNum = parseInt(sess.ta.numStudents) || 0;
          if (sNum > maxStudentsInSpan) maxStudentsInSpan = sNum;
        }

        if (sess.teacher) {
          if (sess.teacher.hours) {
            totalTeacherHoursForSpan += sess.teacher.hours;
            allowedTAs = sess.teacher.allowedTAs || allowedTAs;
          }
          const sNum = parseInt(sess.teacher.numStudents) || 0;
          if (sNum > maxStudentsInSpan) maxStudentsInSpan = sNum;
        }
      }

      const actualTAsCount = uniqueTAs.size;
      const sessionStatus =
        actualTAsCount > allowedTAs ||
        totalTaHoursForSpan > totalTeacherHoursForSpan * allowedTAs + 0.05
          ? "Cần check lại"
          : "Khớp";

      const formattedTeacherHours =
        totalTeacherHoursForSpan > 0
          ? totalTeacherHoursForSpan.toFixed(2).replace(".", ",")
          : "0";
      const formattedAllowedTAs = String(allowedTAs).replace(".", ",");
      const formattedMaxStudents =
        maxStudentsInSpan > 0 ? String(maxStudentsInSpan) : "0";

      let totalTaHours = 0;
      let spanTeacherName = "";
      for (let k = i; k < j; k++) {
        totalTaHours += allSessions[k].ta?.hours || 0;
        if (!spanTeacherName && allSessions[k].teacher?.name && allSessions[k].teacher.name !== "-") {
          spanTeacherName = allSessions[k].teacher.name;
        }
      }
      if (!spanTeacherName) {
        spanTeacherName = current._fallbackTeacherName || "";
      }
      
      const formattedTotalTaHours = totalTaHours > 0 ? totalTaHours.toFixed(2).replace(".", ",") : "0";

      for (let k = i; k < j; k++) {
        const s = allSessions[k];
        const isFirst = k === i;
        finalData.push({
          groupId: i,
          isFirstInGroup: isFirst,
          id: `detail_${k}_${s._parentClassName}`,
          className: s._parentClassName || "KHÔNG CÓ LỚP HỌC",
          dateStr: s.fullDate || s.date || "",
          center: s._parentCenter || "",
          teacherName: spanTeacherName,
          teacherHours: formattedTeacherHours,
          taId: (s.ta?.id && s.ta.id !== "-") ? s.ta.id : "",
          taName: (s.ta?.name && s.ta.name !== "-") ? s.ta.name : "",
          taHours: (s.ta?.hours !== undefined && s.ta.hours !== 0)
            ? s.ta.hours.toFixed(2).replace(".", ",")
            : "",
          numStudents: formattedMaxStudents,
          allowedTAs: formattedAllowedTAs,
          actualTAs: actualTAsCount,
          variance: sessionStatus,
          type: s._type || "",
          _fullDate: s.fullDate || s.date || "",
          _fullClassName: s._parentClassName || "KHÔNG CÓ LỚP HỌC",
        });
      }
      i = j;
    }

    return finalData;
  }, [auditResults.results]);

  // Helper to capitalize names
  const capitalizeName = (name: any) => {
    const n = (name == null || name === "-" || name === "undefined") ? "" : String(name).trim();
    if (!n) return "";
    return n
      .toLowerCase()
      .split(" ")
      .filter((word) => word.length > 0)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // ----- FILTERED DETAIL DATA -----

  const filteredDetailData = useMemo(() => {
    // Chỉ hiển thị dữ liệu cần check lại
    const issueGroupIds = new Set<number>();
    for (let i = 0; i < detailData.length; i++) {
      if (detailData[i].variance === "Cần check lại") {
        issueGroupIds.add(detailData[i].groupId);
      }
    }

    const result = detailData.filter(row => issueGroupIds.has(row.groupId));

    if (!deferredDetailFilter) return result;

    const lower = deferredDetailFilter.toLowerCase();
    const groupMatches = new Set<number>();
    
    // Use standard for loop for performance
    for (let i = 0; i < result.length; i++) {
      const row = result[i];
      // Check specific fields that user might search for instead of Object.values
      if (
        (row.className && row.className.toLowerCase().includes(lower)) ||
        (row.teacherName && row.teacherName.toLowerCase().includes(lower)) ||
        (row.taName && row.taName.toLowerCase().includes(lower)) ||
        (row.dateStr && row.dateStr.toLowerCase().includes(lower)) ||
        (row.center && row.center.toLowerCase().includes(lower)) ||
        (row.variance && row.variance.toLowerCase().includes(lower))
      ) {
        groupMatches.add(row.groupId);
      }
    }

    // Filter using the set
    return result.filter(row => groupMatches.has(row.groupId));
  }, [detailData, deferredDetailFilter]);

  const detailColumns: Column[] = useMemo(() => [
    {
      key: "center",
      label: "L07",
      group: "THÔNG TIN CHUNG",
      sortable: true,
      filterable: true,
      autoRowSpan: true,
      width: 140,
      headerClassName: "bg-[#F3EFE0] border-r border-[#E2E8F0]",
      cellClassName: "bg-white border-r border-[#E2E8F0]",
      render: (val: string, row: any) => (
        <span 
          className="font-bold text-slate-700 cursor-pointer hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            handleDetailRowClick(row, "className");
          }}
        >
          {val || row.displayCenter || "N/A"}
        </span>
      ),
    },
    {
      key: "bu",
      label: "BU",
      group: "THÔNG TIN CHUNG",
      sortable: true,
      filterable: true,
      autoRowSpan: true,
      width: 80,
      render: (val: string, row: any) => {
        const displayBu = val || row.bu || "";
        return <span className="font-bold text-slate-500">{displayBu}</span>;
      }
    },
    {
      key: "className",
      label: "Lớp",
      group: "THÔNG TIN CHUNG",
      sortable: true,
      filterable: true,
      autoRowSpan: true,
      width: 140,
      headerClassName: "bg-[#F3EFE0] border-r border-[#E2E8F0]",
      cellClassName: "bg-white border-r border-[#E2E8F0]",
      render: (val: string, row: any) => {
        const displayVal = row._fullClassName || val || "KHÔNG CÓ LỚP HỌC";
        return (
          <span 
            className="font-bold text-primary cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              handleDetailRowClick(row, "className");
            }}
          >
            {displayVal}
          </span>
        );
      },
    },
    {
      key: "dateStr",
      label: "DATE",
      group: "THÔNG TIN CHUNG",
      sortable: true,
      filterable: true,
      autoRowSpan: true,
      width: 100,
      render: (val: string, row: any) => (
        <span 
          className="font-bold text-primary cursor-pointer hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            handleDetailRowClick(row, "dateStr");
          }}
        >
          {val}
        </span>
      ),
    },

    // Group: Giáo Viên (Nguồn 1)
    {
      key: "teacherName",
      label: teacherGroupLabel,
      group: "THÔNG TIN CHUNG",
      sortable: true,
      filterable: true,
      autoRowSpan: true,
      width: 160,
      render: (val: string) => (
        <div 
          className="font-bold text-foreground w-full h-full flex items-center"
          onClick={(e) => e.stopPropagation()}
        >
          {capitalizeName(val)}
        </div>
      ),
    },
    {
      key: "teacherHours",
      label: "Giờ dạy (h)",
      group: "THÔNG TIN CHUNG",
      sortable: true,
      filterable: true,
      autoRowSpan: true,
      width: 90,
      align: "center",
      render: (val: string) => (
        <div 
          className="tabular-nums font-bold text-primary w-full h-full flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const n = Number(val);
            return (val && val !== "-" && !isNaN(n) && n !== 0) ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : val;
          })()}
        </div>
      ),
    },
    {
      key: "type",
      label: "Nghiệp vụ",
      group: "THÔNG TIN CHUNG",
      sortable: true,
      filterable: true,
      width: 110,
      render: (val: string, row: any) => {
        const displayType = val || row.teacher?.type || row.ta?.type || "";
        const source = row.sourceSheet || row.teacher?.sourceSheet || row.ta?.sourceSheet || "";
        const isBonus = displayType === "Bonus" || (source && (source.includes("Bonus") || source.includes("Summer") || source.includes("Instructors")));
        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 ${isBonus ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
            {isBonus && <span>⏩</span>}
            {displayType}
          </span>
        );
      }
    },
    {
      key: "sourceSheet",
      label: "Sheet Source",
      group: "THÔNG TIN CHUNG",
      sortable: true,
      filterable: true,
      autoRowSpan: true,
      width: 150,
      render: (val: string, row: any) => {
        const displaySheet = val || row.sourceSheet || row.teacher?.sourceSheet || row.ta?.sourceSheet || "";
        return <span className="text-[10px] font-medium text-slate-500 italic">{displaySheet}</span>;
      }
    },

    // Group: Thông tin chung (Common Context)
    {
      key: "numStudents",
      label: "No. Students",
      group: "THÔNG TIN CHUNG",
      sortable: true,
      filterable: true,
      autoRowSpan: true,
      width: 100,
      align: "center",
      render: (val: any) => (
        <div
          className={`tabular-nums font-bold w-full h-full flex items-center justify-center ${val && val !== "0" && val !== 0 ? "text-primary" : "text-muted-foreground/30"}`}
          onClick={(e) => e.stopPropagation()}
        >
          {val && val !== "0" && val !== 0 ? val : ""}
        </div>
      ),
    },
    {
      key: "allowedTAs",
      label: "Allowed TAs",
      group: "THÔNG TIN CHUNG",
      sortable: true,
      filterable: true,
      autoRowSpan: true,
      width: 90,
      align: "center",
      render: (val: any) => (
        <div className="tabular-nums font-bold text-slate-600 w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>{val || ""}</div>
      ),
    },
    {
      key: "actualTAs",
      label: "Actual TAs",
      group: "THÔNG TIN CHUNG",
      sortable: true,
      filterable: true,
      autoRowSpan: true,
      width: 90,
      align: "center",
      render: (val: any) => (
        <div className="tabular-nums font-bold text-emerald-600 w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>{val || ""}</div>
      ),
    },

    // Group: TA (Nguồn 2 - Thông tin riêng)
    {
      key: "taId",
      label: "ID NUMBER",
      group: "CHI TIẾT GIỜ LÀM TA",
      sortable: true,
      filterable: true,
      width: 120,
      render: (val: string, row: any) => (
        <span 
          className="tabular-nums text-[0.7rem] text-rose-600 font-bold cursor-pointer hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            handleDetailRowClick(row, "taId");
          }}
        >
          {val}
        </span>
      ),
    },
    {
      key: "taName",
      label: taGroupLabel,
      group: "CHI TIẾT GIỜ LÀM TA",
      sortable: true,
      filterable: true,
      width: 180,
      render: (val: string, row: any) => (
        <span 
          className="font-bold text-emerald-700 cursor-pointer hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            handleDetailRowClick(row, "taName");
          }}
        >
          {capitalizeName(val)}
        </span>
      ),
    },
    {
      key: "taHours",
      label: "Giờ làm (h)", // Renamed to reflect merged sum
      group: "CHI TIẾT GIỜ LÀM TA",
      sortable: true,
      filterable: true,
      width: 90,
      align: "center",
      render: (val: string) => (
        <div className="tabular-nums text-emerald-600 font-bold w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          {(() => {
            const n = Number(val);
            return (val && val !== "-" && !isNaN(n) && n !== 0) ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : val;
          })()}
        </div>
      ),
    },

    // Group: Đối Soát (Kết luận)
    {
      key: "variance",
      label: "CHÊNH LỆCH",
      group: "CHI TIẾT GIỜ LÀM TA",
      sortable: true,
      filterable: true,
      width: 110,
      align: "center",
      render: (val: string) => (
        <div className="w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <span
            className={`px-2 py-0.5 rounded-full text-[0.6rem] font-black tracking-widest border uppercase ${
              val?.includes("Khớp")
                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                : "bg-rose-50 text-rose-600 border-rose-100"
            }`}
          >
            {val}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      width: 50,
      headerClassName: "bg-slate-50 border-l border-slate-200",
      cellClassName: "bg-white border-l border-slate-200",
      render: (_: any, row: any) => (
        <div className="flex items-center justify-center w-full h-full">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDetailRowClick(row, "className");
            }}
            title="Nhảy ra bảng dữ liệu Roster"
            className="p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer flex items-center justify-center border shadow-sm active:scale-95 text-primary bg-primary/5 hover:bg-primary/20 border-primary/20"
          >
            <AlertCircle className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ], [handleDetailRowClick, teacherGroupLabel, taGroupLabel]);

  const handleExportExcel = () => {
    if (!auditResults.results || auditResults.results.length === 0) {
      toast.error("Không có dữ liệu để xuất!");
      return;
    }

    // Main Report Export
    const exportData = mainData.map((row: any) => ({
      "Mã AE": row.displayCenter || row.center,
      Lớp: row.className,
      KDG: row.isKDG ? "Có" : "Không",
      "Timesheet GV (A)": row.teacherHours,
      "TA Thực Tế (B)": row.actualTA,
      "Trạng Thái": row.status,
    }));

    // Details Export
    const exportDetails = detailData.map((row: any) => ({
      "Mã AE": row.center,
      Lớp: row.className,
      "Ngày Lịch": row.dateStr,
      "A - Tên GV": row.teacherName,
      "A - Sĩ Số": row.numStudents,
      "ALLOWED TAs": row.allowedTAs,
      "A - Giờ": row.teacherHours,
      "B - ID TA": row.taId,
      "B - Tên TA": row.taName,
      "B - Giờ": row.taHours,
      "Trạng Thái Lớp": row.variance,
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(prepareDataForExport(exportData));
    const ws2 = XLSX.utils.json_to_sheet(prepareDataForExport(exportDetails));

    XLSX.utils.book_append_sheet(wb, ws1, "Báo_Cáo_Tong_Hop");
    XLSX.utils.book_append_sheet(wb, ws2, "Chi_Tiet_Đoi_Soat");
    XLSX.writeFile(wb, `Audit_Report.xlsx`);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="page-audit-center flex-1 flex flex-col min-h-0 bg-transparent px-[32px] pt-[20px] pb-[20px] gap-8 items-center overflow-hidden"
    >
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-emerald-500/5 rounded-full blur-[100px] -z-10" />

      <div className="flex flex-col lg:flex-row gap-8 w-full flex-1 min-h-0 min-w-0 mt-0 px-0 pb-0 relative z-10 border border-emerald-100">
        {/* Left Panel - Source Selection (Swapped back to left) */}
        {!isConfigHidden && (
          <motion.div
            key="audit-config"
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full lg:w-80 bg-white border border-emerald-100 p-6 flex flex-col gap-5 relative lg:flex-none shrink-0 z-[60] min-h-0 overflow-hidden mb-1.5 rounded-3xl soft-card"
          >
            <div className="absolute inset-0 bg-pattern-green opacity-[0.05] pointer-events-none" />

            <div className="flex items-center justify-between relative z-10 shrink-0 mb-0 pb-[3px]">
              <div className="flex items-center gap-4">
                <PuppyLogo size={40} className="shrink-0" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase tracking-widest border border-emerald-200">
                      CENTER AUDIT
                    </span>
                  </div>
                  <h2 className="text-[1.2rem] font-normal font-serif text-foreground tracking-tight flex items-end gap-1">
                    Audit{" "}
                    <span className="not-italic font-script text-emerald-600 text-2xl lowercase inline-block">
                      Config
                    </span>
                  </h2>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 flex-1 relative z-10 overflow-auto custom-scrollbar pr-[6px] -mr-[4px]">
              {activeTab === "detail" && selectedDetailRow && (
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[0.6rem] font-black uppercase tracking-widest text-primary">
                      SESSION CONTEXT
                    </p>
                    <button
                      onClick={() => {
                        setSelectedDetailRow(null);
                        setSearchTerm("");
                      }}
                      className="text-primary hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-foreground">
                      {selectedDetailRow._fullDate}
                    </p>
                    <p className="text-[0.65rem] font-bold text-primary/70 uppercase tracking-tight truncate">
                      {selectedDetailRow._fullClassName}
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-primary/10">
                    <p className="text-[0.55rem] font-black text-primary/40 uppercase tracking-widest mb-1">
                      Rule Info
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-[0.65rem] font-bold text-foreground">
                        Sĩ số: {selectedDetailRow.numStudents}
                      </span>
                      <span className="text-[0.65rem] font-black text-primary">
                        ALLOWED TAs: {selectedDetailRow.allowedTAs} TAs
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label
                  className="text-[0.65rem] font-black uppercase tracking-widest flex items-center gap-2 px-1"
                  style={{ color: "#712043" }}
                >
                  <FileText className="w-3.5 h-3.5" /> MR.03 - Teacher Timesheet
                </label>
                <label
                  htmlFor="upload-file-a-audit"
                  className={`flex flex-col items-center justify-center p-3 border-2 border-dashed ${fileNameA ? "bg-primary/5 border-primary/40" : "bg-muted/20 border-border hover:bg-primary/5"} rounded-2xl cursor-pointer transition-colors relative shadow-inner group overflow-hidden`}
                >
                  <input
                    type="file"
                    id="upload-file-a-audit"
                    className="hidden"
                    accept=".xlsx,.xls,.csv,.gsheet"
                    onChange={onFileAChange}
                  />
                  {!fileNameA ? (
                    <div className="text-center py-4">
                      <PlusCircle className="w-10 h-10 text-muted-foreground/30 mb-3 mx-auto group-hover:scale-110 transition-transform" />
                      <span className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-widest block">
                        Tải File GV
                      </span>
                    </div>
                  ) : (
                    <div className="w-full flex items-center gap-3 px-3 py-1">
                      <div
                        className="w-8 h-8 bg-primary/20 rounded-xl flex items-center justify-center shrink-0"
                        style={{ color: "#630a30" }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-bold text-[#8b6580] truncate leading-tight uppercase tracking-wider">
                          {fileNameA}
                        </p>
                        <p className="text-[12px] leading-[14px] font-black text-primary/70 uppercase mt-2">
                          {teacherDateRange || "Dữ liệu đã sẵn sàng"}
                        </p>
                      </div>
                    </div>
                  )}
                </label>
              </div>

              <div className="space-y-3">
                <label className="text-[0.65rem] font-black uppercase tracking-widest text-emerald-700/60 flex items-center gap-2 px-1">
                  <Users className="w-3.5 h-3.5" /> Dữ liệu Lớp Học (B)
                </label>
                <div
                  className={`flex flex-col items-center justify-center p-3 border-2 border-dashed ${rosterData?.length > 0 ? "bg-emerald-50/50 border-emerald-400/40" : "bg-muted/20 border-border"} rounded-2xl relative shadow-inner group overflow-hidden`}
                >
                  {!rosterData?.length ? (
                    <div className="text-center py-4">
                      <Users className="w-10 h-10 text-muted-foreground/30 mb-3 mx-auto" />
                      <span className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-widest block">
                        Chưa có Roster
                      </span>
                    </div>
                  ) : (
                    <div className="w-full flex items-center gap-3 px-3 py-1">
                      <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0 text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[8px] font-bold text-emerald-700 truncate leading-tight uppercase tracking-wider">
                          {rosterData.length} dòng
                        </p>
                        <p className="text-[12px] leading-[14px] font-black text-emerald-600 uppercase mt-0.5">
                          {taDateRange || "Lấy từ bảng Roster Gốc"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[0.65rem] font-black uppercase tracking-widest text-amber-600/60 flex items-center gap-2 px-1">
                  <BadgeCheck className="w-3.5 h-3.5" /> MR.07 - Class hour
                </label>
                <label
                  htmlFor="upload-file-config-audit"
                  className={`flex flex-col items-center justify-center p-3 border-2 border-dashed ${fileNameConfig ? "bg-amber-50/50 border-amber-400/40" : "bg-muted/20 border-border hover:bg-amber-50"} rounded-2xl cursor-pointer transition-colors relative shadow-inner group overflow-hidden`}
                >
                  <input
                    type="file"
                    id="upload-file-config-audit"
                    className="hidden"
                    accept=".xlsx,.xls,.csv,.gsheet"
                    onChange={onFileConfigChange}
                  />
                  {!fileNameConfig ? (
                    <div className="text-center py-4">
                      <PlusCircle className="w-10 h-10 text-muted-foreground/30 mb-3 mx-auto group-hover:scale-110 transition-transform" />
                      <span className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-widest block">
                        Tải File Sĩ Số
                      </span>
                    </div>
                  ) : (
                    <div className="w-full flex items-center gap-3 px-3 py-1">
                      <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center shrink-0 text-amber-600">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.625rem] font-bold text-amber-700 truncate leading-tight uppercase tracking-wider">
                          {fileNameConfig}
                        </p>
                        <p className="text-[8px] font-bold text-amber-600/40 uppercase mt-0.5">
                          Dữ liệu sĩ số OK
                        </p>
                      </div>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Common Date Range Display */}
            {(teacherDateRange || taDateRange) && (
              <div className="mt-4 p-3 bg-blue-50/50 border border-blue-200/50 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100/50 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-[0.65rem] font-bold text-blue-800 uppercase tracking-wider leading-none mb-1">
                      Thời gian chung (A & B)
                    </h4>
                    <p className="text-[12px] leading-[14px] font-black text-blue-600 uppercase">
                      {commonDateRange || "Đang tính toán..."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Info Card */}
          </motion.div>
        )}

        {/* Right Panel - Results (Expanded to fill remaining space) */}
        <div className="flex-1 bg-white flex flex-col min-h-0 min-w-0 mb-[6px] relative rounded-none overflow-hidden shadow-2xl border-0">
          <div className="absolute inset-0 bg-pattern-green opacity-[0.02] pointer-events-none" />
          <div className="px-6 md:px-8 py-2.5 flex items-center justify-between border-b border-emerald-50 bg-white shrink-0 relative z-50 rounded-t-3xl">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setIsConfigHidden(!isConfigHidden)}
                      className="w-10 h-10 flex items-center justify-center bg-white border border-border rounded-xl shadow-sm text-primary hover:bg-primary/5 transition-all shrink-0 hover:scale-105 active:scale-95"
                    >
                      {isConfigHidden ? (
                        <Settings className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5 rotate-90" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#d1435b]">
                      {isConfigHidden
                        ? "HIỆN BẢNG CẤU HÌNH"
                        : "THU GỌN BẢNG CẤU HÌNH"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="flex items-center bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 shadow-inner">
                <button
                  onClick={() => startTransition(() => setActiveTab("main"))}
                  className={`px-8 py-2.5 text-[0.65rem] font-black uppercase tracking-[0.15em] rounded-xl transition-all duration-300 ${
                    activeTab === "main"
                      ? "bg-white text-primary border border-slate-200 shadow-[0_4px_12px_rgba(209,67,91,0.1)] translate-y-0"
                      : "bg-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
                  }`}
                >
                  Báo Cáo Đối Soát
                </button>
                <button
                  onClick={() => startTransition(() => setActiveTab("detail"))}
                  className={`px-8 py-2.5 text-[0.65rem] font-black uppercase tracking-[0.15em] rounded-xl transition-all duration-300 ${
                    activeTab === "detail"
                      ? "bg-white text-primary border border-slate-200 shadow-[0_4px_12px_rgba(209,67,91,0.1)] translate-y-0"
                      : "bg-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
                  }`}
                >
                  Chi Tiết Lệch
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 h-[52.6px]">
              <AnimatePresence>
                {(searchTerm || selectedDetailRow) && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={clearAllFilters}
                    className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-[0.65rem] font-bold uppercase tracking-widest hover:bg-rose-100 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Trash2 className="w-3 h-3" />
                    Thoát Lọc
                  </motion.button>
                )}
              </AnimatePresence>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleRefreshData}
                    disabled={isRefreshing}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-[#d1435b] hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Làm mới dữ liệu đối soát</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="px-3 h-9 rounded-full flex items-center justify-center border border-border bg-white text-[#d1435b] transition-all hover:bg-muted shadow-sm">
                    <Wrench className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-72 p-2 rounded-2xl shadow-xl border-border bg-white"
                >
                  <div className="p-2 pb-3 mb-1 border-b border-primary/5">
                    <div className="relative">
                      <DebouncedSearchInput
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="TÌM KIẾM..."
                      />
                      <Search className="w-3.5 h-3.5 text-primary/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  <DropdownMenuLabel className="text-[0.6rem] font-black uppercase tracking-widest text-muted-foreground/40 px-3 py-2">
                    Công cụ & Thao tác
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={handleExportExcel}
                    disabled={
                      !auditResults.results || auditResults.results.length === 0
                    }
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-700">
                      Xuất báo cáo Excel
                    </span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setShowClearDialog(true)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-rose-500 focus:text-rose-600 focus:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-xs font-bold">
                      Xóa dữ liệu đối soát
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Buttons moved into Settings Dropdown as per request */}
            </div>
          </div>

          {auditResults?.isCalculating || isProcessing ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-white/50 relative z-10 w-full h-full p-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <div className="w-8 h-8 rounded-full bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-inner" />
              </div>
              <p className="mt-8 text-xs font-black uppercase tracking-[0.3em] text-primary/70 animate-pulse text-center">
                Hệ thống đang đối soát dữ liệu...
              </p>
            </div>
          ) : !fileNameA || !auditResults.results || auditResults.results.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-primary/10 relative z-10 w-full h-full p-6 bg-transparent">
              <p className="text-2xl font-bold text-muted-foreground/60 italic text-center max-w-sm">
                Chưa có báo cáo để hiển thị
              </p>
              <p className="text-[0.625rem] font-bold uppercase opacity-40 tracking-[0.3em] mt-4 text-center">
                VUI LÒNG TẢI FILE Timesheet (A) VÀ File Lớp Học (B)
              </p>
            </div>
          ) : activeTab === "main" ? (
            <DataTable
              key="main-table"
              columns={mainColumns}
              data={mainData}
              isEditable={false}
              showRowNumber={true}
              hideSearch={false}
              showFooter={true}
              onFilteredDataChange={handleFilteredDataChange}
              externalSearchTerm={deferredSearchTerm}
              onExternalSearchChange={setSearchTerm}
              onRowClick={handleMainRowClick}
              storageKey="audit_main_v2"
              headerClassName="bg-slate-50 border-b border-border py-3"
              className="border-t-0 flex-1"
              striped={false}
            />
          ) : (
            <DataTable
              key="detail-table"
              columns={detailColumns}
              data={filteredDetailData}
              isEditable={false}
              showRowNumber={false}
              hideSearch={true}
              showFooter={true}
              onFilteredDataChange={handleFilteredDataChange}
              externalSearchTerm=""
              onExternalSearchChange={setDetailManualFilter}
              storageKey="audit_detail_v2"
              headerClassName="bg-slate-50 border-b border-border py-3"
              className="border-t-0 flex-1 audit-detail-table"
              title={`DEBUG: results=${detailData.length}, filtered=${filteredDetailData.length}, filter="${detailManualFilter}"`}
              striped={false}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}
