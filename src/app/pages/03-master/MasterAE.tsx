import { PuppyLogo } from "../../components/shared/PuppyLogo";
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useMemo, useRef, useState, useCallback } from "react";
import { useAppData } from "../../lib/contexts/AppDataContext";
import {
  FileText,
  Landmark,
  PauseCircle,
  Trash2,
  Settings,
  Download,
  Search,
  Users,
  ChevronDown,
  RefreshCw,
  UploadCloud,
  CreditCard,
  PanelLeftClose,
  PanelLeftOpen,
  Wallet,
  CornerDownRight,
  Ban,
  XCircle,
  Plus,
} from "lucide-react";
import { DataTable } from "../../components/DataTable";
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
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import { parseMoneyToNumber, prepareDataForExport } from "../../lib/utils/data-utils";
import { Button } from "../../components/ui/button";
import { useMasterAELogic, MasterAETab } from "../../hooks/useMasterAELogic";
import { BulkPayment } from "../04-balance/BulkPayment";
import { HoldAETable } from "./components/HoldAETable";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const;

import { AEDataConfig } from "./AEDataConfig";
import { PivotSheet } from "../04-balance/PivotSheet";
import { Table2 } from "lucide-react";
import { useUiSettings, UI_SETTINGS_KEY } from "../../lib/ui-settings";
import * as localforage from "localforage";

