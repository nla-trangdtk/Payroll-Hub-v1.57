/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from "xlsx";

self.onmessage = async (e: MessageEvent) => {
  try {
    const { fileBuffer, fileName } = e.data;
    const name = fileName || "unknown.xlsx";
    
    if (!fileBuffer) {
      throw new Error("No file data provided to worker.");
    }

    const isCsv = name.toLowerCase().endsWith(".csv") || name.toLowerCase().endsWith(".gsheet") || name.toLowerCase().endsWith(".txt");
    let workbook;
    if (isCsv) {
      const decoder = new TextDecoder("utf-8");
      const text = decoder.decode(fileBuffer);
      workbook = XLSX.read(text, { type: "string", cellDates: true, raw: true });
    } else {
      workbook = XLSX.read(fileBuffer, { type: "array", cellDates: true, raw: true });
    }
    const allRows: any[] = [];

    const checkHeaders = (row: any[]) => {
      return row.some((c) => {
        const text = String(c).toLowerCase().trim();
        if (!text) return false;
        return (
          text === "no" || text === "no." || text === "stt" || text === "id" ||
          text === "nv" || text === "mã nv" || text === "tên" || text === "họ tên" ||
          text === "họ và tên" || text === "nhân viên" || text === "employee" ||
          text === "time" || text === "hours" || text === "duration" ||
          text.includes("giờ làm") || text.includes("số giờ") ||
          text.includes("mã ae") || text.includes("account") ||
          text === "center" || text === "s code" || text === "class" ||
          text.includes("class name") || text === "lớp" || text === "ngày" ||
          text === "date" || text === "cơ sở" || text === "location" || text === "id number" ||
          text === "from" || text === "to" || text === "start" || text === "end" ||
          text === "task" || text === "activity" || text === "session" || text.includes("phòng") ||
          text === "name" || text === "full name" || text === "code" || text === "ma nv" || text === "teacher"
        );
      });
    };

    const hasRosterTab = workbook.SheetNames.some(name => {
      const upper = name.toUpperCase().trim();
      return upper === "ROSTER" || upper === "Q_ROSTER" || upper.includes("DỮ LIỆU") || upper.includes("DATA");
    });

    const sheetsToProcess = hasRosterTab 
      ? workbook.SheetNames.filter(name => {
          const upper = name.toUpperCase().trim();
          return upper === "ROSTER" || upper === "Q_ROSTER" || upper.includes("DỮ LIỆU") || upper.includes("DATA");
        })
      : workbook.SheetNames;

    for (const sheetName of sheetsToProcess) {
      const ws = workbook.Sheets[sheetName];
      if (!ws) continue;

      const rawData: any[][] = XLSX.utils.sheet_to_json(
        ws,
        { header: 1, defval: "", blankrows: false, raw: false }
      );

      if (rawData.length > 0) {
        let headerRowIdx = -1;
        // Increase search depth for headers to 50
        for (let i = 0; i < Math.min(50, rawData.length); i++) {
          if (checkHeaders(rawData[i] || [])) {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx === -1) {
          const sName = sheetName.toLowerCase();
          const looksLikeDataSheet =
            sName.includes("roster") || sName.includes("lịch") || sName.includes("data") ||
            sName.includes("sheet") || sName.includes("thống kê") || sName.includes("salary") ||
            sName.includes("staff") || sName.includes("báo cáo") || sName.includes("danh sách") ||
            workbook.SheetNames.length === 1;

          if (looksLikeDataSheet) {
            for (let i = 0; i < Math.min(20, rawData.length); i++) {
              const nonEmpties = (rawData[i] || []).filter((c: any) => String(c).trim() !== "");
              if (nonEmpties.length >= 3) {
                headerRowIdx = i;
                break;
              }
            }
          }
        }

        if (headerRowIdx === -1 && workbook.SheetNames.length > 1) {
          continue;
        }

        if (headerRowIdx !== -1) {
          const headers = rawData[headerRowIdx];
          for (let i = headerRowIdx + 1; i < rawData.length; i++) {
            const row = rawData[i] || [];
            if (!row.some((c: any) => String(c).trim() !== "")) continue;
            const obj: any = {};
            for (let j = 0; j < headers.length; j++) {
              const key = String(headers[j] || "").trim();
              if (key && !key.toLowerCase().includes("__empty")) {
                obj[key] = row[j] !== undefined && row[j] !== null ? row[j] : "";
              }
            }
            if (Object.keys(obj).length > 0) {
              allRows.push(obj);
            }
          }
        } else {
          const simpleJson = XLSX.utils.sheet_to_json(
            workbook.Sheets[sheetName],
            { defval: "" }
          );
          if (Array.isArray(simpleJson) && simpleJson.length > 0) {
            allRows.push(...(simpleJson as any[]));
          }
        }
      }
    }

    if (allRows.length === 0) {
      throw new Error("File trống hoặc không tìm thấy dòng Tiêu đề hợp lệ.");
    }
    self.postMessage({ success: true, allRows });
  } catch (err: any) {
    self.postMessage({ success: false, error: err.message });
  }
};
