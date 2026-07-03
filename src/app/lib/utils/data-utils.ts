/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-useless-escape */
import * as XLSX from "xlsx";
import * as fuzz from "fuzzball";

export function normalizeId(id: any): string {
  if (id === null || id === undefined) return "";
  return String(id).trim();
}

const normalizedKeysCache = new Map<string, string[]>();
const objLowerKeysCache = new WeakMap<any, Record<string, string>>();

export function getVal(obj: any, searchKeys: string[]): any {
  if (!obj) return undefined;
  
  const cacheKey = searchKeys.join("|");
  let normalizedKeys = normalizedKeysCache.get(cacheKey);
  if (!normalizedKeys) {
    normalizedKeys = searchKeys.map(k => k.trim().toLowerCase());
    normalizedKeysCache.set(cacheKey, normalizedKeys);
  }

  let lowerKeyMap = objLowerKeysCache.get(obj);
  if (!lowerKeyMap) {
    lowerKeyMap = {};
    for (const k in obj) {
      lowerKeyMap[k.trim().toLowerCase()] = k;
    }
    objLowerKeysCache.set(obj, lowerKeyMap);
  }

  for (let i = 0; i < normalizedKeys.length; i++) {
    const nk = normalizedKeys[i];
    if (lowerKeyMap[nk] !== undefined) {
      return obj[lowerKeyMap[nk]];
    }
  }

  // Secondary pass: more aggressive normalization for encoding issues
  const aggressiveNormalize = (s: string) => {
    return s.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]/g, ""); // Keep only alphanumeric
  };

  const targetAggressive = normalizedKeys.map(aggressiveNormalize);
  for (const k in obj) {
    const kAggressive = aggressiveNormalize(k);
    if (targetAggressive.includes(kAggressive)) {
      return obj[k];
    }
  }

  return undefined;
}

