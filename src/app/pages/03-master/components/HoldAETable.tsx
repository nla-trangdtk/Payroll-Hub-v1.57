/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useCallback, forwardRef } from "react";
import { useAppData } from "../../../lib/contexts/AppDataContext";
import { DataTable } from "../../../components/DataTable";
import { Trash2 } from "lucide-react";
import { parseMoneyToNumber } from "../../../lib/utils/data-utils";
import { toast } from "sonner";

interface HoldAETableProps {
  searchTerm: string;
  onSearchTermChange?: (term: string) => void;
  onAddRow?: (idx?: number) => void;
}

export const HoldAETable = forwardRef<any, HoldAETableProps>(
  ({ searchTerm, onSearchTermChange, onAddRow }, ref) => {
    const { appData, updateAppData } = useAppData();

    // 1. Month range parser and validator
    const parseToMonthIndex = useCallback(
      (str: string): number => {
        if (!str) return 0;
        const clean = str.toUpperCase().trim();

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
          if (m > currentMonthNum) {
            y = currentYear - 1;
          }
          return y * 12 + m;
        }
        const numMatch = clean.match(/^(\d+)$/);
        if (numMatch) {
          const m = parseInt(numMatch[1], 10);
          let y = currentYear;
          if (m > currentMonthNum) {
            y = currentYear - 1;
          }
          return y * 12 + m;
        }
        return 0;
      },
      [appData.globalMonth],
    );

    // 2. Filter data up to the current active period
    const filteredData = useMemo(() => {
      const raw = appData.Hold_AE || { headers: [], data: [] };
      if (!raw.data || !Array.isArray(raw.data))
        return { headers: [], data: [] };

      const currentPeriodVal = appData.globalMonth || "03.2026";
      const currentLimit = parseToMonthIndex(currentPeriodVal);

      const filteredRows = raw.data.filter((r: any) => {
        const rowMonth = r["Tháng báo cáo"] || r["_fileMonth"] || "";
        const rowLimit = parseToMonthIndex(rowMonth);
        return rowLimit === currentLimit;
      });

      return { ...raw, data: filteredRows };
    }, [appData.Hold_AE, appData.globalMonth, parseToMonthIndex]);

    // 3. Special cell change handler for Hold_AE
    const handleCellChange = useCallback(
      (row: Record<string, any>, columnKey: string, value: any) => {
        if (["Tháng báo cáo"].includes(columnKey)) {
          return;
        }

        updateAppData((prev: any) => {
          const targetTab = prev.Hold_AE;
          if (!targetTab || !targetTab.data) return prev;

          const data = [...targetTab.data];
          const rowIndex = data.findIndex(
            (r, idx) =>
              (row._originalIndex !== undefined &&
                idx === row._originalIndex) ||
              (r.id && row.id && r.id === row.id) ||
              r === row ||
              (r["ID Number"] === row["ID Number"] &&
                r["TOTAL PAYMENT"] === row["TOTAL PAYMENT"] &&
                ((r["No."] !== undefined && r["No."] === row["No."]) ||
                  (r["No"] !== undefined && r["No"] === row["No"]) ||
                  (r["STT"] !== undefined && r["STT"] === row["STT"]))),
          );

          if (rowIndex === -1) return prev;

          const updatedRow = { ...data[rowIndex], [columnKey]: value };

          // Automatically offset the TOTAL PAYMENT sign based on Trạng thái or Nghiệp vụ
          if (columnKey === "Trạng thái" || columnKey === "Nghiệp vụ") {
            const valUpper = String(value || "").toUpperCase();
            const currentTotalPayment = parseMoneyToNumber(
              updatedRow["TOTAL PAYMENT"] || 0,
            );
            if (valUpper.includes("HOLD")) {
              updatedRow["TOTAL PAYMENT"] = -Math.abs(currentTotalPayment);
              updatedRow["Nghiệp vụ"] = "Hold";
            } else if (valUpper.includes("CANCEL")) {
              updatedRow["TOTAL PAYMENT"] = -Math.abs(currentTotalPayment);
              updatedRow["Nghiệp vụ"] = "Cancel";
            } else if (valUpper.includes("ADD")) {
              updatedRow["TOTAL PAYMENT"] = Math.abs(currentTotalPayment);
              updatedRow["Nghiệp vụ"] = "Add";
            }
          }

          data[rowIndex] = updatedRow;

          return {
            ...prev,
            Hold_AE: { ...targetTab, data },
          };
        });
      },
      [updateAppData],
    );

    // 4. Row deletion handler for Hold_AE
    const handleDeleteRow = useCallback(
      (rowToDelete: Record<string, any>) => {
        updateAppData((prev: any) => {
          const targetTab = prev.Hold_AE;
          if (!targetTab || !targetTab.data) return prev;

          const data = [...targetTab.data];
          const rowIndex = data.findIndex(
            (r, idx) =>
              (rowToDelete._originalIndex !== undefined &&
                idx === rowToDelete._originalIndex) ||
              (r.id && rowToDelete.id && r.id === rowToDelete.id) ||
              r === rowToDelete ||
              (r["ID Number"] === rowToDelete["ID Number"] &&
                r["TOTAL PAYMENT"] === rowToDelete["TOTAL PAYMENT"]),
          );

          if (rowIndex === -1) return prev;

          data.splice(rowIndex, 1);
          return {
            ...prev,
            Hold_AE: { ...targetTab, data },
          };
        });
        toast.success("Đã xóa dòng");
      },
      [updateAppData],
    );

    const handleDeleteSelection = useCallback(
      (range: { startR: number; endR: number; startC?: number; endC?: number }) => {
        const currentRef = ref as any;
        let rowsToDelete: any[] = [];
        
        if (currentRef?.current?.getFilteredAndSortedData) {
          const allRenderedData = currentRef.current.getFilteredAndSortedData();
          const minR = Math.min(range.startR, range.endR);
          const maxR = Math.max(range.startR, range.endR);
          rowsToDelete = allRenderedData.slice(minR, maxR + 1);
        } else {
          // Fallback if ref is not available
          const minR = Math.min(range.startR, range.endR);
          const maxR = Math.max(range.startR, range.endR);
          rowsToDelete = filteredData.data.slice(minR, maxR + 1);
        }

        if (rowsToDelete.length === 0) return;

        updateAppData((prev: any) => {
          const targetTab = prev.Hold_AE;
          if (!targetTab || !targetTab.data) return prev;

          const data = [...targetTab.data].filter((r) => {
            return !rowsToDelete.some(
              (rowToDelete) =>
                (rowToDelete._originalIndex !== undefined &&
                  targetTab.data.indexOf(r) === rowToDelete._originalIndex) ||
                (r.id && rowToDelete.id && r.id === rowToDelete.id) ||
                r === rowToDelete ||
                (r["ID Number"] === rowToDelete["ID Number"] &&
                  r["TOTAL PAYMENT"] === rowToDelete["TOTAL PAYMENT"]),
            );
          });

          return {
            ...prev,
            Hold_AE: { ...targetTab, data },
          };
        });
        
        if (currentRef?.current?.clearSelection) {
          currentRef.current.clearSelection();
        }
        
        toast.success(`Đã xóa ${rowsToDelete.length} dòng`);
      },
      [filteredData.data, updateAppData, ref],
    );

    // 5. Dynamic Columns memoization
    const columns = useMemo(() => {
      let headers = filteredData.headers;
      if (!headers || headers.length === 0) {
        // Fallback headers to prevent empty rendering
        headers = [
          "Sheet Source", "STT", "Tháng báo cáo", "Phân quyền", "Mã AE", 
          "STK AE", "Beneficiary Name", "Business", "L07", "Sales/Rehiring AE GP Amount (Final)",
          "TOTAL PAYMENT", "Bank", "Note", "Tháng phát sinh", "Nghiệp vụ", "Tình trạng thanh toán", "Trạng thái"
        ];
      }

      return headers
        .filter((h: string) => h.toUpperCase() !== "NO")
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

          const isReadOnly = [
            "Tháng báo cáo",
            "Nghiệp vụ",
            "Trạng thái",
            "Tháng phát sinh",
            "Tình trạng thanh toán",
          ].includes(header);

          let renderOption:
            | ((value: any, row: any) => React.ReactNode)
            | undefined;

          if (header === "Nghiệp vụ") {
            renderOption = (value: any, row: any) => {
              const nghiepVu = String(row["Nghiệp vụ"] || "").toUpperCase();
              const isHold = nghiepVu.includes("HOLD");
              const isCancel = nghiepVu.includes("CANCEL");

              const currentPeriodVal = appData.globalMonth || "03.2026";
              const currentPeriodParts = currentPeriodVal.split(".");
              const currentMonthNum = parseInt(currentPeriodParts[0], 10) || 3;
              const currentYearNum =
                parseInt(currentPeriodParts[1], 10) || 2026;
              const currentPeriod = `${String(currentMonthNum).padStart(2, "0")}.${currentYearNum}`;

              const rowReportingMonth = String(
                row["Tháng báo cáo"] || "",
              ).trim();
              const isPeriodMatch = rowReportingMonth === currentPeriod;

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
                        handleCellChange(row, "Nghiệp vụ", "Add");
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
                        handleCellChange(row, "Nghiệp vụ", "Hold");
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
                        handleCellChange(row, "Nghiệp vụ", "Cancel");
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
            sortable: header !== "Nghiệp vụ",
            filterable: true,
            readOnly: isReadOnly,
            render: renderOption,
          };
        });
    }, [filteredData.headers, handleCellChange, appData.globalMonth]);

    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-0 py-0 relative">
        <DataTable
          ref={ref}
          columns={columns}
          data={filteredData.data}
          onCellChange={handleCellChange}
          onDeleteRow={handleDeleteRow}
          onDeleteSelection={handleDeleteSelection}
          onAddRow={onAddRow}
          isEditable={true}
          selectable={false}
          bulkActions={[
            {
              label: "Xóa các dòng đã chọn",
              icon: <Trash2 className="w-3 h-3" />,
              variant: "destructive",
              onClick: (selectedRows) => {
                updateAppData((prev: any) => {
                  const targetTab = prev.Hold_AE;
                  if (!targetTab || !targetTab.data) return prev;

                  const data = [...targetTab.data].filter((r) => {
                    return !selectedRows.some(
                      (rowToDelete) =>
                        (rowToDelete._originalIndex !== undefined &&
                          targetTab.data.indexOf(r) === rowToDelete._originalIndex) ||
                        (r.id && rowToDelete.id && r.id === rowToDelete.id) ||
                        r === rowToDelete ||
                        (r["ID Number"] === rowToDelete["ID Number"] &&
                          r["TOTAL PAYMENT"] === rowToDelete["TOTAL PAYMENT"]),
                    );
                  });

                  return {
                    ...prev,
                    Hold_AE: { ...targetTab, data },
                  };
                });
                const currentRef = ref as any;
                if (currentRef?.current?.clearSelection) {
                  currentRef.current.clearSelection();
                } else if (typeof currentRef === "function") {
                   // If it's a callback ref, we might not be able to call it here easily if it's not exposed
                }
                toast.success(`Đã xóa ${selectedRows.length} dòng`);
              },
            },
          ]}
          externalSearchTerm={searchTerm}
          onExternalSearchChange={onSearchTermChange}
          storageKey="master_ae_Hold_AE"
          hideSearch={true}
          showFooter={true}
          totalCalculationOverride={(row: any, colKey: string) => {
            if (colKey === "TOTAL PAYMENT" && row._isPastMonthHoldOrCancel) return 0;
            return null;
          }}
          headerClassName="bg-white border-b border-[#E2E8F0]"
        />
      </div>
    );
  },
);

HoldAETable.displayName = "HoldAETable";
