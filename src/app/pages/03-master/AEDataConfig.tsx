import { PuppyLogo } from "../../components/shared/PuppyLogo";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Link as LinkIcon,
  UploadCloud,
  Layers,
  Trash2,
  FileSpreadsheet,
  Loader2,
  AlertTriangle,
  Check,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Search,
  Folder,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import { useAppData } from "../../lib/contexts/AppDataContext";
import {
  readExcelFile,
  parseMoneyToNumber,
  isMoneyColumn,
  autoMapColumns,
  fetchWithBackoff,
} from "../../lib/utils/data-utils";
import {
  mapL07,
  getCenterInfoByL07,
  getCenterInfoByAECode,
} from "../../lib/utils/center-utils";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "../../components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ColumnMappingDialog } from "./components/ColumnMappingDialog";
import {

  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

function parseMonthFromFileName(fileName: string, globalMonth?: string): string | null {
  if (!fileName) return null;
  // Match patterns like 1.2026, 01.2026, 12.2026, or with dashes/slashes 01-2026
  const match = fileName.match(/\b(0?[1-9]|1[0-2])[./-](20\d{2})\b/);
  if (match) {
    const m = parseInt(match[1], 10);
    const y = parseInt(match[2], 10);
    return `${m < 10 ? "0" + m : m}.${y}`;
  }
  // Try backup pattern: Month name or single digits like T1.2026 or Thang 1
  const tMatch = fileName.match(/(Th\w*|T|Month\s*)(0?[1-9]|1[0-2])\b/i);
  if (tMatch) {
    const m = parseInt(tMatch[2], 10);
    const ref = globalMonth || "03.2026";
    const refParts = ref.split(".");
    const currentMonthNum = parseInt(refParts[0], 10) || 3;
    const currentYearNum = parseInt(refParts[1], 10) || 2026;
    let y = currentYearNum;
    // Explicitly force 2025 for months 11 and 12 as requested
    if (m === 11 || m === 12) {
      y = 2025;
    } else if (m > currentMonthNum) {
      y = currentYearNum - 1;
    }
    return `${m < 10 ? "0" + m : m}.${y}`;
  }
  return null;
}

interface AERow {
  id: string;
  name: string;
  fileObj?: File | null;
  url?: string;
  status: string;
  bank?: string;
  month?: string;
  columnMapping?: Record<string, string>;
}

interface PendingUpload {
  file: File;
  existingRowId?: string;
}



const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const;

export function AEDataConfig({
  onSwitchToFinal,
}: {
  onSwitchToFinal?: () => void;
}) {
  const navigate = useNavigate();
  const { appData, updateAppData } = useAppData();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [choices, setChoices] = useState<
    { file: File; action: "update" | "new" | "skip"; targetId?: string }[]
  >([]);
  const [showDialog, setShowDialog] = useState(false);
  
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [isFetchingLink, setIsFetchingLink] = useState(false);
  const [activeLinkRowId, setActiveLinkRowId] = useState<string | null>(null);

  const [folderLinkDialogOpen, setFolderLinkDialogOpen] = useState(false);
  const [folderLinkInput, setFolderLinkInput] = useState("");
  const [isFetchingFolder, setIsFetchingFolder] = useState(false);

  // Initialize choices when pendingUploads changes
  useEffect(() => {
    setChoices(
      pendingUploads.map((p) => ({
        file: p.file,
        action: p.existingRowId ? "update" : "new",
        targetId: p.existingRowId,
      })),
    );
  }, [pendingUploads]);

  const [showClearDialog, setShowClearDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [mappingDialog, setMappingDialog] = useState<{
    isOpen: boolean;
    rowId: string | null;
  }>({
    isOpen: false,
    rowId: null,
  });

  const masterAeFields = [
    "No",
    "ID Number",
    "Full name",
    "Salary Scale",
    "From",
    "To",
    "Bank Account Number",
    "Bank Name",
    "CITAD code",
    "TAX CODE",
    "Contract No",
    "CHARGE TO LXO",
    "CHARGE TO EC",
    "CHARGE TO PT-DEMO",
    "Charge MKT Local",
    "Charge Renewal Projects",
    "Charge Discovery Camp",
    "Charge Summer Outing",
    "Charge Summer Instructors",
    "TOTAL PAYMENT",
    "Center",
  ];

  const filteredData = appData.Ae_Global_Inputs.filter(
    (row) =>
      row.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      (row.bank || "").toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      (row.month || "").toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const clearPageData = () => {
    updateAppData((prev) => ({
      ...prev,
      Ae_Global_Inputs: [],
      Sheet1_AE: { headers: [], data: [] },
      Hold_AE: { headers: [], data: [] },
      Bank_North_AE: { headers: [], data: [] },
      BankExport: { headers: [], data: [] },
      BankExportTN: { headers: [], data: [] },
      BankExportTH: { headers: [], data: [] },
      BankExportPT: { headers: [], data: [] },
      SoSanh_AE: { headers: [], data: [] },
      ConfirmedIds_HoldAdd: [],
      SavedRows_HoldAdd: {},
      SavedBal_PayrollTrial: {},
      // Keep SavedPeriods_HoldAdd or clear it? 
      // Based on "xóa toàn bộ dữ liệu", clearing everything is safer.
      SavedPeriods_HoldAdd: {},
    }));
    setShowClearDialog(false);
    toast.success("Đã xóa toàn bộ dữ liệu và trạng thái.");
  };

  const addRow = () => {
    const newRow: AERow = {
      id: Date.now().toString(),
      name: "",
      status: "ready",
      bank: "",
      month: "",
    };
    updateAppData((prev) => ({
      ...prev,
      Ae_Global_Inputs: [...prev.Ae_Global_Inputs, newRow],
    }));
  };

  const deleteRow = (id: string | undefined) => {
    if (!id) return;
    updateAppData((prev) => ({
      ...prev,
      Ae_Global_Inputs: prev.Ae_Global_Inputs.filter((row) => row.id !== id),
    }));
  };

  const updateRow = (id: string, field: keyof AERow, value: any) => {
    updateAppData((prev) => ({
      ...prev,
      Ae_Global_Inputs: prev.Ae_Global_Inputs.map((row) => {
        if (row.id === id) {
          const updated = { ...row, [field]: value };
          if (field === "name") {
            const guessedMonth = parseMonthFromFileName(value);
            if (guessedMonth) {
              updated.month = guessedMonth;
            }
          }
          return updated;
        }
        return row;
      }),
    }));
  };

  const handleFileUpload = async (id: string, file: File) => {
    const allowedExtensions = [".xlsx", ".xls", ".csv", ".gsheet"];
    const maxSize = 100 * 1024 * 1024; // 100MB

    const guessBank = (name: string) => {
      const u = name.toUpperCase();
      if (u.includes("NORTH")) return "NORTH";
      if (u.includes(" TN") || u.includes(" THAI NGUYEN") || u.includes("_TN_") || u.includes("TN.")) return "THAI NGUYEN";
      if (u.includes(" TH") || u.includes(" THANH HOA") || u.includes("_TH_") || u.includes("TH.")) return "THANH HOA";
      if (u.includes(" PT") || u.includes(" PHU THO") || u.includes("_PT_") || u.includes("PT.")) return "PHU THO";
      return "";
    };

    const fileExtension = file.name
      .substring(file.name.lastIndexOf("."))
      .toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      toast.error(
        `Định dạng file không hợp lệ: ${file.name}. Vui lòng tải lên file Excel (.xlsx, .xls).`,
      );
      return;
    }

    if (file.size > maxSize) {
      toast.error(
        `File quá lớn: ${file.name}. Vui lòng tải lên file nhỏ hơn 100MB.`,
      );
      return;
    }

    setIsProcessing(true);
    setProcessingMessage("Đang tự động map cột...");
    const mapping = await autoMapColumns(file, masterAeFields);
    setIsProcessing(false);

    updateAppData((prev) => ({
      ...prev,
      Ae_Global_Inputs: prev.Ae_Global_Inputs.map((row) =>
        row.id === id
          ? {
              ...row,
              fileObj: file,
              name: file.name,
              status: "Uploaded",
              bank: guessBank(file.name) || row.bank,
              month: parseMonthFromFileName(file.name) || prev.globalMonth || row.month,
              columnMapping: mapping,
            }
          : row,
      ),
    }));
    toast.success(`Đã tải lên và tự động map cột cho file: ${file.name}`);
  };

  const handleLinkSubmit = async () => {
    if (!activeLinkRowId || !linkInput.trim()) return;
    setIsFetchingLink(true);
    try {
      const currentRow = appData.Ae_Global_Inputs.find(r => r.id === activeLinkRowId);
      const response = await fetchWithBackoff(`/api/fetch-google-sheet?url=${encodeURIComponent(linkInput)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Không thể tải dữ liệu. Hãy đảm bảo link đã được share.");
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      let baseName = currentRow?.name || `GoogleSheet_Export_${Date.now()}`;
      if (baseName.endsWith(".csv") || baseName.endsWith(".xlsx") || baseName.endsWith(".xls") || baseName.endsWith(".gsheet")) {
        baseName = baseName.substring(0, baseName.lastIndexOf("."));
      }
      const fileName = `${baseName}.xlsx`;
      const file = new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Map file and upload to the specific row
      handleFileUpload(activeLinkRowId, file);
      
      toast.success("Đã tải dữ liệu từ Google Sheet!");
      setLinkDialogOpen(false);
      setLinkInput("");
    } catch (error: any) {
      toast.error(error.message || "Lỗi tải Google Sheet");
    } finally {
      setIsFetchingLink(false);
      setActiveLinkRowId(null);
    }
  };

  const handleFolderLinkSubmit = async () => {
    if (!folderLinkInput.trim()) return;
    setIsFetchingFolder(true);
    try {
      let folderId = folderLinkInput.trim();
      const match = folderLinkInput.match(/folders\/([a-zA-Z0-9-_]+)/);
      if (match) {
        folderId = match[1];
      } else {
        try {
          const url = new URL(folderLinkInput);
          if (url.searchParams.has("id")) {
            folderId = url.searchParams.get("id") || folderId;
          }
        } catch {
          // Ignore invalid URL
        }
      }

      const response = await fetchWithBackoff(`/api/drive-folder-files?folderId=${encodeURIComponent(folderId)}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Không thể lấy danh sách file từ thư mục. Vui lòng kiểm tra lại link hoặc file credentials.json.");
      }

      const data = await response.json();
      if (!data.success || !data.files || data.files.length === 0) {
        throw new Error("Không tìm thấy file nào trong thư mục này.");
      }

      const newPending: PendingUpload[] = [];
      data.files.forEach((f: any) => {
        const sheetUrl = `https://docs.google.com/spreadsheets/d/${f.id}`;
        const fileContent = JSON.stringify({ url: sheetUrl });
        const blob = new Blob([fileContent], { type: 'application/json' });
        
        let name = f.name || `GoogleSheet_${f.id}`;
        if (!name.endsWith(".gsheet") && !name.endsWith(".xlsx") && !name.endsWith(".xls")) {
          name += ".gsheet";
        } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
          // If it already has an extension but is fetched via Drive, just append .gsheet so our parser treats it as URL
          // Wait, actually Google Drive might return name with .xlsx, but we want it to act like .gsheet 
          name = name.replace(/\.(xlsx|xls)$/i, ".gsheet");
        }

        const file = new File([blob], name, { type: 'application/json' });

        const existingRow = appData.Ae_Global_Inputs.find(
          (row) => row.name === name || row.name === name.replace(".gsheet", ".csv"),
        );

        if (existingRow) {
          newPending.push({ file, existingRowId: existingRow.id });
        } else {
          newPending.push({ file });
        }
      });

      setPendingUploads(newPending);
      setShowDialog(true);
      setFolderLinkDialogOpen(false);
      setFolderLinkInput("");
      toast.success(`Đã tìm thấy ${data.files.length} file trong thư mục.`);

    } catch (error: any) {
      toast.error(error.message || "Lỗi tải dữ liệu từ Google Drive Folder");
    } finally {
      setIsFetchingFolder(false);
    }
  };

  const handleMultiUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPending: PendingUpload[] = [];
    Array.from(files).forEach((file) => {
      const existingRow = appData.Ae_Global_Inputs.find(
        (row) => row.name === file.name,
      );
      if (existingRow) {
        newPending.push({ file, existingRowId: existingRow.id });
      } else {
        newPending.push({ file });
      }
    });

    setPendingUploads(newPending);
    setShowDialog(true);
    e.target.value = ""; // Reset input
  };

  const confirmUploads = async (
    choices: {
      file: File;
      action: "update" | "new" | "skip";
      targetId?: string;
    }[],
  ) => {
    const newRows: AERow[] = [];
    const updates: {
      id: string;
      file: File;
      bank?: string;
      columnMapping?: Record<string, string>;
    }[] = [];

    setIsProcessing(true);
    setProcessingMessage("Đang tự động map cột...");

    const guessBank = (name: string) => {
      const u = name.toUpperCase();
      if (u.includes("NORTH")) return "NORTH";
      if (u.includes(" TN") || u.includes(" THAI NGUYEN") || u.includes("_TN_") || u.includes("TN.")) return "THAI NGUYEN";
      if (u.includes(" TH") || u.includes(" THANH HOA") || u.includes("_TH_") || u.includes("TH.")) return "THANH HOA";
      if (u.includes(" PT") || u.includes(" PHU THO") || u.includes("_PT_") || u.includes("PT.")) return "PHU THO";
      return "";
    };

    for (const choice of choices) {
      if (choice.action === "skip") continue;

      const mapping = await autoMapColumns(choice.file, masterAeFields);
      const guessedBank = guessBank(choice.file.name);

      if (choice.action === "update" && choice.targetId) {
        updates.push({
          id: choice.targetId,
          file: choice.file,
          bank: guessedBank,
          columnMapping: mapping,
        });
      } else if (choice.action === "new") {
        newRows.push({
          id: Date.now().toString() + Math.random(),
          name: choice.file.name,
          status: "Uploaded",
          fileObj: choice.file,
          bank: guessedBank,
          month: parseMonthFromFileName(choice.file.name) || appData.globalMonth || "",
          columnMapping: mapping,
        });
      }
    }

    updateAppData((prev) => ({
      ...prev,
      Ae_Global_Inputs: prev.Ae_Global_Inputs.map((row) => {
        const update = updates.find((u) => u.id === row.id);
        return update
          ? {
              ...row,
              fileObj: update.file,
              status: "Uploaded",
              bank: update.bank || row.bank,
              month: parseMonthFromFileName(update.file.name) || prev.globalMonth || row.month,
              columnMapping: update.columnMapping,
            }
          : row;
      }).concat(newRows),
    }));

    setIsProcessing(false);
    setShowDialog(false);
    setPendingUploads([]);
    toast.success(
      `Đã tải lên và tự động map cột cho ${newRows.length + updates.length} file`,
    );
  };

  const processAEData = async () => {
    const targets = appData.Ae_Global_Inputs.filter((item) => item.fileObj);
    if (targets.length === 0) {
      toast.error("Vui lòng chọn ít nhất một File AE Final!");
      return;
    }

    const normalizeMonth = (m: any) => {
      const str = String(m || "").trim().toUpperCase();
      if (!str) return "";
      const match = str.match(/(?:THÁNG|THANG|T)?\s*(\d{1,2})[./\- ]\s*(\d{4})/i);
      if (match) {
        const mm = match[1].padStart(2, "0");
        const yyyy = match[2];
        return `${mm}.${yyyy}`;
      }
      const parts = str.split(/[./]/);
      if (parts.length === 2) {
        const mm = parts[0].trim().padStart(2, "0");
        const yyyy = parts[1].trim();
        if (mm.length === 2 && yyyy.length === 4) {
          return `${mm}.${yyyy}`;
        }
      }
      return str;
    };

    const getColIndex = (
      headers: string[],
      targetField: string,
      mapping?: Record<string, string>,
      fuzzyKeywords: string[] = [],
    ) => {
      if (mapping && mapping[targetField]) {
        const mappedHeader = mapping[targetField].toUpperCase().trim();
        const idx = headers.findIndex(
          (h) => String(h).toUpperCase().trim() === mappedHeader,
        );
        if (idx !== -1) return idx;
      }
      
      // 1. Exact Match (either targetField itself or an exact match on fuzzy Keywords)
      const idx = headers.findIndex((h: any) => {
        const hUp = String(h).toUpperCase().trim();
        if (hUp === targetField.toUpperCase()) return true;
        return fuzzyKeywords.some((k) => hUp === k.toUpperCase().trim());
      });
      if (idx !== -1) return idx;

      // 2. Contains Match
      return headers.findIndex((h: any) => {
        const hUp = String(h).toUpperCase().trim();
        if (hUp === targetField.toUpperCase()) return true;
        return fuzzyKeywords.some((k) => hUp.includes(k.toUpperCase().trim()));
      });
    };

    setIsProcessing(true);
    setProgress(0);
    setProcessingMessage("Đang chuẩn bị xử lý dữ liệu AE...");
    await new Promise((resolve) => setTimeout(resolve, 10));

    const totalFiles = targets.length;
    let processedFiles = 0;

    try {
      const bankData: any[] = [];
      const sheet1Data: any[] = [];
      const holdData: any[] = [];
      const soSanhAeData: any[] = [];

      const sheet1Headers = [
        "No.",
        "Tháng báo cáo",
        "L07",
        "Business",
        "ID Number",
        "Full name",
        "Salary Scale",
        "From",
        "To",
        "Bank Account Number",
        "Bank Name",
        "CITAD code",
        "TAX CODE",
        "Contract No",
        "CHARGE TO LXO",
        "CHARGE TO EC",
        "CHARGE TO PT-DEMO",
        "Charge MKT Local",
        "Charge Renewal Projects",
        "Charge Discovery Camp",
        "Charge Summer Outing",
        "Charge Summer Instructors",
        "TOTAL PAYMENT",
        "TÊN FILE",
        "Center",
      ];

      let foundAnySheet = false;
      const aeMap = appData.AE_Map;

      for (let i = 0; i < targets.length; i++) {
        const item = targets[i];
        if (!item.fileObj) continue;

        const itemMonth = item.month || parseMonthFromFileName(item.name || item.fileObj.name) || appData.globalMonth || "03.2026";

        processedFiles++;
        setProgress(Math.round((processedFiles / totalFiles) * 100));
        setProcessingMessage(
          `Đang xử lý file ${i + 1}/${targets.length}: ${item.name}...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 10));

        updateAppData(
          (prev) => ({
            ...prev,
            Ae_Global_Inputs: prev.Ae_Global_Inputs.map((row) =>
              row.id === item.id ? { ...row, status: "Processing..." } : row,
            ),
          }),
          false,
        );

        try {
          const wb = await readExcelFile(item.fileObj);
          let fileProcessedSuccessfully = false;

          if (wb.SheetNames.length === 0) {
            throw new Error("File không có sheet nào.");
          }

          // Optimized: Only process relevant sheets (including HOLD or ADD sheets)
          const relevantSheets = wb.SheetNames.filter((name) => {
            const n = name.toUpperCase();
            const isRelevant =
              n.includes("BANK") ||
              n.includes("NGÂN HÀNG") ||
              n.includes("SHEET 1") ||
              n.includes("SHEET1") ||
              n.includes("HOLD") ||
              n.includes("ADD") ||
              n.includes("SO SÁNH AE");

            if (!isRelevant) return false;

            return true;
          });

          for (const sheetName of relevantSheets) {
            try {
              const ws = wb.Sheets[sheetName];
              if (!ws) continue;

              // Use raw: true to get actual number objects for Bank Account handling
              const rows: any[][] = XLSX.utils.sheet_to_json(ws, {
                header: 1,
                defval: "",
                raw: true,
              });
              if (rows.length <= 1) continue;

              const nameUpper = sheetName.toUpperCase();
              let sheetProcessed = false;

              if (
                nameUpper.includes("BANK") ||
                nameUpper.includes("NGÂN HÀNG")
              ) {
                let headerRowIndex = -1;
                for (let r = 0; r < Math.min(30, rows.length); r++) {
                  const rowStr = rows[r]
                    .map((c) => String(c || "").toUpperCase())
                    .join(" ");
                  if (
                    (rowStr.includes("FULL NAME") ||
                      rowStr.includes("HỌ VÀ TÊN") ||
                      rowStr.includes("TÊN")) &&
                    (rowStr.includes("ACCOUNT") ||
                      rowStr.includes("SỐ TÀI KHOẢN") ||
                      rowStr.includes("TÀI KHOẢN") ||
                      rowStr.includes("STK"))
                  ) {
                    headerRowIndex = r;
                    break;
                  }
                }

                if (headerRowIndex !== -1) {
                  foundAnySheet = true;
                  sheetProcessed = true;
                  const h = rows[headerRowIndex].map((c) =>
                    String(c || "").trim(),
                  );

                  const iS = getColIndex(h, "No", item.columnMapping, [
                    "NO",
                    "STT",
                    "NO.",
                  ]);
                  const iId = getColIndex(h, "ID Number", item.columnMapping, [
                    "ID",
                    "CMND",
                    "MÃ NV",
                  ]);
                  const iN = getColIndex(h, "Full name", item.columnMapping, [
                    "NAME",
                    "TÊN",
                  ]);
                  const iA = getColIndex(
                    h,
                    "Bank Account Number",
                    item.columnMapping,
                    ["ACCOUNT", "TÀI KHOẢN", "STK"],
                  );
                  const iT = getColIndex(
                    h,
                    "TOTAL PAYMENT",
                    item.columnMapping,
                    ["TOTAL", "TỔNG", "THỰC NHẬN"],
                  );
                  const iP = getColIndex(
                    h,
                    "Payment details",
                    item.columnMapping,
                    ["DETAILS", "NỘI DUNG", "DIỄN GIẢI", "DESCRIPTION"],
                  );
                  // const iBank = getColIndex(
                  //   h,
                  //   "Bank Name",
                  //   item.columnMapping,
                  //   ["BANK", "NGÂN HÀNG", "TEN NGAN HANG", "TÊN NGÂN HÀNG"],
                  // );
                  // const iThang = getColIndex(h, "Tháng", item.columnMapping, [
                  //   "THÁNG",
                  //   "MONTH",
                  //   "KỲ",
                  // ]);
                  const iCenter = getColIndex(h, "Center", item.columnMapping, [
                    "CENTER",
                    "COST CENTER",
                    "TRUNG TÂM",
                    "AE CODE",
                    "AE",
                    "MÃ AE",
                  ]);

                  for (let r = headerRowIndex + 1; r < rows.length; r++) {
                    const row = rows[r];
                    if (!row || row.every((cell) => cell === "")) continue;

                    const rawTP =
                      iT !== -1 && row[iT] !== undefined ? row[iT] : "";
                    const t = parseMoneyToNumber(rawTP);
                    const nameVal =
                      iN !== -1 && row[iN] !== undefined
                        ? String(row[iN]).trim()
                        : "";

                    // Force Bank Account Number to be string
                    let acc = "";
                    if (iA !== -1) {
                      const rawAcc = row[iA];
                      acc =
                        rawAcc !== undefined && rawAcc !== null
                          ? String(rawAcc).replace(/\s/g, "")
                          : "";
                      if (
                        typeof rawAcc === "number" &&
                        (acc.includes("E") || acc.includes("e"))
                      ) {
                        acc = rawAcc.toLocaleString("fullwide", {
                          useGrouping: false,
                        });
                      }
                    }

                    const idVal =
                      iId !== -1 && row[iId] !== undefined
                        ? String(row[iId]).trim()
                        : "";

                    let type = "Liên ngân hàng";
                    if (!acc) type = "⚠️ Thiếu STK";
                    else if (acc.length < 6 || acc.length > 25)
                      type = "⚠️ Sai độ dài";
                    else if (acc.startsWith("0") || acc.startsWith("10"))
                      type = "Nội bộ VCB";

                    const rawCenterVal =
                      iCenter !== -1 && row[iCenter] !== undefined
                        ? String(row[iCenter]).trim()
                        : "";

                    const rawCenterKey = rawCenterVal.toLowerCase();
                    let l07 = rawCenterVal;
                    let business = "";

                    if (rawCenterVal) {
                      if (aeMap[rawCenterKey]) {
                        l07 = aeMap[rawCenterKey].name;
                        business = aeMap[rawCenterKey].bus;
                      } else {
                        const info = getCenterInfoByAECode(rawCenterVal);
                        if (info) {
                          l07 = info.l07;
                          business = info.bus;
                        } else {
                          const mapped = mapL07(rawCenterVal);
                          const info2 = getCenterInfoByL07(mapped);
                          if (info2) {
                            l07 = info2.l07;
                            business = info2.bus;
                          } else {
                            l07 = mapped;
                          }
                        }
                      }
                    }

                    bankData.push({
                      No: iS !== -1 && row[iS] !== undefined ? row[iS] : "",
                      "ID Number": idVal,
                      "Full name": nameVal,
                      L07: l07,
                      Business: business,
                      "Bank Account Number": acc,
                      "TOTAL PAYMENT": t,
                      "LOẠI CK": type,
                      "Payment details":
                        iP !== -1 && row[iP] !== undefined
                          ? String(row[iP]).trim()
                          : "",
                      "TÊN FILE": item.name || "",
                      _fileBank: item.bank || "",
                      _fileMonth: itemMonth,
                    });
                  }
                }
              }

              if (nameUpper.includes("HOLD") || nameUpper.includes("ADD")) {
                let headerRowIndex = -1;
                for (let r = 0; r < Math.min(30, rows.length); r++) {
                  const rowStr = rows[r]
                    .map((c) => String(c || "").toUpperCase())
                    .join(" ");
                  if (
                    (rowStr.includes("FULL NAME") ||
                      rowStr.includes("HỌ VÀ TÊN") ||
                      rowStr.includes("TÊN") ||
                      rowStr.includes("CMND")) &&
                    (rowStr.includes("SỐ TÀI KHOẢN") ||
                      rowStr.includes("TÀI KHOẢN") ||
                      rowStr.includes("STK") ||
                      rowStr.includes("TOTAL PAYMENT") ||
                      rowStr.includes("THỰC NHẬN") ||
                      rowStr.includes("TỔNG") ||
                      rowStr.includes("CENTER") ||
                      rowStr.includes("SỐ TIỀN") ||
                      rowStr.includes("PHÁT SINH"))
                  ) {
                    headerRowIndex = r;
                    break;
                  }
                }

                foundAnySheet = true;
                sheetProcessed = true;

                // Identify file month 
                let fileMonthNum = -1;
                const monthStr = appData.globalMonth || "03.2026";
                const lowerMonth = String(monthStr).toLowerCase().trim();
                const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
                for (let i = 0; i < monthNames.length; i++) {
                  if (lowerMonth.includes(monthNames[i])) {
                    fileMonthNum = i + 1;
                    break;
                  }
                }
                if (fileMonthNum === -1) {
                  const match = lowerMonth.match(/(?:t|tháng|thang)\s*(\d{1,2})/);
                  if (match) fileMonthNum = parseInt(match[1], 10);
                  else {
                    const match2 = lowerMonth.match(/(\d{1,2})\/\d{4}/);
                    if (match2) fileMonthNum = parseInt(match2[1], 10);
                    else {
                      const match3 = lowerMonth.match(/\b(0?[1-9]|1[0-2])\b/);
                      if (match3) fileMonthNum = parseInt(match3[1], 10);
                    }
                  }
                }

                const getRowShouldNegate = (_noteValue: string) => {
                  void _noteValue;
                  let rowShouldNegate = false;
                  const sheetSource = sheetName;
                  
                  // Determine negation ONLY from the sheetName itself, never from the adjacent Note column.
                  // The Note column has absolutely zero impact on the Sheet Source or whether the Total Payment is negated.
                  const sheetNameUpper = sheetName.toUpperCase();
                  if (sheetNameUpper.includes("HOLD") && fileMonthNum !== -1) {
                    const ssMatch = sheetNameUpper.match(/(?:T|THÁNG|THANG|HOLD T|HOLD THÁNG|HOLD)\s*(\d{1,2})/);
                    if (ssMatch) {
                      if (parseInt(ssMatch[1], 10) === fileMonthNum) rowShouldNegate = true;
                    } else {
                      const allNumbers = sheetNameUpper.match(/\d+/g);
                      if (allNumbers) {
                        for (const m of allNumbers) {
                          if (parseInt(m, 10) === fileMonthNum) {
                            rowShouldNegate = true;
                            break;
                          }
                        }
                      }
                    }
                  }
                  return { rowShouldNegate, sheetSource };
                };

                if (headerRowIndex !== -1) {
                  // Header found - use dynamic mapping
                  const h = rows[headerRowIndex].map((c) =>
                    String(c || "").trim(),
                  );
                  const iId = getColIndex(h, "ID Number", item.columnMapping, [
                    "ID",
                    "CMND",
                    "MÃ NV",
                    "CĂN CƯỚC",
                  ]);
                  const iN = getColIndex(h, "Full name", item.columnMapping, [
                    "NAME",
                    "TÊN",
                    "NV",
                    "GIÁO VIÊN",
                    "KHÁCH HÀNG",
                  ]);
                  const iA = getColIndex(
                    h,
                    "Bank Account Number",
                    item.columnMapping,
                    ["ACCOUNT", "TÀI KHOẢN", "STK"],
                  );
                  const iT = getColIndex(
                    h,
                    "TOTAL PAYMENT",
                    item.columnMapping,
                    ["TOTAL", "TỔNG", "THỰC NHẬN", "SỐ TIỀN", "TIỀN", "SỐ PHÁT SINH", "PHÁT SINH", "HOLD", "HOLD T3"],
                  );
                  // const iBank = getColIndex(
                  //   h,
                  //   "Bank Name",
                  //   item.columnMapping,
                  //   ["BANK", "NGÂN HÀNG", "TEN NGAN HANG", "TÊN NGÂN HÀNG"],
                  // );
                  // const iThang = getColIndex(h, "Tháng", item.columnMapping, [
                  //   "THÁNG",
                  //   "MONTH",
                  //   "KỲ",
                  // ]);
                  const iTax = getColIndex(h, "TAX CODE", item.columnMapping, [
                    "TAX",
                    "MST",
                  ]);
                  const iContract = getColIndex(
                    h,
                    "Contract No",
                    item.columnMapping,
                    ["CONTRACT", "HỢP ĐỒNG"],
                  );
                  const iCenter = getColIndex(
                    h,
                    "Center",
                    item.columnMapping,
                    ["CENTER NOTE", "CENTER", "CENTERS", "TRUNG TÂM", "MÃ AE"],
                  );
                  const iNote = getColIndex(h, "Note", item.columnMapping, [
                    "NOTE",
                    "GHI CHÚ",
                  ]);

                  for (let r = headerRowIndex + 1; r < rows.length; r++) {
                    const row = rows[r];
                    if (!row || row.length < 3) continue;

                    const idVal =
                      iId !== -1 && row[iId] !== undefined
                        ? String(row[iId]).trim()
                        : "";
                    const nameVal =
                      iN !== -1 && row[iN] !== undefined
                        ? String(row[iN]).trim()
                        : "";

                    let accVal = "";
                    if (iA !== -1) {
                      const rawAcc = row[iA];
                      accVal =
                        rawAcc !== undefined && rawAcc !== null
                          ? String(rawAcc).replace(/\s/g, "")
                          : "";
                      if (
                        typeof rawAcc === "number" &&
                        (accVal.includes("E") || accVal.includes("e"))
                      ) {
                        accVal = rawAcc.toLocaleString("fullwide", {
                          useGrouping: false,
                        });
                      }
                    }

                    const taxCode =
                      iTax !== -1 && row[iTax] !== undefined
                        ? String(row[iTax]).trim()
                        : "";
                    const contractNo =
                      iContract !== -1 && row[iContract] !== undefined
                        ? String(row[iContract]).trim()
                        : "";
                    const rawTP =
                      iT !== -1 && row[iT] !== undefined ? row[iT] : "";
                    const note =
                      iNote !== -1 && row[iNote] !== undefined
                        ? String(row[iNote]).trim()
                        : "";

                    const { rowShouldNegate, sheetSource } = getRowShouldNegate(note);

                    let numTP = parseMoneyToNumber(rawTP);
                    if (rowShouldNegate) {
                      numTP = -Math.abs(numTP);
                    }

                    const centerNote =
                      iCenter !== -1 && row[iCenter] !== undefined
                        ? String(row[iCenter]).trim()
                        : "";

                    if (!idVal && !nameVal && numTP === 0) continue;
                    
                    if (!accVal && !rowShouldNegate) continue;

                    holdData.push({
                      "No.": holdData.length + 1,
                      "ID Number": idVal,
                      "Full name": nameVal,
                      "Bank Account Number": accVal,
                      "TAX CODE": taxCode,
                      "Contract No": contractNo,
                      "TOTAL PAYMENT": numTP,
                      "Mã ae": centerNote,
                      "Sheet Source": sheetSource,
                      Note: note,
                      "TÊN FILE": item.name || "",
                      _fileBank: item.bank || "",
                      _fileMonth: itemMonth,
                      _rawRowData: Array.isArray(row) ? row : [],
                      _headerRowArr: h,
                    });
                  }
                } else {
                  // No header found - extract data from column B to I (indices 1 to 8)
                  // Columns expected: ID Number (B), Full name (C), Bank / Tax (D/E), Contract No (F), TOTAL PAYMENT (G), CENTER (H), NOTE (I)
                  const getValidVals = (cIndex: number) => {
                    const s = new Set<string>();
                    for (let r = 0; r < rows.length; r++) {
                      const row = rows[r];
                      if (!row || row.length === 0) continue;
                      const val = String(row[cIndex] || "").trim();
                      if (val && val.length > 2 && val.toUpperCase() !== "NULL" && val !== "0" && !val.match(/^[0]+$/)) {
                        s.add(val);
                      }
                    }
                    return s;
                  };

                  let cID = 1, cBank = 3, cTax = 4;
                  const s1 = getValidVals(1);
                  const s3 = getValidVals(3);
                  const s4 = getValidVals(4);

                  const intersects = (setA: Set<string>, setB: Set<string>) => {
                    for (const elem of setB) {
                      if (setA.has(elem)) return true;
                    }
                    return false;
                  };

                  if (intersects(s1, s3)) {
                    // Cột B trùng với cột D -> Cột B là ID, D là TAX, còn lại E là Bank
                    cID = 1; cTax = 3; cBank = 4;
                  } else if (intersects(s1, s4)) {
                    // Cột B trùng với cột E -> Cột B là ID, E là TAX, còn lại D là Bank
                    cID = 1; cTax = 4; cBank = 3;
                  } else if (intersects(s3, s4)) {
                    // Không xác định được với B, nhưng D và E trùng nhau -> D và E là ID và TAX, cột còn lại cột B quan trọng nhất là Bank
                    cBank = 1; cID = 3; cTax = 4;
                  }

                  for (let r = 0; r < rows.length; r++) {
                    const row = rows[r];
                    if (!row || row.length === 0) continue;

                    const idVal = String(row[cID] || "").trim();
                    const nameVal = String(row[2] || "").trim();
                    let accVal = String(row[cBank] || "").trim();
                    const taxCode = String(row[cTax] || "").trim();
                    const contractNo = String(row[5] || "").trim();
                    
                    const centerNote = String(row[7] || "").trim();
                    const note = String(row[8] || "").trim();

                    const { rowShouldNegate, sheetSource } = getRowShouldNegate(note);

                    const rawTP = row[6] !== undefined ? row[6] : "";
                    let numTP = parseMoneyToNumber(rawTP);
                    if (rowShouldNegate) {
                      numTP = -Math.abs(numTP);
                    }

                    if (!idVal && !nameVal && numTP === 0) continue;
                    if (idVal && !nameVal && numTP === 0 && idVal.toUpperCase().includes("HOLD")) continue;
                    if (idVal.toUpperCase() === "ID NUMBER" || nameVal.toUpperCase() === "FULL NAME") continue;

                    if (row[cBank] !== undefined && row[cBank] !== null) {
                      accVal = String(row[cBank]).replace(/\s/g, "");
                      if (typeof row[cBank] === "number" && (accVal.includes("E") || accVal.includes("e"))) {
                        accVal = Number(row[cBank]).toLocaleString("fullwide", { useGrouping: false });
                      }
                    }

                    if (!accVal && !rowShouldNegate) continue;

                    holdData.push({
                      "No.": holdData.length + 1,
                      "ID Number": idVal,
                      "Full name": nameVal,
                      "Bank Account Number": accVal,
                      "TAX CODE": taxCode,
                      "Contract No": contractNo,
                      "TOTAL PAYMENT": numTP,
                      "Mã ae": centerNote,
                      "Sheet Source": sheetSource,
                      Note: note,
                      "TÊN FILE": item.name || "",
                      _fileBank: item.bank || "",
                      _fileMonth: itemMonth,
                    });
                  }
                }
              }

              if (
                nameUpper.includes("SHEET 1") ||
                nameUpper.includes("SHEET1")
              ) {
                let headerRowIndex = -1;
                for (let r = 0; r < Math.min(30, rows.length); r++) {
                  const rowStr = rows[r]
                    .map((c) => String(c || "").toUpperCase())
                    .join(" ");
                  let matchCount = 0;
                  if (
                    rowStr.includes("FULL NAME") ||
                    rowStr.includes("HỌ VÀ TÊN") ||
                    rowStr.includes("TÊN NHÂN VIÊN")
                  )
                    matchCount++;
                  if (
                    rowStr.includes("ID NUMBER") ||
                    rowStr.includes("MÃ NV") ||
                    rowStr.includes("ID")
                  )
                    matchCount++;
                  if (
                    rowStr.includes("TOTAL PAYMENT") ||
                    rowStr.includes("THỰC NHẬN") ||
                    rowStr.includes("TỔNG")
                  )
                    matchCount++;

                  if (matchCount >= 2) {
                    headerRowIndex = r;
                    break;
                  }
                }

                if (headerRowIndex !== -1) {
                  foundAnySheet = true;
                  sheetProcessed = true;
                  const h = rows[headerRowIndex].map((c) =>
                    String(c || "").trim(),
                  );
                  const colIndices: Record<string, number> = {};
                  sheet1Headers.forEach((th) => {
                    if (th === "L07" || th === "Business") return;

                    const fuzzyMap: Record<string, string[]> = {
                      "Full name": ["FULL NAME", "HỌ VÀ TÊN", "TÊN NHÂN VIÊN"],
                      "ID Number": ["ID", "MÃ NV", "CMND", "MÃ NHÂN VIÊN", "EMPLOYEE ID", "CĂN CƯỚC"],
                      "Bank Account Number": ["ACCOUNT", "TÀI KHOẢN", "STK", "SỐ TÀI KHOẢN"],
                      "TOTAL PAYMENT": ["TOTAL", "TỔNG", "THỰC NHẬN", "TỔNG THANH TOÁN"],
                      "Bank Name": ["BANK NAME", "NGÂN HÀNG"],
                      Bank: [
                        "BANK",
                        "NGÂN HÀNG",
                        "TEN NGAN HANG",
                        "TÊN NGÂN HÀNG",
                      ],
                      Tháng: ["THÁNG", "MONTH", "KỲ"],
                      "CHARGE TO LXO": ["LXO", "CHARGE LXO", "CHARGE TO LXO", "CHARGE LXP"],
                      "CHARGE TO EC": ["EC", "CHARGE EC", "CHARGE TO EC"],
                      "CHARGE TO PT-DEMO": ["PT-DEMO", "CHARGE PT-DEMO", "CHARGE TO PT-DEMO"],
                      "Charge MKT Local": ["MKT", "MKT LOCAL", "CHARGE MKT LOCAL", "CHARGE TO MKT LOCAL", "CHARGE MKT", "CHARGE OTHER", "CHARGE TO CENTER MKT"],
                      "Charge Renewal Projects": ["RENEWAL", "RENEWAL PROJECTS", "CHARGE TO RENEWAL PROJECTS", "CHARGE RENEWAL"],
                      "Charge Discovery Camp": ["DISCOVERY", "DISCOVERY CAMP", "CHARGE TO DISCOVERY CAMP", "CHARGE DISCOVERY"],
                      "Charge Summer Outing": ["SUMMER OUTING", "CHARGE TO SUMMER OUTING", "CHARGE SUMMER"],
                      "Charge Summer Instructors": ["SUMMER INSTRUCTORS", "CHARGE TO SUMMER INSTRUCTORS", "CHARGE INSTRUCTOR", "CHARGE INSTRUCTORS"],
                      "TAX CODE": ["TAX", "MST", "MÃ SỐ THUẾ", "TAX CODE", "MÃ ST"],
                      "Contract No": ["CONTRACT", "HỢP ĐỒNG", "SỐ HỢP ĐỒNG", "CONTRACT NO"],
                      "CITAD code": ["CITAD", "MÃ CITAD", "CITAD CODE", "CITAD CHECK"],
                    };

                    colIndices[th] = getColIndex(
                      h,
                      th,
                      item.columnMapping,
                      fuzzyMap[th] || [],
                    );
                  });

                  let centerColIndex = getColIndex(
                    h,
                    "Center",
                    item.columnMapping,
                    [
                      "CENTER",
                      "COST CENTER",
                      "CENTERS",
                      "AE CODE",
                      "AE",
                      "MÃ AE",
                      "MÃ CENTERS",
                      "MÃ TT",
                    ],
                  );
                  if (centerColIndex === -1) centerColIndex = 19;

                  for (let r = headerRowIndex + 1; r < rows.length; r++) {
                    const row = rows[r];
                    // const idxTP = colIndices["TOTAL PAYMENT"];
                    // const rawTP =
                    //   idxTP !== -1 && row[idxTP] !== undefined
                    //     ? row[idxTP]
                    //     : "";
                    // const numTP = parseMoneyToNumber(rawTP);

                    const idxAcc = colIndices["Bank Account Number"];
                    let accVal = "";
                    if (idxAcc !== -1) {
                      const rawAcc = row[idxAcc];
                      accVal =
                        rawAcc !== undefined && rawAcc !== null
                          ? String(rawAcc).trim()
                          : "";
                      if (
                        typeof rawAcc === "number" &&
                        (accVal.includes("E") || accVal.includes("e"))
                      ) {
                        accVal = rawAcc.toLocaleString("fullwide", {
                          useGrouping: false,
                        });
                      }
                    }

                    const idxName = colIndices["Full name"];
                    const nameVal =
                      idxName !== -1 && row[idxName] !== undefined
                        ? String(row[idxName]).trim()
                        : "";

                    if (!accVal) continue;

                    if (
                      (nameVal !== "" || idxName === -1)
                    ) {
                      const obj: any = {};
                      sheet1Headers.forEach((th) => {
                        if (th === "L07" || th === "Business") return;
                        const idx = colIndices[th];
                        let val =
                          idx !== -1 && row[idx] !== undefined ? row[idx] : "";

                        const valStr = String(val).toUpperCase().trim();
                        if (
                          valStr === "NA" ||
                          valStr === "N/A" ||
                          valStr === "#N/A" ||
                          valStr === "NAN"
                        ) {
                          val = "";
                        }

                        if (th === "Bank Account Number") {
                          val = accVal;
                        } else if (isMoneyColumn(th)) {
                          val = parseMoneyToNumber(val);
                        }

                        obj[th] = val;
                      });

                      const rawCenterVal =
                        centerColIndex !== -1
                          ? String(row[centerColIndex] || "").trim()
                          : "";
                      obj["_rawAE"] = rawCenterVal;

                      let l07 = rawCenterVal;
                      let business = "";

                      if (rawCenterVal) {
                        const rawCenterKey = rawCenterVal.toLowerCase();
                        if (aeMap[rawCenterKey]) {
                          const mappedName = aeMap[rawCenterKey].name;
                          const formalInfo = getCenterInfoByL07(mappedName) || getCenterInfoByAECode(mappedName);
                          l07 = formalInfo ? formalInfo.l07 : mappedName;
                          business = aeMap[rawCenterKey].bus;
                        } else {
                          const info = getCenterInfoByAECode(rawCenterVal);
                          if (info) {
                            l07 = info.l07;
                            business = info.bus;
                          } else {
                            const mapped = mapL07(rawCenterVal);
                            const info2 = getCenterInfoByL07(mapped);
                            if (info2) {
                              l07 = info2.l07;
                              business = info2.bus;
                            } else {
                              // If even keyword mapping couldn't find a formal L07 info
                              l07 = mapped.includes(".")
                                ? mapped
                                : mapped + " (Chưa Map)";
                            }
                          }
                        }
                      }

                      obj["L07"] = l07;
                      obj["Business"] = business;
                      obj["TÊN FILE"] = item.name || "";
                      obj["_fileBank"] = item.bank || "";
                      obj["_fileMonth"] = normalizeMonth(itemMonth);
                      obj["Tháng báo cáo"] = normalizeMonth(itemMonth);
                      sheet1Data.push(obj);
                    }
                  }
                }
              }

              if (nameUpper.includes("SO SÁNH AE")) {
                foundAnySheet = true;
                sheetProcessed = true;
                for (let r = 1; r < rows.length; r++) {
                  const row = rows[r];
                  soSanhAeData.push({
                    "ID Number": row[0] || "",
                    "Full name": row[1] || "",
                    "Sheet 1 AE": row[2] || 0,
                    "Bank North AE": row[3] || 0,
                    "Chênh Lệch": row[4] || 0,
                  });
                }
              }

              if (sheetProcessed) fileProcessedSuccessfully = true;
            } catch (sheetError: any) {
              console.error(
                `Lỗi xử lý sheet ${sheetName} trong file ${item.name}:`,
                sheetError,
              );
            }
          }

          if (fileProcessedSuccessfully) {
            updateAppData(
              (prev) => ({
                ...prev,
                Ae_Global_Inputs: prev.Ae_Global_Inputs.map((row) =>
                  row.id === item.id ? { ...row, status: "Success" } : row,
                ),
              }),
              false,
            );
          } else {
            updateAppData(
              (prev) => ({
                ...prev,
                Ae_Global_Inputs: prev.Ae_Global_Inputs.map((row) =>
                  row.id === item.id
                    ? { ...row, status: "Error: Invalid format" }
                    : row,
                ),
              }),
              false,
            );
          }
        } catch (e: any) {
          updateAppData(
            (prev) => ({
              ...prev,
              Ae_Global_Inputs: prev.Ae_Global_Inputs.map((row) =>
                row.id === item.id
                  ? { ...row, status: `Error: ${e.message}` }
                  : row,
              ),
            }),
            false,
          );
        }
      }

      if (!foundAnySheet) {
        toast.error(
          "Không tìm thấy Sheet 'BANK', 'SHEET 1', 'HOLD', 'ADD' hoặc 'SO SÁNH AE' hợp lệ!",
        );
        return;
      }

      setProcessingMessage("Đang tổng hợp và khử trùng dữ liệu...");
      await new Promise((resolve) => setTimeout(resolve, 10));

      const finalSheet1Data: any[] = [];
      const seenSheet1Keys = new Set();
      const chargeCols = [
        "CHARGE TO LXO",
        "CHARGE TO EC",
        "CHARGE TO PT-DEMO",
        "Charge MKT Local",
        "Charge Renewal Projects",
        "Charge Discovery Camp",
        "Charge Summer Outing",
        "Charge Summer Instructors",
      ];

      sheet1Data.forEach((row) => {
        let calcPayment = 0;
        chargeCols.forEach(col => {
          calcPayment += parseMoneyToNumber(row[col] || 0);
        });
        row["TOTAL PAYMENT"] = calcPayment;

        const idNum = String(row["ID Number"] || "").trim();
        const fname = String(row["Full name"] || "").trim();
        const l07 = String(row["L07"] || "").trim();
        const total = calcPayment;
        const key = `${idNum}|${fname}|${l07}|${total}`;
        if (!seenSheet1Keys.has(key)) {
          row.id = crypto.randomUUID();
          finalSheet1Data.push(row);
          seenSheet1Keys.add(key);
        }
      });

      const finalBankData: any[] = [];
      const seenBankKeys = new Set();
      bankData.forEach((row) => {
        const idNum = String(row["ID Number"] || "").trim();
        const fname = String(row["Full name"] || "").trim();
        const acc = String(row["Bank Account Number"] || "").trim();
        
        // Bỏ qua nếu Bank Account Number trống (theo yêu cầu)
        if (!acc) return;
        
        const total = parseMoneyToNumber(row["TOTAL PAYMENT"]);
        const key = `${idNum}|${fname}|${acc}|${total}`;
        if (!seenBankKeys.has(key)) {
          row.id = crypto.randomUUID();
          row["No"] = finalBankData.length + 1;
          finalBankData.push(row);
          seenBankKeys.add(key);
        }
      });

      const finalHoldData: any[] = [];
      holdData.forEach((row) => {
        row["No"] = finalHoldData.length + 1;

        const rawCenterVal = String(row["Mã ae"] || row["CENTER"] || "").trim();
        const aeMap = appData.AE_Map;

        let l07 = rawCenterVal;
        let business = "";

        if (rawCenterVal) {
          const rawKey = rawCenterVal.toLowerCase();
          if (aeMap[rawKey]) {
            const mappedName = aeMap[rawKey].name;
            const formalInfo = getCenterInfoByL07(mappedName) || getCenterInfoByAECode(mappedName);
            l07 = formalInfo ? formalInfo.l07 : mappedName;
            business = aeMap[rawKey].bus;
          } else {
            const info = getCenterInfoByAECode(rawCenterVal);
            if (info) {
              l07 = info.l07;
              business = info.bus;
            } else {
              const mapped = mapL07(rawCenterVal);
              const info2 = getCenterInfoByL07(mapped);
              if (info2) {
                l07 = info2.l07;
                business = info2.bus;
              } else {
                l07 = mapped;
              }
            }
          }
        }

        row["L07"] = l07;
        row["Business"] = business;
        row["BU"] = business;
        row.id = crypto.randomUUID();

        finalHoldData.push(row);
      });

      // 4. TỰ ĐỘNG ĐỐI SOÁT (RECONCILIATION LOGIC)
      setProcessingMessage("Đang tự động đối soát Sheet 1 và Bank...");
      setProgress(95);
      const finalSoSanhAeData: any[] = [];
      const sheet1Map: Record<string, any> = {};

      // Tạo Map cho Sheet 1 để tra cứu nhanh
      finalSheet1Data.forEach((row) => {
        const id = String(row["ID Number"] || "").trim();
        if (id) {
          if (!sheet1Map[id]) sheet1Map[id] = [];
          sheet1Map[id].push(row);
        }
      });

      const processedSheet1Ids = new Set<string>();

      // Duyệt qua dữ liệu Bank để so sánh
      finalBankData.forEach((bankRow) => {
        const id = String(bankRow["ID Number"] || "").trim();
        const bankAmount = parseMoneyToNumber(bankRow["TOTAL PAYMENT"]);
        const sheet1Rows = id ? sheet1Map[id] : null;

        if (sheet1Rows && sheet1Rows.length > 0) {
          const sheet1Total = sheet1Rows.reduce(
            (sum: number, r: any) =>
              sum + parseMoneyToNumber(r["TOTAL PAYMENT"]),
            0,
          );
          const diff = sheet1Total - bankAmount;

          finalSoSanhAeData.push({
            "ID Number": id,
            "Full name": bankRow["Full name"] || sheet1Rows[0]["Full name"],
            "Sheet 1 AE": sheet1Total,
            "Bank North AE": bankAmount,
            "Chênh Lệch": diff,
            "Ghi chú":
              diff === 0
                ? "Khớp"
                : diff > 0
                  ? "Thừa AE duyệt"
                  : "Thiếu AE duyệt",
          });
          processedSheet1Ids.add(id);

          // (Removed auto-pushing to Hold based on user requirement: 'chỉ lấy các sheet chứa từ Hold')
        } else {
          const diff = -bankAmount;
          finalSoSanhAeData.push({
            "ID Number": id,
            "Full name": bankRow["Full name"],
            "Sheet 1 AE": 0,
            "Bank North AE": bankAmount,
            "Chênh Lệch": diff,
            "Ghi chú": "Thiếu Sheet 1 (Chưa duyệt)",
          });

          // (Removed auto-pushing to Hold based on user requirement)
        }
      });

      // Kiểm tra những người có trong Sheet 1 nhưng không có trong Bank
      Object.keys(sheet1Map).forEach((id) => {
        if (!processedSheet1Ids.has(id)) {
          const sheet1Rows = sheet1Map[id];
          const sheet1Total = sheet1Rows.reduce(
            (sum: number, r: any) =>
              sum + parseMoneyToNumber(r["TOTAL PAYMENT"]),
            0,
          );

          finalSoSanhAeData.push({
            "ID Number": id,
            "Full name": sheet1Rows[0]["Full name"],
            "Sheet 1 AE": sheet1Total,
            "Bank North AE": 0,
            "Chênh Lệch": sheet1Total,
            "Ghi chú": "Thừa Sheet 1 (Bank không gửi)",
          });
        }
      });

      // Lọc các bản ghi có 'Bank Account Number' không trống cho Sheet 1
      const verifiedSheet1Data = finalSheet1Data.filter(r => r["Bank Account Number"] && String(r["Bank Account Number"]).trim() !== "");
      const verifiedHoldData = finalHoldData;

      // Cập nhật map BU, L07 từ Sheet 1 cho Hold Data
      verifiedHoldData.forEach((row) => {
        const id = row["ID Number"];
        if (id && sheet1Map[id] && sheet1Map[id].length > 0) {
          row["L07"] = row["L07"] || sheet1Map[id][0]["L07"];
          row["BU"] = row["BU"] || sheet1Map[id][0]["Business"] || sheet1Map[id][0]["BU"];
        }
      });

      updateAppData((prev) => {
        const currentMonth = prev.globalMonth || "03.2026";
        const existingHoldData = prev.Hold_AE?.data || [];
        const uploadTime = new Date().toISOString();

        // Standardize monthly values and fields for new incoming rows
        verifiedHoldData.forEach((row) => {
          let rMonth = currentMonth;
          let rNghiepVu = row["Nghiệp vụ"] || "";

          if (row._rawRowData && row._headerRowArr) {
             const h = row._headerRowArr;
             const rawRow = row._rawRowData;
             const iThang = h.findIndex((x: any) => String(x).toUpperCase().includes("THÁNG") || String(x).toUpperCase().includes("MONTH"));
             const iNghiepVuCol = h.findIndex((x: any) => String(x).toUpperCase().includes("NGHIỆP VỤ") || String(x).toUpperCase().includes("LOẠI"));
             if (iThang !== -1 && rawRow[iThang] !== undefined) {
               const v = String(rawRow[iThang]).trim();
               if (v) rMonth = v;
             }
             if (iNghiepVuCol !== -1 && rawRow[iNghiepVuCol] !== undefined) {
               const v = String(rawRow[iNghiepVuCol]).trim();
               if (v) rNghiepVu = v;
             }
          }

          const rawMonth = row["Tháng báo cáo"] || row["_fileMonth"] || rMonth;
          row["Tháng báo cáo"] = normalizeMonth(rawMonth) || normalizeMonth(currentMonth);
          if (!row["Nghiệp vụ"]) row["Nghiệp vụ"] = rNghiepVu || "Hold";
          row.id = row.id || crypto.randomUUID();
          row._uploadTimestamp = row._uploadTimestamp || uploadTime;
        });

        const holdKeyFn = (r: any) => {
          const id = String(r["ID Number"] || "").trim().toUpperCase();
          const month = normalizeMonth(r["Tháng báo cáo"] || r["_fileMonth"] || currentMonth);
          const tp = Math.round(parseMoneyToNumber(r["TOTAL PAYMENT"] || 0));
          const note = String(r["Note"] || "").trim().toUpperCase();
          const nv = String(r["Nghiệp vụ"] || "").trim().toUpperCase() || "HOLD";
          return `${id}|${month}|${tp}|${note}|${nv}`;
        };

        // Group and map existing data by ID/Key and Timestamp
        const recordsMap = new Map<string, any>();

        existingHoldData.forEach((row) => {
          const key = holdKeyFn(row);
          row.id = row.id || crypto.randomUUID();
          row._recordId = row._recordId || key;
          if (!row._uploadTimestamp) {
            row._uploadTimestamp = new Date(0).toISOString(); // Backfill old records
          }
          
          const existing = recordsMap.get(key);
          if (!existing || new Date(row._uploadTimestamp).getTime() > new Date(existing._uploadTimestamp).getTime()) {
            recordsMap.set(key, row);
          }
        });

        // Merge incoming verified hold data
        verifiedHoldData.forEach((row) => {
          const key = holdKeyFn(row);
          row._recordId = row._recordId || key;
          
          const existing = recordsMap.get(key);
          if (!existing) {
            recordsMap.set(key, row);
          } else {
            // Compare upload timestamps to prevent duplicates, keeping the newest upload
            const existingTime = new Date(existing._uploadTimestamp || 0).getTime();
            const incomingTime = new Date(row._uploadTimestamp).getTime();
            if (incomingTime >= existingTime) {
              recordsMap.set(key, row); // Replace with fresher record
            }
          }
        });

        const mergedHoldData = Array.from(recordsMap.values());

        // Re-calculate row numbers
        mergedHoldData.forEach((row, idx) => {
          row["No."] = idx + 1;
          row["No"] = idx + 1;
        });

        return {
          ...prev,
          Bank_North_AE: {
            headers: [
              "No",
              "L07",
              "Business",
              "ID Number",
              "Full name",
              "Bank Account Number",
              "TOTAL PAYMENT",
              "LOẠI CK",
              "Payment details",
            ],
            data: finalBankData,
          },
          Sheet1_AE: { headers: sheet1Headers, data: verifiedSheet1Data },
          SoSanh_AE: {
            headers: [
              "ID Number",
              "Full name",
              "Sheet 1 AE",
              "Bank North AE",
              "Chênh Lệch",
              "Ghi chú",
            ],
            data: finalSoSanhAeData,
          },
          Hold_AE: {
            headers: [
              "No.",
              "TÊN FILE",
              "Tháng báo cáo",
              "BU",
              "L07",
              "ID Number",
              "Full name",
              "Bank Account Number",
              "TAX CODE",
              "Contract No",
              "TOTAL PAYMENT",
              "Mã ae",
              "Sheet Source",
              "Note",
              "Nghiệp vụ",
            ],
            data: mergedHoldData,
          },
        };
      }, false);

      toast.success(
        `Xử lý xong: ${verifiedSheet1Data.length} Sheet1, ${finalBankData.length} Bank, ${verifiedHoldData.length} Hold.`,
      );
      if (onSwitchToFinal) {
        onSwitchToFinal();
      } else {
        navigate("/master-ae");
      }
    } catch (error: any) {
      console.error("Error processing AE data:", error);
      toast.error("Lỗi xử lý file: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex-1 flex flex-col min-h-0 bg-transparent p-4 md:p-8 gap-8 items-center overflow-auto custom-scrollbar"
    >
      {/* Main Content Card */}
      <div className="bg-white soft-card force-light flex-1 flex flex-col min-h-0 w-full relative overflow-hidden">
        <div className="absolute inset-0 striped-pattern opacity-[0.05] pointer-events-none" />

        {/* Integrated Header & Controls */}
        <div className="px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-muted/20 shrink-0 border-b border-border relative z-10 overflow-hidden">
          <div className="absolute inset-0 striped-pattern-sage opacity-[0.1] pointer-events-none" />
          <div className="flex items-center gap-5 relative z-10">
            <PuppyLogo size={56} className="shrink-0" />

            <div>
              <h2 className="text-3xl font-normal font-serif text-foreground tracking-tight flex items-end gap-1" style={{ fontSize: "25px", paddingTop: "0px", paddingBottom: "0px" }}>
                Files from{" "}
                <span className="not-italic font-script text-primary text-4xl lowercase inline-block transform -translate-y-0.5">
                  AE
                </span>
              </h2>
              <p className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                MANAGEMENT • {appData.Sheet1_AE.data.length} RECORDS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  className="relative group"
                >
                  <input
                    id="search-input"
                    name="search-input"
                    type="text"
                    placeholder="TÌM KIẾM..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-primary/5 border border-primary/10 rounded-xl pl-10 pr-4 py-2 text-xs w-64 uppercase font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:w-80"
                    autoFocus
                  />
                  <Search className="w-4 h-4 text-primary/30 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (onSwitchToFinal) {
                    onSwitchToFinal();
                  } else {
                    navigate("/master-ae");
                  }
                }}
                className="flex items-center gap-2 px-6 h-11 border border-primary/20 rounded-full bg-primary/5 text-primary font-bold text-[0.6875rem] uppercase tracking-widest hover:bg-primary/10 transition-colors shadow-sm whitespace-nowrap"
              >
                Go to Final from AE
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>

              <button
                onClick={processAEData}
                disabled={isProcessing}
                className="soft-button bg-primary text-white shadow-md flex items-center gap-3 px-8"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Layers className="w-4 h-4" />
                )}
                <span className="text-[0.7rem] font-bold tracking-widest uppercase">
                  Xử lý dữ liệu
                </span>
              </button>

              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button className="p-3 rounded-full border border-border bg-white text-muted-foreground hover:text-primary transition-all group shadow-sm">
                        <Wrench className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500" />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Cài đặt</TooltipContent>
                </Tooltip>
                <DropdownMenuContent
                  align="end"
                  className="w-64 border border-primary/10 shadow-xl p-1.5 bg-white"
                >
                  <DropdownMenuLabel className="font-bold uppercase text-[0.625rem] tracking-widest text-primary/60 px-3 py-2">
                    Thao tác dữ liệu
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-primary/10 mx-1.5" />

                  <DropdownMenuItem
                    onClick={addRow}
                    className="cursor-pointer font-bold uppercase text-[0.6875rem] gap-3 p-3 rounded-xl transition-all hover:bg-primary/5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm dòng mới</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setShowSearch(!showSearch)}
                    className={`cursor-pointer font-bold uppercase text-[0.6875rem] gap-3 p-3 rounded-xl transition-all ${showSearch ? "bg-primary text-white shadow-lg shadow-primary/20" : "hover:bg-primary/5"}`}
                  >
                    <Search className="w-4 h-4" />
                    <span>{showSearch ? "Ẩn tìm kiếm" : "Hiện tìm kiếm"}</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer font-bold uppercase text-[0.6875rem] gap-3 hover:bg-primary/5 text-primary p-3 rounded-xl transition-all"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload nhiều File</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="bg-primary/10 mx-1.5" />

                  <DropdownMenuItem
                    onClick={() => setFolderLinkDialogOpen(true)}
                    className="cursor-pointer font-bold uppercase text-[0.6875rem] gap-3 hover:bg-blue-50 text-blue-600 p-3 rounded-xl transition-all"
                  >
                    <Folder className="w-4 h-4" />
                    <span>Upload thư mục Google Drive</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-primary/10 mx-1.5" />

                  <DropdownMenuItem
                    onClick={() => setShowClearDialog(true)}
                    className="cursor-pointer font-bold uppercase text-[0.6875rem] gap-3 hover:bg-rose-50 text-rose-500 p-3 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa toàn bộ dữ liệu</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {isProcessing && (
          <div className="mx-6 mt-4 p-4 border border-primary/10 bg-primary/5 flex flex-col gap-3 text-primary rounded-2xl shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-bold uppercase text-[0.625rem] tracking-widest">
                  {processingMessage}
                </span>
              </div>
              <span className="text-xs font-bold">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-white/50 rounded-full h-2 overflow-hidden border border-primary/5">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 p-2 md:p-4 flex flex-col w-full font-[family-name:var(--font-table,var(--font-main))]">
          <div className="flex-1 min-h-0 w-full overflow-auto custom-scrollbar data-table-wrapper rounded-[var(--radius)]">
            <table className="w-full border-separate border-spacing-0 table-auto text-left border-l border-t border-[#E2E8F0]">
              <thead>
                <tr className="bg-[#F3EFE0]">
                  <th
                    style={{ padding: "var(--table-padding, 12px 16px)" }}
                    className="sticky top-0 z-20 bg-[#F3EFE0] text-[0.85em] font-bold text-primary uppercase tracking-[0.22em] text-center border-b border-r border-[#E2E8F0] whitespace-nowrap shadow-[0_1px_0_rgba(0,0,0,0.1)]"
                  >
                    No
                  </th>
                  <th
                    style={{ padding: "var(--table-padding, 12px 16px)" }}
                    className="sticky top-0 z-20 bg-[#F3EFE0] text-[0.85em] font-bold text-primary uppercase tracking-[0.22em] border-b border-r border-[#E2E8F0] whitespace-nowrap text-center shadow-[0_1px_0_rgba(0,0,0,0.1)]"
                  >
                    TÊN FILE
                  </th>
                  <th
                    style={{ padding: "var(--table-padding, 12px 16px)" }}
                    className="sticky top-0 z-20 bg-[#F3EFE0] text-[0.85em] font-bold text-primary uppercase tracking-[0.22em] border-b border-r border-[#E2E8F0] whitespace-nowrap text-center w-32 shadow-[0_1px_0_rgba(0,0,0,0.1)]"
                  >
                    BANK
                  </th>
                  <th
                    style={{ padding: "var(--table-padding, 12px 16px)" }}
                    className="sticky top-0 z-20 bg-[#F3EFE0] text-[0.85em] font-bold text-primary uppercase tracking-[0.22em] border-b border-r border-[#E2E8F0] whitespace-nowrap text-center w-32 shadow-[0_1px_0_rgba(0,0,0,0.1)]"
                  >
                    THÁNG
                  </th>
                  <th
                    style={{ padding: "var(--table-padding, 12px 16px)" }}
                    className="sticky top-0 z-20 bg-[#F3EFE0] text-[0.85em] font-bold text-primary uppercase tracking-[0.22em] border-b border-r border-[#E2E8F0] whitespace-nowrap text-center shadow-[0_1px_0_rgba(0,0,0,0.1)]"
                  >
                    NGUỒN
                  </th>
                  <th
                    style={{ padding: "var(--table-padding, 12px 16px)" }}
                    className="sticky top-0 z-20 bg-[#F3EFE0] text-[0.85em] font-bold text-primary uppercase tracking-[0.22em] border-b border-r border-[#E2E8F0] whitespace-nowrap text-center w-40 shadow-[0_1px_0_rgba(0,0,0,0.1)]"
                  >
                    TRẠNG THÁI
                  </th>
                  <th
                    style={{ padding: "var(--table-padding, 12px 16px)" }}
                    className="sticky top-0 z-20 bg-[#F3EFE0] text-[0.85em] font-bold text-primary uppercase tracking-[0.22em] text-center border-b border-[#E2E8F0] whitespace-nowrap w-20 shadow-[0_1px_0_rgba(0,0,0,0.1)]"
                  >
                    XÓA
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-slate-400 border border-slate-200/50 bg-slate-50/30"
                    >
                      <div className="flex flex-col items-center gap-6">
                        <div className="w-24 h-24 bg-primary/5 rounded-3xl flex items-center justify-center border border-primary/10">
                          <FileSpreadsheet className="w-10 h-10 text-primary/20" />
                        </div>
                        <div className="space-y-2">
                          <p className="font-bold uppercase text-lg tracking-tight text-primary/40 font-display">
                            Chưa có file From AE
                          </p>
                          <p className="text-[0.625rem] font-bold uppercase opacity-40 tracking-widest">
                            Thêm dòng hoặc upload file để bắt đầu
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, idx) => (
                    <tr
                      key={row.id}
                      className="group animate-in fade-in duration-300 fill-mode-both"
                    >
                      <td
                        style={{
                          padding: "var(--table-padding, 12px 16px)",
                          fontFamily: "var(--font-table, var(--font-main))",
                          fontSize: "var(--font-size)",
                        }}
                        className="text-center border-b border-r border-[#E2E8F0]"
                      >
                        <span className="text-[1em] font-medium text-foreground/30">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "var(--table-padding, 12px 16px)",
                          fontFamily: "var(--font-table, var(--font-main))",
                          fontSize: "var(--font-size)",
                        }}
                        className="border-b border-r border-[#E2E8F0]"
                      >
                        <input
                          id={`name-${row.id}`}
                          name={`name-${row.id}`}
                          type="text"
                          value={row.name}
                          onChange={(e) =>
                            updateRow(row.id, "name", e.target.value)
                          }
                          placeholder="Tên file..."
                          className="w-full bg-transparent border-none focus:ring-0 text-[1em] font-medium text-foreground placeholder:text-foreground/20 p-0 uppercase tracking-tight"
                          style={{ fontFamily: "inherit", fontSize: "inherit" }}
                        />
                      </td>
                      <td
                        style={{
                          padding: "var(--table-padding, 12px 16px)",
                          fontFamily: "var(--font-table, var(--font-main))",
                          fontSize: "var(--font-size)",
                        }}
                        className="border-b border-r border-[#E2E8F0]"
                      >
                        <select
                          id={`bank-${row.id}`}
                          name={`bank-${row.id}`}
                          value={row.bank || ""}
                          onChange={(e) =>
                            updateRow(row.id, "bank", e.target.value)
                          }
                          className="w-full bg-transparent border-none focus:ring-0 text-[1em] font-bold text-foreground/60 p-0 uppercase cursor-pointer appearance-none tracking-widest"
                          style={{ fontFamily: "inherit", fontSize: "inherit" }}
                        >
                          <option value="" className="text-foreground/40">
                            Chọn Region...
                          </option>
                          <option value="NORTH">NORTH</option>
                          <option value="THANH HOA">THANH HOA</option>
                          <option value="PHU THO">PHU THO</option>
                          <option value="THAI NGUYEN">THAI NGUYEN</option>
                        </select>
                      </td>
                      <td
                        style={{
                          padding: "var(--table-padding, 12px 16px)",
                          fontFamily: "var(--font-table, var(--font-main))",
                          fontSize: "var(--font-size)",
                        }}
                        className="border-b border-r border-[#E2E8F0] text-center"
                      >
                        <select
                          id={`month-${row.id}`}
                          name={`month-${row.id}`}
                          value={row.month || parseMonthFromFileName(row.name) || appData.globalMonth || "03.2026"}
                          onChange={(e) =>
                            updateRow(row.id, "month", e.target.value)
                          }
                          className="w-full bg-transparent border-none focus:ring-0 text-[1em] font-bold text-foreground/60 p-0 uppercase cursor-pointer appearance-none tracking-widest text-center"
                          style={{ fontFamily: "inherit", fontSize: "inherit" }}
                        >
                          {[
                            "01.2026", "02.2026", "03.2026", "04.2026", "05.2026", "06.2026",
                            "07.2026", "08.2026", "09.2026", "10.2026", "11.2026", "12.2026"
                          ].map((m) => (
                            <option key={m} value={m} className="text-foreground font-normal">{m}</option>
                          ))}
                        </select>
                      </td>
                      <td
                        style={{
                          padding: "var(--table-padding, 12px 16px)",
                          fontFamily: "var(--font-table, var(--font-main))",
                          fontSize: "var(--font-size)",
                        }}
                        className="border-b border-r border-[#E2E8F0]"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            id={`file-${row.id}`}
                            name={`file-${row.id}`}
                            className="hidden"
                            accept=".xlsx,.xls"
                            onChange={(e) =>
                              e.target.files?.[0] &&
                              handleFileUpload(row.id, e.target.files[0])
                            }
                          />
                          <button
                            onClick={() =>
                              document.getElementById(`file-${row.id}`)?.click()
                            }
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-[0.625rem] tracking-widest uppercase transition-all flex-1 justify-center ${row.fileObj ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-white text-primary border-primary/10 hover:bg-primary/5"}`}
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            {row.fileObj ? "ĐÃ CHỌN" : "CHỌN FILE"}
                          </button>
                          <button
                            onClick={() => {
                              setActiveLinkRowId(row.id);
                              setLinkInput("");
                              setLinkDialogOpen(true);
                            }}
                            className="p-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-500 hover:bg-blue-100 transition-colors shrink-0"
                            title="Dán link Google Sheet"
                          >
                            <LinkIcon className="w-4 h-4" />
                          </button>

                          {row.fileObj && (
                            <button
                              onClick={() =>
                                setMappingDialog({
                                  isOpen: true,
                                  rowId: row.id,
                                })
                              }
                              className="p-2 border border-primary/10 rounded-xl bg-white text-primary hover:bg-primary/5 transition-all shadow-sm"
                              title="Cấu hình Mapping Cột"
                            >
                              <Wrench className="w-4 h-4" />
                            </button>
                          )}
                          {row.fileObj && (
                            <span
                              className="text-[0.625rem] font-bold text-foreground/40 truncate max-w-[100px] uppercase tracking-widest"
                              style={{ fontSize: "0.625rem" }}
                            >
                              {row.fileObj.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "var(--table-padding, 12px 16px)",
                          fontFamily: "var(--font-table, var(--font-main))",
                          fontSize: "var(--font-size)",
                        }}
                        className="border-b border-r border-[#E2E8F0]"
                      >
                        <div className="flex items-center gap-2">
                          {row.status === "Success" ? (
                            <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full text-[0.625rem] font-bold uppercase tracking-widest">
                              <Check className="w-3 h-3" />
                              <span>Thành công</span>
                            </div>
                          ) : row.status === "ready" ? (
                            <div className="flex items-center gap-1.5 text-foreground/30 bg-foreground/5 px-3 py-1 rounded-full text-[0.625rem] font-bold uppercase tracking-widest">
                              <div className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
                              <span>Sẵn sàng</span>
                            </div>
                          ) : row.status.includes("Error") ? (
                            <div className="flex items-center gap-1.5 text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full text-[0.625rem] font-bold uppercase tracking-widest">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Lỗi</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full text-[0.625rem] font-bold uppercase tracking-widest">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Xử lý...</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center border-b border-slate-200">
                        <button
                          onClick={() => deleteRow(row.id)}
                          className="p-2 text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Integrated Pagination */}
        <div className="px-6 py-4 border-t border-primary/5 bg-transparent flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => processAEData()}
              disabled={isProcessing}
              className="p-1.5 text-primary/40 hover:text-primary hover:bg-primary/10 rounded-full transition-all group disabled:opacity-50"
              title="Reload Files"
            >
              <RefreshCw
                className={`w-4 h-4 ${isProcessing ? "animate-spin" : ""}`}
              />
            </button>
            <p className="text-[0.625rem] font-bold uppercase tracking-widest text-foreground/40">
              Hiển thị{" "}
              <span className="text-foreground">
                {(currentPage - 1) * itemsPerPage + 1}
              </span>{" "}
              -{" "}
              <span className="text-foreground">
                {Math.min(currentPage * itemsPerPage, filteredData.length)}
              </span>{" "}
              / <span className="text-foreground">{filteredData.length}</span>{" "}
              file
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="h-[35px] w-[35px] flex items-center justify-center text-primary/60 hover:bg-primary/10 rounded-xl disabled:opacity-30 transition-all border border-primary/10"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2)
                  pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-[35px] w-[35px] flex items-center justify-center rounded-xl font-bold text-[0.625rem] transition-all border ${currentPage === pageNum ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "text-primary/60 hover:bg-primary/10 border-primary/10"}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="h-[35px] w-[35px] flex items-center justify-center text-primary/60 hover:bg-primary/10 rounded-xl disabled:opacity-30 transition-all border border-primary/10"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <input
        type="file"
        id="file-upload"
        name="file-upload"
        ref={fileInputRef}
        className="hidden"
        multiple
        accept=".xlsx,.xls,.gsheet"
        onChange={handleMultiUpload}
      />

      {/* Confirmation Dialog for Multi-Upload */}
      <Dialog open={folderLinkDialogOpen} onOpenChange={setFolderLinkDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-primary/10 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-bold uppercase tracking-widest text-primary text-sm">Nhập link Google Drive Folder</DialogTitle>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <div className="grid flex-1 gap-2">
              <Input
                id="folder-link"
                placeholder="https://drive.google.com/drive/folders/..."
                value={folderLinkInput}
                onChange={(e) => setFolderLinkInput(e.target.value)}
                disabled={isFetchingFolder}
              />
              <p className="text-[0.65rem] text-muted-foreground mt-1 font-medium">
                <span className="font-bold text-red-500">Lưu ý quan trọng:</span> File <span className="text-primary font-bold">credentials.json</span> (của Google Cloud) phải được tạo/upload vào <span className="font-bold">thư mục gốc của phần mềm này</span> (ở cột cây thư mục bên trái màn hình), KHÔNG phải tạo trên Google Drive. Thư mục Drive chỉ cần được cấp quyền View cho email Service Account.
              </p>
            </div>
          </div>
          <DialogFooter className="sm:justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setFolderLinkDialogOpen(false)}
              disabled={isFetchingFolder}
              className="font-bold uppercase text-[0.625rem] tracking-widest px-6 py-2.5 rounded-xl hover:bg-primary/5 transition-all bg-white border-primary/10"
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleFolderLinkSubmit}
              disabled={isFetchingFolder || !folderLinkInput.trim()}
              className="bg-primary text-white font-bold uppercase text-[0.625rem] tracking-widest px-6 py-2.5 rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
            >
              {isFetchingFolder ? "Đang tải..." : "Lấy danh sách file"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-primary/10 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-bold uppercase tracking-widest text-primary text-sm">Nhập link Google Sheet</DialogTitle>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <div className="grid flex-1 gap-2">
              <Input
                id="link"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                disabled={isFetchingLink}
              />
              <p className="text-[0.65rem] text-muted-foreground mt-1 uppercase tracking-wider font-bold">
                Lưu ý: Chia sẻ dưới dạng <span className="text-primary">"Bất kỳ ai có liên kết"</span>
              </p>
            </div>
          </div>
          <DialogFooter className="sm:justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setLinkDialogOpen(false)}
              disabled={isFetchingLink}
              className="font-bold uppercase text-[0.625rem] tracking-widest px-6 py-2.5 rounded-xl hover:bg-primary/5 transition-all bg-white border-primary/10"
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleLinkSubmit}
              disabled={isFetchingLink || !linkInput.trim()}
              className="bg-primary text-white font-bold uppercase text-[0.625rem] tracking-widest px-6 py-2.5 rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
            >
              {isFetchingLink ? "Đang tải..." : "Tải dữ liệu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl border border-primary/10 shadow-2xl bg-white rounded-2xl p-6 max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-bold uppercase tracking-widest text-primary text-sm">
              Xác nhận tải lên danh sách file
            </DialogTitle>
            <DialogDescription className="font-bold text-foreground/40 text-[0.625rem] uppercase tracking-widest mt-2">
              Phát hiện {pendingUploads.length} file. Vui lòng chọn hành động
              cho từng file.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto custom-scrollbar my-6 border border-primary/10 rounded-xl bg-primary/5 font-[family-name:var(--font-table,var(--font-main))]">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="bg-primary/10">
                  <th className="px-4 py-3 text-[0.625rem] font-bold uppercase tracking-widest text-primary/60 border-b border-primary/10">
                    Tên File
                  </th>
                  <th className="px-4 py-3 text-[0.625rem] font-bold uppercase tracking-widest text-primary/60 border-b border-primary/10">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {choices.map((choice, idx) => (
                  <tr
                    key={idx}
                    className=""
                  >
                    <td className="px-4 py-3 text-[0.6875rem] font-bold text-foreground truncate max-w-[300px] uppercase tracking-tight">
                      {choice.file.name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <select
                          id={`action-${idx}`}
                          name={`action-${idx}`}
                          value={choice.action}
                          onChange={(e) => {
                            const newChoices = [...choices];
                            newChoices[idx].action = e.target.value as any;
                            setChoices(newChoices);
                          }}
                          className="bg-white border border-primary/10 rounded-lg px-3 py-1.5 text-[0.625rem] font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="new">Tạo mới</option>
                          {choice.targetId && (
                            <option value="update">Ghi đè</option>
                          )}
                          <option value="skip">Bỏ qua</option>
                        </select>
                        {choice.action === "update" && (
                          <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                        )}
                        {choice.action === "new" && (
                          <Plus className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        {choice.action === "skip" && (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              className="border-primary/10 bg-white font-bold uppercase text-[0.625rem] tracking-widest px-6 py-2.5 rounded-xl hover:bg-primary/5 transition-all"
            >
              Hủy bỏ
            </Button>
            <Button
              onClick={() => confirmUploads(choices)}
              className="bg-primary text-white font-bold uppercase text-[0.625rem] tracking-widest px-6 py-2.5 rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
            >
              Xác nhận tải lên
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="sm:max-w-md border border-primary/10 shadow-2xl bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-bold uppercase tracking-widest text-primary text-sm">
              Xác nhận xoá file và trạng thái
            </DialogTitle>
            <DialogDescription className="font-bold text-foreground/40 text-[0.625rem] uppercase tracking-widest mt-2">
              Bạn có chắc chắn muốn xóa toàn bộ file đã tải lên và đặt lại trạng
              thái? Các cấu hình Tên File, Bank và Tháng sẽ được giữ nguyên.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowClearDialog(false)}
              className="border-primary/10 bg-white font-bold uppercase text-[0.625rem] tracking-widest px-6 py-2.5 rounded-xl hover:bg-primary/5 transition-all"
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={clearPageData}
              className="bg-rose-500 text-white font-bold uppercase text-[0.625rem] tracking-widest px-6 py-2.5 rounded-xl hover:bg-rose-600 shadow-lg shadow-rose-500/20 transition-all"
            >
              Xác nhận xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ColumnMappingDialog
        isOpen={mappingDialog.isOpen}
        onClose={() => setMappingDialog({ isOpen: false, rowId: null })}
        file={
          appData.Ae_Global_Inputs.find((r) => r.id === mappingDialog.rowId)
            ?.fileObj || null
        }
        targetFields={masterAeFields}
        initialMapping={
          appData.Ae_Global_Inputs.find((r) => r.id === mappingDialog.rowId)
            ?.columnMapping || {}
        }
        onSave={(mapping) => {
          if (mappingDialog.rowId) {
            updateRow(mappingDialog.rowId, "columnMapping", mapping);
            toast.success("Đã lưu cấu hình mapping cột");
          }
        }}
      />
    </motion.div>
  );
}