export function parseTimeStrToHours(val: any): number {
  if (!val) return 0;
  if (val instanceof Date)
    return (val.getHours() * 3600 + val.getMinutes() * 60 + val.getSeconds()) / 86400;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const str = val.trim();
    if (str.includes(":")) {
      const p = str.split(":");
      return (parseInt(p[0]) || 0) / 24 + (parseInt(p[1]) || 0) / 1440 + parseInt(p[2] || "0") / 86400;
    }
    const parsed = parseFloat(str.replace(/,/g, "."));
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

export function generateUUID(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function cleanText(str: any) {
  return str ? String(str).replace(/_/g, " ") : "";
}

export function formatTime12Hour(val: any): string {
  if (!val) return "";
  if (typeof val === "number") {
    const totalMins = Math.round(val * 24 * 60);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const period = hrs >= 12 ? "PM" : "AM";
    const displayHrs = hrs % 12 || 12;
    return `${displayHrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")} ${period}`;
  }
  if (val instanceof Date) {
    let hrs = val.getHours();
    const mins = val.getMinutes();
    const period = hrs >= 12 ? "PM" : "AM";
    hrs = hrs % 12 || 12;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")} ${period}`;
  }
  return String(val);
}

export function formatDurationFromHours(hours: number): string {
  if (!hours || isNaN(hours)) return "0:00";
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}

export function removeVietnameseTones(str: string): string {
  if (!str) return "";
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  return str.toUpperCase().trim();
}

export function findColumnMapping(
  fileHeaders: string[],
  targetHeaders: string[],
  manualMapping?: Record<string, string>,
): Record<string, number> {
  const colMap: Record<string, number> = {};

  targetHeaders.forEach((target) => {
    // 1. Check manual mapping first
    if (manualMapping && manualMapping[target]) {
      const mappedHeader = manualMapping[target].toUpperCase().trim();
      const idx = fileHeaders.findIndex(
        (h) => h.toUpperCase().trim() === mappedHeader,
      );
      if (idx !== -1) {
        colMap[target] = idx;
        return;
      }
    }

    const tUp = target.toUpperCase().trim();

    // 2. Exact match
    let idx = fileHeaders.findIndex((h) => h.toUpperCase().trim() === tUp);

    // 2. Fuzzy match if not found
    if (idx === -1) {
      if (tUp === "FULL NAME") {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return (
            v.includes("FULL NAME") ||
            v.includes("HỌ VÀ TÊN") ||
            v.includes("TÊN NHÂN VIÊN")
          );
        });
      } else if (tUp === "ID NUMBER") {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return v.includes("ID") || v.includes("MÃ NV") || v.includes("CMND");
        });
      } else if (tUp === "TOTAL PAYMENT") {
        idx = fileHeaders.findIndex((h) => h.toUpperCase().includes("BONUS"));
        if (idx === -1) {
          idx = fileHeaders.findIndex((h) => {
            const v = h.toUpperCase();
            return (
              v.includes("TOTAL") || v.includes("TỔNG") || v.includes("THỰC NHẬN")
            );
          });
        }
      } else if (tUp === "BANK ACCOUNT NUMBER") {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return (
            v.includes("ACCOUNT") ||
            v.includes("TÀI KHOẢN") ||
            v.includes("STK")
          );
        });
      } else if (tUp === "BANK NAME") {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return v.includes("BANK NAME") || v.includes("NGÂN HÀNG");
        });
      } else if (tUp === "CITAD CODE") {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return v.includes("CITAD");
        });
      } else if (tUp === "TAX CODE") {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return (
            v.includes("TAX") || v.includes("MST") || v.includes("MÃ SỐ THUẾ")
          );
        });
      } else if (tUp === "CONTRACT NO") {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return v.includes("CONTRACT") || v.includes("HỢP ĐỒNG");
        });
      } else if (tUp === "FROM") {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return (
            v === "FROM" ||
            v === "TỪ" ||
            v.includes("TỪ NGÀY") ||
            v === "START DATE"
          );
        });
      } else if (tUp === "TO") {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return (
            v === "TO" ||
            v === "ĐẾN" ||
            v.includes("ĐẾN NGÀY") ||
            v === "END DATE"
          );
        });
      } else if (tUp === "NO") {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return v === "NO" || v === "STT";
        });
      } else if (tUp === "SALARY SCALE") {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return (
            v.includes("SCALE") || v.includes("MỨC LƯƠNG") || v.includes("RANK")
          );
        });
      } else if (tUp === "BUSINESS") {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return (
            v.includes("BUSINESS") || v.includes("KHỐI") || v.includes("BUS")
          );
        });
      } else if (tUp === "L07") {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return (
            v.includes("L07") || v.includes("CENTER") || v.includes("TRUNG TÂM")
          );
        });
      }
    }

    colMap[target] = idx;
  });

  return colMap;
}

export function parseMoneyToNumber(val: any): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;

  let str = String(val).trim();
  if (!str) return 0;

  let isNegative = false;
  if (str.startsWith("-") || (str.startsWith("(") && str.endsWith(")"))) {
    isNegative = true;
  }

  // Remove currency symbols, spaces, parenthesis, and minus sign
  str = str.replace(/[₫$€\s\(\)\-]/g, "");

  const lastComma = str.lastIndexOf(",");
  const lastDot = str.lastIndexOf(".");

  // Logic to distinguish between VN (1.234.567,89) and US (1,234,567.89)
  if (lastComma > lastDot) {
    // Likely VN format: 1.234,56 — dots are thousand sep, comma is decimal
    str = str.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    const dotCount = (str.match(/\./g) || []).length;
    const commaCount = (str.match(/,/g) || []).length;
    if (dotCount > 1) {
      // Multiple dots → thousands seps, e.g. 1.234.567
      str = str.replace(/\./g, "");
    } else if (dotCount === 1) {
      const parts = str.split(".");
      if (parts[1].length === 3 && lastComma === -1 && commaCount === 0) {
        // Ambiguous: 178.000 — in VN context this is 178,000
        str = str.replace(/\./g, "");
      } else {
        // US decimal: 178.5
        str = str.replace(/,/g, "");
      }
    } else {
      str = str.replace(/,/g, "");
    }
  } else if (lastComma !== -1 && lastDot === -1) {
    // Only commas — could be US thousands: 178,000
    const parts = str.split(",");
    const allThree = parts.slice(1).every((p) => p.length === 3);
    if (allThree) {
      str = str.replace(/,/g, ""); // thousands
    } else {
      str = str.replace(/,/g, "."); // decimal fallback
    }
  } else {
    str = str.replace(/[,.]/g, "");
  }

  const num = parseFloat(str);
  if (isNaN(num)) return 0;
  return isNegative ? -num : num;
}

