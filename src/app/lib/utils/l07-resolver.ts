/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  mapL07,
  getL07FromFileName,
  getL07FromChargeToCenterMkt,
  getCenterInfoByAECode,
  getCenterInfoByL07,
  getAeCodeFromL07,
  getBusinessFromL07,
} from "./center-utils";
import { getVal } from "./data-utils";

export interface ResolveL07Input {
  rawCenter: string;
  rawChargeToCenter: string;
  sourceFile: string;
  rawType: string;
  rawClassCode: string; // Added to differentiate Cost Type from Class
  rawAeCode: string; // Used to override mapped AE Code
  empId: string;
  staffLookup: Map<string, any>;
  normCenterCache?: Map<string, string>;
}

export interface ResolveL07Result {
  l07: string;
  originalL07: string;
  isMktLocal: boolean;
  chargeToCenterMkt: string;
  taskField: string;
  aeCode: string;
  centerBusiness?: string;
  correctedType?: string;
  correctedClass?: string;
}

export function getNormCenter(rCen: string, cache?: Map<string, string>) {
  if (cache?.has(rCen)) return cache.get(rCen)!;
  const l07 = mapL07(rCen);
  if (cache) cache.set(rCen, l07);
  return l07;
}

export function resolveL07Logic(
  input: ResolveL07Input,
  TASK_COLUMNS: any
): ResolveL07Result {
  let { rawChargeToCenter } = input;
  const {
    rawCenter: rCen,
    sourceFile,
    rawType,
    rawClassCode,
    rawAeCode,
    empId,
    staffLookup,
    normCenterCache,
  } = input;

  let l07 = "";
  let originalL07 = "";

  // 1. ĐỌC DỮ LIỆU TỪ CỘT "CƠ SỞ" / "TRUNG TÂM"
  if (rCen) {
    if (
      rCen.toUpperCase() === "MKT NORTH" ||
      rCen.toUpperCase() === "MKT LOCAL NORTH"
    ) {
      originalL07 = "MKT LOCAL NORTH";
    } else if (
      rCen.toUpperCase() === "MKT SOUTH" ||
      rCen.toUpperCase() === "MKT LOCAL SOUTH"
    ) {
      originalL07 = "MKT LOCAL SOUTH";
    } else {
      originalL07 = getNormCenter(rCen, normCenterCache);
    }
  }

  // 2. DỰ PHÒNG THEO TÊN FILE
  if (!originalL07) {
    const fileL07 = getL07FromFileName(sourceFile);
    if (fileL07) {
      originalL07 = fileL07;
    }
  }

  // 3. DỰ PHÒNG THEO CỘT "CHARGE TO CENTER MKT"
  if (!originalL07 && rawChargeToCenter) {
    if (
      rawChargeToCenter.toUpperCase() === "MKT NORTH" ||
      rawChargeToCenter.toUpperCase() === "MKT LOCAL NORTH"
    ) {
      originalL07 = "MKT LOCAL NORTH";
    } else if (
      rawChargeToCenter.toUpperCase() === "MKT SOUTH" ||
      rawChargeToCenter.toUpperCase() === "MKT LOCAL SOUTH"
    ) {
      originalL07 = "MKT LOCAL SOUTH";
    } else {
      originalL07 = getNormCenter(rawChargeToCenter, normCenterCache);
    }
  }

  l07 = originalL07;

  // 4. KIỂM TRA ĐIỀU KIỆN MKT LOCAL
  const hasMktInCenter =
    l07 &&
    (l07.toUpperCase().includes("MKT") ||
      l07.toUpperCase().includes("LOCAL"));
  const fileUpperName = String(sourceFile).toUpperCase();
  const hasMktInFile =
    fileUpperName.includes("MKT") || fileUpperName.includes("MARKETING");
  const isChargeColMkt =
    rawChargeToCenter !== "" &&
    rawChargeToCenter !== "-" &&
    (rawChargeToCenter.toUpperCase().includes("MKT") ||
      rawChargeToCenter.toUpperCase().includes("LOCAL") ||
      rawChargeToCenter.toUpperCase().includes("NORTH") ||
      rawChargeToCenter.toUpperCase().includes("SOUTH") ||
      rawChargeToCenter.toUpperCase().includes("AHN") ||
      rawChargeToCenter.toUpperCase().includes("ASH") ||
      rawChargeToCenter.toUpperCase() === "NTW");

  const isMktLocal = !!(hasMktInCenter || isChargeColMkt || hasMktInFile);

  // 5. PHÂN TÁCH MKT LOCAL
  if (isMktLocal) {
    const fileUpper = String(sourceFile).toUpperCase();
    const rCenUpper = rCen.toUpperCase();
    const chargeUpper = rawChargeToCenter.toUpperCase();

    if (
      fileUpper.includes("NORTH") ||
      rCenUpper.includes("NORTH") ||
      chargeUpper.includes("NORTH") ||
      fileUpper.includes("AHN") ||
      rCenUpper.includes("AHN") ||
      chargeUpper === "NTW"
    ) {
      l07 = "MKT LOCAL NORTH";
    } else if (
      fileUpper.includes("SOUTH") ||
      rCenUpper.includes("SOUTH") ||
      chargeUpper.includes("SOUTH") ||
      fileUpper.includes("ASH") ||
      rCenUpper.includes("ASH")
    ) {
      l07 = "MKT LOCAL SOUTH";
    } else {
      if (
        rCenUpper.includes("SOUTH") ||
        l07.toUpperCase().includes("SOUTH") ||
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
        l07 = "MKT LOCAL SOUTH";
      } else {
        l07 = "MKT LOCAL NORTH";
      }
    }

    if (l07 === "MKT LOCAL NORTH") {
      let mappedL07 = getL07FromChargeToCenterMkt(rCen);
      if (!mappedL07 || mappedL07 === "MKT LOCAL NORTH") {
        const fromCharge = getL07FromChargeToCenterMkt(rawChargeToCenter);
        if (fromCharge) mappedL07 = fromCharge;
      }
      if (mappedL07) {
        l07 = mappedL07;
      }
    }
  }

  // AE CODE logic
  let aeCode = rawAeCode;
  const centerByAe = getCenterInfoByAECode(l07);
  if (centerByAe && !isMktLocal) {
    l07 = centerByAe.l07;
  }

  // TASK FIELD Logic
  let taskField = TASK_COLUMNS[rawType.toLowerCase()] || "adminHours";
  let correctedType = rawType;
  let correctedClass = rawClassCode;

  if (
    l07 === "MKT LOCAL NORTH" ||
    l07 === "MKT LOCAL SOUTH" ||
    (l07 && typeof l07 === "string" && l07.startsWith("MKT LOCAL NORTH_"))
  ) {
    const rTypeLower = rawType.toLowerCase().trim();
    const rClassLower = rawClassCode.toLowerCase().trim();
    
    // Detection logic: if Class contains Cost Type markers and Type does not, or vice versa
    const isCostType = (s: string) => 
      s.startsWith("lpar") || s.startsWith("lret") || s.startsWith("ldem") || 
      s.startsWith("ldec") || s.startsWith("moth");

    const typeIsCost = isCostType(rTypeLower);
    const classIsCost = isCostType(rClassLower);

    if (classIsCost && !typeIsCost) {
      // Swapped case: Class has the type, Type probably has the class data
      correctedType = rawClassCode;
      correctedClass = rawType; 
    }

    const effectiveType = correctedType.toLowerCase().trim();

    if (effectiveType.startsWith("lpar")) taskField = "lpar01";
    else if (effectiveType.startsWith("lret")) taskField = "lret01";
    else if (effectiveType.startsWith("ldem")) taskField = "ldem01";
    else if (effectiveType.startsWith("ldec")) taskField = "ldec01";
    else if (effectiveType.startsWith("moth")) taskField = "moth01";
    else taskField = "supportMkt";
  }

  // CHARGE TO CENTER MKT
  let chargeToCenterMkt = "";
  if (isMktLocal) {
    // For MKT Local files, the raw "Center" column (rCen) actually contains the Charge To Center MKT raw values (e.g., Van Quan, An Hung)
    // OR it could be in the explicit rawChargeToCenter column.
    chargeToCenterMkt = rawChargeToCenter || rCen;
  } else {
    if (rawChargeToCenter) {
      if (rawChargeToCenter.toUpperCase() === "MKT NORTH")
        rawChargeToCenter = "MKT LOCAL NORTH";
      if (rawChargeToCenter.toUpperCase() === "MKT SOUTH")
        rawChargeToCenter = "MKT LOCAL SOUTH";
      let chargeL07 = getNormCenter(rawChargeToCenter, normCenterCache);
      const chargeCenterByAe = getCenterInfoByAECode(chargeL07);
      if (chargeCenterByAe) {
        chargeL07 = chargeCenterByAe.l07;
      }
      chargeToCenterMkt = chargeL07;
    }
  }

  // STAFF LOOKUP FALLBACK
  if ((!l07 || l07 === "UNKNOWN") && !isMktLocal) {
    const matchStaff = staffLookup.get(empId);
    if (matchStaff) {
      const staffRawCen = String(
        getVal(matchStaff, ["l07", "center"])
      ).trim();
      if (staffRawCen) {
        const sL07 = getNormCenter(staffRawCen, normCenterCache);
        const staffCenterAe =
          getCenterInfoByAECode(sL07) || getCenterInfoByL07(sL07);
        l07 = staffCenterAe ? staffCenterAe.l07 : sL07;
      }
    }
  }

  if (!l07) {
    l07 = "UNKNOWN";
  }

  const finalCenterInfo = getCenterInfoByL07(l07);
  if (finalCenterInfo) {
    aeCode = finalCenterInfo.aeCode;
  }

  // Override for MKT Local Mã AE
  if (
    l07 &&
    (l07 === "MKT LOCAL NORTH" ||
      l07 === "MKT LOCAL SOUTH" ||
      l07.startsWith("MKT LOCAL NORTH_"))
  ) {
    aeCode = getAeCodeFromL07(l07);
  }
  
  // Also optionally extract centerBusiness mapping if requested
  let centerBusiness = "";
  if (l07 && (l07 === "MKT LOCAL NORTH" || l07 === "MKT LOCAL NORTH_TH" || l07 === "MKT LOCAL NORTH_TN" || l07 === "MKT LOCAL NORTH_HP" || l07 === "MKT LOCAL NORTH_PT")) {
    centerBusiness = getBusinessFromL07(l07);
  }

  return {
    l07,
    originalL07,
    isMktLocal,
    chargeToCenterMkt,
    taskField,
    aeCode,
    centerBusiness,
    correctedType,
    correctedClass
  };
}
