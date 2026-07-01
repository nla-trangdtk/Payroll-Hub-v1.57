import { useState, useCallback } from "react";
import { useAppData } from "../lib/contexts/AppDataContext";
import { toast } from "sonner";
import { getCenterInfoByAECode } from "../lib/utils/center-utils";
import { parseMoneyToNumber } from "../lib/utils/data-utils";

export type MasterAETab =
  | "Sheet1_AE"
  | "Bank_North_AE"
  | "Hold_AE"
  | "BulkPayment"
  | "Pivot";

export function useMasterAELogic() {
  const { updateAppData } = useAppData();
  const [activeTab, setActiveTabInternal] = useState<MasterAETab>(() => {
    return (localStorage.getItem("master_ae_active_tab") as MasterAETab) || "Sheet1_AE";
  });
  const setActiveTab = useCallback((tab: MasterAETab) => {
    localStorage.setItem("master_ae_active_tab", tab);
    setActiveTabInternal(tab);
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const processAEData = useCallback(() => {
    // This is primarily handled in AEDataConfig, but we can trigger a recalculation
    // if we want to ensure data is up to date based on current appData.
    toast.info("Vui lòng sử dụng trang Cấu hình AE để xử lý lại file gốc.");
  }, []);

  const reMapAECodes = useCallback(() => {
    updateAppData((prev) => {
      const aeMap = prev.AE_Map;
      const newData = prev.Sheet1_AE.data.map((row) => {
        // Try using _rawAE (original center string) or fallback to L07
        const rawCenterVal = String(row["_rawAE"] || row["L07"] || "").trim();
        const rawCenterKey = rawCenterVal.toUpperCase();

        if (aeMap[rawCenterKey]) {
          return {
            ...row,
            L07: aeMap[rawCenterKey].name,
            Business: aeMap[rawCenterKey].bus,
          };
        } else {
          const info = getCenterInfoByAECode(rawCenterVal);
          if (info) {
            return {
              ...row,
              L07: info.l07,
              Business: info.bus,
            };
          }
        }
        return row;
      });
      return {
        ...prev,
        Sheet1_AE: { ...prev.Sheet1_AE, data: newData },
      };
    });
    toast.success("Đã cập nhật lại mã AE dựa trên bảng Map");
  }, [updateAppData]);

  const handleCellChange = useCallback(
    (
      tab: MasterAETab,
      row: Record<string, unknown>,
      columnKey: string,
      value: string | number | null,
    ) => {
      if (tab === "BulkPayment") return;
      if (
        tab === "Hold_AE" &&
        ["Tháng báo cáo"].includes(
          columnKey,
        )
      ) {
        return;
      }
      updateAppData((prev) => {
        const tabDataKey = tab as keyof typeof prev;
        const targetTab = prev[tabDataKey];
        if (!targetTab || !("data" in targetTab)) return prev;
        
        const data = [...targetTab.data];
        const rowIndex = data.findIndex(
          (r, idx) =>
            (row._originalIndex !== undefined && idx === row._originalIndex) ||
            (r.id && row.id && r.id === row.id) ||
            r === row ||
            (r["ID Number"] === row["ID Number"] &&
              r["TOTAL PAYMENT"] === row["TOTAL PAYMENT"] &&
              ((r["No."] !== undefined && r["No."] === row["No."]) ||
                (r["No"] !== undefined && r["No"] === row["No"]) || 
                (r["STT"] !== undefined && r["STT"] === row["STT"])))
        );
        if (rowIndex === -1) return prev;
        
        const updatedRow = { ...data[rowIndex], [columnKey]: value };
        if (tab === "Hold_AE" && (columnKey === "Nghiệp vụ" || columnKey === "Tháng phát sinh" || columnKey === "Trạng thái")) {
          const valUpper = String(updatedRow["Nghiệp vụ"] || "").toUpperCase();
          const currentTotalPayment = parseMoneyToNumber(updatedRow["TOTAL PAYMENT"] || 0);
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
          [tabDataKey]: { ...targetTab, data },
        };
      });
    },
    [updateAppData],
  );

  const handleDeleteRow = useCallback(
    (tab: MasterAETab, rowToDelete: Record<string, unknown>) => {
      if (tab === "BulkPayment") return;
      updateAppData((prev) => {
        const tabDataKey = tab as keyof typeof prev;
        const targetTab = prev[tabDataKey];
        if (!targetTab || !("data" in targetTab)) return prev;

        const data = [...targetTab.data];
        const rowIndex = data.findIndex(
          (r, idx) =>
            (rowToDelete._originalIndex !== undefined && idx === rowToDelete._originalIndex) ||
            (r.id && rowToDelete.id && r.id === rowToDelete.id) ||
            r === rowToDelete ||
            (r["ID Number"] === rowToDelete["ID Number"] &&
              r["TOTAL PAYMENT"] === rowToDelete["TOTAL PAYMENT"])
        );
        if (rowIndex === -1) return prev;
        
        data.splice(rowIndex, 1);
        return {
          ...prev,
          [tabDataKey]: { ...targetTab, data },
        };
      });
      toast.success("Đã xóa dòng");
    },
    [updateAppData],
  );

  const handleDeleteRows = useCallback(
    (tab: MasterAETab, rowsToDelete: Record<string, unknown>[]) => {
      if (tab === "BulkPayment" || rowsToDelete.length === 0) return;
      updateAppData((prev) => {
        const tabDataKey = tab as keyof typeof prev;
        const targetTab = prev[tabDataKey];
        if (!targetTab || !("data" in targetTab)) return prev;

        const data = [...targetTab.data].filter(r => {
          return !rowsToDelete.some(rowToDelete => 
            (rowToDelete._originalIndex !== undefined && targetTab.data.indexOf(r) === rowToDelete._originalIndex) ||
            (r.id && rowToDelete.id && r.id === rowToDelete.id) ||
            r === rowToDelete ||
            (r["ID Number"] === rowToDelete["ID Number"] &&
             r["TOTAL PAYMENT"] === rowToDelete["TOTAL PAYMENT"])
          );
        });

        return {
          ...prev,
          [tabDataKey]: { ...targetTab, data },
        };
      });
      toast.success(`Đã xóa ${rowsToDelete.length} dòng`);
    },
    [updateAppData],
  );

  const clearAllData = useCallback(() => {
    updateAppData((prev) => ({
      ...prev,
      Sheet1_AE: { ...prev.Sheet1_AE, data: [] },
      Bank_North_AE: { ...prev.Bank_North_AE, data: [] },
    }));
    toast.success("Đã xóa tất cả dữ liệu Sheet1 và Bank, giữ nguyên Hold");
  }, [updateAppData]);

  return {
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
    handleDeleteRows,
    clearAllData,
  };
}