export const COMMON_FIELD_ALIASES: Record<string, string[]> = {
  No: ["STT", "NO", "NUMBER", "SỐ THỨ TỰ"],
  "ID Number": ["ID", "MÃ NV", "CMND", "MÃ NHÂN VIÊN", "EMPLOYEE ID", "MÃ SỐ", "EMAIL", "ID NUMBER"],
  "Full Name": ["NAME", "TÊN", "HỌ VÀ TÊN", "TÊN NHÂN VIÊN", "FULL NAME", "TEACHER", "GIÁO VIÊN"],
  "Full name": ["NAME", "TÊN", "HỌ VÀ TÊN", "TÊN NHÂN VIÊN", "FULL NAME"],
  "Salary Scale": ["SCALE", "MỨC LƯƠNG", "RANK", "BẬC LƯƠNG", "SALARY RANK"],
  From: [
    "FROM",
    "TỪ",
    "TỪ NGÀY",
    "START DATE",
    "NGÀY BẮT ĐẦU",
    "START",
    "DATE FROM",
    "FROM DATE",
  ],
  To: [
    "TO",
    "ĐẾN",
    "ĐẾN NGÀY",
    "END DATE",
    "NGÀY KẾT THÚC",
    "END",
    "DATE TO",
    "TO DATE",
  ],
  "Bank Account Number": [
    "ACCOUNT",
    "TÀI KHOẢN",
    "STK",
    "SỐ TÀI KHOẢN",
    "BANK ACCOUNT",
  ],
  "Bank Name": ["BANK NAME", "NGÂN HÀNG", "TÊN NGÂN HÀNG", "TEN NGAN HANG"],
  "CITAD code": ["CITAD", "MÃ CITAD", "CITAD CODE"],
  "TAX CODE": ["TAX", "MST", "MÃ SỐ THUẾ", "TAX CODE"],
  "Contract No": ["CONTRACT", "HỢP ĐỒNG", "SỐ HỢP ĐỒNG", "CONTRACT NO"],
  "CHARGE TO LXO": ["LXO", "CHARGE LXO", "CHARGE TO LXO"],
  "CHARGE TO EC": ["EC", "CHARGE EC", "CHARGE TO EC"],
  "CHARGE TO PT-DEMO": ["PT-DEMO", "CHARGE PT-DEMO", "CHARGE TO PT-DEMO"],
  "Charge MKT Local": ["MKT", "MKT LOCAL", "CHARGE MKT LOCAL", "CHARGE TO MKT LOCAL", "CHARGE MKT", "CHARGE TO CENTER MKT"],
  "CHARGE TO OTHER": ["CHARGE OTHER", "CHARGE TO OTHER", "OTHER"],
  "Charge Renewal Projects": [
    "RENEWAL",
    "RENEWAL PROJECTS",
    "CHARGE TO RENEWAL PROJECTS",
  ],
  "Charge Discovery Camp": [
    "DISCOVERY",
    "DISCOVERY CAMP",
    "CHARGE TO DISCOVERY CAMP",
  ],
  "Charge Summer Outing": [
    "SUMMER OUTING",
    "CHARGE TO SUMMER OUTING",
  ],
  "Charge Summer Instructors": [
    "SUMMER INSTRUCTORS",
    "CHARGE TO SUMMER INSTRUCTORS",
  ],
  "TOTAL PAYMENT": [
    "TOTAL",
    "TỔNG",
    "THỰC NHẬN",
    "TỔNG THANH TOÁN",
    "TOTAL PAYMENT",
    "NET PAY",
    "AMOUNT",
    "BONUS",
  ],
  Center: [
    "CENTER",
    "COST CENTER",
    "TRUNG TÂM",
    "AE CODE",
    "AE",
    "MÃ AE",
    "MÃ TT",
    "MÃ TRUNG TÂM",
  ],
  Business: ["BUSINESS", "KHỐI", "BUS", "BỘ PHẬN"],
  "Center Code": [
    "CENTER CODE",
    "MÃ TRUNG TÂM",
    "CƠ SỞ",
    "L07",
    "MÃ",
    "CENTERCODE",
    "CENTER",
  ],
  "Class Name / Event Note": [
    "CLASS",
    "CLASS NAME",
    "EVENT NOTE",
    "TÊN LỚP",
    "LỚP",
    "MÃ LỚP",
    "CLASS NAME / EVENT NOTE",
  ],
  Type: ["TYPE", "EVENT TYPE", "CLASS TYPE", "LOẠI LỚP", "LOẠI", "KIND"],
  Class: [
    "CLASS",
    "CLASS NAME",
    "CLASS NAME / EVENT NOTE",
    "TÊN LỚP",
    "LỚP",
    "MÃ LỚP",
    "CLASS CODE",
    "CLASS_NAME",
  ],
  Teacher: ["TEACHER", "GIÁO VIÊN", "GIẢNG VIÊN", "TÊN GIÁO VIÊN", "FULL NAME"],
  Date: ["DATE", "NGÀY", "DATE OF CLASS", "NGÀY DẠY", "SCHEDULE DATE", "SCHEDULE_DATE"],
  Total: ["TOTAL HOURS", "TỔNG GIỜ", "HOURS", "TOTAL"],
  "Quy ra số giờ làm": [
    "QUY RA SỐ GIỜ LÀM",
    "TOTAL",
    "ACTUAL HOURS",
    "WORKING HOURS",
    "GIỜ LÀM",
    "SỐ GIỜ",
    "HOURS",
  ],
};

