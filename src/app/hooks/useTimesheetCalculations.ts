/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState, useEffect, useRef } from "react";
import { parseAnyDate } from "../lib/utils/data-utils";
import { mapL07 } from "../lib/utils/center-utils";
import { TASK_COLUMNS } from "../constants/timesheet-logic";
import { useAppData } from "../lib/contexts/AppDataContext";
import { useUiSettings } from "../lib/ui-settings";
import TimesheetWorker from "../workers/timesheet.worker?worker&inline";

// Global cache to prevent re-calculations during tab switching
let globalWorkerCacheKey = "";
let globalWorkerCacheResult: any = {
  processedRosterData: [],
  employeeSummary: [],
  centerSummary: [],
  isCalculating: false,
};

export function useTimesheetCalculations(
  rosterData: any[],
  salaryScaleData: any[],
  staffData: any[],
  cacheData: any[],
  fromDateStr: string,
  toDateStr: string,
) {
  const { appData } = useAppData();
  const uiSettings = useUiSettings();

  const [result, setResult] = useState<any>({
    processedRosterData: [],
    employeeSummary: [],
    centerSummary: [],
    isCalculating: true,
  });

  const workerRef = useRef<Worker | null>(null);

  const fromDateVal = fromDateStr || appData.Timesheet_Dates?.from || "";
  let tempFDate: Date | null = null;
  if (fromDateVal) {
    const parts = fromDateVal.split("-");
    if (parts.length === 3) {
      tempFDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0);
    }
  }
  const preferredYear = uiSettings.defaultAuditYear || (tempFDate ? tempFDate.getFullYear() : new Date().getFullYear());

  const sheet1Data = appData?.Sheet1_AE?.data;
  const holdData = appData?.Hold_AE?.data;
  const bankNorthData = appData?.Bank_North_AE?.data;
  const checkTAsData = appData?.Q_CheckTAs;

  const aeConfigData = useMemo(
    () => [
      ...(sheet1Data || []),
      ...(holdData || []),
      ...(bankNorthData || []),
    ],
    [sheet1Data, holdData, bankNorthData],
  );

  const { classSizeMap, checkTAsMap } = useMemo(() => {
    // Basic class map generation logic retained out of worker as it uses specific appData
    const csMap: Record<string, number> = {};
    const ctaMap: Record<string, number> = {};

    aeConfigData.forEach((row: any) => {
      const clsName = String(row["Class Name"] || row["Lớp"] || row["Class"] || row["Mã lớp"] || "").trim();
      const centerRaw = String(row["Center Name"] || row["Mã AE"] || row["Center"] || row["L07"] || row["Trung tâm"] || row["Center Code"] || "");
      const numStudents = parseInt(String(row["Number of Student"] || row["Sĩ số"] || row["Sỹ số"] || row["Students"] || row["Số HV"] || row["Số học viên"] || row["Sĩ số lớp"] || row["Total Students"] || row["Số lượng học viên"] || row["Sĩ số thực tế"] || row["Sỹ số thực tế"] || row["Actual Size"] || row["Class Size"] || row["Size"] || row["Số lượng"] || row["Sĩ số cơ sở"] || ""), 10) || 0;

      if (numStudents > 0 && clsName) {
        const centerL07 = mapL07(centerRaw);
        const classKey = `${centerL07.replace(/\s+/g, "").toUpperCase()}_${clsName.replace(/\s+/g, "").toUpperCase()}`;
        if (!csMap[classKey] || csMap[classKey] < numStudents) {
          csMap[classKey] = numStudents;
        }
      }
    });

    const safeCheckTAsData = checkTAsData || [];
    safeCheckTAsData.forEach((row: any) => {
      const clsName = String(row["Class Name"] || row["Lớp"] || row["Class"] || row["Mã lớp"] || "").trim();
      const centerRaw = String(row["Center Name"] || row["Mã AE"] || row["Center"] || row["Center Code"] || row["L07"] || row["Trung tâm"] || "");
      const sessionDate = row["Session Date"] || row["Ngày"] || row["Date"] || row["Ngày học"] || row["Session"] || row["SessionDate"];
      const numStudents = parseInt(String(row["Number of Student"] || row["Number of Students"] || row["No of Student"] || row["Sĩ số"] || row["Sỹ số"] || row["Students"] || row["Số HV"] || row["Số học viên"] || row["Sĩ số lớp"] || row["Total Students"] || row["Số lượng học viên"] || row["Sĩ số thực tế"] || row["Sỹ số thực tế"] || row["Actual Size"] || row["Class Size"] || row["Size"] || row["Số lượng"] || row["Sĩ số cơ sở"] || ""), 10) || 0;

      const parsedDate = parseAnyDate(sessionDate, preferredYear);
      const normCls = clsName.replace(/\s+/g, "").toUpperCase();
      const centerL07 = mapL07(centerRaw);
      const normCenter = centerL07.replace(/\s+/g, "").toUpperCase();

      if (numStudents > 0 && normCls) {
        const classKey = `${normCenter}_${normCls}`;
        if (!csMap[classKey] || csMap[classKey] < numStudents) csMap[classKey] = numStudents;
      }
      if (parsedDate && clsName) {
        const dateStr = `${String(parsedDate.getDate()).padStart(2, "0")}/${String(parsedDate.getMonth() + 1).padStart(2, "0")}/${parsedDate.getFullYear()}`;
        const key = `${normCenter}_${normCls}_${dateStr}`;
        ctaMap[key] = numStudents;
      }
    });
    return { classSizeMap: csMap, checkTAsMap: ctaMap };
  }, [aeConfigData, checkTAsData, preferredYear]);

  useEffect(() => {
    if (rosterData.length === 0) {
      Promise.resolve().then(() => {
        setResult((prev: any) => {
          if (prev.processedRosterData.length === 0 && !prev.isCalculating) return prev;
          return {
            processedRosterData: [],
            employeeSummary: [],
            centerSummary: [],
            isCalculating: false,
          };
        });
      });
      return;
    }

    const currentArgsSignature = JSON.stringify({
      rosterLen: rosterData.length,
      salaryLen: salaryScaleData.length,
      staffLen: staffData.length,
      cacheLen: cacheData.length,
      from: fromDateStr,
      to: toDateStr,
      year: preferredYear,
      aeConfigLen: aeConfigData.length,
      inputs: appData?.Timesheet_InputList?.map((x: any) => x.status).join(",")
    });

    if (currentArgsSignature === globalWorkerCacheKey && globalWorkerCacheResult.processedRosterData.length > 0) {
      // Return cached result instantly and avoid running the worker
      Promise.resolve().then(() => {
        setResult(globalWorkerCacheResult);
      });
      return;
    }

    Promise.resolve().then(() => {
      setResult((prev: any) => ({ ...prev, isCalculating: true }));
    });

    if (workerRef.current) {
      workerRef.current.terminate();
    }
    
    const params = {
      rosterData,
      salaryScaleData,
      staffData,
      cacheData,
      fromDateStr,
      toDateStr,
      appData: {
        Timesheet_InputList: appData?.Timesheet_InputList,
        Q_RosterFileName: appData?.Q_RosterFileName,
      },
      preferredYear,
      aeConfigData,
      checkTAsMap,
      classSizeMap,
      TASK_COLUMNS
    };

    workerRef.current = new TimesheetWorker();
    workerRef.current.onmessage = (e) => {
      const resultData = e.data || {};
      if (resultData.error) {
        console.error("Timesheet worker error string:", resultData.error);
      }
      const finalResult = {
        processedRosterData: resultData.processedRosterData || [],
        employeeSummary: resultData.employeeSummary || [],
        centerSummary: resultData.centerSummary || [],
        isCalculating: false,
        error: resultData.error,
      };
      globalWorkerCacheKey = currentArgsSignature;
      globalWorkerCacheResult = finalResult;
      setResult(finalResult);
    };
    workerRef.current.onerror = (err) => {
      console.error("Timesheet worker error:", err);
      setResult((prev: any) => ({ ...prev, isCalculating: false }));
    };
    workerRef.current.postMessage(params);

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [
    rosterData,
    salaryScaleData,
    staffData,
    cacheData,
    fromDateStr,
    toDateStr,
    classSizeMap,
    checkTAsMap,
    appData?.Q_RosterFileName,
    appData?.Timesheet_InputList,
    preferredYear,
    aeConfigData,
  ]);

  return result;
}
