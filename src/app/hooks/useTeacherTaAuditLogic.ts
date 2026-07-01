/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect, useRef } from "react";
import AuditWorker from "../workers/audit.worker?worker";
import * as XLSX from "xlsx";
import { useAppData } from "../lib/contexts/AppDataContext";
import { CENTER_MAPPING, getCenterInfoByAECode } from "../lib/utils/center-utils";
import { getVal, getExcelFileBuffer } from "../lib/utils/data-utils";

// ==========================================
// 1. CONSTANTS & MAPPING PRE-CALCULATION
// ==========================================

// ==========================================
// 3. HOOK
// ==========================================

export function useTeacherTaAuditLogic(rosterData: any[], fromDate: string, toDate: string) {
  const { appData, updateAppData } = useAppData();
  const fileAData = useMemo(() => appData.Q_TeacherHours || [], [appData.Q_TeacherHours]);
  const fileNameA = appData.Q_TeacherHoursFileName || "";
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [fuzzyThreshold, setFuzzyThreshold] = useState(75);
  // Cache key: trÃ¡nh re-run worker khi inputs khÃ´ng Ä‘á»•i vá» ná»™i dung
  const lastParamsCacheRef = useRef<string>("");
  const workerRef = useRef<Worker | null>(null);

  // NGUỒN 1: File Timesheet của Giáo Viên
  const handleUploadFileA = async (file: File) => {
    setIsProcessing(true);
    setErrorMsg("");
    try {
      const { buffer, name: fileName } = await getExcelFileBuffer(file);
      const isCsv = fileName.toLowerCase().endsWith(".csv") || fileName.toLowerCase().endsWith(".gsheet") || fileName.toLowerCase().endsWith(".txt");
      let workbook;
      if (isCsv) {
        const decoder = new TextDecoder("utf-8");
        const text = decoder.decode(buffer);
        workbook = XLSX.read(text, { type: "string", raw: true });
      } else {
        workbook = XLSX.read(buffer, { type: "array", raw: true });
      }
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      const rawData = XLSX.utils.sheet_to_json(firstSheet, {
        header: 1,
        defval: "",
        raw: false
      }) as any[][];
      
      updateAppData((prev) => ({
        ...prev,
        Q_TeacherHours: rawData,
        Q_TeacherHoursFileName: fileName,
      }));
    } catch (error) {
      console.error("Lỗi upload file A:", error);
      setErrorMsg("Lỗi đọc File A. Vui lòng kiểm tra định dạng file!");
    } finally {
      setIsProcessing(false);
    }
  };

  // NGUỒN 2: File Danh Sách TA (Roster / Source 2)
  const handleUploadFileB = async (file: File) => {
    setIsProcessing(true);
    setErrorMsg("");
    try {
      const { buffer, name: fileName } = await getExcelFileBuffer(file);
      const isCsv = fileName.toLowerCase().endsWith(".csv") || fileName.toLowerCase().endsWith(".gsheet") || fileName.toLowerCase().endsWith(".txt");
      let workbook;
      if (isCsv) {
        const decoder = new TextDecoder("utf-8");
        const text = decoder.decode(buffer);
        workbook = XLSX.read(text, { type: "string", raw: true });
      } else {
        workbook = XLSX.read(buffer, { type: "array", raw: true });
      }
      
      const rosterSheetName = workbook.SheetNames.find(name => {
        const upper = name.toUpperCase().trim();
        return upper === "ROSTER" || upper === "Q_ROSTER";
      }) || workbook.SheetNames[0];
      const firstSheet = workbook.Sheets[rosterSheetName];
      
      const rawData = XLSX.utils.sheet_to_json(firstSheet, {
        defval: "",
        raw: false
      });

      const mappedRosters = rawData.map((row: any) => {
        const rawCenter = String(getVal(row, ["center", "mã ae", "ae", "ae code"]) || "").trim();
        const info = getCenterInfoByAECode(rawCenter);
        const l07 = info?.l07 || rawCenter || "UNKNOWN";
        const business = info?.bus || "";
        const ma_nv = String(getVal(row, ["id number", "id", "teacher id", "emp id", "mã nv", "manv"]) || "").trim();
        const full_name = String(getVal(row, ["full name", "name", "teacher name", "tên", "họ và tên", "họ tên"]) || "").trim();
        const ngayRaw = getVal(row, ["date", "ngay", "ngày", "tk_date", "session date", "sessiondate", "ngày học", "scheduledate", "ngày làm việc", "ngày tháng"]);
        const ngay = ngayRaw !== undefined && ngayRaw !== null ? String(ngayRaw).trim() : "";
        const type = String(getVal(row, ["type", "task type", "task", "code", "loại", "loại hoạt động", "event type"]) || "").trim();
        const className = String(getVal(row, ["class", "class code", "lớp", "class name", "mã lớp", "tên lớp", "classcode"]) || "").trim();
        const gio_vao = String(getVal(row, ["from", "start", "start time", "từ"]) || "").trim();
        const gio_ra = String(getVal(row, ["to", "end", "end time", "đến"]) || "").trim();
        
        const rawDuration = getVal(row, ["duration", "quy ra số giờ làm", "total", "actual hours", "working hours", "giờ làm", "số giờ", "hours", "tk_duration", "total hours", "tổng giờ", "time"]);
        let duration = 0;
        if (typeof rawDuration === "number") {
          duration = rawDuration;
        } else if (rawDuration) {
          const sv = String(rawDuration).trim().replace(",", ".");
          if (sv.includes(":")) {
            const p = sv.split(":");
            duration = (parseInt(p[0]) || 0) + (parseInt(p[1]) || 0) / 60;
          } else {
            duration = parseFloat(sv) || 0;
          }
        }
        
        const notes = String(getVal(row, ["notes", "note", "ghi chú", "ghi chu", "remarks"]) || "").trim();

        return {
          center: rawCenter,
          l07,
          business,
          ma_nv,
          full_name,
          ngay,
          type,
          class: className,
          gio_vao,
          gio_ra,
          duration,
          notes,
          
          employeeId: ma_nv,
          fullName: full_name,
          maAE: rawCenter,
          date: ngay,
          taskType: type,
          classCode: className,
          from: gio_vao,
          to: gio_ra,
          _sourceFile: fileName
        };
      });
      
      updateAppData((prev) => ({
        ...prev,
        Q_Roster: mappedRosters,
        Q_RosterFileName: fileName
      } as any));
    } catch (error) {
      console.error("Lỗi upload file B:", error);
      setErrorMsg("Lỗi đọc File B. Vui lòng kiểm tra định dạng file!");
    } finally {
      setIsProcessing(false);
    }
  };

  // NGUỒN 3: File Audit Config (Student Counts / Source 3)
  const handleUploadFileConfig = async (file: File) => {
    setIsProcessing(true);
    setErrorMsg("");
    try {
      const { buffer, name: fileName } = await getExcelFileBuffer(file);
      const isCsv = fileName.toLowerCase().endsWith(".csv") || fileName.toLowerCase().endsWith(".gsheet") || fileName.toLowerCase().endsWith(".txt");
      let workbook;
      if (isCsv) {
        const decoder = new TextDecoder("utf-8");
        const text = decoder.decode(buffer);
        workbook = XLSX.read(text, { type: "string", raw: true });
      } else {
        workbook = XLSX.read(buffer, { type: "array", raw: true });
      }
      
      // Look for a sheet with relevant names
      const targetSheetName = workbook.SheetNames.find(s => 
        s.toLowerCase().includes("check tas") || 
        s.toLowerCase().includes("danh sách lớp") || 
        s.toLowerCase().includes("schedule") ||
        s.toLowerCase().includes("so sánh")
      ) || workbook.SheetNames[0];
      
      const sheet = workbook.Sheets[targetSheetName];
      
      // Auto-detect header row
      const configRaw = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        raw: false
      });
      
      updateAppData((prev) => ({
        ...prev,
        Q_CheckTAs: configRaw,
        Q_CheckTAsFileName: fileName
      } as any));
    } catch (error) {
      console.error("Lỗi upload file Config:", error);
      setErrorMsg("Lỗi đọc File Config. Vui lòng kiểm tra định dạng file!");
    } finally {
      setIsProcessing(false);
    }
  };

  const [auditResults, setAuditResults] = useState<any>({
    results: [], 
    summary: { sumTeacher: 0, sumActualTA: 0, sumExpected: 0 }, 
    missingCenters: [], 
    error: null,
    isCalculating: false
  });

  // Extract checkTAsData - stabilize reference
  const checkTAsDataRaw = useMemo(() => appData.Q_CheckTAs || [], [appData.Q_CheckTAs]);
  const centerMappingParam = useMemo(() => CENTER_MAPPING || {}, []);

  useEffect(() => {
    if (fileAData.length === 0) {
      setTimeout(() => {
        setAuditResults({ results: [], summary: { sumTeacher: 0, sumActualTA: 0, sumExpected: 0 }, missingCenters: [], error: null, isCalculating: false });
      }, 0);
      return;
    }
    if (!rosterData || rosterData.length === 0) {
      setTimeout(() => {
        setAuditResults({ results: [], summary: { sumTeacher: 0, sumActualTA: 0, sumExpected: 0 }, missingCenters: [], error: "NO_ROSTER_B", isCalculating: false });
      }, 0);
      return;
    }

    // Cache check: khÃ´ng gá»­i worker náº¿u params giá»‘ng há»‡t láº§n trÆ°á»›c
    const cacheKey = `${fileNameA}|${fromDate}|${toDate}|${rosterData.length}|${fileAData.length}|${checkTAsDataRaw.length}`;
    if (cacheKey === lastParamsCacheRef.current) return;
    lastParamsCacheRef.current = cacheKey;

    // Terminate previous worker náº¿u cÃ²n Ä‘ang cháº¡y
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    setAuditResults((prev: any) => ({ ...prev, isCalculating: true }));

    const worker = new AuditWorker();
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      setAuditResults(e.data || {
        results: [], 
        summary: { sumTeacher: 0, sumActualTA: 0, sumExpected: 0 }, 
        missingCenters: [], 
        error: "Worker returned undefined data",
        isCalculating: false
      });
      workerRef.current = null;
    };
    worker.onerror = (err) => {
      console.error("Audit worker error:", err);
      setAuditResults((prev: any) => ({ ...prev, error: err.message || "Lỗi worker", isCalculating: false }));
      workerRef.current = null;
    };

    worker.postMessage({
      fileAData,
      rosterData,
      fromDate,
      toDate,
      checkTAsDataRaw,
      fileNameA,
      centerMappingParam,
    });

    return () => {
      if (workerRef.current) { workerRef.current.terminate(); workerRef.current = null; }
    };
  }, [fileAData, rosterData, fromDate, toDate, checkTAsDataRaw, fileNameA, fuzzyThreshold, centerMappingParam]);

  const fileNameB = appData.Q_RosterFileName || "";
  const fileNameConfig = appData.Q_CheckTAsFileName || "";

  const clearData = () => {
    updateAppData((prev) => ({
      ...prev,
      Q_TeacherHours: [],
      Q_TeacherHoursFileName: "",
      Q_Roster: [],
      Q_RosterFileName: "",
      Q_CheckTAs: [],
      Q_CheckTAsFileName: "",
    }));
  };

  return {
    state: { fileAData, fileNameA, fileNameB, fileNameConfig, isProcessing, errorMsg, fuzzyThreshold },
    computed: { auditResults },
    actions: { handleUploadFileA, handleUploadFileB, handleUploadFileConfig, setErrorMsg, clearData, setFuzzyThreshold },
  };
}