// Reliable VN number formatter — does NOT depend on browser locale
export function formatVNThousands(num: number): string {
  if (isNaN(num)) return "0";
  const isNeg = num < 0;
  const abs = Math.round(Math.abs(num));
  // Add dots every 3 digits (VN standard: 1.234.567)
  const intStr = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (isNeg ? "-" : "") + intStr;
}

export function formatVND(val: any): string {
  return formatMoneyVND(val);
}

export function formatMoneyVND(val: any): string {
  const num = Math.round(parseMoneyToNumber(val));
  if (num === 0) return "0";
  return formatVNThousands(num);
}

export function formatVNDecimal(val: any, decimals: number = 2): string {
  const num = parseMoneyToNumber(val);
  if (isNaN(num)) return "";
  
  // Using formatVNRobust ensures standard vi-VN formatting (dot for thousands, comma for decimals)
  return formatVNRobust(num, decimals);
}

export function formatNumber(
  val: any,
  type: "string" | "number" | "money" | "date" = "number",
): string {
  if (val === null || val === undefined) return "";

  switch (type) {
    case "money":
      return formatMoneyVND(val);
    case "number": {
      return formatVNDecimal(val, 2);
    }
    case "date":
      return formatExcelDate(val);
    default:
      return String(val);
  }
}

function adjustToVietnamMidnight(val: Date): Date {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
    const parts = formatter.formatToParts(val);
    const getPart = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || "0", 10);
    const year = getPart("year");
    const month = getPart("month") - 1;
    const day = getPart("day");
    return new Date(year, month, day);
  } catch {
    const d = new Date(val);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
}

