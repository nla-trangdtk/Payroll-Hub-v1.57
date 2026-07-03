/* eslint-disable */
import {
  parseAnyDate,
  toVietnamDateString,
  formatTime12Hour,
  normalizeId,
  getVal,
  parseTimeStrToHours,
  generateUUID,
} from "../lib/utils/data-utils";
import {
  getCenterInfoByAECode,
  getCenterInfoByL07,
  mapL07,
  getBusinessFromL07,
} from "../lib/utils/center-utils";
import { resolveL07Logic } from "../lib/utils/l07-resolver";
import {
  DEFAULT_SALARY_SCALES,
  ACADEMIC_FIELDS,
} from "../constants/timesheet-logic";

export function calculateTimesheet(params: any) {
  try {
    const {
      rosterData,
      salaryScaleData,
      staffData,
      cacheData,
      fromDateStr,
      toDateStr,
      appData,
      preferredYear,
      aeConfigData,
      checkTAsMap,
      classSizeMap,
      TASK_COLUMNS,
    } = params;

    if (!rosterData || rosterData.length === 0) {
      return {
        processedRosterData: [],
        employeeSummary: [],
        centerSummary: [],
        isCalculating: false,
      };
    }

  // Lookups reconstructed in worker
  const staffLookup = new Map();
  (staffData || []).forEach((s: any) => {
    const sid = normalizeId(getVal(s, ["id", "id number"]));
    const sn = String(getVal(s, ["full name", "name"])).trim().toLowerCase();
    if (sid) staffLookup.set(sid, s);
    if (sn) staffLookup.set(sn, s);
  });

  const salaryScaleLookup = new Map();
  (salaryScaleData || []).forEach((s: any) => {
    const sid = normalizeId(getVal(s, ["id", "id number"]));
    const sn = String(getVal(s, ["full name", "name"])).trim().toLowerCase();
    if (sid) salaryScaleLookup.set(sid, s);
    if (sn) salaryScaleLookup.set(sn, s);
  });

  const inputListLookup = new Map(
    (appData?.Timesheet_InputList || []).map((ir: any) => [ir.id, ir])
  );

  const cacheCodes = new Set(
    (cacheData || []).map((c: any) => String(getVal(c, ["code", "mã lớp"])).toLowerCase().trim())
  );

  const academicFieldSet = new Set(ACADEMIC_FIELDS);
  const dateCache = new Map<string, Date | null>();
  const dateStringCache = new Map<string, string>();
  const centerInfoCache = new Map<string, any>();

  const getSalaryRate = (id: string, name: string) => {
    const nid = normalizeId(id);
    const row = salaryScaleLookup.get(nid) || salaryScaleLookup.get(String(name || "").toLowerCase());
    const sCode = String(getVal(row || {}, ["s code", "scale"]) || "S1").trim().toUpperCase();
    const def = DEFAULT_SALARY_SCALES[sCode] || DEFAULT_SALARY_SCALES["S1"];
    let ac = def.ac, ad = def.ad;
    const su = def.summer, ou = def.outing, si = def.summerInstructors;
    if (row) {
      const rAc = getVal(row, ["academic price", "academic"]);
      const rAd = getVal(row, ["administrative price", "admin"]);
      if (rAc !== undefined && rAc !== "") ac = parseFloat(String(rAc).replace(/,/g, "")) || 0;
      if (rAd !== undefined && rAd !== "") ad = parseFloat(String(rAd).replace(/,/g, "")) || 0;
    }
    return { ac, ad, su, ou, si, sCode };
  };

  const normalizeStr = (str: string) => String(str).replace(/\s+/g, "").toUpperCase();

  const details: any[] = [];
  const empGroup: Record<string, any> = {};
  const cenGroup: Record<string, any> = {};
  const normCenterCache = new Map();

  let checkSkipped = 0;
  let dateSkipped = 0;
  let empSkipped = 0;

  rosterData.forEach((t: any) => {
    const rawDateVal = getVal(t, [
      "date", "ngay", "ngày", "tk_date", "session date", "sessiondate",
      "ngày học", "date of class", "scheduledate", "ngày làm việc",
      "thời gian", "kỳ", "ngày trực", "ngày tháng",
    ]);
    const dateKey = `${String(rawDateVal)}_${preferredYear}`;
    let rawDate = dateCache.get(dateKey);
    if (rawDate === undefined) {
      rawDate = parseAnyDate(rawDateVal, preferredYear);
      dateCache.set(dateKey, rawDate);
    }
    if (!rawDate) { dateSkipped++; return; }

    let rawDateStr = dateStringCache.get(dateKey);
    if (!rawDateStr) {
      rawDateStr = toVietnamDateString(rawDate);
      dateStringCache.set(dateKey, rawDateStr);
    }

    if (fromDateStr && toDateStr) {
      if (rawDateStr < fromDateStr) {
        const nextYearDate = new Date(rawDate);
        nextYearDate.setFullYear(rawDate.getFullYear() + 1);
        const nextYearStr = toVietnamDateString(nextYearDate);
        if (nextYearStr >= fromDateStr && nextYearStr <= toDateStr) {
          rawDate = nextYearDate;
          rawDateStr = nextYearStr;
        }
      } else if (rawDateStr > toDateStr) {
        const prevYearDate = new Date(rawDate);
        prevYearDate.setFullYear(rawDate.getFullYear() - 1);
        const prevYearStr = toVietnamDateString(prevYearDate);
        if (prevYearStr >= fromDateStr && prevYearStr <= toDateStr) {
          rawDate = prevYearDate;
          rawDateStr = prevYearStr;
        }
      }
    }

    if (fromDateStr && fromDateStr !== "Tất cả" && rawDateStr < fromDateStr) { dateSkipped++; return; }
    if (toDateStr && toDateStr !== "Tất cả" && rawDateStr > toDateStr) { dateSkipped++; return; }

    const rawEid = String(getVal(t, ["id", "id number", "teacher id", "emp id", "mã nv", "manv", "id nv", "mã nhân viên", "staff id", "code"]) || "").trim();
    const rawName = String(getVal(t, ["full name", "name", "teacher name", "tên", "họ và tên", "họ tên", "nhân viên", "tên nhân viên", "giáo viên", "staff name"]) || "").trim();
    const kId = rawEid.toUpperCase();

    if (["ATLS", "ECP", "KDG", "PRI", "TOTAL", "TỔNG", "CLASS", "IELTS", "LỚP"].some((kw) => kId.includes(kw)) || (kId.includes(".") && !rawName)) {
      return;
    }

    let empId = normalizeId(rawEid);
    if (!empId && !rawName) return;

    let effName = rawName;
    if (!empId || !effName) {
      const sMatch = staffLookup.get(empId) || staffLookup.get(String(rawName || "").toLowerCase());
      if (sMatch) {
        if (!empId) empId = normalizeId(getVal(sMatch, ["id", "id number"]));
        if (!effName) effName = getVal(sMatch, ["full name", "name"]);
      }
      if (!empId) empId = rawName;
      if (!effName) effName = empId;
    }

    const rawType = String(getVal(t, ["type", "type code", "type_code", "typecode", "task type", "task", "loại", "loại hoạt động", "event type", "activity", "category", "task type name", "taskType"]) || "").trim();
    const rCen = String(getVal(t, ["center code", "office code", "l07", "center", "cơ sở", "trung tâm", "chi nhánh", "mã trung tâm"]) || "").trim();
    const rawChargeToCenter = String(getVal(t, ["charge to center mkt", "charge to center", "chargetocenter", "charge to center mkt name"]) || "").trim();
    const rawAeCode = String(getVal(t, ["mã ae", "ae", "ae code"]) || "").trim();

    const rawClassCode = String(getVal(t, ["class code", "class", "class_code", "classcode", "lớp", "class name", "mã lớp", "tên lớp", "code", "mã lớp học", "classCode"]) || "");
    const resolvedAuth = resolveL07Logic({ rawCenter: rCen, rawChargeToCenter, sourceFile: t._sourceFile || appData?.Q_RosterFileName || "", rawType, rawClassCode, rawAeCode, empId, staffLookup, normCenterCache }, TASK_COLUMNS);
    let { l07, aeCode, taskField, correctedType, correctedClass } = resolvedAuth;
    const { chargeToCenterMkt, isMktLocal } = resolvedAuth;

    // Use corrected values directly as they default to raw inside resolveL07Logic
    const effectiveType = correctedType;
    const effectiveClass = correctedClass;

    const [yearStr, monthStr, dayStr] = rawDateStr.split("-");
    const dateStr = `${dayStr}/${monthStr}/${yearStr}`;

    const startVal = getVal(t, ["start", "from", "start time", "từ"]);
    const endVal = getVal(t, ["end", "to", "end time", "đến"]);
    const fromStr = formatTime12Hour(startVal);
    const toStr = formatTime12Hour(endVal);

    const sH = parseTimeStrToHours(startVal);
    const eH = parseTimeStrToHours(endVal);
    let durationHours = 0;
    if (startVal !== undefined && startVal !== "" && endVal !== undefined && endVal !== "") {
      durationHours = eH >= sH ? (eH - sH) * 24 : (eH + 1 - sH) * 24;
    } else {
      const fallbackStr = String(getVal(t, ["duration", "quy ra số giờ làm", "total", "actual hours", "working hours", "giờ làm", "số giờ", "hours", "tk_duration", "total hours", "tổng giờ", "time"]) || "0").trim();
      if (fallbackStr.includes(":")) {
        const p = fallbackStr.split(":");
        durationHours = (parseInt(p[0]) || 0) + (parseInt(p[1]) || 0) / 60;
      } else {
        durationHours = parseFloat(fallbackStr.replace(",", "."));
      }
    }

    let classSize = 0;
    const classSizeVal = getVal(t, ["class size", "sĩ số", "sỹ số", "no of students", "number of student", "number of students", "students", "số hv", "số học viên", "sĩ số lớp", "total students", "số lượng học viên", "sĩ số thực tế", "sỹ số thực tế", "actual size", "size", "số lượng", "sĩ số cơ sở"]);
    if (classSizeVal) classSize = parseInt(String(classSizeVal), 10) || 0;

    if (classSize === 0) {
      const normCls = normalizeStr(rawClassCode);
      const normCenter = normalizeStr(mapL07(rCen) || aeCode);
      if (normCls && normCenter && dateStr) {
        const key = `${normCenter}_${normCls}_${dateStr}`;
        if (checkTAsMap[key]) classSize = checkTAsMap[key];
        if (classSize === 0 && classSizeMap[`${normCenter}_${normCls}`]) classSize = classSizeMap[`${normCenter}_${normCls}`];
      }
    }

    let actHours = durationHours;
    if (rawType.toLowerCase() === "tutorial" || rawType.toLowerCase().includes("tutoring")) {
      const clsLower = String(getVal(t, ["class code", "class", "lớp", "class name", "mã lớp", "tên lớp", "classcode"])).toLowerCase().trim();
      const isCached = cacheCodes.has(clsLower);
      const hasPT = String(getVal(t, ["pt name", "gvpt"])).trim() !== "";
      if (classSize > 0) {
        if (classSize === 1) actHours = 0.5;
        else if (classSize <= 4) actHours = 1;
        else if (classSize <= 8) actHours = 1.5;
        else actHours = 2;
      } else if (isCached || hasPT) { actHours = 1; } else { actHours = 1; }
    } else if (rawType.toLowerCase().includes("club")) {
      if (classSize > 0 && classSize <= 10) actHours = 1;
      else if (classSize > 10) actHours = 1.5;
      else actHours = 1.5;
    } else if (rawType.toLowerCase().includes("demo")) {
      if (classSize > 0) {
        if (classSize <= 5) actHours = Math.round((durationHours + 0.25) * 100) / 100;
        else actHours = Math.round((durationHours + 0.5) * 100) / 100;
      } else { actHours = Math.round((durationHours + 0.5) * 100) / 100; }
    }

    if (rawType.toLowerCase().includes("admin") && !actHours) actHours = 1;

    const rates = getSalaryRate(empId, effName);
    let money = 0;
    let activeRate = rates.ad;
    if (taskField === "summer") { money = actHours * rates.su; activeRate = rates.su; }
    else if (taskField === "outing") { money = actHours * rates.ou; activeRate = rates.ou; }
    else if (academicFieldSet.has(taskField)) { money = actHours * rates.ac; activeRate = rates.ac; }
    else { money = actHours * rates.ad; activeRate = rates.ad; }

    const rawBUCol = String(getVal(t, ["khối", "business", "bus", "bộ phận", "bu", "khối/bu"]) || "").trim().toUpperCase();
    let centerBusiness = rawBUCol;
    if (!centerBusiness) { const rowInfo = inputListLookup.get(t._rowId) as any; centerBusiness = rowInfo?.bus || ""; }
    if (!centerBusiness) {
      let centerInfoForBus = centerInfoCache.get(l07);
      if (centerInfoForBus === undefined) { centerInfoForBus = getCenterInfoByL07(l07) || getCenterInfoByAECode(l07); centerInfoCache.set(l07, centerInfoForBus); }
      centerBusiness = (centerInfoForBus as any)?.bus || "";
    }
    if (centerBusiness === "AHN_HP") centerBusiness = "AHP";
    if (l07 && (l07 === "MKT LOCAL NORTH" || l07 === "MKT LOCAL NORTH_TH" || l07 === "MKT LOCAL NORTH_TN" || l07 === "MKT LOCAL NORTH_HP" || l07 === "MKT LOCAL NORTH_PT")) { centerBusiness = getBusinessFromL07(l07); }

    const detailRow = {
      id: generateUUID(),
      
      // 12 properties required for roster-raw table
      center: aeCode || l07,
      l07: l07,
      business: centerBusiness,
      ma_nv: empId,
      full_name: effName,
      ngay: dateStr,
      type: effectiveType,
      class: effectiveClass,
      gio_vao: fromStr,
      gio_ra: toStr,
      duration: durationHours,
      notes: String(getVal(t, ["notes", "note", "ghi chú", "ghi chu", "remarks"]) || "").trim().replace(/^["']|["']$/g, ""),
      overlap_check: "Không trùng",

      // Internal for overlap check and aggregation
      _sH: sH,
      _eH: eH,
      _taskField: taskField,
      _rates: rates,
      _activeRate: activeRate,
      _money: money,

      // Backward compatibility keys
      chargeToCenterMkt,
      taskField,
      employeeId: empId,
      fullName: effName,
      maAE: aeCode,
      date: dateStr,
      taskType: effectiveType,
      classCode: effectiveClass,
      from: fromStr,
      to: toStr,
      workingHours: actHours,
      rate: activeRate,
      payment: money,
    };
    const normalizeSearchStr = (s: string) => s ? s.toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "") : "";
    (detailRow as any)._searchStr = normalizeSearchStr(`${detailRow.classCode} ${detailRow.fullName} ${detailRow.employeeId}`);
    details.push(detailRow);
  });

  // -------------------------------------------------------------------------
  // 1. OVERLAP DETECTION
  // -------------------------------------------------------------------------
  const groups: Record<string, any[]> = {};
  details.forEach(d => {
    const key = `${d.ma_nv}|${d.full_name}|${d.ngay}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(d);
  });

  Object.values(groups).forEach(group => {
    if (group.length <= 1) return;
    for (let i = 0; i < group.length; i++) {
      const r1 = group[i];
      if (r1._sH === undefined || r1._eH === undefined) continue;
      const s1 = r1._sH;
      const e1 = r1._eH < r1._sH ? r1._eH + 1 : r1._eH;
      
      for (let j = 0; j < group.length; j++) {
        if (i === j) continue;
        const r2 = group[j];
        if (r2._sH === undefined || r2._eH === undefined) continue;
        const s2 = r2._sH;
        const e2 = r2._eH < r2._sH ? r2._eH + 1 : r2._eH;
        
        // Strict overlap: max start < min end
        if (Math.max(s1, s2) < Math.min(e1, e2)) {
          r1.overlap_check = "Trùng lịch";
          break;
        }
      }
    }
  });

  // -------------------------------------------------------------------------
  // 2. AGGREGATION (Filter out overlaps)
  // -------------------------------------------------------------------------
  details.forEach(detailRow => {
    if (detailRow.overlap_check === "Trùng lịch") return;

    const { l07, ma_nv: empId, full_name: effName, business: centerBusiness, duration: actHours, _taskField: taskField, _rates: rates, _money: money, ngay: dateStr } = detailRow;

    const empKey = `${l07}_${empId}_${centerBusiness}`;
    if (!empGroup[empKey]) {
      const nid = normalizeId(empId);
      const staffRow = staffLookup.get(nid) || staffLookup.get(String(effName || "").toLowerCase()) || {};
      const bankAccount = String(getVal(staffRow, ["bank account number", "account number", "stk", "số tài khoản"]) || "").trim();

      empGroup[empKey] = {
        id: generateUUID(), business: centerBusiness, center: l07, employeeId: empId, fullName: effName, bankAccountNumber: bankAccount, salaryScale: rates.sCode, from: fromDateStr, to: toDateStr, className: detailRow.classCode,
        noteDays: new Set(), inClass: 0, inClassAtls: 0, demo: 0, tutoring: 0, waitingClass: 0, clubActivity: 0, parentMeeting: 0, pickUpDropOff: 0, pickUpDropOffAtls: 0, sms: 0, smsAtls: 0, progressReport: 0, progressReportAtls: 0, prepareLessonTutoring: 0, prepareLessonClubs: 0, meetingTraining: 0, pt: 0, discoveryCamp: 0, outing: 0, summer: 0, summerInstructors: 0, conductTest: 0, renewalProjects: 0, supportLxo: 0, supportEc: 0, supportMkt: 0, lpar01: 0, lret01: 0, ldem01: 0, ldec01: 0, moth01: 0, other: 0, totalHours: 0, academicHours: 0, adminHours: 0, baseSalary: 0, totalSalary: 0, deductionHours: 0, _rates: rates, siRate: rates.si,
      };
    }
    const eRow = empGroup[empKey];
    if (academicFieldSet.has(taskField)) eRow.academicHours += actHours; else eRow.adminHours += actHours;
    eRow.totalHours += actHours;
    if (eRow[taskField] === undefined) eRow[taskField] = 0;
    eRow[taskField] += actHours;
    eRow.baseSalary += money; eRow.totalSalary += money;
    if (detailRow.notes) eRow.noteDays.add(`${dateStr}: ${detailRow.notes}`);

    const cenId = `${l07}|${rates.sCode}`;
    if (!cenGroup[cenId]) {
      cenGroup[cenId] = {
        id: generateUUID(), l07: l07, business: centerBusiness, salaryScale: rates.sCode, acRate: rates.ac, adRate: rates.ad, suRate: rates.su, ouRate: rates.ou, siRate: rates.si, from: fromDateStr, to: toDateStr, inClass: 0, inClassAtls: 0, demo: 0, tutoring: 0, waitingClass: 0, clubActivity: 0, parentMeeting: 0, pickUpDropOff: 0, pickUpDropOffAtls: 0, sms: 0, smsAtls: 0, progressReport: 0, progressReportAtls: 0, prepareLessonTutoring: 0, prepareLessonClubs: 0, meetingTraining: 0, pt: 0, discoveryCamp: 0, outing: 0, summer: 0, summerInstructors: 0, conductTest: 0, renewalProjects: 0, supportLxo: 0, supportEc: 0, supportMkt: 0, lpar01: 0, lret01: 0, ldem01: 0, ldec01: 0, moth01: 0, other: 0, totalHours: 0, academicHours: 0, adminHours: 0,
      };
    }
    const cRow = cenGroup[cenId];
    if (taskField) { if (cRow[taskField] === undefined) cRow[taskField] = 0; cRow[taskField] += actHours; }
    if (academicFieldSet.has(taskField)) cRow.academicHours += actHours; else cRow.adminHours += actHours;
    cRow.totalHours += actHours;
  });

  const finalize = (groupObj: Record<string, any>) => Object.values(groupObj).map((row: any, index) => {
    const deductionHours = (row.inClass + row.inClassAtls + row.clubActivity + row.parentMeeting) / 2;
    let mktHours = row.supportMkt || 0;
    Object.keys(row).forEach((k) => { 
      if (k.startsWith("lpar") || k.startsWith("lret") || k.startsWith("ldem") || k.startsWith("ldec")) {
        mktHours += row[k] || 0; 
      }
    });
    const otherAdminHours = row.adminHours - mktHours - (row.other || 0) - (row.moth01 || 0);
    const isMktLocal = row.center === "MKT LOCAL NORTH" || row.center === "MKT LOCAL SOUTH" || (row.center && typeof row.center === "string" && row.center.startsWith("MKT LOCAL NORTH_")) || row.l07 === "MKT LOCAL NORTH" || row.l07 === "MKT LOCAL SOUTH" || (row.l07 && typeof row.l07 === "string" && row.l07.startsWith("MKT LOCAL NORTH_"));
    let rawTotalSalary = 0, baseSalary = 0, totalSalary = 0, cMktLocal = 0, chargeLxo = 0, cEc = 0, cPtDemo = 0, cRenewal = 0, cDiscovery = 0, cSummerOuting = 0, cSummerInstructors = 0;
    const chargeOther = ((row.other || 0) + (row.moth01 || 0)) * 20000;
    if (isMktLocal) { rawTotalSalary = row.totalHours * 20000; totalSalary = Math.round(rawTotalSalary); baseSalary = totalSalary; cMktLocal = totalSalary; }
    else {
      rawTotalSalary = row.academicHours * row.acRate + (otherAdminHours - deductionHours) * row.adRate + mktHours * 20000 + row.summer * row.suRate + row.outing * row.ouRate + row.discoveryCamp * row.suRate + chargeOther + row.summerInstructors * row.siRate;
      totalSalary = Math.round(rawTotalSalary); baseSalary = rawTotalSalary - row.discoveryCamp * row.suRate; cEc = Math.round(row.supportEc * row.adRate); cPtDemo = Math.round(row.demo * row.acRate) + Math.round(row.pt * row.adRate); cMktLocal = Math.round(mktHours * 20000); cRenewal = Math.round(Math.round((row.prepareLessonClubs + row.renewalProjects) * row.adRate) + row.clubActivity * row.acRate - (row.clubActivity / 2) * row.adRate); cDiscovery = Math.round(row.discoveryCamp * row.suRate); cSummerOuting = Math.round(row.summer * row.suRate) + Math.round(row.outing * row.ouRate); cSummerInstructors = Math.round(row.summerInstructors * row.siRate); chargeLxo = totalSalary - cSummerOuting - cPtDemo - cEc - cMktLocal - cRenewal - cDiscovery - cSummerInstructors - chargeOther;
    }
    return { ...row, id: index + 1, deductionHours, baseSalary, totalSalary, chargeLxo, chargeEc: cEc, chargePtDemo: cPtDemo, chargeMktLocal: cMktLocal, chargeOther, chargeRenewalProjects: cRenewal, chargeDiscoveryCamp: cDiscovery, chargeSummerOuting: cSummerOuting, chargeSummerInstructors: cSummerInstructors };
  });

  const normalizeSearchStr = (s: string) => s ? s.toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "") : "";
  const empResult = finalize(empGroup).map((r: any) => ({ ...r, noteDays: r.noteDays ? Array.from(r.noteDays).join(" | ") : "", _searchStr: normalizeSearchStr(`${r.className} ${r.fullName} ${r.employeeId}`) }));
  const cenAggregate: Record<string, any> = {};
  finalize(cenGroup).forEach((c) => {
    const key = c.l07;
    if (!cenAggregate[key]) cenAggregate[key] = { ...c };
    else { cenAggregate[key].totalSalary += c.totalSalary; cenAggregate[key].chargeLxo += c.chargeLxo; cenAggregate[key].chargeEc += c.chargeEc; cenAggregate[key].chargePtDemo += c.chargePtDemo; cenAggregate[key].chargeMktLocal += c.chargeMktLocal; cenAggregate[key].chargeOther += c.chargeOther; cenAggregate[key].chargeRenewalProjects += c.chargeRenewalProjects; cenAggregate[key].chargeDiscoveryCamp += c.chargeDiscoveryCamp; cenAggregate[key].chargeSummerOuting += c.chargeSummerOuting; cenAggregate[key].chargeSummerInstructors += c.chargeSummerInstructors; cenAggregate[key].totalHours += c.totalHours; }
  });

  const cenResult = Object.values(cenAggregate);

  return { processedRosterData: details, employeeSummary: empResult, centerSummary: cenResult, isCalculating: false };

  } catch (error: any) {
    return {
      processedRosterData: [],
      employeeSummary: [],
      centerSummary: [],
      isCalculating: false,
      error: error.message || String(error)
    };
  }
}

if (typeof window === "undefined" && typeof self !== "undefined") {
  self.onmessage = (e: MessageEvent) => {
    const result = calculateTimesheet(e.data);
    self.postMessage(result);
  };
}
