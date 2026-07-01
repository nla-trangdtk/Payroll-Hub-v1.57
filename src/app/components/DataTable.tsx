/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, @typescript-eslint/no-unused-vars, react-hooks/incompatible-library */
import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  useDeferredValue,
  useLayoutEffect,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Download,
  CheckSquare,
  Square,
  Copy,
  ChevronLeft,
  ChevronRight,
  Table2,
  Wrench,
  Eraser,
  Type,
  Trash2,
  RefreshCw,
  X,
  Calendar,
  Play,
  Minus,
  FileText,
  Eye,
  EyeOff,
  Settings2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { toast } from "sonner";
import { parseMoneyToNumber, formatNumber } from "../lib/utils/data-utils";
import { formatVNRobust } from "../lib/utils/format-utils";
import { ColumnFormatDialog } from "./ColumnFormatDialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { SaveStatusCard } from "./shared/SaveStatusCard";

export interface Column {
  key: string;
  label: string;
  group?: string;
  type?: "text" | "number" | "date" | "currency" | "money" | "label";
  sortable?: boolean;
  filterable?: boolean;
  hidden?: boolean;
  width?: number | string;
  headerClassName?: string;
  headerSpanClassName?: string;
  cellClassName?: string;
  footerClassName?: string;
  render?: (value: any, row: any) => React.ReactNode;
  align?: "left" | "center" | "right";
  readOnly?: boolean;
}

const GITHUB_LABELS: Record<string, { color: string; textColor: string }> = {
  bug: { color: "#d73a4a", textColor: "#ffffff" },
  documentation: { color: "#0075ca", textColor: "#ffffff" },
  duplicate: { color: "#cfd3d7", textColor: "#1f2328" },
  enhancement: { color: "#a2eeef", textColor: "#1f2328" },
  "good first issue": { color: "#7057ff", textColor: "#ffffff" },
  "help wanted": { color: "#008672", textColor: "#ffffff" },
  invalid: { color: "#e4e669", textColor: "#1f2328" },
  question: { color: "#d876e3", textColor: "#ffffff" },
  wontfix: { color: "#ffffff", textColor: "#1f2328" },
};

export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: (selectedRows: any[]) => void;
  variant?: "default" | "destructive";
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  title?: string;
  onExport?: () => void;
  showFilters?: boolean;
  selectable?: boolean;
  showRowNumber?: boolean;
  onSelectionChange?: (selectedRows: any[]) => void;
  onCellChange?: (row: any, colKey: string, value: any) => void;
  onDeleteRow?: (row: any, rowIndex: number) => void;
  onDeleteRows?: (rows: any[]) => void;
  onAddRow?: (idx?: number) => void;
  onDeleteSelection?: (range: {
    startR: number;
    endR: number;
    startC: number;
    endC: number;
  }) => void;
  bulkActions?: BulkAction[];
  isEditable?: boolean;
  externalSearchTerm?: string;
  onExternalSearchChange?: (value: string) => void;
  onRowClick?: (row: any) => void;
  storageKey?: string;
  hideSearch?: boolean;
  hideToolbar?: boolean;
  showFooter?: boolean;
  headerClassName?: string;
  footerClassName?: string;
  totalCalculationOverride?: (row: any, colKey: string) => number | null;
  className?: string;
  striped?: boolean;
  resizableColumns?: boolean;
  rowHeight?: number;
  style?: React.CSSProperties;
  onFilteredDataChange?: (data: any[]) => void;
}