export function toVietnamDateString(date: Date | null | undefined): string {
  if (!date || isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseAnyDate(val: any, defaultYear?: number | null): Date | null {
  if (val === null || val === undefined || val === "") return null;

  let date: Date;

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return adjustToVietnamMidnight(val);
  } else if (typeof val === "number" || (typeof val === "string" && /^\d+(\.\d+)?$/.test(val.trim()) && val.trim().length >= 4 && val.trim().length <= 6)) {
    const num = typeof val === "number" ? val : parseFloat(val);
    if (isNaN(num)) return null;
    // Excel serial number to JS date (UTC)
    date = new Date(Math.round((num - 25569) * 86400 * 1000));
    return adjustToVietnamMidnight(date);
  } else {
    let str = String(val).trim();
    if (!str) return null;

    // Remove day of week prefix like "Sat ", "Sun ", "Mon ", etc.
    str = str.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*[,.\s]+/gi, "").trim();
    // Remove Vietnamese day of week prefix like "T2 ", "T3 ", ..., "T7 ", "CN "
    str = str.replace(/^(T[2-7]|CN)\s+/gi, "").trim();

    // 0. Try Vietnamese MMM D, YYYY format: "Thg1 21, 2026" or "Tháng 1 21, 2026"
    const vnMmmPattern = /^(?:Thg|Tháng)\s*(\d{1,2})\s+(\d{1,2}),\s*(\d{4})$/i;
    const vnMatch = str.match(vnMmmPattern);
    if (vnMatch) {
      const month = parseInt(vnMatch[1]) - 1;
      const day = parseInt(vnMatch[2]);
      const year = parseInt(vnMatch[3]);
      const dObj = new Date(year, month, day);
      if (
        dObj.getFullYear() === year &&
        dObj.getMonth() === month &&
        dObj.getDate() === day
      ) {
        return adjustToVietnamMidnight(dObj);
      }
    }

    // 1. Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmyPattern = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})(?:\s+.*)?$/;
    const match = str.match(dmyPattern);
    if (match) {
      const [_, d, m, y] = match;
      const day = parseInt(d);
      const month = parseInt(m) - 1;
      let year = parseInt(y);
      if (year < 100) year += 2000;

      const dObj = new Date(year, month, day);
      if (
        dObj.getFullYear() === year &&
        dObj.getMonth() === month &&
        dObj.getDate() === day
      ) {
        return adjustToVietnamMidnight(dObj);
      }
    }

    // 2. Try YYYY/MM/DD or YYYY-MM-DD or YYYY.MM.DD
    const ymdPattern = /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})(?:\s+.*)?$/;
    const ymdMatch = str.match(ymdPattern);
    if (ymdMatch) {
      const [_, y, m, d] = ymdMatch;
      const year = parseInt(y);
      const month = parseInt(m) - 1;
      const day = parseInt(d);
      const dObj = new Date(year, month, day);
      if (
        dObj.getFullYear() === year &&
        dObj.getMonth() === month &&
        dObj.getDate() === day
      ) {
        return adjustToVietnamMidnight(dObj);
      }
    }

    // 2b. Try DD/MM or DD-MM or DD.MM without year
    const noYearPattern = /^(\d{1,2})[\/\-\.](\d{1,2})(?:\s+.*)?$/;
    const noYearMatch = str.match(noYearPattern);
    if (noYearMatch) {
      const p1 = parseInt(noYearMatch[1]);
      const p2 = parseInt(noYearMatch[2]);
      let day = p1;
      let month = p2 - 1;
      if (p1 <= 12 && p2 > 12) {
        month = p1 - 1;
        day = p2;
      }
      const nowYear = defaultYear || new Date().getFullYear();
      const dObj = new Date(nowYear, month, day);
      if (
        dObj.getFullYear() === nowYear &&
        dObj.getMonth() === month &&
        dObj.getDate() === day
      ) {
        return adjustToVietnamMidnight(dObj);
      }
    }

    // 3. Try MM/YYYY or MM-YYYY or MM.YYYY
    const myPattern = /^(\d{1,2})[\/\-\.](\d{2,4})(?:\s+.*)?$/;
    const myMatch = str.match(myPattern);
    if (myMatch) {
      const month = parseInt(myMatch[1]) - 1;
      let year = parseInt(myMatch[2]);
      if (year < 100) year += 2000;
      const dObj = new Date(year, month, 1);
      if (dObj.getFullYear() === year && dObj.getMonth() === month) {
        return adjustToVietnamMidnight(dObj);
      }
    }

    // 4. Fallback to native Date parsing
    // If it's a "YYYY-MM-DD" string, most browsers parse it as UTC.
    // If it's "YYYY/MM/DD", it's usually local.
    // To be safe, if it's YYYY-MM-DD, we force it to look local or parse parts.
    date = new Date(str);
    if (isNaN(date.getTime())) return null;

    // Check if it's an ISO-like string and normalize if needed
    if (str.includes("-") && !str.includes("/") && !str.includes(" ")) {
       // Likely YYYY-MM-DD
       const p = str.split("-");
       if (p.length >= 3) {
         const y = parseInt(p[0]);
         const m = parseInt(p[1]) - 1;
         const d = parseInt(p[2]);
         return adjustToVietnamMidnight(new Date(y, m, d));
       }
    }
  }

  if (isNaN(date.getTime())) return null;

  return adjustToVietnamMidnight(date);
}