export function MasterAE() {
  const { appData, updateAppData } = useAppData();
  const uiSettings = useUiSettings();

  const handleUpdateUiSettings = async (newPartial: any) => {
    const newSettings = { ...uiSettings, ...newPartial };
    await localforage.setItem(UI_SETTINGS_KEY, newSettings);
    window.dispatchEvent(new Event("ui-settings-changed"));
  };

  const [view, setView] = useState<"final" | "upload">("final");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLeftCard, setShowLeftCard] = useState(true);
  const [showClearBankExportDialog, setShowClearBankExportDialog] =
    useState(false);

  const handleRefreshData = () => {
    setIsRefreshing(true);
    updateAppData((prev) => ({ ...prev }));
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Đã làm mới dữ liệu", {
        description: "Dữ liệu MASTER AE đã được làm mới thành công.",
      });
    }, 600);
  };

  const {
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    showSearch,
    setShowSearch,
    processAEData,
    reMapAECodes,
    handleCellChange,
    handleDeleteRow,
    clearAllData,
  } = useMasterAELogic();

  const handleAddRow = (idx?: number) => {
    if (activeTab === "BulkPayment") return;

    // Auto increment primary key or just generate a unique row
    updateAppData((prev) => {
      const tabDataKey = activeTab as keyof typeof prev;
      const targetTab = prev[tabDataKey];
      if (!targetTab || !("data" in targetTab)) return prev;

      const data = [...targetTab.data];
      const headers = targetTab.headers;

      const newRow: Record<string, any> = {
        id: `custom_${Date.now()}`, // fallback id
        _isNew: true,
      };

      headers.forEach((h: string) => {
        newRow[h] = "";
      });

      let insertIdx = idx;
      if (insertIdx === undefined && tableRef.current) {
        const activeCell = tableRef.current.getActiveCell?.();
        const filteredAndSorted = tableRef.current.getFilteredAndSortedData?.();
        if (activeCell && filteredAndSorted) {
          const targetRow = filteredAndSorted[activeCell.r];
          if (targetRow) {
            const actualIdx = data.findIndex((r: any) => r.id === targetRow.id);
            if (actualIdx >= 0) {
              insertIdx = actualIdx;
            }
          }
        }
      }

      if (
        insertIdx !== undefined &&
        insertIdx >= 0 &&
        insertIdx < data.length
      ) {
        data.splice(insertIdx + 1, 0, newRow);
      } else {
        data.push(newRow);
      }

      return {
        ...prev,
        [tabDataKey]: {
          ...targetTab,
          data,
        },
      };
    });
    toast.success("Đã thêm dòng mới");
  };

  const [showClearDialog, setShowClearDialog] = useState(false);

  const tabs = useMemo(
    () =>
      [
        { id: "Sheet1_AE", label: "Sheet 1 AE", icon: FileText },
        { id: "Hold_AE", label: "Hold AE", icon: PauseCircle },
        { id: "BulkPayment", label: "Bulk Payment", icon: CreditCard },
        { id: "Pivot", label: "Pivot Table", icon: Table2 },
      ] as const,
    [],
  );

  const parseToMonthIndex = useCallback(
    (str: string): number => {
      if (!str) return 0;
      const clean = str.toUpperCase().trim();

      // Attempt to extract the "current year" from appData.globalMonth if needed
      const currentPeriodVal = appData.globalMonth || "03.2026";
      const yearParts = currentPeriodVal.split(".");
      const currentYear =
        yearParts.length === 2 ? parseInt(yearParts[1], 10) : 2026;
      const currentMonthNum =
        yearParts.length === 2 ? parseInt(yearParts[0], 10) : 3;

      const dateMatch = clean.match(/(\d{1,2})(?:[./-]|\s+|năm\s+)(\d{4})/i);
      if (dateMatch) {
        const m = parseInt(dateMatch[1], 10);
        const y = parseInt(dateMatch[2], 10);
        return y * 12 + m;
      }
      const tMatch = clean.match(/T[HÁNG]*\s*(\d{1,2})/i);
      if (tMatch) {
        const m = parseInt(tMatch[1], 10);
        let y = currentYear;
        if (m === 11 || m === 12) {
          y = currentYear === 2025 ? 2025 : (currentYear === 2026 ? 2025 : currentYear);
        } else if (m > currentMonthNum && (currentYear === 2025 || currentYear === 2026)) {
          y = currentYear - 1;
        }
        return y * 12 + m;
      }
      const numMatch = clean.match(/^(\d+)$/);
      if (numMatch) {
        const m = parseInt(numMatch[1], 10);
        let y = currentYear;
        if (m === 11 || m === 12) {
          y = currentYear === 2025 ? 2025 : (currentYear === 2026 ? 2025 : currentYear);
        } else if (m > currentMonthNum && (currentYear === 2025 || currentYear === 2026)) {
          y = currentYear - 1;
        }
        return y * 12 + m;
      }
      return 0;
    },
    [appData.globalMonth],
  );

  const currentData = useMemo(() => {
    const raw =
      activeTab === "BulkPayment"
        ? appData.BankExport
        : appData[activeTab as keyof typeof appData] || appData.Sheet1_AE;
    
    if (raw && Array.isArray(raw.data)) {
      const currentPeriodVal = appData.globalMonth || "03.2026";
      const currentLimit = parseToMonthIndex(currentPeriodVal);
      
      // Map data to ensure "Tháng báo cáo" is correctly populated, especially for older data
      const mappedData = raw.data.map((r: any) => {
        const mappedRow = { ...r };
        if (!mappedRow["Tháng báo cáo"]) {
           mappedRow["Tháng báo cáo"] = r["_fileMonth"] || r["Tháng"] || "";
        }
        return mappedRow;
      });

      // For Hold_AE, we show everything up to the selected month
      if (activeTab === "Hold_AE") {
        const filteredRows = mappedData.filter((r: any) => {
          const rowMonth = r["Tháng báo cáo"];
          const rowLimit = parseToMonthIndex(rowMonth);
          return rowLimit <= currentLimit;
        });
        return { ...raw, data: filteredRows };
      }
      
      // For other tabs (Sheet1_AE, BulkPayment, Pivot), we show ONLY the selected month
      const filteredRows = mappedData.filter((r: any) => {
        const rowMonthStr = r["Tháng báo cáo"];
        const rowLimit = parseToMonthIndex(rowMonthStr);
        return rowLimit === currentLimit;
      });
      return { ...raw, data: filteredRows };
    }
    
    return raw;
  }, [activeTab, appData, parseToMonthIndex]);

  const columns = useMemo(() => {
    let headers = currentData.headers && currentData.headers.length > 0 
      ? [...currentData.headers] 
      : activeTab === "Sheet1_AE" 
        ? ["STT", "Tháng báo cáo", "Phân quyền", "Mã AE", "STK AE", "Beneficiary Name", "Business", "L07", "Sale Incentive Amount", "Tiền Tỉnh", "Tổng tiền phạt", "Sales/Rehiring AE GP Amount (Final)", "Bank", "Note"]
        : activeTab === "Bank_North_AE"
          ? ["STT", "Tháng báo cáo", "Mã AE", "STK AE", "Beneficiary Name", "Business", "L07", "Sale Incentive Amount", "Bank", "Note"]
          : activeTab === "Hold_AE"
            ? ["Sheet Source", "STT", "Tháng báo cáo", "Phân quyền", "Mã AE", "STK AE", "Beneficiary Name", "Business", "L07", "Sales/Rehiring AE GP Amount (Final)", "TOTAL PAYMENT", "Bank", "Note", "Tháng phát sinh", "Nghiệp vụ", "Tình trạng thanh toán", "Trạng thái"]
            : activeTab === "BulkPayment"
              ? ["Payment Serial Number", "Tháng báo cáo", "Transaction Type Code", "Payment Type", "Customer Reference No", "Beneficiary Account No.", "Beneficiary Name", "Document ID", "Place of Issue", "ID Issuance Date", "Beneficiary Bank Swift Code / IFSC Code", "Transaction Currency", "Payment Amount", "Charge Type", "Payment details"]
              : [];
    
    // Ensure "Tháng báo cáo" exists for Sheet1_AE
    if (activeTab === "Sheet1_AE") {
      const hasThangBaoCao = headers.some(h => String(h).toUpperCase() === "THÁNG BÁO CÁO");
      if (!hasThangBaoCao) {
        headers.splice(0, 0, "Tháng báo cáo");
      } else {
        // Move to first column (after STT)
        headers = headers.filter(h => String(h).toUpperCase() !== "THÁNG BÁO CÁO");
        headers.splice(0, 0, "Tháng báo cáo");
      }
    }

    return headers
      .filter((h: string) => {
        const hUp = h.toUpperCase();
        if (hUp === "NO" || hUp === "NO." || hUp === "MÃ AE") {
          return false;
        }
        if (activeTab === "BulkPayment" && hUp === "THÁNG BÁO CÁO") {
          return false;
        }
        if (activeTab === "Sheet1_AE" && (hUp === "TÊN FILE" || hUp === "CENTER")) {
          return false;
        }
        return true;
      })
      .map((header: string) => {
        const h = header.toUpperCase();
        const isLabel = h === "LABEL";
        let type: "text" | "number" | "currency" | "label" = "text";
        if (
          h.includes("TOTAL") ||
          h.includes("CHARGE") ||
          h.includes("PAYMENT") ||
          h.includes("AE") ||
          h.includes("LỆCH") ||
          h.includes("TIỀN")
        ) {
          if (
            !(
              h.includes("ID") ||
              h.includes("ACCOUNT") ||
              h.includes("NUMBER") ||
              h.includes("CODE") ||
              h.includes("STK") ||
              h.includes("MÃ") ||
              h.includes("CENTER") ||
              h.includes("KHÁCH HÀNG")
            )
          ) {
            type = "currency";
          }
        }
        if (isLabel) type = "label";

        const isReadOnly =
          activeTab === "Hold_AE" &&
          [
            "Tháng báo cáo",
            "Nghiệp vụ",
            "Trạng thái",
            "Tháng phát sinh",
            "Tình trạng thanh toán",
          ].includes(header);

        let renderOption:
          | ((value: any, row: any) => React.ReactNode)
          | undefined;
        if (activeTab === "Hold_AE" && header === "Nghiệp vụ") {
          renderOption = (value: any, row: any) => {
            const nghiepVu = String(row["Nghiệp vụ"] || "").toUpperCase();
            const isHold = nghiepVu.includes("HOLD");
            const isCancel = nghiepVu.includes("CANCEL");

            const currentPeriodVal = appData.globalMonth || "03.2026";
            const currentPeriodParts = currentPeriodVal.split(".");
            const currentMonthNum = parseInt(currentPeriodParts[0], 10) || 3;
            const currentYearNum = parseInt(currentPeriodParts[1], 10) || 2026;
            const currentPeriod = `${String(currentMonthNum).padStart(2, "0")}.${currentYearNum}`;

            const rowReportingMonth = String(row["Tháng báo cáo"] || "").trim();
            const isPeriodMatch =
              rowReportingMonth === currentPeriod ||
              rowReportingMonth.endsWith(".2025") ||
              rowReportingMonth.endsWith("/2025");

            const buttonClass = (
              active: boolean,
              activeStyle: string,
              inactiveStyle: string,
            ) => {
              const base =
                "flex items-center justify-center w-8 h-8 rounded-full border transition-all text-sm shadow-sm";
              if (!isPeriodMatch) {
                return `${base} opacity-30 grayscale cursor-not-allowed pointer-events-none ${active ? activeStyle : inactiveStyle}`;
              }
              return `${base} cursor-pointer ${
                active
                  ? `${activeStyle} scale-110 font-bold border-slate-400 z-10 shadow-md`
                  : `${inactiveStyle} opacity-40 border-slate-200 hover:opacity-100 hover:bg-slate-100`
              }`;
            };

            const titleAdd = !isPeriodMatch
              ? `Chỉ sửa đổi được tại card tháng chọn: ${rowReportingMonth}`
              : "Add";

            const titleHold = !isPeriodMatch
              ? `Chỉ sửa đổi được tại card tháng chọn: ${rowReportingMonth}`
              : "Hold";

            const titleCancel = !isPeriodMatch
              ? `Chỉ sửa đổi được tại card tháng chọn: ${rowReportingMonth}`
              : "Cancel";

            return (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center gap-2.5 w-full min-w-[150px]"
              >
                <button
                  onClick={() => {
                    if (!isPeriodMatch) return;
                    if (row["Nghiệp vụ"] !== "Add") {
                      handleCellChange(
                        activeTab,
                        row,
                        "Nghiệp vụ",
                        "Add",
                      );
                    }
                  }}
                  className={buttonClass(
                    !isHold && !isCancel,
                    "bg-emerald-50 border-emerald-400 text-emerald-700",
                    "bg-slate-50 border-transparent text-slate-400",
                  )}
                  title={titleAdd}
                  disabled={!isPeriodMatch}
                >
                  <span>☑️</span>
                </button>
                <button
                  onClick={() => {
                    if (!isPeriodMatch) return;
                    if (row["Nghiệp vụ"] !== "Hold") {
                      handleCellChange(
                        activeTab,
                        row,
                        "Nghiệp vụ",
                        "Hold",
                      );
                    }
                  }}
                  className={buttonClass(
                    isHold,
                    "bg-amber-50 border-amber-400 text-amber-700",
                    "bg-slate-50 border-transparent text-slate-400",
                  )}
                  title={titleHold}
                  disabled={!isPeriodMatch}
                >
                  <span>✖️</span>
                </button>
                <button
                  onClick={() => {
                    if (!isPeriodMatch) return;
                    if (row["Nghiệp vụ"] !== "Cancel") {
                      handleCellChange(
                        activeTab,
                        row,
                        "Nghiệp vụ",
                        "Cancel",
                      );
                    }
                  }}
                  className={buttonClass(
                    isCancel,
                    "bg-slate-100 border-slate-400 text-slate-700",
                    "bg-slate-50 border-transparent text-slate-400",
                  )}
                  title={titleCancel}
                  disabled={!isPeriodMatch}
                >
                  <span>©️</span>
                </button>
              </div>
            );
          };
        }

        return {
          key: header,
          label: header,
          type,
          sortable: header === "Nghiệp vụ" ? false : true,
          filterable: true,
          readOnly: isReadOnly,
          render: renderOption,
        };
      });
  }, [currentData.headers, activeTab, handleCellChange, appData.globalMonth]);

  const handleExportExcel = () => {
    if (currentData.data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(prepareDataForExport(currentData.data));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab);
    XLSX.writeFile(wb, `Master_AE_${activeTab}.xlsx`);
  };

  const tableRef = useRef<any>(null);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
      <AnimatePresence initial={false}>
        {view === "final" && (
          <motion.div
            key="final"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-0 flex flex-col min-h-0 bg-transparent px-[20px] pt-[20px] pb-[20px] gap-8 items-center overflow-hidden"
          >
            {/* Decorative Background Elements */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] -z-10" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px] -z-10" />

            {/* Main Content Card */}
            <div className="bg-white soft-card force-light flex-1 flex flex-col min-h-0 relative z-10 w-full overflow-hidden pl-0" style={{ paddingLeft: "0px" }}>
              <div className="absolute inset-0 striped-pattern opacity-[0.05] pointer-events-none rounded-[2.5rem] overflow-hidden" />

              {/* Integrated Header & Controls */}
              <div className="px-[32px] py-[32px] h-[92.67px] my-0 flex flex-row items-center justify-between gap-6 border-b border-border bg-muted/10 shrink-0 relative">
                <div className="absolute inset-0 pattern-dots opacity-[0.05] pointer-events-none" />
                <div className="flex items-center gap-5 relative z-10 shrink-0">
                  <PuppyLogo size={40} className="shrink-0 hidden md:flex" />
                  <div className="min-w-0 text-[11px] leading-[15px] h-[63px]">
                    <div className="flex items-center gap-3 mb-[8px]">
                      <h2 className="text-[29px] leading-[17px] font-bold font-serif text-foreground tracking-tight flex items-end gap-1" style={{ fontSize: "29px", fontWeight: "bold", lineHeight: "17px" }}>
                        Final from{" "}
                        <span
                          className="not-italic font-bold font-script text-3xl md:text-5xl lowercase inline-block transform -translate-y-0.5 h-[39px]"
                          style={{ color: "#803d53" }}
                        >
                          ae
                        </span>
                      </h2>
                    </div>
                    <p className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-[3px] whitespace-nowrap">
                      MANAGEMENT & RECONCILIATION •{" "}
                      {currentData.data.length || 0} RECORDS
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 relative z-10 shrink-0 ml-auto justify-end">
                  <button
                    onClick={() => setView("upload")}
                    className="flex items-center gap-2 px-6 h-11 border border-primary/20 rounded-full bg-primary/5 text-primary font-bold text-[0.6875rem] uppercase tracking-widest hover:bg-primary/10 transition-colors shadow-sm"
                  >
                    <UploadCloud className="w-4 h-4" />
                    Upload Master AE
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex items-center gap-4 px-6 h-11 border border-border rounded-full bg-white text-muted-foreground hover:text-primary transition-all group shadow-sm"
                        title="Chuyển bảng dữ liệu"
                      >
                        {(() => {
                          const active = tabs.find((t) => t.id === activeTab);
                          const Icon = active?.icon || FileText;
                          return (
                            <>
                              <Icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              <span className="text-[0.7rem] font-bold uppercase tracking-widest">
                                {active?.label}
                              </span>
                            </>
                          );
                        })()}
                        <ChevronDown className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-64 border border-primary/10 shadow-2xl p-2 bg-white rounded-2xl"
                    >
                      <DropdownMenuLabel className="font-bold uppercase text-[0.625rem] tracking-widest text-primary/60 px-3 py-2">
                        Chọn bảng dữ liệu
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-primary/10 mx-1.5" />
                      {tabs.map((tab) => (
                        <DropdownMenuItem
                          key={tab.id}
                          onSelect={() => setActiveTab(tab.id as MasterAETab)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                            activeTab === tab.id
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-primary/5"
                          }`}
                        >
                          <tab.icon className="w-4 h-4" />
                          <span className="text-[0.7rem] font-bold uppercase tracking-wider">
                            {tab.label}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="p-3 rounded-full border border-border bg-white text-muted-foreground hover:text-primary transition-all group shadow-sm"
                        title="Cài đặt & Thao tác"
                      >
                        <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-72 border border-primary/10 shadow-2xl p-2 bg-white rounded-2xl"
                    >
                      <div className="p-2 pb-3 mb-1 border-b border-primary/5">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="TÌM KIẾM..."
                            value={searchTerm}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="w-full bg-primary/5 border border-primary/10 rounded-xl pl-9 pr-3 py-2.5 text-xs uppercase font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-inner text-foreground"
                            autoFocus
                          />
                          <Search className="w-4 h-4 text-primary/40 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>
                      <DropdownMenuLabel className="text-[0.625rem] font-bold uppercase tracking-widest text-primary/60 px-3 py-2">
                        Thao tác nâng cao
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-primary/5 mx-1" />
                      <div className="p-1">
                        {activeTab === "Pivot" && (
                          <>
                            <DropdownMenuItem
                              onSelect={() =>
                                window.dispatchEvent(
                                  new Event("trigger-pivot-add-row"),
                                )
                              }
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-emerald-50 text-emerald-700 transition-colors"
                            >
                              <Plus className="w-4 h-4 text-emerald-600" />
                              <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-emerald-700 font-semibold">
                                Thêm Dòng mới
                              </span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() =>
                                window.dispatchEvent(
                                  new Event("trigger-pivot-insert-col"),
                                )
                              }
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-sky-50 text-sky-700 transition-colors"
                            >
                              <Plus className="w-4 h-4 text-sky-600" />
                              <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-sky-700 font-semibold">
                                Chèn Cột mới
                              </span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() =>
                                window.dispatchEvent(
                                  new Event("trigger-pivot-refresh"),
                                )
                              }
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors"
                            >
                              <RefreshCw className="w-4 h-4 text-slate-600" />
                              <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-700">
                                Làm mới dữ liệu
                              </span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() =>
                                window.dispatchEvent(
                                  new Event("trigger-pivot-export"),
                                )
                              }
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors"
                            >
                              <Download className="w-4 h-4 text-primary/60" />
                              <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-600">
                                Xuất bảng đang xem
                              </span>
                            </DropdownMenuItem>
                          </>
                        )}

                        {activeTab === "BulkPayment" && (
                          <>
                            {appData.BankExport.data.length > 0 && (
                              <DropdownMenuItem
                                onSelect={() =>
                                  setShowClearBankExportDialog(true)
                                }
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-rose-50 text-rose-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-rose-500" />
                                <span className="text-[0.6875rem] font-bold uppercase tracking-wider">
                                  Xóa bảng kê
                                </span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-primary/5 mx-1" />
                          </>
                        )}

                        {activeTab === "Sheet1_AE" && (
                          <DropdownMenuItem
                            onSelect={reMapAECodes}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors"
                          >
                            <RefreshCw className="w-4 h-4 text-primary" />
                            <span className="text-[0.6875rem] font-bold uppercase tracking-wider">
                              Re-Map AE Codes
                            </span>
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem
                          onSelect={handleExportExcel}
                          disabled={currentData.data.length === 0}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors"
                        >
                          <Download className="w-4 h-4 text-primary" />
                          <span className="text-[0.6875rem] font-bold uppercase tracking-wider">
                            Xuất Excel
                          </span>
                        </DropdownMenuItem>

                        {activeTab !== "BulkPayment" && (
                          <DropdownMenuItem
                            onSelect={() => handleAddRow()}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-emerald-50 text-emerald-600 transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                            <span className="text-[0.6875rem] font-bold uppercase tracking-wider">
                              Thêm dòng mới
                            </span>
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator className="bg-primary/5 mx-1" />
                        <DropdownMenuItem
                          onSelect={() => setShowClearDialog(true)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-rose-50 text-rose-500 transition-colors group"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="text-[0.6875rem] font-bold uppercase tracking-wider">
                            Xóa toàn bộ dữ liệu
                          </span>
                        </DropdownMenuItem>
                      </div>

                      {activeTab === "Pivot" && (
                        <>
                          <DropdownMenuSeparator className="bg-primary/5 mx-1" />
                          <div className="p-2 flex flex-col gap-3 pb-3">
                            <h4 className="text-[0.625rem] font-bold uppercase tracking-widest text-primary/60 px-1">
                              Cài đặt Pivot
                            </h4>

                            <div
                              className="flex items-center justify-between px-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <label className="text-[0.7rem] font-medium text-muted-foreground mr-2 whitespace-nowrap">
                                Hiện Tổng phụ
                              </label>
                              <input
                                type="checkbox"
                                checked={uiSettings.showPivotSubtotals ?? true}
                                onChange={(e) =>
                                  handleUpdateUiSettings({
                                    showPivotSubtotals: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 cursor-pointer"
                              />
                            </div>

                            <div
                              className="flex items-center justify-between px-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <label className="text-[0.7rem] font-medium text-muted-foreground mr-2 whitespace-nowrap">
                                Hiện Tổng cộng
                              </label>
                              <input
                                type="checkbox"
                                checked={uiSettings.showGrandTotals ?? true}
                                onChange={(e) =>
                                  handleUpdateUiSettings({
                                    showGrandTotals: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 cursor-pointer"
                              />
                            </div>

                            <div
                              className="flex items-center justify-between px-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <label className="text-[0.7rem] font-medium text-muted-foreground mr-2 whitespace-nowrap">
                                Hiện cột MKT
                              </label>
                              <input
                                type="checkbox"
                                checked={uiSettings.showMktCols ?? true}
                                onChange={(e) =>
                                  handleUpdateUiSettings({
                                    showMktCols: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 cursor-pointer"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 flex flex-col min-h-0 relative z-10 w-full overflow-hidden">
                {activeTab === "BulkPayment" ? (
                  <BulkPayment
                    showLeftCard={showLeftCard}
                    setShowLeftCard={setShowLeftCard}
                  />
                ) : activeTab === "Pivot" ? (
                  <PivotSheet />
                ) : activeTab === "Hold_AE" ? (
                  <HoldAETable
                    ref={tableRef}
                    searchTerm={searchTerm}
                    onSearchTermChange={setSearchTerm}
                    onAddRow={handleAddRow}
                  />
                ) : currentData.data.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-primary/10 p-12">
                    <div className="w-20 h-20 bg-[#FAF5EE] rounded-full flex items-center justify-center mb-6 border border-[#3D3935]/5">
                      <PuppyLogo size={44} className="opacity-20 grayscale" />
                    </div>
                    <p className="font-bold uppercase text-xl tracking-tight text-primary/40">
                      Chưa có dữ liệu{" "}
                      {tabs.find((t) => t.id === activeTab)?.label}
                    </p>
                    <p className="text-[0.625rem] font-bold uppercase opacity-40 tracking-widest mt-2 text-center max-w-md">
                      Vui lòng vào phần Cấu hình để chọn file AE Final, hệ thống
                      sẽ tự động cập nhật dữ liệu.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-0 py-0 relative">
                    <DataTable
                      ref={tableRef}
                      columns={columns}
                      data={currentData.data}
                      onCellChange={(row, col, val) =>
                        handleCellChange(activeTab, row, col, val)
                      }
                      onDeleteRow={(row, idx) =>
                        handleDeleteRow(activeTab, row)
                      }
                      onAddRow={handleAddRow}
                      isEditable={true}
                      externalSearchTerm={searchTerm}
                      onExternalSearchChange={setSearchTerm}
                      storageKey={`master_ae_${activeTab}`}
                      hideSearch={true}
                      showFooter={true}
                      showRowNumber={true}
                      headerClassName="bg-white border-b border-[#E2E8F0]"
                    />
                  </div>
                )}
              </div>
            </div>

            <ConfirmDialog
              isOpen={showClearDialog}
              onClose={() => setShowClearDialog(false)}
              onConfirm={() => {
                clearAllData();
                setShowClearDialog(false);
              }}
              title="Xóa toàn bộ dữ liệu?"
              description="Hành động này sẽ xóa sạch dữ liệu trong tất cả các bảng của Master AE. Bạn có chắc chắn muốn tiếp tục?"
              confirmText="XÓA TẤT CẢ"
              variant="destructive"
            />

            <ConfirmDialog
              isOpen={showClearBankExportDialog}
              onClose={() => setShowClearBankExportDialog(false)}
              onConfirm={() => {
                updateAppData((prev) => ({
                  ...prev,
                  BankExport: { ...prev.BankExport, data: [] },
                }));
                setShowClearBankExportDialog(false);
                toast.success("Đã xóa dữ liệu bảng kê");
              }}
              title="Xóa dữ liệu bảng kê?"
              description="Hành động này sẽ xóa sạch dữ liệu trong bảng kê Bulk Payment. Bạn có chắc chắn muốn tiếp tục?"
              confirmText="Xác nhận xoá"
              variant="destructive"
            />
          </motion.div>
        )}
        {view === "upload" && (
          <motion.div
            key="upload"
            initial={{ y: "-100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-0 flex flex-col"
          >
            <AEDataConfig onSwitchToFinal={() => setView("final")} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