const ColumnFilter = ({
  column,
  allData,
  filterState,
  onFilterChange,
  onSort,
  searchTerm,
}: any) => {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const uniqueValues = useMemo(() => {
    if (!isOpen) return [];

    const vals = new Set<any>();

    // Dependent Filtering: Calculate options based on other filters
    let currentData = allData;

    // 1. Apply Global Search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      currentData = currentData.filter((row: any) =>
        Object.values(row).some(
          (val) =>
            val != null && String(val).toLowerCase().includes(lowerSearch),
        ),
      );
    }

    // 2. Apply ALL OTHER column filters
    Object.entries(filterState).forEach(([key, allowedValues]) => {
      if (key !== column.key && allowedValues instanceof Set) {
        currentData = currentData.filter((row: any) =>
          allowedValues.has(row[key]),
        );
      }
    });

    // 3. Extract unique values from contextually filtered data
    currentData.forEach((row: any) => {
      const val = row[column.key];
      if (val != null && val !== "") {
        vals.add(val);
      } else {
        vals.add("undefined");
      }
    });

    // Also include currently selected values even if they aren't in the contextually filtered data
    // so the user can see what they've selected and potentially unselect them.
    const currentSelection = filterState[column.key];
    if (currentSelection instanceof Set) {
      currentSelection.forEach((val) => vals.add(val));
    }

    return Array.from(vals).sort((a: any, b: any) => {
      if (a === "undefined") return -1;
      if (b === "undefined") return 1;
      return String(a).localeCompare(String(b), undefined, { numeric: true });
    });
  }, [allData, column.key, filterState, searchTerm, isOpen]);

  const filteredValues = useMemo(() => {
    if (!search) return uniqueValues;
    return uniqueValues.filter((v) =>
      String(v).toLowerCase().includes(search.toLowerCase()),
    );
  }, [uniqueValues, search]);

  const currentFilters = filterState[column.key];
  const isAllSelected = !currentFilters;

  const handleToggleValue = (val: any, checked: boolean) => {
    let next: Set<any>;
    if (isAllSelected) {
      next = new Set(uniqueValues);
      next.delete(val);
    } else {
      next = new Set(currentFilters);
      if (checked) next.add(val);
      else next.delete(val);
    }

    if (next.size === uniqueValues.length) {
      onFilterChange(column.key, undefined);
    } else {
      onFilterChange(column.key, next);
    }
  };

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      onFilterChange(column.key, undefined);
    } else {
      onFilterChange(column.key, new Set());
    }
  };

  return (
    <Popover onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center justify-center w-3.5 h-3.5 rounded transition-all shrink-0 bg-transparent ${
            currentFilters && currentFilters.size !== uniqueValues.length
              ? "text-accent hover:text-accent/80 scale-110 font-bold"
              : "text-slate-400 hover:text-accent"
          }`}
          onClick={(e) => {
            e.stopPropagation();
          }}
          title={`Bộ lọc ${column.label}`}
        >
          <Filter className="w-2.5 h-2.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-0 rounded-xl bg-white shadow-2xl border-2 border-primary/20 filter-popover-content"
        align="start"
        onClick={(e) => e.stopPropagation()}
        onPointerDownOutside={(e) => {
          const originalEvent = e.detail?.originalEvent;
          if (originalEvent) {
            const path = originalEvent.composedPath ? originalEvent.composedPath() : [];
            const clickedInside = path.some((el: any) => 
              el && el.classList && el.classList.contains("filter-popover-content")
            );
            if (clickedInside) {
              e.preventDefault();
            }
          }
        }}
      >
        <div className="flex flex-col p-2 border-b">
          <button
            className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted rounded text-left font-bold text-slate-700"
            onClick={() => onSort(column.key, "asc")}
          >
            <ChevronUp className="w-3.5 h-3.5" /> Sắp xếp A-Z
          </button>
          <button
            className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted rounded text-left font-bold text-slate-700"
            onClick={() => onSort(column.key, "desc")}
          >
            <ChevronDown className="w-3.5 h-3.5" /> Sắp xếp Z-A
          </button>
        </div>
        <div className="p-2">
          <Input
            id={`filter-search-${column.key}`}
            name={`filter-search-${column.key}`}
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs mb-2 outline-none border-primary/20"
          />
          <div className="flex flex-col gap-1 max-h-48 overflow-auto custom-scrollbar">
            <div className="flex items-center gap-2 px-2 hover:bg-muted/50 rounded py-1 cursor-pointer">
              <Checkbox
                id={`all-${column.key}`}
                name={`all-${column.key}`}
                checked={isAllSelected}
                onCheckedChange={(c) => handleToggleAll(!!c)}
              />
              <label
                htmlFor={`all-${column.key}`}
                className="text-xs font-bold leading-none cursor-pointer flex-1"
              >
                (Chọn tất cả)
              </label>
            </div>
            {filteredValues.map((val, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-2 hover:bg-muted/50 rounded py-1 cursor-pointer"
              >
                <Checkbox
                  id={`val-${column.key}-${i}`}
                  name={`val-${column.key}-${i}`}
                  checked={isAllSelected || currentFilters.has(val)}
                  onCheckedChange={(c) => handleToggleValue(val, !!c)}
                />
                <label
                  htmlFor={`val-${column.key}-${i}`}
                  className="text-xs truncate leading-none cursor-pointer flex-1"
                  title={String(val)}
                >
                  {String(val) === "undefined" ? "(Trống)" : String(val)}
                </label>
              </div>
            ))}
            {filteredValues.length === 0 && (
              <div className="text-xs text-center text-muted-foreground p-2">
                Không tìm thấy
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const getBorderClass = (headerClass?: string) => {
  if (!headerClass) return "border-[#E2E8F0]";
  const parts = headerClass.split(/\s+/);
  const borderClass = parts.find(p => p.startsWith("border-") && !["border-b", "border-r", "border-t", "border-l", "border-none", "border-separate", "border-collapse", "border-0", "border-1", "border-2", "border-4", "border-8"].includes(p));
  return borderClass || "border-[#E2E8F0]";
};

const DataRow = React.memo(
  ({
    row,
    rIdx,
    selectable,
    showRowNumber,
    selectedRowIds,
    activeCell,
    selectionRange,
    editingCell,
    editValue,
    visibleColumns,
    columnWidths,
    isEditable,
    onCellChange,
    toggleRow,
    startEditing,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleContextMenu,
    setEditValue,
    commitEdit,
    formatValue,
    getAlignment,
    inputRef,
    rowHeight,
    setRowHeight,
    striped,
    onRowClick,
    borderClass,
  }: any) => {
    const rowId = row.id || rIdx;
    const isSelected = selectedRowIds.has(rowId);

    // Row resize handle
    const [isResizing, setIsResizing] = useState(false);

    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing) return;
        setRowHeight((h: number) => Math.max(30, h + e.movementY));
      };
      const handleMouseUp = () => setIsResizing(false);
      if (isResizing) {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
      }
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }, [isResizing, setRowHeight]);
    const isRowActive = activeCell?.r === rIdx;
    const isRowInRange =
      selectionRange &&
      rIdx >= Math.min(selectionRange.startR, selectionRange.endR) &&
      rIdx <= Math.max(selectionRange.startR, selectionRange.endR);

    return (
      <tr
        onClick={() => onRowClick?.(row)}
        className={`group ${selectable || onRowClick ? "cursor-pointer" : "cursor-default"} ${row._dimmed ? "opacity-35 hover:opacity-100 transition-opacity" : ""} ${row._isTotalRow ? "bg-indigo-50/80 font-black border-t-2 border-indigo-200" : isSelected ? "bg-primary/[0.05]" : isRowActive ? "bg-primary/[0.03]" : isRowInRange ? "bg-primary/[0.015]" : striped ? (rIdx % 2 === 0 ? "bg-[var(--stripe-color1,white)]" : "bg-[var(--stripe-color2,white)]") : "bg-white"} relative`}
        style={{ height: rowHeight ? `${rowHeight}px` : undefined }}
      >
        {isSelected && (
          <td className="p-0 border-0" colSpan={999}>
            <div
              className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize z-50 hover:bg-accent/40 transition-colors"
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsResizing(true);
              }}
            />
          </td>
        )}

        {showRowNumber && (
          <td
            className={`border-b border-r ${borderClass || "border-[#E2E8F0]"} select-none`}
            style={{
              padding: "var(--table-padding, 1rem 1.5rem)",
              textAlign: "center",
              width: "50px",
              minWidth: "50px",
            }}
          >
            <div className="font-bold text-slate-400 text-xs">{rIdx + 1}</div>
          </td>
        )}

        {selectable && (
          <td
            onClick={() => toggleRow(rowId)}
            className={`text-accent whitespace-nowrap border-b border-r ${borderClass || "border-[#E2E8F0]"} ${isSelected ? "bg-accent/10" : ""}`}
            style={{
              padding: "var(--table-padding, 1rem 1.5rem)",
              boxShadow: isRowActive ? "inset 4px 0 0 theme(colors.accent.DEFAULT/0.4)" : undefined,
            }}
          >
            <div className="flex items-center justify-center">
              {isSelected ? (
                <div className="w-5 h-5 bg-accent rounded-md flex items-center justify-center border border-accent shadow-sm transition-transform active:scale-95">
                  <CheckSquare className="w-3.5 h-3.5 text-white" />
                </div>
              ) : (
                <div className="w-5 h-5 border-2 border-accent/20 bg-white rounded-md hover:border-accent/50 transition-all" />
              )}
            </div>
          </td>
        )}
        {visibleColumns.map((col: any, cIdx: number) => {
          const isActive = activeCell?.r === rIdx && activeCell?.c === cIdx;
          const isEditing = editingCell?.r === rIdx && editingCell?.c === cIdx;
          const isColActive = activeCell?.c === cIdx;
          const isInRange =
            selectionRange &&
            rIdx >= Math.min(selectionRange.startR, selectionRange.endR) &&
            rIdx <= Math.max(selectionRange.startR, selectionRange.endR) &&
            cIdx >= Math.min(selectionRange.startC, selectionRange.endC) &&
            cIdx <= Math.max(selectionRange.startC, selectionRange.endC);

          const colWidth = columnWidths[col.key] || col.width;
          const widthStyle = colWidth
            ? typeof colWidth === "number"
              ? `${colWidth}px`
              : colWidth
            : undefined;

          const customSpan = row._rowSpans?.[col.key];
          if (customSpan === 0) return null;

          return (
            <td
              key={col.key}
              rowSpan={customSpan || 1}
              data-r={rIdx}
              data-c={cIdx}
              onMouseDown={(e) => handleCellMouseDown(e, rIdx, cIdx)}
              onMouseEnter={(e) => handleCellMouseEnter(e, rIdx, cIdx)}
              onDoubleClick={() => startEditing(rIdx, cIdx)}
              onContextMenu={(e) => handleContextMenu(e, rIdx, cIdx)}
              className={`${col.cellClassName?.includes("whitespace-pre-wrap") ? "" : "whitespace-nowrap"} select-none ${getAlignment(col)} relative 
              ${isInRange ? "bg-accent/20 z-10" : ""} 
              ${isActive ? "ring-2 ring-inset ring-accent/40 z-20 bg-white shadow-xl" : ""} 
              ${isColActive && !isActive && !isInRange ? "bg-accent/10" : ""}
              text-[1em] leading-[1.7] font-normal text-[#4A3E3E] border-b border-r ${borderClass || "border-[#E2E8F0]"} ${col.cellClassName || ""}
            `}
              style={{
                padding: "var(--table-padding, 0.65rem 1rem)",
                fontFamily: "var(--font-table, var(--font-main))",
                fontSize: "var(--font-size)",
                width: widthStyle,
                minWidth: widthStyle,
                boxShadow:
                  !selectable && isRowActive && cIdx === 0
                    ? "inset 4px 0 0 theme(colors.accent.DEFAULT/0.4)"
                    : undefined,
              }}
            >
              {/* Range Borders */}
              {isInRange && selectionRange && (
                <>
                  {rIdx ===
                    Math.min(selectionRange.startR, selectionRange.endR) && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/30 z-20" />
                  )}
                  {rIdx ===
                    Math.max(selectionRange.startR, selectionRange.endR) && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary/30 z-20" />
                  )}
                  {cIdx ===
                    Math.min(selectionRange.startC, selectionRange.endC) && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary/30 z-20" />
                  )}
                  {cIdx ===
                    Math.max(selectionRange.startC, selectionRange.endC) && (
                    <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-primary/30 z-20" />
                  )}
                </>
              )}

              {isEditing ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 z-50 p-0 bg-white shadow-2xl ring-2 ring-primary/60 rounded-md overflow-hidden flex items-center"
                >
                  {col.type === "label" ? (
                    <select
                      id={`edit-${col.key}-${row.id}`}
                      name={`edit-${col.key}-${row.id}`}
                      aria-label="Chọn nhãn"
                      ref={inputRef as any}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      className="w-full h-full px-4 py-2 bg-transparent border-none focus:ring-0 text-[0.7rem] font-bold text-foreground uppercase appearance-none cursor-pointer"
                      autoFocus
                    >
                      <option value="">-- NO LABEL --</option>
                      {Object.keys(GITHUB_LABELS).map((label) => (
                        <option key={label} value={label}>
                          {label.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={`edit-${col.key}-${row.id}`}
                      name={`edit-${col.key}-${row.id}`}
                      aria-label="Nhập giá trị"
                      ref={inputRef as any}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      className="w-full h-full px-4 py-2 bg-transparent border-none focus:ring-0 text-[0.8rem] font-medium text-foreground tracking-tight"
                      autoFocus
                    />
                  )}
                </motion.div>
              ) : (
                <div
                  className={`flex items-center group/cell ${getAlignment(col) === "text-right" ? "justify-end" : getAlignment(col) === "text-center" ? "justify-center" : "justify-start"}`}
                >
                  <span className={`relative z-0 ${col.cellClassName?.includes("whitespace-pre-wrap") ? "" : "truncate"}`}>
                    {col.render ? col.render(row[col.key], row) : formatValue(row[col.key], col.type, col.key)}
                  </span>
                  {isEditable && !isActive && !isInRange && (
                    <Type className="w-3 h-3 text-primary/0 shrink-0 ml-2" />
                  )}
                </div>
              )}
            </td>
          );
        })}
      </tr>
    );
  },
  (prev, next) => {
    if (prev.borderClass !== next.borderClass) return false;
    if (prev.row !== next.row) return false;
    if (prev.rIdx !== next.rIdx) return false;
    if (prev.selectedRowIds !== next.selectedRowIds) return false;
    if (prev.editingCell !== next.editingCell) return false;
    if (prev.editValue !== next.editValue) return false;
    if (prev.columnWidths !== next.columnWidths) return false;
    if (prev.visibleColumns !== next.visibleColumns) return false;
    if (prev.rowHeight !== next.rowHeight) return false;

    const wasRowActive = prev.activeCell?.r === prev.rIdx;
    const isRowActive = next.activeCell?.r === next.rIdx;
    if (wasRowActive || isRowActive) {
      if (prev.activeCell?.c !== next.activeCell?.c || prev.activeCell?.r !== next.activeCell?.r) return false;
    }
    
    if (prev.activeCell?.c !== next.activeCell?.c) return false;

    const wasInRange = prev.selectionRange && prev.rIdx >= Math.min(prev.selectionRange.startR, prev.selectionRange.endR) && prev.rIdx <= Math.max(prev.selectionRange.startR, prev.selectionRange.endR);
    const isInRange = next.selectionRange && next.rIdx >= Math.min(next.selectionRange.startR, next.selectionRange.endR) && next.rIdx <= Math.max(next.selectionRange.startR, next.selectionRange.endR);
    
    if (wasInRange || isInRange) {
      if (
        prev.selectionRange?.startR !== next.selectionRange?.startR ||
        prev.selectionRange?.endR !== next.selectionRange?.endR ||
        prev.selectionRange?.startC !== next.selectionRange?.startC ||
        prev.selectionRange?.endC !== next.selectionRange?.endC
      ) {
        return false;
      }
    }

    return true;
  },
);

DataRow.displayName = "DataRow";

export interface DataTableRef {
  columns: Column[];
  hiddenColumns: Set<string>;
  toggleColumn: (key: string) => void;
  resetTableConfig: () => void;
  clearAllFilters: () => void;
  getCurrentPageData: () => any[];
}

export const DataTable = React.forwardRef<DataTableRef, DataTableProps>(
  (
    {
      columns,
      data,
      title,
      onExport,
      selectable = false,
      showRowNumber = false,
      onSelectionChange,
      onCellChange,
      onDeleteRow,
      onDeleteRows,
      onAddRow,
      onDeleteSelection,
      bulkActions,
      isEditable = true,
      externalSearchTerm,
      onExternalSearchChange,
      onRowClick,
      storageKey,
      hideSearch = false,
      hideToolbar = false,
      showFooter = false,
      headerClassName,
      footerClassName,
      totalCalculationOverride,
      className,
      striped = false,
      resizableColumns = true,
      style: customStyle,
      onFilteredDataChange,
    },
    ref,
  ) => {
    const [sortConfig, setSortConfig] = useState<{
      key: string;
      direction: "asc" | "desc";
    } | null>(null);
    const [columnFilters, setColumnFilters] = useState<
      Record<string, Set<any> | undefined>
    >({});
    const [internalSearchTerm, setInternalSearchTerm] = useState("");

    const searchTerm =
      externalSearchTerm !== undefined
        ? externalSearchTerm
        : internalSearchTerm;

    const borderClass = getBorderClass(headerClassName);
    const getBorderColorHex = (headerClass?: string) => {
      if (!headerClass) return "#E2E8F0";
      if (headerClass.includes("border-accent")) return "rgba(var(--accent), 0.2)";
      if (headerClass.includes("border-indigo")) return "rgba(99, 102, 241, 0.2)";
      if (headerClass.includes("border-pink")) return "rgba(244, 63, 94, 0.2)";
      return "#E2E8F0";
    };
    const borderColorHex = getBorderColorHex(headerClassName);
    const setSearchTerm = onExternalSearchChange || setInternalSearchTerm;
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

    const [inputColumnFilters, setInputColumnFilters] = useState<Record<string, string>>({});
    const [debouncedColumnFilters, setDebouncedColumnFilters] = useState<Record<string, string>>({});

    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedColumnFilters(inputColumnFilters);
      }, 350);
      return () => clearTimeout(handler);
    }, [inputColumnFilters]);

    const [resizingCol, setResizingCol] = useState<{
      key: string;
      startX: number;
      startWidth: number;
      currentX: number;
    } | null>(null);

    const [resizingLineLeft, setResizingLineLeft] = useState<number | null>(
      null,
    );

    useLayoutEffect(() => {
      let raf: number;
      if (resizingCol && scrollContainerRef.current) {
        raf = requestAnimationFrame(() => {
          const el = scrollContainerRef.current;
          if (el) {
            const rect = el.getBoundingClientRect();
            setResizingLineLeft(
              resizingCol.currentX - rect.left + el.scrollLeft,
            );
          }
        });
      } else {
        setResizingLineLeft(null);
      }
      return () => cancelAnimationFrame(raf);
    }, [resizingCol?.currentX, resizingCol]);

    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedSearchTerm(searchTerm);
      }, 300);
      return () => clearTimeout(timer);
    }, [searchTerm]);

    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
    const [rowDensity, setRowDensity] = useState<
      "compact" | "normal" | "relaxed"
    >("normal");
    const [columnFormats, setColumnFormats] = useState<
      Record<string, { alignment?: "left" | "center" | "right" }>
    >({});
    const [formatModal, setFormatModal] = useState<{
      isOpen: boolean;
      colKey: string;
    } | null>(null);
    const [selectedRowIds, setSelectedRowIds] = useState<Set<string | number>>(
      new Set(),
    );
    const [contextMenu, setContextMenu] = useState<{
      x: number;
      y: number;
      r: number;
      c: number;
    } | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    // Grid selection & editing
    const [activeCell, setActiveCell] = useState<{
      r: number;
      c: number;
    } | null>(null);
    const [selectionRange, setSelectionRange] = useState<{
      startR: number;
      endR: number;
      startC: number;
      endC: number;
    } | null>(null);
    const [editingCell, setEditingCell] = useState<{
      r: number;
      c: number;
    } | null>(null);
    const [editValue, setEditValue] = useState("");
    const [isSelecting, setIsSelecting] = useState(false);
    
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
      {},
    );
    const [columnTypes, setColumnTypes] = useState<Record<string, string>>({});

    // Use standard effect or simple initial state setup instead to avoid rendering cycle
    // Note: since this is just parsing localStorage it can be done once initially instead
    // of in an effect. We will just use an effect and accept that it will trigger a re-render.
    // However, to fix the lint error, we need to disable the exhaustive-deps or just let it happen in useEffect rather than useLayoutEffect
    useEffect(() => {
      if (!storageKey) return;
      // ... rest is same
      const initStates = {
        hiddenColumns: new Set<string>(),
        columnWidths: {} as Record<string, number>,
        columnTypes: {} as Record<string, string>,
        columnFormats: {} as Record<
          string,
          { alignment?: "left" | "center" | "right" }
        >,
        sortConfig: null as { key: string; direction: "asc" | "desc" } | null,
        rowDensity: "normal" as "compact" | "normal" | "relaxed",
        itemsPerPage: 50 as number | typeof Infinity,
      };

      let hasUpdates = false;

      // Hidden columns
      try {
        const savedHidden = localStorage.getItem(`dt_hidden_${storageKey}`);
        if (savedHidden) {
          initStates.hiddenColumns = new Set(JSON.parse(savedHidden));
          hasUpdates = true;
        }
      } catch (e) {
        console.error(e);
      }

      // Row density
      try {
        const savedDensity = localStorage.getItem(`dt_density_${storageKey}`);
        if (savedDensity) {
          initStates.rowDensity = savedDensity as
            | "compact"
            | "normal"
            | "relaxed";
          hasUpdates = true;
        }
      } catch (e) {
        console.error(e);
      }

      // Column widths
      try {
        const savedWidths = localStorage.getItem(`dt_widths_${storageKey}`);
        if (savedWidths) {
          initStates.columnWidths = JSON.parse(savedWidths);
          hasUpdates = true;
        }
      } catch (e) {
        console.error(e);
      }

      // Column types
      try {
        const savedTypes = localStorage.getItem(`dt_types_${storageKey}`);
        if (savedTypes) {
          initStates.columnTypes = JSON.parse(savedTypes);
          hasUpdates = true;
        }
      } catch (e) {
        console.error(e);
      }

      // Column formats
      try {
        const savedFormats = localStorage.getItem(`dt_formats_${storageKey}`);
        if (savedFormats) {
          initStates.columnFormats = JSON.parse(savedFormats);
          hasUpdates = true;
        }
      } catch (e) {
        console.error(e);
      }

      // Sort config
      try {
        const savedSort = localStorage.getItem(`dt_sort_${storageKey}`);
        if (savedSort) {
          initStates.sortConfig = JSON.parse(savedSort);
          hasUpdates = true;
        }
      } catch (e) {
        console.error(e);
      }

      // Items per page
      try {
        const savedItemsPerPage = localStorage.getItem(`dt_ipp_${storageKey}`);
        if (savedItemsPerPage) {
          const parsed = JSON.parse(savedItemsPerPage);
          if (parsed === "all") {
            initStates.itemsPerPage = Infinity;
          } else if (
            typeof parsed === "number" &&
            !isNaN(parsed) &&
            parsed > 0
          ) {
            initStates.itemsPerPage = parsed;
          }
          hasUpdates = true;
        }
      } catch (e) {
        console.error(e);
      }

      if (hasUpdates) {
        setHiddenColumns(initStates.hiddenColumns);
        setColumnWidths(initStates.columnWidths);
        setColumnTypes(initStates.columnTypes);
        setColumnFormats(initStates.columnFormats);
        setSortConfig(initStates.sortConfig);
        setItemsPerPage(initStates.itemsPerPage);
        setRowDensity(initStates.rowDensity);
      }
    }, [storageKey]);

    // Save hidden columns
    useEffect(() => {
      if (storageKey)
        localStorage.setItem(
          `dt_hidden_${storageKey}`,
          JSON.stringify(Array.from(hiddenColumns)),
        );
    }, [hiddenColumns, storageKey]);

    // Save row density
    useEffect(() => {
      if (storageKey)
        localStorage.setItem(`dt_density_${storageKey}`, rowDensity);
    }, [rowDensity, storageKey]);

    // Save column formats
    useEffect(() => {
      if (storageKey)
        localStorage.setItem(
          `dt_formats_${storageKey}`,
          JSON.stringify(columnFormats),
        );
    }, [columnFormats, storageKey]);

    // Save sort config
    useEffect(() => {
      if (storageKey)
        localStorage.setItem(
          `dt_sort_${storageKey}`,
          JSON.stringify(sortConfig),
        );
    }, [sortConfig, storageKey]);

    // Save items per page
    useEffect(() => {
      if (storageKey)
        localStorage.setItem(
          `dt_ipp_${storageKey}`,
          itemsPerPage === Infinity ? '"all"' : JSON.stringify(itemsPerPage),
        );
    }, [itemsPerPage, storageKey]);

    // Save column widths
    const saveColumnWidths = (widths: Record<string, number>) => {
      if (storageKey)
        localStorage.setItem(`dt_widths_${storageKey}`, JSON.stringify(widths));
    };

    const visibleColumns = useMemo(
      () => columns.filter((col) => !hiddenColumns.has(col.key)),
      [columns, hiddenColumns],
    );

    const filteredAndSortedData = useMemo(() => {
      let result = [...data];

      // Apply search
      if (debouncedSearchTerm) {
        const lowerSearch = debouncedSearchTerm.toLowerCase();
        result = result.filter((row) =>
          Object.values(row).some(
            (val) =>
              val != null && String(val).toLowerCase().includes(lowerSearch),
          ),
        );
      }

      // Apply filters
      Object.entries(columnFilters).forEach(([key, allowedValues]) => {
        if (allowedValues) {
          result = result.filter((row) => allowedValues.has(row[key]));
        }
      });

      // Apply column text filters
      Object.entries(debouncedColumnFilters).forEach(([key, val]) => {
        if (val) {
          const lowerVal = val.toLowerCase();
          result = result.filter((row) => {
            const cellVal = row[key];
            return cellVal != null && String(cellVal).toLowerCase().includes(lowerVal);
          });
        }
      });

      // Apply sorting
      if (sortConfig) {
        const col = columns.find((c) => c.key === sortConfig.key);
        const type = columnTypes[sortConfig.key] || col?.type || "text";

        result.sort((a, b) => {
          const aVal = a[sortConfig.key];
          const bVal = b[sortConfig.key];

          const isANull = aVal === null || aVal === undefined || aVal === "";
          const isBNull = bVal === null || bVal === undefined || bVal === "";

          if (isANull && isBNull) return 0;
          if (isANull) return 1; // Always push empty values to the bottom
          if (isBNull) return -1;

          if (type === "number" || type === "currency" || type === "money") {
            const aNum = parseMoneyToNumber(aVal) || 0;
            const bNum = parseMoneyToNumber(bVal) || 0;
            return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
          }

          if (type === "date" && aVal instanceof Date && bVal instanceof Date) {
            return sortConfig.direction === "asc"
              ? aVal.getTime() - bVal.getTime()
              : bVal.getTime() - aVal.getTime();
          }

          const aStr = String(aVal).toLowerCase();
          const bStr = String(bVal).toLowerCase();

          return sortConfig.direction === "asc"
            ? aStr.localeCompare(bStr, undefined, { numeric: true })
            : bStr.localeCompare(aStr, undefined, { numeric: true });
        });
      }

      return result;
    }, [data, sortConfig, columnFilters, debouncedSearchTerm, debouncedColumnFilters]);

    // Keyboard shortcuts are handled in the main listener below

    useEffect(() => {
      if (onFilteredDataChange) {
        onFilteredDataChange(filteredAndSortedData);
      }
    }, [filteredAndSortedData, onFilteredDataChange]);

    const totalPages =
      itemsPerPage === Infinity
        ? 1
        : Math.ceil(filteredAndSortedData.length / itemsPerPage);
    const paginatedData = useMemo(() => {
      if (itemsPerPage === Infinity) return filteredAndSortedData;
      const start = (currentPage - 1) * itemsPerPage;
      return filteredAndSortedData.slice(start, start + itemsPerPage);
    }, [filteredAndSortedData, currentPage, itemsPerPage]);

    // ── Custom Virtual Scrolling (no library needed) ──────────────────────────
    const densityHeights = useMemo(() => ({
      compact: 32,
      normal: 52,
      relaxed: 64,
    }), []);

    const [rowHeight, setRowHeight] = useState(52); // px

    useEffect(() => {
      const targetHeight = densityHeights[rowDensity] || 52;
      setRowHeight(targetHeight);
    }, [rowDensity, densityHeights]);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [vsContainerWidth, setVsContainerWidth] = useState(1000);

    // Track container width via ResizeObserver
    useEffect(() => {
      const el = scrollContainerRef.current;
      if (!el) return;
      if (typeof ResizeObserver === "undefined") return;

      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setVsContainerWidth((prev) => Math.abs(prev - entry.contentRect.width) > 2 ? Math.round(entry.contentRect.width) : prev);
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    // Reset scroll to top when data changes (search/sort)
    useEffect(() => {
      scrollContainerRef.current?.scrollTo({ top: 0 });
      
    }, [debouncedSearchTerm, sortConfig]);

    const rowVirtualizer = useVirtualizer({
      count: paginatedData.length,
      getScrollElement: () => scrollContainerRef.current,
      estimateSize: useCallback(() => rowHeight, [rowHeight]),
      overscan: 30,
      getItemKey: useCallback((index: number) => paginatedData[index]?.id || index, [paginatedData]),
    });
    
    const virtualItems = rowVirtualizer.getVirtualItems();
    const vsTopPad = virtualItems.length > 0 ? virtualItems[0].start : 0;
    const vsBottomPad = virtualItems.length > 0 ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end : 0;
    const vsStartIndex = virtualItems.length > 0 ? virtualItems[0].index : 0;
    const vsEndIndex = virtualItems.length > 0 ? virtualItems[virtualItems.length - 1].index : 0;

    // Defer heavy table re-render — user interactions stay responsive during data updates
    const deferredPaginatedData = useDeferredValue(paginatedData);
    const isStale = deferredPaginatedData !== paginatedData;

    // Notify filtered data change
    useEffect(() => {
      if (onFilteredDataChange) {
        onFilteredDataChange(filteredAndSortedData);
      }
    }, [filteredAndSortedData, onFilteredDataChange]);

    // Notify selection change
    useEffect(() => {
      if (onSelectionChange) {
        const selectedRows = filteredAndSortedData.filter((row, idx) =>
          selectedRowIds.has(row.id || idx),
        );
        onSelectionChange(selectedRows);
      }
    }, [selectedRowIds, filteredAndSortedData, onSelectionChange]);

    // Scroll active cell into view
    useEffect(() => {
      if (activeCell && scrollContainerRef.current) {
        // Find if row is in paginatedData
        const startIdx = itemsPerPage === Infinity ? 0 : (currentPage - 1) * itemsPerPage;
        const endIdx = itemsPerPage === Infinity ? filteredAndSortedData.length - 1 : startIdx + itemsPerPage - 1;
        
        if (activeCell.r >= startIdx && activeCell.r <= endIdx) {
          const paginatedIndex = activeCell.r - startIdx;
          rowVirtualizer.scrollToIndex(paginatedIndex, { align: "auto" });
        }
        
        // Use requestAnimationFrame to let the DOM update if we just scrolled vertically,
        // then find the td element and ensure it is visible horizontally.
        requestAnimationFrame(() => {
          const container = scrollContainerRef.current;
          if (!container) return;
          const td = container.querySelector(`td[data-r="${activeCell.r}"][data-c="${activeCell.c}"]`) as HTMLElement;
          if (td) {
            const leftOffset = td.offsetLeft;
            const cellWidth = td.offsetWidth;
            
            const viewLeft = container.scrollLeft;
            const viewRight = viewLeft + container.clientWidth;
            
            // Adjust left offset if row numbers and select columns are sticky
            // Normally they aren't fully sticky in all themes, but let's just make sure the cell is in view
            if (leftOffset < viewLeft) {
               container.scrollTo({ left: leftOffset, behavior: 'auto' });
            } else if (leftOffset + cellWidth > viewRight) {
               container.scrollTo({ left: leftOffset + cellWidth - container.clientWidth, behavior: 'auto' });
            }
          }
        });
      }
    }, [activeCell, rowVirtualizer, currentPage, itemsPerPage, filteredAndSortedData.length]);

    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (!resizingCol) return;

        const { key, startX, startWidth } = resizingCol;
        const delta = e.clientX - startX;
        const newWidth = Math.max(50, startWidth + delta);

        setResizingCol((prev) =>
          prev ? { ...prev, currentX: e.clientX } : null,
        );
        setColumnWidths((prev) => ({
          ...prev,
          [key]: newWidth,
        }));
      };

      const handleMouseUp = () => {
        if (resizingCol) {
          const { key } = resizingCol;
          setColumnWidths((prev) => {
            saveColumnWidths(prev);
            return prev;
          });
          setResizingCol(null);
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
        }
      };

      if (resizingCol) {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
      }
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }, [resizingCol]);

    const handleResizeStart = (e: React.MouseEvent, colKey: string) => {
      e.preventDefault();
      e.stopPropagation();
      const th = (e.target as HTMLElement).closest("th");
      if (!th) return;

      setResizingCol({
        key: colKey,
        startX: e.clientX,
        startWidth: th.offsetWidth,
        currentX: e.clientX,
      });

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    };

    const handleResizeDoubleClick = (colKey: string) => {
      let isAllSelected = selectedRowIds.size > 0 && selectedRowIds.size === filteredAndSortedData.length;
      if (!isAllSelected && selectionRange) {
        const { startR, endR, startC, endC } = selectionRange;
        const minR = Math.min(startR, endR);
        const maxR = Math.max(startR, endR);
        const minC = Math.min(startC, endC);
        const maxC = Math.max(startC, endC);

        if (minR === 0 && maxR === filteredAndSortedData.length - 1 && minC === 0 && maxC === visibleColumns.length - 1) {
          isAllSelected = true;
        }
      }

      if (isAllSelected) {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) return;

        const nextWidths = { ...columnWidths };

        columns.forEach((col) => {
          if (hiddenColumns.has(col.key)) return;

          context.font = "700 0.8125rem Inter, sans-serif"; // Matches table cell font
          let maxWidth = context.measureText(col.label || "").width + 80;

          context.font = "500 0.8125rem Inter, sans-serif";
          filteredAndSortedData.forEach((row) => {
            const v = String(formatValue(row[col.key], col.type, col.key));
            const w = context.measureText(v).width + 60;
            if (w > maxWidth) maxWidth = w;
          });

          const finalWidth = Math.min(600, Math.max(80, maxWidth));
          nextWidths[col.key] = finalWidth;
        });

        setColumnWidths(nextWidths);
        saveColumnWidths(nextWidths);
        toast.success("Đã tự động căn chỉnh kích thước cho tất cả cột!");
        return;
      }

      const values = filteredAndSortedData.map((row) =>
        String(formatValue(row[colKey], "text", colKey)),
      );

      // Measure text tool
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return;
      context.font = "700 0.8125rem Inter, sans-serif"; // Matches table cell font

      // Measure header
      const col = columns.find((c) => c.key === colKey);
      let maxWidth = context.measureText(col?.label || "").width + 80; // Padding + Filter icon

      context.font = "500 0.8125rem Inter, sans-serif"; // Matches row cell font
      values.forEach((v) => {
        const w = context.measureText(v).width + 60; // Cell padding
        if (w > maxWidth) maxWidth = w;
      });

      const finalWidth = Math.min(600, Math.max(80, maxWidth));
      setColumnWidths((prev) => {
        const next = { ...prev, [colKey]: finalWidth };
        saveColumnWidths(next);
        return next;
      });
      toast.success(`Đã tự động căn chỉnh cột ${col?.label}`);
    };

    const tableRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    useEffect(() => {
      const handleGlobalMouseUp = () => {
        setIsSelecting(false);
      };
      window.addEventListener("mouseup", handleGlobalMouseUp);
      return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
    }, []);

    const handleSort = (key: string, direction?: "asc" | "desc") => {
      setSortConfig((prev) => {
        if (direction) return { key, direction };
        if (prev?.key === key) {
          return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
        }
        return { key, direction: "asc" };
      });
    };

    const handleFilterChange = (key: string, values: Set<any> | undefined) => {
      setColumnFilters((prev) => ({ ...prev, [key]: values }));
    };

    const clearAllFilters = () => {
      setColumnFilters({});
      setInternalSearchTerm("");
      if (onExternalSearchChange) onExternalSearchChange("");
      toast.success("Đã xóa tất cả bộ lọc");
    };

    const resetTableConfig = () => {
      if (storageKey) {
        localStorage.removeItem(`dt_hidden_${storageKey}`);
        localStorage.removeItem(`dt_widths_${storageKey}`);
        localStorage.removeItem(`dt_sort_${storageKey}`);
        localStorage.removeItem(`dt_ipp_${storageKey}`);
        setHiddenColumns(new Set());
        setColumnWidths({});
        setSortConfig(null);
        setItemsPerPage(50);
        setCurrentPage(1);
        toast.success("Đã khôi phục cấu hình bảng mặc định");
      }
    };

    const toggleColumn = (key: string) => {
      setHiddenColumns((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    };

    const updateAlignment = (
      colKey: string,
      alignment: "left" | "center" | "right",
    ) => {
      setColumnFormats((prev) => ({
        ...prev,
        [colKey]: { ...prev[colKey], alignment },
      }));
    };

    const updateColumnType = (key: string, type: string) => {
      setColumnTypes((prev) => {
        const next = { ...prev, [key]: type };
        if (storageKey)
          localStorage.setItem(`dt_types_${storageKey}`, JSON.stringify(next));
        return next;
      });
      toast.success(`Đã đổi định dạng cột sang ${type}`);
    };

    React.useImperativeHandle(ref, () => ({
      columns,
      hiddenColumns,
      toggleColumn,
      resetTableConfig,
      clearAllFilters,
      getCurrentPageData: () => paginatedData,
      getActiveCell: () => activeCell,
      getFilteredAndSortedData: () => filteredAndSortedData,
    }));

    const formatValue = (value: any, type?: string, colKey?: string) => {
      const effectiveType = (colKey && columnTypes[colKey]) || type || "text";

      // ── Guard: Date objects cannot be rendered as React children ────────────
      if (value instanceof Date) {
        if (isNaN(value.getTime())) return ""; // Invalid Date
        if (effectiveType === "date") {
          return value.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        }
        return value.toLocaleDateString("vi-VN");
      }

      if (effectiveType === "currency" || effectiveType === "money") {
        const num = parseMoneyToNumber(value);
        return formatVNRobust(num, 0);
      }
      if (effectiveType === "number") {
        const num = parseMoneyToNumber(value);
        return formatVNRobust(num, 2);
      }
      if (effectiveType === "date") {
        return formatNumber(value, "date");
      }
      if (effectiveType === "label") {
        const label = String(value || "").toLowerCase();
        const config = GITHUB_LABELS[label];
        if (config) {
          return (
            <span
              className="px-2 py-0.5 rounded-full text-[0.55rem] font-black uppercase tracking-wider shadow-sm border border-black/5"
              style={{ backgroundColor: config.color, color: config.textColor }}
            >
              {label}
            </span>
          );
        }
      }
      if (React.isValidElement(value)) {
        return value;
      }
      // Guard: prevent any remaining plain objects from crashing React render
      if (value !== null && typeof value === "object") {
        return String(value);
      }
      return value == null ? "" : String(value);
    };

    // Automatically auto-size columns upon first mount/data load if no widths are defined in local storage
    useEffect(() => {
      if (storageKey && filteredAndSortedData.length > 0 && columns.length > 0) {
        const hasSavedWidths = localStorage.getItem(`dt_widths_${storageKey}`);
        if (!hasSavedWidths) {
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (context) {
            const nextWidths: Record<string, number> = {};
            columns.forEach((col) => {
              if (hiddenColumns.has(col.key)) return;

              context.font = "700 0.7rem Inter, sans-serif";
              let maxWidth = context.measureText(col.label || "").width + 45;

              context.font = "500 0.8125rem Inter, sans-serif";
              filteredAndSortedData.forEach((row) => {
                const val = row[col.key];
                const formatted = val !== undefined && val !== null ? formatValue(val, col.type, col.key) : "";
                const stringVal = (typeof formatted === "string" || typeof formatted === "number") ? String(formatted) : String(val ?? "");
                const w = context.measureText(stringVal).width + 32;
                if (w > maxWidth) maxWidth = w;
              });

              const colDefaultWidth = col.width ? (typeof col.width === "number" ? col.width : parseInt(String(col.width)) || 150) : 150;
              const finalWidth = Math.min(600, Math.max(colDefaultWidth, maxWidth));
              nextWidths[col.key] = finalWidth;
            });
            setColumnWidths(nextWidths);
            saveColumnWidths(nextWidths);
          }
        }
      }
    }, [filteredAndSortedData, columns, storageKey, hiddenColumns]);

    const getAlignment = (col: Column) => {
      const type = col.type;
      const key = col.key;
      if (col.align) {
        return `text-${col.align}`;
      }
      if (key && columnFormats[key]?.alignment) {
        return `text-${columnFormats[key].alignment}`;
      }
      const k = key?.toLowerCase() || "";
      if (k.includes("salaryscale")) {
        return "text-center";
      }
      if (k === "no" || k === "stt" || k === "id") {
        return "text-center";
      }
      // Specific columns căn trái as requested
      if (k.includes("l07") || k.includes("ae") || k.includes("business")) {
        return "text-left";
      }

      switch (type) {
        case "number":
        case "currency":
        case "money":
          return "text-right";
        case "text":
        default:
          return "text-left";
      }
    };

    const toggleAll = () => {
      setSelectedRowIds((prev) => {
        if (prev.size === filteredAndSortedData.length) {
          return new Set();
        } else {
          return new Set(
            filteredAndSortedData.map((row, idx) => row.id || idx),
          );
        }
      });
    };

    const toggleRow = useCallback((id: string | number) => {
      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    }, []);

    const startEditing = useCallback(
      (r: number, c: number, clear: boolean = false) => {
        if (!isEditable) return;
        const col = visibleColumns[c];
        if (col && col.readOnly) return;
        const row = filteredAndSortedData[r];
        setEditingCell({ r, c });
        setEditValue(clear ? "" : String(row[col.key] || ""));

        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            if (!clear) {
              if (
                inputRef.current instanceof HTMLInputElement ||
                inputRef.current instanceof HTMLTextAreaElement
              ) {
                inputRef.current.select();
              }
            }
          }
        }, 0);
      },
      [isEditable, visibleColumns, filteredAndSortedData],
    );

    const commitEdit = useCallback(() => {
      if (editingCell && onCellChange) {
        const col = visibleColumns[editingCell.c];
        const row = filteredAndSortedData[editingCell.r];
        onCellChange(row, col.key, editValue);
      }
      setEditingCell(null);
    }, [
      editingCell,
      onCellChange,
      visibleColumns,
      filteredAndSortedData,
      editValue,
    ]);

    const cancelEdit = () => {
      setEditingCell(null);
    };

    const handleContextMenu = useCallback(
      (e: React.MouseEvent, r: number, c: number) => {
        if (!isEditable) return;
        e.preventDefault();
        if (r !== -1) {
          // If there's a selection range and the right-click is inside it, don't change the active cell
          let isInsideRange = false;
          if (selectionRange) {
            const minR = Math.min(selectionRange.startR, selectionRange.endR);
            const maxR = Math.max(selectionRange.startR, selectionRange.endR);
            const minC = Math.min(selectionRange.startC, selectionRange.endC);
            const maxC = Math.max(selectionRange.startC, selectionRange.endC);
            if (r >= minR && r <= maxR && c >= minC && c <= maxC) {
              isInsideRange = true;
            }
          }
          if (!isInsideRange) {
            setActiveCell({ r, c });
            setSelectionRange(null); // Clear range if right click outside
          }
        }
        setContextMenu({ x: e.clientX, y: e.clientY, r, c });
      },
      [selectionRange],
    );

    const closeContextMenu = () => setContextMenu(null);

    useEffect(() => {
      const handleGlobalClick = () => closeContextMenu();
      window.addEventListener("click", handleGlobalClick);
      return () => window.removeEventListener("click", handleGlobalClick);
    }, []);

    const handleHeaderMouseDown = (e: React.MouseEvent, cIdx: number) => {
      if (e.button !== 0) return;
      if (filteredAndSortedData.length === 0) return;
      setIsSelecting(true);
      setActiveCell({ r: 0, c: cIdx });
      setSelectionRange({
        startR: 0,
        endR: filteredAndSortedData.length - 1,
        startC: cIdx,
        endC: cIdx,
      });
    };

    const handleHeaderMouseEnter = (e: React.MouseEvent, cIdx: number) => {
      if (
        e.buttons === 1 &&
        selectionRange &&
        selectionRange.startR === 0 &&
        selectionRange.endR === filteredAndSortedData.length - 1
      ) {
        setSelectionRange((prev) => (prev ? { ...prev, endC: cIdx } : null));
      }
    };

    const copyColumn = (cIdx: number) => {
      const col = visibleColumns[cIdx];
      const values = filteredAndSortedData.map((row) =>
        formatValue(row[col.key], col.type),
      );
      try {
        navigator.clipboard.writeText(values.join("\n"));
      } catch (err) {
        console.error("Failed to copy!", err);
        toast.error(
          "Không thể sao chép vào clipboard. Vui lòng kiểm tra quyền truy cập.",
        );
      }
    };

    const copySelection = () => {
      const getCellValueAsString = (row: any, col: any) => {
        if (!row || !col) return "";
        const val = row[col.key];
        if (val === null || val === undefined) return "";
        if (val instanceof Date) {
          return isNaN(val.getTime()) ? "" : val.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        }
        if (col.type === "label") {
          return String(val);
        }
        if (col.type === "currency" || col.type === "money" || col.type === "number") {
          const num = parseMoneyToNumber(val);
          return formatVNRobust(num);
        }
        return String(val);
      };

      if (selectionRange) {
        const { startR, endR, startC, endC } = selectionRange;
        const minR = Math.min(startR, endR);
        const maxR = Math.max(startR, endR);
        const minC = Math.min(startC, endC);
        const maxC = Math.max(startC, endC);

        try {
          if (minR === maxR && minC === maxC) {
            const row = filteredAndSortedData[minR];
            const col = visibleColumns[minC];
            const valStr = getCellValueAsString(row, col);
            navigator.clipboard.writeText(valStr);
          } else {
            const rows = [];
            for (let i = minR; i <= maxR; i++) {
              const rowVals = [];
              for (let j = minC; j <= maxC; j++) {
                const col = visibleColumns[j];
                rowVals.push(getCellValueAsString(filteredAndSortedData[i], col));
              }
              rows.push(rowVals.join("\t"));
            }
            navigator.clipboard.writeText(rows.join("\n"));
          }
        } catch (err) {
          console.error("Failed to copy!", err);
          toast.error(
            "Không thể sao chép vào clipboard. Vui lòng kiểm tra quyền truy cập.",
          );
        }
      } else if (activeCell) {
        try {
          const row = filteredAndSortedData[activeCell.r];
          const col = visibleColumns[activeCell.c];
          const valStr = getCellValueAsString(row, col);
          navigator.clipboard.writeText(valStr);
        } catch (err) {
          console.error("Failed to copy!", err);
          toast.error(
            "Không thể sao chép vào clipboard. Vui lòng kiểm tra quyền truy cập.",
          );
        }
      }
    };

    const handleCellMouseDown = useCallback(
      (e: React.MouseEvent, r: number, c: number) => {
        if (e.button !== 0) return;
        setIsSelecting(true);
        
        // Focus the scroll container to make sure arrow keys and paste events function correctly
        if (scrollContainerRef.current) {
          scrollContainerRef.current.focus();
        }

        if (e.shiftKey && activeCell) {
          setSelectionRange({
            startR: activeCell.r,
            endR: r,
            startC: activeCell.c,
            endC: c,
          });
        } else {
          setActiveCell({ r, c });
          setSelectionRange({ startR: r, endR: r, startC: c, endC: c });
        }
      },
      [activeCell, scrollContainerRef],
    );

    const handleCellMouseEnter = useCallback(
      (e: React.MouseEvent, r: number, c: number) => {
        if (e.buttons === 1 && selectionRange) {
          setSelectionRange((prev) => {
            if (!prev) return null;
            if (prev.endR === r && prev.endC === c) return prev;
            return { ...prev, endR: r, endC: c };
          });
        }
      },
      [selectionRange],
    );

    const handleTableMouseMove = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isSelecting || e.buttons !== 1) return;

        const el = scrollContainerRef.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const edgeSize = 80;
        const maxStep = 32;
        let delta = 0;
        let deltaY = 0;

        if (e.clientX < rect.left + edgeSize) {
          delta = -Math.ceil(
            ((rect.left + edgeSize - e.clientX) / edgeSize) * maxStep,
          );
        } else if (e.clientX > rect.right - edgeSize) {
          delta = Math.ceil(
            ((e.clientX - (rect.right - edgeSize)) / edgeSize) * maxStep,
          );
        }

        if (e.clientY < rect.top + edgeSize) {
          deltaY = -Math.ceil(
            ((rect.top + edgeSize - e.clientY) / edgeSize) * maxStep,
          );
        } else if (e.clientY > rect.bottom - edgeSize) {
          deltaY = Math.ceil(
            ((e.clientY - (rect.bottom - edgeSize)) / edgeSize) * maxStep,
          );
        }

        if (delta !== 0) el.scrollLeft += delta;
        if (deltaY !== 0) el.scrollTop += deltaY;
      },
      [isSelecting],
    );

    // Keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (editingCell) {
          if (e.key === "Enter" && !e.altKey) {
            e.preventDefault();
            const { r, c } = editingCell;
            commitEdit();
            const nextR = Math.min(r + 1, filteredAndSortedData.length - 1);
            setActiveCell({ r: nextR, c });
            if (nextR !== r) setTimeout(() => startEditing(nextR, c), 10);
          } else if (e.key === "Tab") {
            e.preventDefault();
            const { r, c } = editingCell;
            commitEdit();
            let nextR = r,
              nextC = c;
            if (e.shiftKey) {
              if (c > 0) nextC = c - 1;
              else if (r > 0) {
                nextR = r - 1;
                nextC = visibleColumns.length - 1;
              }
            } else {
              if (c < visibleColumns.length - 1) nextC = c + 1;
              else if (r < filteredAndSortedData.length - 1) {
                nextR = r + 1;
                nextC = 0;
              }
            }
            setActiveCell({ r: nextR, c: nextC });
            if (nextR !== r || nextC !== c)
              setTimeout(() => startEditing(nextR, nextC), 10);
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancelEdit();
          }
          return;
        }

        if (
          !tableRef.current?.contains(document.activeElement) &&
          document.activeElement !== document.body
        )
          return;
        if (!activeCell) return;
        const { r, c } = activeCell;

        if (e.key === "ArrowDown") {
          e.preventDefault();
          const nextR = e.ctrlKey || e.metaKey 
            ? filteredAndSortedData.length - 1 
            : Math.min(r + 1, filteredAndSortedData.length - 1);
          setActiveCell({ r: nextR, c });
          if (e.shiftKey && selectionRange)
            setSelectionRange({ ...selectionRange, endR: nextR });
          else
            setSelectionRange({
              startR: nextR,
              endR: nextR,
              startC: c,
              endC: c,
            });
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const nextR = e.ctrlKey || e.metaKey ? 0 : Math.max(r - 1, 0);
          setActiveCell({ r: nextR, c });
          if (e.shiftKey && selectionRange)
            setSelectionRange({ ...selectionRange, endR: nextR });
          else
            setSelectionRange({
              startR: nextR,
              endR: nextR,
              startC: c,
              endC: c,
            });
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          const nextC = e.ctrlKey || e.metaKey 
            ? visibleColumns.length - 1 
            : Math.min(c + 1, visibleColumns.length - 1);
          setActiveCell({ r, c: nextC });
          if (e.shiftKey && selectionRange)
            setSelectionRange({ ...selectionRange, endC: nextC });
          else
            setSelectionRange({
              startR: r,
              endR: r,
              startC: nextC,
              endC: nextC,
            });
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          const nextC = e.ctrlKey || e.metaKey ? 0 : Math.max(c - 1, 0);
          setActiveCell({ r, c: nextC });
          if (e.shiftKey && selectionRange)
            setSelectionRange({ ...selectionRange, endC: nextC });
          else
            setSelectionRange({
              startR: r,
              endR: r,
              startC: nextC,
              endC: nextC,
            });
        } else if (e.key === "Tab") {
          e.preventDefault();
          const nextC = e.shiftKey
            ? Math.max(c - 1, 0)
            : Math.min(c + 1, visibleColumns.length - 1);
          setActiveCell({ r, c: nextC });
          setSelectionRange({ startR: r, endR: r, startC: nextC, endC: nextC });
        } else if (e.key === "Enter" || e.key === "F2") {
          e.preventDefault();
          startEditing(r, c);
        } else if (e.key === "Delete" || e.key === "Backspace") {
          if (onCellChange) {
            if (selectionRange) {
              const { startR, endR, startC, endC } = selectionRange;
              const minR = Math.min(startR, endR),
                maxR = Math.max(startR, endR);
              const minC = Math.min(startC, endC),
                maxC = Math.max(startC, endC);
              for (let i = minR; i <= maxR; i++) {
                for (let j = minC; j <= maxC; j++) {
                  const row = filteredAndSortedData[i];
                  onCellChange(row, visibleColumns[j].key, "");
                }
              }
              toast.success(
                `Đã xóa dữ liệu trong ${(maxR - minR + 1) * (maxC - minC + 1)} ô`,
              );
            } else {
              const row = filteredAndSortedData[r];
              onCellChange(row, visibleColumns[c].key, "");
            }
          }
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
          e.preventDefault();
          if (selectable) {
            toggleAll();
          } else {
            setSelectionRange({
              startR: 0,
              endR: filteredAndSortedData.length - 1,
              startC: 0,
              endC: visibleColumns.length - 1,
            });
          }
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
          e.preventDefault();
          copySelection();
        } else if (
          /^[a-zA-Z0-9]$/.test(e.key) &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.altKey
        ) {
          e.preventDefault();
          startEditing(r, c, true);
          setEditValue(e.key);
        }
      };

      const handlePaste = (e: ClipboardEvent) => {
        if (editingCell) return;
        if (
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA"
        ) {
          return;
        }
        if (
          !tableRef.current?.contains(document.activeElement) &&
          document.activeElement !== document.body
        ) {
          return;
        }
        if (!activeCell || !onCellChange) return;

        const text = e.clipboardData?.getData("text") || "";
        if (!text) return;

        e.preventDefault();

        const { r, c } = activeCell;
        const rows = text.split("\n");
        if (rows.length > 1 && rows[rows.length - 1].trim() === "") {
          rows.pop();
        }

        rows.forEach((rowText, rOffset) => {
          const cells = rowText.split("\t");
          cells.forEach((cellText, cOffset) => {
            const targetR = r + rOffset,
              targetC = c + cOffset;
            if (
              targetR < filteredAndSortedData.length &&
              targetC < visibleColumns.length
            ) {
              const row = filteredAndSortedData[targetR];
              onCellChange(
                row,
                visibleColumns[targetC].key,
                cellText.trim(),
              );
            }
          });
        });
        toast.success("Đã dán dữ liệu");
      };

      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("paste", handlePaste);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("paste", handlePaste);
      };
    }, [
      filteredAndSortedData,
      activeCell,
      editingCell,
      editValue,
      visibleColumns,
      isEditable,
      onCellChange,
      selectionRange,
    ]);

    const totalTableWidth =
      (selectable ? 56 : 0) +
      (showRowNumber ? 50 : 0) +
      visibleColumns.reduce((sum, col) => {
        const w = columnWidths[col.key] || col.width || 150;
        return sum + (typeof w === "number" ? w : parseInt(String(w)) || 150);
      }, 0);

    const densityStyles = {
      compact: {
        padding: "4px 8px",
        fontSize: "0.75rem",
        headerFontSize: "0.7rem",
      },
      normal: {
        padding: "12px 16px",
        fontSize: "0.8125rem",
        headerFontSize: "0.85em",
      },
      relaxed: {
        padding: "16px 24px",
        fontSize: "0.9rem",
        headerFontSize: "0.9rem",
      },
    };

    const renderHeaderCell = (col: Column, cIdx: number, rowSpan: number = 1) => {
      const isColActive =
        activeCell?.c === cIdx ||
        (selectionRange &&
          cIdx >= Math.min(selectionRange.startC, selectionRange.endC) &&
          cIdx <= Math.max(selectionRange.startC, selectionRange.endC));
      const colWidth = columnWidths[col.key] || col.width;
      const widthStyle = colWidth
        ? typeof colWidth === "number"
          ? `${colWidth}px`
          : colWidth
        : undefined;

      return (
        <th
          key={col.key}
          rowSpan={rowSpan}
          onMouseDown={(e) => handleHeaderMouseDown(e, cIdx)}
          onMouseEnter={(e) => handleHeaderMouseEnter(e, cIdx)}
          onContextMenu={(e) => handleContextMenu(e, -1, cIdx)}
          className={`sticky top-0 z-[110] whitespace-normal cursor-pointer select-none group border-b border-r ${borderClass} text-center ${headerClassName || "bg-[#f8fafc]"} ${col.headerClassName || ""} ${isColActive ? "bg-accent/20" : ""} shadow-[0_1px_0_var(--table-border-color,#E2E8F0)] text-[0.75rem] font-bold uppercase text-slate-800`}
          style={{
            padding: "var(--table-padding, 0.75rem 1rem)",
            width: widthStyle,
            minWidth: widthStyle,
            maxWidth: widthStyle,
            overflow: "visible",
          }}
        >
          <div className="flex items-center gap-2 justify-center h-full px-2">
            <span
              className={`transition-colors flex-1 flex flex-col md:flex-row items-center justify-center gap-1 ${col.sortable !== false ? "hover:text-accent active:scale-[0.98]" : ""} ${col.headerSpanClassName || ""}`}
              onClick={(e) => {
                if (col.sortable !== false) {
                  e.stopPropagation();
                  handleSort(col.key);
                }
              }}
            >
              <span>{col.label}</span>
              {col.sortable !== false && sortConfig?.key === col.key && (
                <span className="shrink-0 text-accent flex items-center justify-center">
                  {sortConfig.direction === "asc" ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </span>
              )}
            </span>
            {col.filterable !== false && (
              <ColumnFilter
                column={col}
                allData={data}
                filterState={columnFilters}
                onFilterChange={handleFilterChange}
                onSort={handleSort}
                searchTerm={debouncedSearchTerm}
              />
            )}
          </div>
          {resizableColumns && (
            <div
              onMouseDown={(e) => handleResizeStart(e, col.key)}
              onDoubleClick={() => handleResizeDoubleClick(col.key)}
              className={`absolute -right-[8px] top-0 bottom-0 w-[16px] cursor-col-resize group/resizer z-[70] flex justify-center`}
            >
              <div
                className={`w-[1px] h-full transition-colors bg-[var(--table-border-color,#E2E8F0)] group-hover/resizer:bg-accent/40 ${resizingCol?.key === col.key ? "bg-accent" : ""}`}
              />
            </div>
          )}
        </th>
      );
    };

    return (
      <>
        <div
          ref={tableRef}
          className={`flex flex-col flex-1 min-h-0 outline-none overflow-hidden relative border-0 border-white ${className || ""} data-table-wrapper`}
          style={
            {
              "--table-padding": densityStyles[rowDensity].padding,
              "--font-size": densityStyles[rowDensity].fontSize,
              "--header-font-size": densityStyles[rowDensity].headerFontSize,
              "--table-border-color": borderColorHex,
              ...customStyle,
            } as any
          }
        >
          {/* Table Scroll Container — virtual scrolling host */}
          <div
            ref={scrollContainerRef}
            tabIndex={0}
            className={`flex-1 overflow-y-scroll overflow-x-auto custom-scrollbar outline-none bg-transparent relative min-h-0 transition-opacity duration-100 mb-0 ${isStale ? "opacity-60" : "opacity-100"}`}
            onFocus={() => !activeCell && setActiveCell({ r: 0, c: 0 })}
            onMouseMove={handleTableMouseMove}
            style={{ 
              overscrollBehavior: "contain", 
              marginBottom: "8px", 
              overflowAnchor: "none",
              borderRadius: '0px',
              borderStyle: 'none',
              borderWidth: '0px'
            }}
          >
            {resizingLineLeft !== null && (
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-accent z-[100] pointer-events-none"
                style={{
                  left: resizingLineLeft,
                }}
              />
            )}

            <table
              className={`border-separate border-spacing-0 table-fixed bg-white ${isSelecting ? "select-none" : ""}`}
              style={{
                width: totalTableWidth,
                minWidth: totalTableWidth,
                minHeight: paginatedData.length === 0 ? 400 : 0,
                borderWidth: '0px'
              }}
            >
              <colgroup>
                {/* {selectable && <col style={{ width: 56 }} />} */}
                {showRowNumber && <col style={{ width: 50 }} />}
                {visibleColumns.map((col) => {
                  const colWidth = columnWidths[col.key] || col.width || 150;
                  const widthStyle = colWidth
                    ? typeof colWidth === "number"
                      ? `${colWidth}px`
                      : colWidth
                    : "150px";
                  return (
                    <col key={`col-${col.key}`} style={{ width: widthStyle }} />
                  );
                })}
              </colgroup>
              <thead>
                {/* Grouped Headers Row if any column has a group defined */}
                {columns.some(c => c.group) && (
                  <tr>
                    {/* {selectable && <th rowSpan={2} className="bg-slate-50 border-b border-r border-border" />} */}
                    {showRowNumber && <th rowSpan={2} className={`${headerClassName || "bg-[#f8fafc]"} sticky top-0 z-[110] border-b border-r ${borderClass} shadow-[0_1px_0_var(--table-border-color,#E2E8F0)]`} />}
                    {(() => {
                      const groupings: { group: string | undefined, count: number, startIdx: number }[] = [];
                      visibleColumns.forEach((col, idx) => {
                        const last = groupings[groupings.length - 1];
                        if (last && col.group && last.group === col.group) {
                          last.count++;
                        } else {
                          groupings.push({ group: col.group, count: 1, startIdx: idx });
                        }
                      });

                      return groupings.map((g, idx) => {
                        if (g.group) {
                          return (
                            <th 
                              key={idx} 
                              colSpan={g.count}
                              className={`sticky top-0 z-[110] ${headerClassName || "bg-[#f8fafc]"} border-b border-r ${borderClass} py-2 text-[0.75rem] font-bold uppercase text-center text-slate-800 shadow-[0_1px_0_var(--table-border-color,#E2E8F0)]`}
                            >
                              {g.group}
                            </th>
                          );
                        } else {
                          // Individual column with no group - rendering rowSpan=2
                          return renderHeaderCell(visibleColumns[g.startIdx], g.startIdx, 2);
                        }
                      });
                    })()}
                  </tr>
                )}
                <tr className={headerClassName ? "" : "bg-[#f8fafc]"}>
                  {selectable && !columns.some(c => c.group) && (
                    <th
                      className={`sticky top-0 z-[110] w-10 border-b border-r ${borderClass} text-center ${headerClassName ? headerClassName : "bg-[#f8fafc]"} shadow-[0_1px_0_var(--table-border-color,#E2E8F0)] text-[0.75rem] font-bold uppercase text-slate-800`}
                      style={{ padding: "var(--table-padding, 0.75rem 1rem)" }}
                    >
                      <button
                        onClick={toggleAll}
                        className="flex items-center justify-center hover:text-accent transition-colors mx-auto"
                      >
                        {selectedRowIds.size > 0 &&
                        selectedRowIds.size === filteredAndSortedData.length ? (
                          <div className="w-5 h-5 bg-accent rounded-md flex items-center justify-center border border-accent shadow-sm transition-transform active:scale-95">
                            <CheckSquare className="w-3.5 h-3.5 text-white" />
                          </div>
                        ) : selectedRowIds.size > 0 ? (
                          <div className="w-5 h-5 bg-accent/10 rounded-md flex items-center justify-center border border-accent/40 shadow-sm transition-transform active:scale-95">
                            <Minus className="w-3 h-3 text-accent" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 border-2 border-accent/20 bg-white rounded-md hover:border-accent/50 transition-colors" />
                        )}
                      </button>
                    </th>
                  )}
                  {showRowNumber && !columns.some(c => c.group) && (
                    <th
                      className={`sticky top-0 z-[110] w-[50px] border-b border-r ${borderClass} text-center ${headerClassName ? headerClassName : "bg-[#f8fafc]"} shadow-[0_1px_0_var(--table-border-color,#E2E8F0)] text-[0.75rem] font-bold uppercase text-slate-800`}
                      style={{ padding: "var(--table-padding, 0.75rem 1rem)" }}
                    >
                      No.
                    </th>
                  )}
                  {visibleColumns.map((col, cIdx) => {
                    // Skip rendering if it was already rendered via rowSpan=2 in the group row (only if grouping is present)
                    if (columns.some(c => c.group) && !col.group) return null;
                    
                    return renderHeaderCell(col, cIdx, 1);
                  })}
                </tr>

              </thead>
              <tbody className="border-primary/5">
                {/* Top spacer */}
                {vsTopPad > 0 && (
                  <tr style={{ height: `${vsTopPad}px` }} aria-hidden="true">
                    <td
                      colSpan={visibleColumns.length + (selectable ? 1 : 0) + (showRowNumber ? 1 : 0)}
                      style={{ height: `${vsTopPad}px`, padding: 0, border: "none" }}
                    />
                  </tr>
                )}

                {filteredAndSortedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={visibleColumns.length + (selectable ? 1 : 0) + (showRowNumber ? 1 : 0)}
                      className="p-0 border-none relative h-[400px]"
                    >
                      <div
                        className="sticky left-0 flex flex-col items-center justify-center gap-6"
                        style={{ width: vsContainerWidth, height: 400 }}
                      >
                        <div className="w-24 h-24 bg-primary/5 rounded-[32px] flex items-center justify-center border-2 border-dashed border-primary/20">
                          <Search className="w-10 h-10 text-primary/20" />
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <p
                            className="text-lg font-black uppercase tracking-[0.2em] text-primary/80"
                            style={{ fontFamily: "Verdana" }}
                          >
                            {searchTerm
                              ? "Không tìm thấy kết quả"
                              : "Dữ liệu trống"}
                          </p>
                          <p className="text-foreground/40 font-bold text-[0.625rem] uppercase tracking-[0.3em] max-w-[300px] leading-relaxed text-center">
                            {searchTerm ? (
                              <>
                                Không khớp với từ khóa{" "}
                                <span className="text-primary">
                                  "{searchTerm}"
                                </span>
                              </>
                            ) : (
                              "Vui lòng tải file hoặc phân phối dữ liệu từ bảng Data"
                            )}
                          </p>
                        </div>
                        { (searchTerm || Object.values(columnFilters).some(v => !!v)) && (
                          <button
                            onClick={clearAllFilters}
                            className="px-6 py-2.5 rounded-xl border-2 border-primary text-primary font-black text-[0.625rem] uppercase tracking-widest hover:bg-primary hover:text-white transition-all active:scale-95"
                          >
                            Xóa tất cả bộ lọc
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  virtualItems.map((vi) => {
                    const row = paginatedData[vi.index];
                    return (
                    <DataRow
                      key={row.id ?? vi.index}
                      row={row}
                      rIdx={itemsPerPage === Infinity ? vi.index : (currentPage - 1) * itemsPerPage + vi.index}
                      selectable={selectable}
                      showRowNumber={showRowNumber}
                      selectedRowIds={selectedRowIds}
                      activeCell={activeCell}
                      selectionRange={selectionRange}
                      editingCell={editingCell}
                      editValue={editValue}
                      visibleColumns={visibleColumns}
                      columnWidths={columnWidths}
                      isEditable={isEditable}
                      onCellChange={onCellChange}
                      toggleRow={toggleRow}
                      startEditing={startEditing}
                      handleCellMouseDown={handleCellMouseDown}
                      handleCellMouseEnter={handleCellMouseEnter}
                      handleContextMenu={handleContextMenu}
                      setEditValue={setEditValue}
                      commitEdit={commitEdit}
                      formatValue={formatValue}
                      getAlignment={getAlignment}
                      inputRef={inputRef}
                      rowHeight={rowHeight}
                      setRowHeight={setRowHeight}
                      striped={striped}
                      onRowClick={onRowClick}
                      borderClass={borderClass}
                    />
                  );
                  })
                )}

                {/* Bottom spacer */}
                {vsBottomPad > 0 && (
                  <tr style={{ height: `${vsBottomPad}px` }} aria-hidden="true">
                    <td
                      colSpan={visibleColumns.length + (selectable ? 1 : 0) + (showRowNumber ? 1 : 0)}
                      style={{ height: `${vsBottomPad}px`, padding: 0, border: "none" }}
                    />
                  </tr>
                )}
              </tbody>
              {showFooter && (
                <tfoot
                  className="sticky bottom-0 z-30"
                  style={{
                    willChange: "transform",
                    boxShadow: "0 -2px 10px rgba(0,0,0,0.05)",
                  }}
                >
                  {/* Grand Total Row */}
                  <tr
                    className={`${footerClassName || "divide-x divide-slate-300 bg-slate-50 shadow-[0_-1px_0_theme(colors.slate.300)_inset]"} total-row`}
                  >
                    {selectable && <td className="bg-transparent" />}
                    {showRowNumber && <td className="bg-transparent" />}
                    {visibleColumns.map((col: any, cIdx: number) => {
                      let colIsNumeric =
                        col.type === "number" ||
                        col.type === "currency" ||
                        col.type === "money";

                      if (
                        !colIsNumeric &&
                        col.type !== "text" &&
                        col.type !== "label" &&
                        col.type !== "date" &&
                        filteredAndSortedData.length > 0 &&
                        col.key !== "STT" &&
                        col.key !== "stt"
                      ) {
                        let numericCount = 0;
                        let totalValCount = 0;
                        const sampleSize = Math.min(20, filteredAndSortedData.length);
                        for (let i = 0; i < sampleSize; i++) {
                          const r = filteredAndSortedData[i];
                          if (r) {
                            const rawVal = r[col.key];
                            if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== "") {
                              totalValCount++;
                              const str = String(rawVal).trim();
                              const parsed = parseMoneyToNumber(str);
                              if (parsed !== 0 || str === "0") {
                                numericCount++;
                              }
                            }
                          }
                        }
                        if (totalValCount > 0 && numericCount / totalValCount > 0.7) {
                          colIsNumeric = true;
                        }
                      }

                      const grandTotal = colIsNumeric
                        ? filteredAndSortedData.reduce(
                            (sum, row) => {
                              if (totalCalculationOverride) {
                                const override = totalCalculationOverride(row, col.key);
                                if (override !== null) return sum + override;
                              }
                              const val = parseMoneyToNumber(row[col.key]);
                              return sum + (val || 0);
                            },
                            0,
                          )
                        : null;
                      const colWidth = columnWidths[col.key] || col.width;
                      const widthStyle = colWidth
                        ? typeof colWidth === "number"
                          ? `${colWidth}px`
                          : colWidth
                        : undefined;

                      return (
                        <td
                          key={`footer-grand-${col.key}`}
                          className={`whitespace-nowrap font-black border-b border-r ${borderClass} ${getAlignment(col)} uppercase tracking-widest ${footerClassName ? "" : "bg-slate-50/90 text-slate-800"} ${col.footerClassName || ""}`}
                          style={{
                            padding: "var(--table-padding, 0.65rem 1rem)",
                            fontFamily: "var(--font-table, var(--font-main))",
                            fontSize: "var(--font-size)",
                            width: widthStyle,
                            minWidth: widthStyle,
                            maxWidth: widthStyle,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {cIdx === 0
                            ? "TỔNG CỘNG"
                            : colIsNumeric && col.key !== "STT" && col.key !== "stt" && grandTotal !== null
                              ? formatValue(grandTotal, col.type === "number" ? "number" : "currency")
                              : ""}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

            {/* Footer — Floating Card Style mimicking payment page */}
          <div
            className="flex items-center justify-between shrink-0 z-40 relative bg-white h-10"
            style={{
              borderWidth: "0px",
              borderStyle: "none",
              borderRadius: "0px",
              borderColor: "#ffffff",
              marginTop: "-7px",
              marginBottom: "0px",
              marginRight: "17px",
              marginLeft: "17px",
              boxShadow: "none"
            }}
          >
            <div className="flex items-center gap-3 px-3">
              <div className="flex items-center gap-1.5 hidden md:flex">
                <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap ml-2">
                  Hiển thị:
                </span>
                <select
                  id="itemsPerPage"
                  name="itemsPerPage"
                  value={itemsPerPage === Infinity ? "all" : itemsPerPage}
                  onChange={(e) => {
                    const val = e.target.value;
                    setItemsPerPage(val === "all" ? Infinity : Number(val));
                    setCurrentPage(1);
                    
                    scrollContainerRef.current?.scrollTo({ top: 0 });
                  }}
                  className="h-6 px-1 text-[12px] font-bold text-slate-700 border border-slate-200 rounded-md flex items-center bg-white focus:ring-1 focus:ring-primary/20 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm"
                  style={{ fontSize: "12px" }}
                >
                  <option value="50">50 dòng</option>
                  <option value="100">100 dòng</option>
                  <option value="all">Tất cả</option>
                </select>
              </div>

              <div 
                className="flex items-center gap-1.5 hidden md:flex border-l border-slate-100 pl-3"
                style={{
                  marginRight: "12px",
                  marginBottom: "3px",
                  marginTop: "3px"
                }}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors"
                      title="Chọn cột hiển thị"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 max-h-[300px] overflow-y-auto">
                    <DropdownMenuLabel className="text-xs font-bold text-slate-500 uppercase">Cột hiển thị</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        const allVisible = hiddenColumns.size === 0;
                        if (allVisible) {
                          setHiddenColumns(new Set(columns.map((c) => c.key)));
                        } else {
                          setHiddenColumns(new Set());
                        }
                      }}
                      className="flex items-center justify-between text-sm font-bold cursor-pointer text-primary"
                    >
                      <span>Chọn tất cả</span>
                      {hiddenColumns.size === 0 ? (
                        <Eye className="w-3.5 h-3.5 text-primary shrink-0" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {columns.map((col) => (
                      <DropdownMenuItem
                        key={col.key}
                        onClick={(e) => {
                          e.preventDefault();
                          toggleColumn(col.key);
                        }}
                        className="flex items-center justify-between text-sm cursor-pointer"
                      >
                        <span className="truncate pr-2">{col.label}</span>
                        {!hiddenColumns.has(col.key) ? (
                          <Eye className="w-3.5 h-3.5 text-primary shrink-0" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <SaveStatusCard 
                  className="!px-1.5 !py-0.5 !rounded bg-slate-50 border border-slate-200/80 shadow-none gap-1 ml-1"
                  textStyle={{
                    fontFamily: "inherit",
                    fontWeight: "600",
                    fontSize: "9px",
                    color: "#475569",
                  }}
                  iconStyle={{
                    width: "11px",
                    height: "11px",
                    color: "#475569",
                  }}
                />
              </div>
            </div>

            {/* Pagination Controls - Added purely for navigation mimicking pagination feeling */}
            <div className="flex items-center gap-1 pr-3">
              <div className="mr-2 text-[11px] font-semibold text-slate-500 select-none">
                TRANG {currentPage} / {totalPages || 1}
              </div>
              
              <button
                onClick={() => {
                  setCurrentPage(1);
                  scrollContainerRef.current?.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                }}
                disabled={currentPage === 1}
                title="Trang đầu"
                className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
              >
                <ChevronLeft className="w-3 h-3" />
                <ChevronLeft className="w-3 h-3 -ml-1.5" />
              </button>
              <button
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1));
                  scrollContainerRef.current?.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                }}
                disabled={currentPage === 1}
                title="Trang trước"
                className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>

              <button
                onClick={() => {
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                  scrollContainerRef.current?.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                }}
                disabled={currentPage >= totalPages || totalPages === 0}
                title="Trang sau"
                className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  setCurrentPage(totalPages);
                  scrollContainerRef.current?.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                }}
                disabled={currentPage >= totalPages || totalPages === 0}
                title="Trang cuối"
                className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
              >
                <ChevronRight className="w-3 h-3" />
                <ChevronRight className="w-3 h-3 -ml-1.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed z-[100] bg-white/90 backdrop-blur-md shadow-hard py-1 min-w-[180px] rounded border-2 border-primary overflow-hidden animate-in fade-in zoom-in slide-in-from-top-2 duration-150"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 text-[0.5625rem] font-black uppercase tracking-widest text-primary/40 mb-1 border-b border-primary/10">
              Thao tác nhanh
            </div>

            {contextMenu.r !== -1 && (
              <>
                <button
                  onClick={() => {
                    const row = filteredAndSortedData[contextMenu.r];
                    const col = visibleColumns[contextMenu.c];
                    const val = formatValue(row[col.key], col.type);
                    navigator.clipboard.writeText(String(val));
                    closeContextMenu();
                  }}
                  className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group"
                >
                  <Copy className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary transition-colors" />
                  <span>Sao chép giá trị ô</span>
                </button>

                <button
                  onClick={() => {
                    if (onCellChange) {
                      if (selectionRange) {
                        const minR = Math.min(selectionRange.startR, selectionRange.endR);
                        const maxR = Math.max(selectionRange.startR, selectionRange.endR);
                        const minC = Math.min(selectionRange.startC, selectionRange.endC);
                        const maxC = Math.max(selectionRange.startC, selectionRange.endC);
                        
                        for (let r = minR; r <= maxR; r++) {
                          for (let c = minC; c <= maxC; c++) {
                            const row = filteredAndSortedData[r];
                            onCellChange(row, visibleColumns[c].key, "");
                          }
                        }
                        toast.success("Đã xóa dữ liệu các ô được chọn");
                      } else {
                        const row = filteredAndSortedData[contextMenu.r];
                        onCellChange(row, visibleColumns[contextMenu.c].key, "");
                        toast.success("Đã xóa dữ liệu ô");
                      }
                    }
                    closeContextMenu();
                  }}
                  className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group text-destructive hover:text-destructive"
                >
                  <Eraser className="w-3.5 h-3.5 text-destructive/40 group-hover:text-destructive transition-colors" />
                  <span>{selectionRange && (Math.abs(selectionRange.endR - selectionRange.startR) > 0 || Math.abs(selectionRange.endC - selectionRange.startC) > 0) ? "Xóa giá trị vùng chọn" : "Xóa giá trị ô"}</span>
                </button>

                <button
                  onClick={() => {
                    if (onDeleteSelection && selectionRange && (Math.abs(selectionRange.endR - selectionRange.startR) > 0 || Math.abs(selectionRange.endC - selectionRange.startC) > 0)) {
                       onDeleteSelection({
                         startR: Math.min(selectionRange.startR, selectionRange.endR),
                         endR: Math.max(selectionRange.startR, selectionRange.endR),
                         startC: Math.min(selectionRange.startC, selectionRange.endC),
                         endC: Math.max(selectionRange.startC, selectionRange.endC),
                       });
                       setSelectionRange(null);
                    } else if (onDeleteRows && selectionRange && Math.abs(selectionRange.endR - selectionRange.startR) > 0) {
                        const minR = Math.min(selectionRange.startR, selectionRange.endR);
                        const maxR = Math.max(selectionRange.startR, selectionRange.endR);
                        const rowsToDelete = [];
                        for (let r = minR; r <= maxR; r++) {
                            rowsToDelete.push(filteredAndSortedData[r]);
                        }
                        onDeleteRows(rowsToDelete);
                        setSelectionRange(null);
                        toast.success(`Đã xóa ${rowsToDelete.length} dòng`);
                    } else if (onDeleteRow) {
                      if (selectionRange && Math.abs(selectionRange.endR - selectionRange.startR) > 0) {
                         toast.error("Tính năng xóa nhiều dòng không khả dụng (thiếu onDeleteRows/onDeleteSelection)");
                      } else {
                         const row = filteredAndSortedData[contextMenu.r];
                         onDeleteRow(row, contextMenu.r);
                      }
                    } else {
                      toast.error("Tính năng xóa dòng không khả dụng cho bảng này");
                    }
                    closeContextMenu();
                  }}
                  className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive/40 group-hover:text-destructive transition-colors" />
                  <span>{selectionRange && Math.abs(selectionRange.endR - selectionRange.startR) > 0 ? "Xóa những dòng đang chọn" : "Xóa dòng này"}</span>
                </button>

                <button
                  onClick={() => {
                    const col = visibleColumns[contextMenu.c];
                    setFormatModal({ isOpen: true, colKey: col.key });
                    closeContextMenu();
                  }}
                  className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group"
                >
                  <Type className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary transition-colors" />
                  <span>Định dạng ô</span>
                </button>

                <button
                  onClick={() => {
                    if (onAddRow) {
                      const targetRow = filteredAndSortedData[contextMenu.r];
                      const actualIdx = targetRow ? data.findIndex((r) => r.id === targetRow.id) : -1;
                      onAddRow(actualIdx >= 0 ? actualIdx : undefined);
                      closeContextMenu();
                    } else {
                      toast.error("Tính năng thêm dòng không khả dụng cho bảng này");
                      closeContextMenu();
                    }
                  }}
                  className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-accent/10 flex items-center gap-2.5 transition-colors group text-accent hover:text-accent/80"
                >
                  <FileText className="w-3.5 h-3.5 text-accent/60 group-hover:text-accent transition-colors" />
                  <span>Thêm dòng mới</span>
                </button>

                <DropdownMenuSeparator className="bg-primary/10 mx-1" />
              </>
            )}

            <button
              onClick={() => {
                copyColumn(contextMenu.c);
                closeContextMenu();
              }}
              className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group"
            >
              <Copy className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary transition-colors" />
              <span>Sao chép cột</span>
            </button>
            <button
              onClick={() => {
                copySelection();
                closeContextMenu();
              }}
              className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group"
            >
              <Table2 className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary transition-colors" />
              <span>Sao chép vùng chọn</span>
            </button>
            {selectionRange && (
              <button
                onClick={() => {
                  if (onDeleteSelection) {
                    onDeleteSelection(selectionRange);
                  } else if (onCellChange) {
                    const { startR, endR, startC, endC } = selectionRange;
                    const minR = Math.min(startR, endR),
                      maxR = Math.max(startR, endR);
                    const minC = Math.min(startC, endC),
                      maxC = Math.max(startC, endC);
                    for (let i = minR; i <= maxR; i++) {
                      for (let j = minC; j <= maxC; j++) {
                        const row = filteredAndSortedData[i];
                        onCellChange(row, visibleColumns[j].key, "");
                      }
                    }
                    toast.success(
                      `Đã xóa dữ liệu trong ${(maxR - minR + 1) * (maxC - minC + 1)} ô`,
                    );
                  }
                  closeContextMenu();
                }}
                className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group text-destructive hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive/40 group-hover:text-destructive transition-colors" />
                <span>Xóa vùng chọn</span>
              </button>
            )}
            <DropdownMenuSeparator className="bg-primary/10 mx-1" />
            <button
              onClick={() => {
                setSortConfig({
                  key: visibleColumns[contextMenu.c].key,
                  direction: "asc",
                });
                closeContextMenu();
              }}
              className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group"
            >
              <ChevronUp className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary transition-colors" />
              <span>Sắp xếp A-Z</span>
            </button>
            <button
              onClick={() => {
                setSortConfig({
                  key: visibleColumns[contextMenu.c].key,
                  direction: "desc",
                });
                closeContextMenu();
              }}
              className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group"
            >
              <ChevronDown className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary transition-colors" />
              <span>Sắp xếp Z-A</span>
            </button>
          </div>
        )}
        {/* Column Format Dialog */}
        {formatModal && (
          <ColumnFormatDialog
            key={formatModal.colKey}
            isOpen={formatModal.isOpen}
            onClose={() => setFormatModal(null)}
            colKey={formatModal.colKey}
            initialFormat={columnFormats[formatModal.colKey] || {}}
            onSave={(format: { alignment?: "left" | "center" | "right" }) => {
              setColumnFormats((prev) => ({
                ...prev,
                [formatModal.colKey]: format,
              }));
            }}
          />
        )}
      </>
    );
  },
);

DataTable.displayName = "DataTable";