export function formatExcelDate(val: any): string {
  const date = parseAnyDate(val);
  if (!date) return String(val || "");

  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Processes data before exporting to Excel via SheetJS.
 * It adjusts all JavaScript Date objects to UTC midnight of their local day,
 * ensuring SheetJS's UTC-based date conversion matches the local timezone's calendar day.
 * This completely prevents the "off-by-one" day error (shifted 1 day back) in positive/negative offsets.
 */
export function prepareDataForExport(data: any[]): any[] {
  if (!Array.isArray(data)) return data;
  return data.map((row) => {
    if (!row || typeof row !== "object") return row;
    const newRow: any = {};
    for (const key of Object.keys(row)) {
      const val = row[key];
      if (val instanceof Date) {
        if (!isNaN(val.getTime())) {
          // Construct a Date object where the UTC components match the local calendar components
          newRow[key] = new Date(Date.UTC(
            val.getFullYear(),
            val.getMonth(),
            val.getDate()
          ));
        } else {
          newRow[key] = null;
        }
      } else {
        newRow[key] = val;
      }
    }
    return newRow;
  });
}

export function isMoneyColumn(header: string): boolean {
  const h = String(header).toUpperCase();
  const excluded = [
    "PAYMENT DETAILS",
    "PAYMENT TYPE",
    "PAYMENT SERIAL NUMBER",
    "CHARGE TYPE",
    "DOCUMENT ID",
  ];
  if (excluded.includes(h)) return false;
  return (
    h.includes("CHARGE") ||
    h.includes("PAYMENT") ||
    h.includes("TOTAL") ||
    h.includes("LƯƠNG") ||
    h.includes("CHÊNH LỆCH") ||
    h.includes("TIỀN") ||
    h.includes("AMOUNT") ||
    h.includes("FEE") ||
    h.includes("THƯỞNG")
  );
}

export function scoreMatch(
  header: string,
  target: string,
  aliases: string[],
): number {
  const h = header.toUpperCase().trim();
  const t = target.toUpperCase().trim();

  if (h === t) return 100;
  if (aliases.some((a) => a.toUpperCase().trim() === h)) return 95;

  const hNorm = removeVietnameseTones(h);
  const tNorm = removeVietnameseTones(t);
  if (hNorm === tNorm) return 90;
  if (aliases.some((a) => removeVietnameseTones(a) === hNorm)) return 85;

  if (h.includes(t) || t.includes(h)) return 80;
  if (
    aliases.some((a) => {
      const aUp = a.toUpperCase().trim();
      return h.includes(aUp) || aUp.includes(h);
    })
  )
    return 75;

  if (hNorm.includes(tNorm) || tNorm.includes(hNorm)) return 70;

  // Fuzzy Matching for better flexibility
  const fuzzyTargetScore = fuzz.token_set_ratio(hNorm, tNorm);
  if (fuzzyTargetScore > 80) return fuzzyTargetScore - 10;
  
  let bestAliasFuzzyScore = 0;
  aliases.forEach((a) => {
    const aNorm = removeVietnameseTones(a.toUpperCase().trim());
    const score = fuzz.token_set_ratio(hNorm, aNorm);
    if (score > bestAliasFuzzyScore) bestAliasFuzzyScore = score;
  });

  if (bestAliasFuzzyScore > 80) return bestAliasFuzzyScore - 15;

  return 0;
}

export async function autoMapColumns(
  file: File,
  targetFields: string[],
): Promise<Record<string, string>> {
  try {
    const { buffer: buf, name: fileName } = await getExcelFileBuffer(file);
    const isCsv = fileName.toLowerCase().endsWith(".csv") || fileName.toLowerCase().endsWith(".gsheet") || fileName.toLowerCase().endsWith(".txt");
    let wb;
    if (isCsv) {
      const decoder = new TextDecoder("utf-8");
      const text = decoder.decode(buf);
      wb = XLSX.read(text, { type: "string", sheetRows: 50, raw: true });
    } else {
      wb = XLSX.read(buf, { type: "array", sheetRows: 50, raw: true });
    }
    const allHeaders: string[] = [];
    const usedHeaders = new Set<string>();

    wb.SheetNames.forEach((name) => {
      const ws = wb.Sheets[name];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: "",
        raw: false
      });

      for (let i = 0; i < Math.min(rows.length, 50); i++) {
        const row = rows[i];
        if (row && Array.isArray(row)) {
          row.forEach((cell) => {
            const cellStr = String(cell).trim().replace(/\s+/g, ' '); 
            if (cellStr.length > 0 && isNaN(Number(cellStr))) {
              if (!usedHeaders.has(cellStr.toLowerCase())) {
                usedHeaders.add(cellStr.toLowerCase());
                allHeaders.push(cellStr);
              }
            }
          });
        }
      }
    });

    const mapping: Record<string, string> = {};
    targetFields.forEach((target) => {
      const aliases = COMMON_FIELD_ALIASES[target] || [target.toUpperCase()];
      let bestMatch = "";
      let bestScore = 0;

      allHeaders.forEach((h) => {
        const score = scoreMatch(h, target, aliases);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = h;
        }
      });

      if (bestScore >= 60) {
        mapping[target] = bestMatch;
      }
    });

    return mapping;
  } catch (error) {
    console.error("Error auto-mapping columns:", error);
    return {};
  }
}

