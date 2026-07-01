/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useRef } from "react";
import { Link as RouterLink } from "react-router";
import {
  Search,
  Plus,
  LayoutList,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Trash2,
  FileSpreadsheet,
  RefreshCw,
  Link,
  CheckCircle2,
  Circle,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import {
  getL07FromFileName,
  getCenterInfoByL07,
  mapL07,
  getCenterInfoByAECode
} from "../../../lib/utils/center-utils";

export interface TimesheetInputRow {
  id: string;
  l07: string;
  aeCode: string;
  bus: string;
  url: string;
  fileName?: string;
  sheetName?: string;
  status: "pending" | "processing" | "success" | "error";
  count?: number;
  date?: string;
  columnMapping?: Record<string, string>;
}

interface TimesheetInputTableProps {
  rows: TimesheetInputRow[];
  onUpdateRow: (id: string, field: keyof TimesheetInputRow, value: any) => void;
  onClearRow: (id: string) => void;
  onAddRow: () => void;
  onUploadFile: (id: string, file: File) => void;
  onClearAll: () => void;
  onClearEmptyL07?: () => void;
  onUploadFiles: (files: File[]) => void;
  onUrlInput?: (id: string, url: string) => void;
  isProcessing?: boolean;
  onRefresh?: () => void;
  onRestoreDefaults?: () => void;
  onSyncRow?: (id: string) => void;
}

export function TimesheetInputTable({
  rows,
  onUpdateRow,
  onClearRow,
  onAddRow,
  onUploadFile,
  onUploadFiles,
  onUrlInput,
  onClearAll,
  onClearEmptyL07,
  isProcessing,
  onRefresh,
  onRestoreDefaults,
  onSyncRow,
}: TimesheetInputTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  const [colWidths, setColWidths] = useState<Record<string, number>>({
    no: 60,
    l07: 140,
    aeCode: 120,
    bus: 140,
    file: 260,
    date: 180,
    status: 140,
    actions: 120,
  });

  const handleMouseDown = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = colWidths[colKey] || 150;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      setColWidths((prev) => ({
        ...prev,
        [colKey]: Math.max(50, startWidth + deltaX),
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const totalPages = Math.ceil(rows.length / itemsPerPage);
  const paginatedRows = rows.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleFileClick = (id: string) => {
    setActiveRowId(id);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      if (activeRowId) {
        // Single file upload case (retry existing row)
        const file = files[0];
        onUploadFile(activeRowId, file);
        const l07 = getL07FromFileName(file.name);
        if (l07) {
          onUpdateRow(activeRowId, "l07", l07);
          const centerInfo = getCenterInfoByL07(l07);
          if (centerInfo) {
            onUpdateRow(activeRowId, "aeCode", centerInfo.aeCode || "");
            onUpdateRow(activeRowId, "bus", getBusinessFromL07(l07));
          }
        }
      } else {
        // Multiple file upload case (new bulk upload)
        onUploadFiles(Array.from(files));
      }
    }
    e.target.value = "";
    setActiveRowId(null);
  };

  return (
    <div id="roster-center-table-wrapper" className="flex-1 flex flex-col min-h-0 relative font-[family-name:var(--font-table,var(--font-main))]">
      <div className="relative flex flex-col flex-1 min-h-0 bg-white overflow-hidden p-0">
        <div className="flex-1 overflow-auto custom-scrollbar bg-white relative min-h-0 shadow-none p-0 border-0 scroll-pt-0">
          <table className="w-full min-w-max border-separate border-spacing-0 border-l border-t border-rose-100" style={{ tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th 
                className="sticky top-0 z-[110] bg-[#fce7f3] border-b border-r border-rose-100 text-[0.85em] font-bold uppercase tracking-[0.22em] text-rose-700 p-4 text-center group select-none shadow-[0_1px_0_#fbcfe8]"
                style={{ width: colWidths.no }}
              >
                <span>No.</span>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-rose-300/50 bg-transparent transition-all z-50 select-none"
                  onMouseDown={(e) => handleMouseDown(e, "no")}
                />
              </th>
              <th 
                className="sticky top-0 z-[110] bg-[#fce7f3] border-b border-r border-rose-100 text-[0.85em] font-bold uppercase tracking-[0.22em] text-rose-700 p-4 text-center group select-none shadow-[0_1px_0_#fbcfe8]"
                style={{ width: colWidths.l07 }}
              >
                <span>L07</span>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-rose-300/50 bg-transparent transition-all z-50 select-none"
                  onMouseDown={(e) => handleMouseDown(e, "l07")}
                />
              </th>
              <th 
                className="sticky top-0 z-[110] bg-[#fce7f3] border-b border-r border-rose-100 text-[0.85em] font-bold uppercase tracking-[0.22em] text-rose-700 p-4 text-center group select-none shadow-[0_1px_0_#fbcfe8]"
                style={{ width: colWidths.aeCode }}
              >
                <span>Mã AE</span>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-rose-300/50 bg-transparent transition-all z-50 select-none"
                  onMouseDown={(e) => handleMouseDown(e, "aeCode")}
                />
              </th>
              <th 
                className="sticky top-0 z-[110] bg-[#fce7f3] border-b border-r border-rose-100 text-[0.85em] font-bold uppercase tracking-[0.22em] text-rose-700 p-4 text-center group select-none shadow-[0_1px_0_#fbcfe8]"
                style={{ width: colWidths.bus }}
              >
                <span>Business</span>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-rose-300/50 bg-transparent transition-all z-50 select-none"
                  onMouseDown={(e) => handleMouseDown(e, "bus")}
                />
              </th>
              <th 
                className="sticky top-0 z-[110] bg-[#fce7f3] border-b border-r border-rose-100 text-[0.85em] font-bold uppercase tracking-[0.22em] text-rose-700 p-4 text-center group select-none shadow-[0_1px_0_#fbcfe8]"
                style={{ width: colWidths.file }}
              >
                <span>File / Link</span>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-rose-300/50 bg-transparent transition-all z-50 select-none"
                  onMouseDown={(e) => handleMouseDown(e, "file")}
                />
              </th>
              <th 
                className="sticky top-0 z-[110] bg-[#fce7f3] border-b border-r border-rose-100 text-[0.85em] font-bold uppercase tracking-[0.22em] text-rose-700 p-4 text-center group select-none shadow-[0_1px_0_#fbcfe8]"
                style={{ width: colWidths.date }}
              >
                <span>Ngày Upload</span>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-rose-300/50 bg-transparent transition-all z-50 select-none"
                  onMouseDown={(e) => handleMouseDown(e, "date")}
                />
              </th>
              <th 
                className="sticky top-0 z-[110] bg-[#fce7f3] border-b border-r border-rose-100 text-[0.85em] font-bold uppercase tracking-[0.22em] text-rose-700 p-4 text-center group select-none shadow-[0_1px_0_#fbcfe8]"
                style={{ width: colWidths.status }}
              >
                <span>Trạng Thái</span>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-rose-300/50 bg-transparent transition-all z-50 select-none"
                  onMouseDown={(e) => handleMouseDown(e, "status")}
                />
              </th>
              <th 
                className="sticky top-0 z-[110] bg-[#fce7f3] border-b border-r border-rose-100 text-[0.85em] font-bold uppercase tracking-[0.22em] text-rose-700 p-4 text-center group select-none shadow-[0_1px_0_#fbcfe8]"
                style={{ width: colWidths.actions }}
              >
                <span>Actions</span>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-rose-300/50 bg-transparent transition-all z-50 select-none"
                  onMouseDown={(e) => handleMouseDown(e, "actions")}
                />
              </th>
            </tr>
          </thead>
          <tbody className="">
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-16 text-center text-sm text-slate-400 border-b border-r border-[#E2E8F0]"
                >
                  <div className="flex flex-col items-center justify-center gap-3 py-6">
                    <span className="text-slate-500 font-medium">Chưa có dữ liệu nào hoặc danh sách L07 trống</span>
                    {onRestoreDefaults && (
                      <button
                        type="button"
                        onClick={onRestoreDefaults}
                        className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 hover:text-primary border border-primary/20 text-primary text-[0.6875rem] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin-hover" />
                        Khởi tạo lại 50+ trung tâm L07 gốc
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, idx) => (
                <tr
                  key={row.id}
                  className="transition-colors group animate-in fade-in duration-300 fill-mode-both"
                >
                  <td
                    className="px-4 py-2 text-center text-[0.8em] text-foreground/40 border-b border-r border-[#E2E8F0]"
                    style={{
                      fontFamily: "var(--font-table, var(--font-main))",
                      fontSize: "var(--font-size)",
                    }}
                  >
                    {(currentPage - 1) * itemsPerPage + idx + 1}
                  </td>
                  <td
                    className="px-4 py-2 border-b border-r border-[#E2E8F0]"
                    style={{
                      fontFamily: "var(--font-table, var(--font-main))",
                      fontSize: "var(--font-size)",
                    }}
                  >
                    <input
                      id={`l07-${row.id}`}
                      name={`l07-${row.id}`}
                      type="text"
                      value={row.l07 || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        onUpdateRow(row.id, "l07", val);
                        if (val) {
                          const mappedL07 = mapL07(val);
                          const info = getCenterInfoByL07(mappedL07);
                          if (info) {
                            if (info.aeCode) onUpdateRow(row.id, "aeCode", info.aeCode);
                            onUpdateRow(row.id, "bus", getBusinessFromL07(mappedL07));
                          }
                        }
                      }}
                      className="w-full bg-transparent border-none focus:ring-0 text-[1em] font-medium text-foreground p-0"
                      style={{ fontFamily: "inherit", fontSize: "inherit" }}
                      placeholder="L07..."
                    />
                  </td>
                  <td
                    className="px-4 py-2 border-b border-r border-[#E2E8F0]"
                    style={{
                      fontFamily: "var(--font-table, var(--font-main))",
                      fontSize: "var(--font-size)",
                    }}
                  >
                    <input
                      id={`aeCode-${row.id}`}
                      name={`aeCode-${row.id}`}
                      type="text"
                      value={row.aeCode || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        onUpdateRow(row.id, "aeCode", val);
                        if (val) {
                          const info = getCenterInfoByAECode(val);
                          if (info) {
                            if (info.l07) {
                              onUpdateRow(row.id, "l07", info.l07);
                              onUpdateRow(row.id, "bus", getBusinessFromL07(info.l07));
                            }
                          }
                        }
                      }}
                      className="w-full bg-transparent border-none focus:ring-0 text-[1em] font-medium text-foreground p-0"
                      style={{ fontFamily: "inherit", fontSize: "inherit" }}
                      placeholder="L07..."
                    />
                  </td>
                  <td
                    className="px-4 py-2 border-b border-r border-[#E2E8F0]"
                    style={{
                      fontFamily: "var(--font-table, var(--font-main))",
                      fontSize: "var(--font-size)",
                    }}
                  >
                    <input
                      id={`bus-${row.id}`}
                      name={`bus-${row.id}`}
                      type="text"
                      value={row.bus || ""}
                      onChange={(e) =>
                        onUpdateRow(row.id, "bus", e.target.value)
                      }
                      className="w-full bg-transparent border-none focus:ring-0 text-[1em] font-medium text-foreground p-0"
                      style={{ fontFamily: "inherit", fontSize: "inherit" }}
                      placeholder="Business..."
                    />
                  </td>
                  <td
                    className="px-4 py-2 border-b border-r border-[#E2E8F0]"
                    style={{
                      fontFamily: "var(--font-table, var(--font-main))",
                      fontSize: "var(--font-size)",
                    }}
                  >
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleFileClick(row.id)}
                          className="flex items-center justify-center shrink-0 w-8 h-8 bg-primary/5 border border-primary/10 rounded-md hover:bg-primary/10 transition-colors group/btn"
                          title="Tải lên tệp tin"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-primary group-hover/btn:scale-110 transition-transform" />
                        </button>
                        {row.fileName ? (
                          <div className="w-full h-8 bg-slate-50/80 border border-emerald-200 rounded-md px-2 text-[0.8em] text-emerald-800 flex items-center justify-between gap-2 overflow-hidden shadow-sm">
                            <div className="flex items-center gap-1.5 min-w-0 truncate">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span className="truncate font-medium" title={row.fileName}>{row.fileName}</span>
                            </div>
                            <button 
                              onClick={() => {
                                onUpdateRow(row.id, "url", "");
                                onUpdateRow(row.id, "fileName", "");
                                onUpdateRow(row.id, "status", "pending");
                                onUpdateRow(row.id, "date", "");
                              }}
                              className="text-emerald-600/60 hover:text-rose-500 p-0.5 rounded-sm hover:bg-rose-50 shrink-0 transition-colors"
                              title="Xóa file"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="Dán link GSheet/Folder..."
                            className="w-full h-8 bg-slate-50/50 border border-dashed border-border rounded-md px-2 text-[0.8em] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = e.currentTarget.value.trim();
                                if (val && onUrlInput) {
                                  onUrlInput(row.id, val);
                                  e.currentTarget.value = "";
                                }
                              }
                            }}
                            onPaste={(e) => {
                              const val = e.clipboardData.getData('text').trim();
                              if (val && onUrlInput) {
                                // Allow small delay so the value is actually in the input if needed, 
                                // but we use the clipboard data directly.
                                onUrlInput(row.id, val);
                                e.preventDefault();
                              }
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </td>
                  <td
                    className="px-4 py-2 text-center text-[0.8em] text-slate-500 border-b border-r border-[#E2E8F0]"
                    style={{
                      fontFamily: "var(--font-table, var(--font-main))",
                      fontSize: "var(--font-size)",
                    }}
                  >
                    {row.date || "---"}
                  </td>
                  <td
                    className="px-4 py-2 text-center border-b border-r border-[#E2E8F0]"
                    style={{
                      fontFamily: "var(--font-table, var(--font-main))",
                      fontSize: "var(--font-size)",
                    }}
                  >
                    <div className="flex justify-center">
                      {row.status === "success" ? (
                        <span
                          className="text-[0.65rem] font-bold uppercase py-0.5 px-2 rounded-full bg-emerald-50 text-emerald-700"
                          style={{ fontSize: "0.625rem" }}
                        >
                          Success
                        </span>
                      ) : row.status === "error" ? (
                        <span
                          className="text-[0.65rem] font-bold uppercase py-0.5 px-2 rounded-full bg-rose-50 text-rose-700"
                          style={{ fontSize: "0.625rem" }}
                        >
                          Error
                        </span>
                      ) : (
                        <span
                          className="text-[0.65rem] font-bold uppercase py-0.5 px-2 rounded-full bg-slate-100 text-slate-600"
                          style={{ fontSize: "0.625rem" }}
                        >
                          {row.status}
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    className="px-4 py-2 text-center border-b border-r border-[#E2E8F0]"
                    style={{
                      fontFamily: "var(--font-table, var(--font-main))",
                    }}
                  >
                    <div className="flex justify-center gap-1">
                      {onSyncRow && (row.url || row.status === "error") && (
                        <button
                          onClick={() => onSyncRow(row.id)}
                          className={`p-1.5 rounded transition-colors ${row.status === "processing" ? "text-amber-500 animate-spin" : "hover:bg-amber-50 text-amber-500"}`}
                          title="Đồng bộ lại từ Link"
                          disabled={row.status === "processing"}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleFileClick(row.id)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors"
                        title="Upload File Local"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onClearRow(row.id)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Xóa dòng"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Controls matching DataTable format */}
      <div className="px-4 py-1.5 h-auto bg-white border-t border-rose-100 flex items-center justify-between shrink-0 relative z-40 rounded-b-[54px]">
        <div className="flex items-center gap-3 text-[0.625rem] font-bold uppercase tracking-widest text-rose-300">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1 text-rose-200 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors active:scale-95"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="font-normal normal-case tracking-normal text-rose-400">
            {rows.length === 0 ? "0" : (currentPage - 1) * itemsPerPage + 1} -{" "}
            {Math.min(currentPage * itemsPerPage, rows.length)} / {rows.length}
          </span>
        </div>

        <div className="flex items-center gap-2 opacity-100 px-3">
          {onClearEmptyL07 && (
            <button
              onClick={onClearEmptyL07}
              className="flex items-center gap-1.5 px-3 py-1 mr-2 bg-rose-50 border border-rose-200 text-rose-500 rounded-lg text-[0.625rem] font-bold uppercase tracking-widest hover:bg-rose-100 hover:text-rose-600 transition-colors"
               title="Xóa rỗng l07"
            >
              <Trash2 className="w-3.5 h-3.5" /> Dọn dòng trống L07
            </button>
          )}
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-rose-100 bg-white hover:bg-rose-50 hover:border-rose-200 text-rose-400 hover:text-rose-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="px-2 font-black text-[0.6rem] text-rose-400 select-none flex items-center gap-1">
            <span>TRANG</span>
            <span className="font-normal">{currentPage}</span>
            <span>/</span>
            <span className="font-normal">{totalPages || 1}</span>
          </div>

          <button
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-rose-100 bg-white hover:bg-rose-50 hover:border-rose-200 text-rose-400 hover:text-rose-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <input
        id="fileInput"
        name="fileInput"
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        accept=".xlsx,.xls,.csv"
        multiple
      />
      </div>
    </div>
  );
}