export function isDateColumn(header: string): boolean {
  const h = String(header).toUpperCase();
  return (
    h === "FROM" ||
    h === "TO" ||
    h.includes("DATE") ||
    h.includes("NGÀY") ||
    h.includes("DOB") ||
    h.includes("THÁNG")
  );
}

export async function fetchWithBackoff(
  url: string,
  options?: RequestInit,
  retries = 3,
  backoff = 1000,
): Promise<Response> {
  try {
    const response = await fetch(url, options);

    if (response.status === 429 && retries > 0) {
      console.warn(`Quá tải! Thử lại sau ${backoff}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return fetchWithBackoff(url, options, retries - 1, backoff * 2);
    }

    return response;
  } catch (err) {
    if (retries > 0) {
      console.warn(`Fetch error, retrying in ${backoff}ms...`, err);
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return fetchWithBackoff(url, options, retries - 1, backoff * 2);
    }
    throw err;
  }
}

export async function fetchGoogleSheetAsFile(url: string, originalFileName?: string): Promise<File> {
  console.log(`[fetchGoogleSheetAsFile] Using backend proxy for: ${url}`);
  try {
    const response = await fetchWithBackoff("/api/gs-export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Lỗi server (${response.status})`);
    }

    const contentType = response.headers.get("content-type") || "";
    const isCsv = contentType.includes("text/csv");
    const arrayBuffer = await response.arrayBuffer();
    
    let ext = isCsv ? ".csv" : ".xlsx";
    let mimeType = isCsv ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    
    // Fallback detection if headers are weird
    if (!isCsv && url.includes("output=csv")) {
      ext = ".csv";
      mimeType = "text/csv";
    }

    const baseName = originalFileName ? originalFileName.replace(/\.gsheet$/i, "") : "GoogleSheet";
    const fileName = baseName.endsWith(ext) ? baseName : baseName + ext;
    
    const blob = new Blob([arrayBuffer], { type: mimeType });
    return new File([blob], fileName, { type: mimeType });
  } catch (err: any) {
    console.warn(`[fetchGoogleSheetAsFile] Backend failed, attempting direct client-side fetch (likely to fail due to CORS): ${err.message}`);
    
    // Direct client-side fetch fallback (likely to hit CORS, but better than nothing as a last resort)
    let fetchUrl = url;
    if (url.includes("docs.google.com/spreadsheets/d/e/")) {
      const pubMatch = url.match(/\/d\/e\/([a-zA-Z0-9-_]{20,})/);
      if (pubMatch) {
        fetchUrl = `https://docs.google.com/spreadsheets/d/e/${pubMatch[1]}/pub?output=csv`;
      }
    } else {
      const dMatch = url.match(/\/d\/([a-zA-Z0-9-_]{15,})/);
      const idMatch = url.match(/[?&]id=([a-zA-Z0-9-_]{15,})/);
      if (dMatch || idMatch) {
        const spreadsheetId = dMatch ? dMatch[1] : idMatch![1];
        fetchUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
      }
    }

    const directRes = await fetch(fetchUrl);
    if (!directRes.ok) throw new Error(`Không thể tải Google Sheet trực tiếp (CORS hoặc Private). Vui lòng kiểm tra lại link hoặc cấp quyền cho service account.`);
    
    const ab = await directRes.arrayBuffer();
    const ct = directRes.headers.get("content-type") || "";
    const name = (originalFileName || "GoogleSheet.csv").replace(/\.gsheet$/i, ".csv");
    return new File([ab], name, { type: ct || "text/csv" });
  }
}

export async function getExcelFileBuffer(file: File): Promise<{ buffer: ArrayBuffer, name: string }> {
  let finalFile = file;
  if (file.name.toLowerCase().endsWith(".gsheet")) {
    try {
      const text = await file.text();
      let url = "";
      try {
        const json = JSON.parse(text);
        url = json.url;
      } catch (e) {
        url = text.trim();
      }
      
      if (!url || !url.startsWith("http")) {
        throw new Error("Nội dung file .gsheet không hợp lệ (thiếu URL).");
      }

      finalFile = await fetchGoogleSheetAsFile(url, file.name);
    } catch (err: any) {
      console.error("[getExcelFileBuffer] Error fetching:", err);
      throw new Error(`Lỗi đọc file .gsheet: ${err.message}`);
    }
  }

  const buffer = await finalFile.arrayBuffer();
  return { buffer, name: finalFile.name };
}

export async function readExcelFile(
  file: File,
): Promise<XLSX.WorkBook> {
  const { buffer, name } = await getExcelFileBuffer(file);
  const isCsv = name.toLowerCase().endsWith(".csv") || name.toLowerCase().endsWith(".gsheet") || name.toLowerCase().endsWith(".txt");
  
  if (isCsv) {
    const decoder = new TextDecoder("utf-8");
    const text = decoder.decode(buffer);
    return XLSX.read(text, { type: "string", cellDates: true, raw: true });
  }
  return XLSX.read(buffer, { type: "array", cellDates: true, raw: true });
}
