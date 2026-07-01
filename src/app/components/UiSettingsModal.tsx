/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import React, { useState, useEffect } from "react";
import { X, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import localforage from "localforage";
import { useAppData } from "../lib/contexts/AppDataContext";
import { ConfirmDialog } from "./shared/ConfirmDialog";
import {
  type UiSettings,
  defaultSettings,
  UI_SETTINGS_KEY,
  applyUiSettings,
  loadUiSettings,
} from "../lib/ui-settings";

export function UiSettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [settings, setSettings] = useState<UiSettings>(defaultSettings);
  const { updateAppData } = useAppData();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await localforage.getItem<UiSettings>(UI_SETTINGS_KEY);
        if (saved) {
          setSettings({ ...defaultSettings, ...saved });
        } else {
          // Fallback to localStorage
          const legacySaved = localStorage.getItem(UI_SETTINGS_KEY);
          if (legacySaved) {
            try {
              const parsed = JSON.parse(legacySaved);
              setSettings({ ...defaultSettings, ...parsed });
              await localforage.setItem(UI_SETTINGS_KEY, parsed);
            } catch (e) {}
          }
        }
      } catch (e) {
        console.error("Failed to load UI settings", e);
      }
    };

    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      applyUiSettings(settings);
    }
  }, [settings, isOpen]);

  const saveSettings = async () => {
    try {
      await localforage.setItem(UI_SETTINGS_KEY, settings);
      const { bgImage, ...smallSettings } = settings;
      localStorage.setItem(
        UI_SETTINGS_KEY + "_small",
        JSON.stringify(smallSettings),
      );
      toast.dismiss();
      toast.success("Đã lưu cài đặt!");
      window.dispatchEvent(new Event("ui-settings-changed"));
    } catch (e) {
      console.error("Failed to save UI settings", e);
      toast.dismiss();
      toast.error("Không thể lưu cài đặt.");
      return;
    }

    onClose();
  };

  const resetSettings = async () => {
    toast.info("Đang reset cài đặt...");
    setSettings(defaultSettings);
    await localforage.setItem(UI_SETTINGS_KEY, defaultSettings);
    localStorage.setItem(
      UI_SETTINGS_KEY + "_small",
      JSON.stringify(defaultSettings),
    );
    toast.success("Đã reset cài đặt!");
    window.dispatchEvent(new Event("ui-settings-changed"));
    applyUiSettings(defaultSettings);
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ảnh quá lớn! Vui lòng chọn ảnh dưới 5MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, bgImage: reader.result as string });
      };
      reader.onerror = () => {
        toast.error("Có lỗi khi đọc file ảnh.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearAll = () => {
    updateAppData((prev: any) => ({
      ...prev,
      Final_AE: { ...prev.Final_AE, data: [] },
      Bank_North_AE: { ...prev.Bank_North_AE, data: [] },
      Sheet1_AE: { ...prev.Sheet1_AE, data: [] },
      // KHÔNG XOÁ Hold_AE và SoSanh_AE
      AuditReport: { ...prev.AuditReport, data: [] },
      Timesheet_InputList: prev.Timesheet_InputList?.map((row: any) => ({
        ...row,
        url: "",
        fileObj: undefined,
        fileName: "",
        sheetName: undefined,
        count: undefined,
        date: undefined,
        columnMapping: undefined,
        status: "pending",
        hasError: false,
        errorRaw: "",
        errorMessage: "",
      })),
      BankExport: { ...prev.BankExport, data: [] },
      CustomReport: { ...prev.CustomReport, data: [] },
      Q_Staff: [],
      Q_Salary_Scale: [],
      Q_Roster: [],
      Q_Cache: [],
      Timesheets: [],
    }));
    setShowClearConfirm(false);
    toast.success("Đã xóa toàn bộ dữ liệu ứng dụng.");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-white/90 backdrop-blur-md shadow-[-4px_0px_0px_rgba(0,0,0,1)] z-[10000] flex flex-col animate-in slide-in-from-right-full duration-300">
      <div className="p-4 flex justify-between items-center bg-background">
        <h3 className="font-black text-lg uppercase flex items-center gap-2 text-primary">
          <Settings2 className="w-5 h-5" /> Cài đặt Giao diện
        </h3>
        <button
          onClick={onClose}
          aria-label="Đóng cài đặt giao diện"
          className="p-1 hover:bg-primary/10 rounded-lg border-2 border-transparent hover:border-primary transition-all text-primary"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-6 bg-white/50 text-primary hide-scrollbar">
        <div className="flex flex-col gap-3">
          <h4 className="font-black text-xs text-primary/50 tracking-widest uppercase border-b-2 border-primary/10 pb-1">
            1. MÀU SẮC & NỀN (COLORS & BG)
          </h4>
          <div className="flex flex-col gap-2">
            <label className="font-bold text-[0.8125rem]">
              Ảnh nền (Background Image)
            </label>
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer bg-white border-2 border-primary rounded-lg p-2 text-center text-xs font-bold shadow-hard-sm hover:bg-primary/5 transition-all">
                {settings.bgImage ? "Đổi ảnh nền" : "Tải ảnh lên"}
                <input
                  type="file"
                  id="bg-image-upload"
                  name="bg-image-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e)}
                />
              </label>
              {settings.bgImage && (
                <button
                  onClick={() => setSettings({ ...settings, bgImage: "" })}
                  aria-label="Xóa ảnh nền"
                  className="p-2 border-2 border-destructive text-destructive rounded-lg shadow-hard-sm hover:bg-destructive/10 transition-all"
                  title="Xóa ảnh nền"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {(settings.bgImage ||
              settings.bgImageStyle?.startsWith("brand-stripes-")) && (
              <>
                <div
                  className="h-24 w-full rounded-lg mt-1 border border-primary/20"
                  style={{
                    backgroundImage:
                      settings.bgImageStyle === "brand-stripes-purple"
                        ? "var(--pattern-stripes-purple)"
                        : settings.bgImageStyle === "brand-stripes-green"
                          ? "var(--pattern-stripes-green)"
                          : settings.bgImageStyle === "brand-stripes-brown"
                            ? "var(--pattern-stripes-brown)"
                            : `url(${settings.bgImage})`,
                    backgroundSize:
                      settings.bgImageStyle === "pattern-sm"
                        ? "30px"
                        : settings.bgImageStyle === "pattern-md"
                          ? "60px"
                          : settings.bgImageStyle === "pattern-lg"
                            ? "120px"
                            : settings.bgImageStyle?.startsWith(
                                  "brand-stripes-",
                                )
                              ? "20px 20px"
                              : "cover",
                    backgroundRepeat:
                      settings.bgImageStyle?.startsWith("pattern") ||
                      settings.bgImageStyle?.startsWith("brand-stripes")
                        ? "repeat"
                        : "no-repeat",
                    backgroundPosition: settings.bgImageStyle?.startsWith(
                      "pattern",
                    )
                      ? "top left"
                      : "center",
                    opacity: (settings.bgImageOpacity ?? 100) / 100,
                  }}
                />
                <div className="flex flex-col gap-1 mt-1">
                  <label
                    htmlFor="bg-image-style"
                    className="font-bold text-[0.8125rem]"
                  >
                    Kiểu hiển thị ảnh
                  </label>
                  <select
                    id="bg-image-style"
                    value={settings.bgImageStyle || "cover"}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        bgImageStyle: e.target.value as any,
                      })
                    }
                    className="w-full border-2 border-primary rounded-lg p-2 font-bold text-sm outline-none focus:shadow-hard-sm transition-all bg-white"
                  >
                    <option value="cover">Lấp đầy màn hình (Cover)</option>
                    <option value="contain">Vừa vặn màn hình (Contain)</option>
                    <option value="original">Kích thước gốc (Original)</option>
                    <option value="pattern-sm">Nhân bản (Nhỏ)</option>
                    <option value="pattern-md">Nhân bản (Vừa)</option>
                    <option value="pattern-lg">Nhân bản (Lớn)</option>
                    <option value="brand-stripes-purple">Brand: Sọc Tím</option>
                    <option value="brand-stripes-green">Brand: Sọc Xanh</option>
                    <option value="brand-stripes-brown">Brand: Sọc Nâu</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-[0.8125rem]">
                      Độ đậm nhạt của ảnh
                    </label>
                    <span className="text-xs font-bold">
                      {settings.bgImageOpacity ?? 100}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.bgImageOpacity ?? 100}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        bgImageOpacity: Number(e.target.value),
                      })
                    }
                    className="w-full accent-primary"
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="accent-color"
              className="font-bold text-[0.8125rem]"
            >
              Màu nhấn (Accent/Table)
            </label>
            <input
              id="accent-color"
              type="color"
              value={
                settings.accent?.startsWith("#") && settings.accent.length === 7
                  ? settings.accent
                  : "#C88493"
              }
              onChange={(e) =>
                setSettings({ ...settings, accent: e.target.value })
              }
              className="w-10 h-10 cursor-pointer border-2 border-primary rounded-lg p-0.5 shadow-hard-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <label htmlFor="text-color" className="font-bold text-[0.8125rem]">
              Màu chữ (Text)
            </label>
            <input
              id="text-color"
              type="color"
              value={
                settings.text?.startsWith("#") && settings.text.length === 7
                  ? settings.text
                  : "#5D111A"
              }
              onChange={(e) =>
                setSettings({ ...settings, text: e.target.value })
              }
              className="w-10 h-10 cursor-pointer border-2 border-primary rounded-lg p-0.5 shadow-hard-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="stripe-color1"
              className="font-bold text-[0.8125rem]"
            >
              Nền Web: Màu sọc 1
            </label>
            <input
              id="stripe-color1"
              type="color"
              value={
                settings.stripeColor1?.startsWith("#") &&
                settings.stripeColor1.length === 7
                  ? settings.stripeColor1
                  : "#F6F4F0"
              }
              onChange={(e) =>
                setSettings({ ...settings, stripeColor1: e.target.value })
              }
              className="w-10 h-10 cursor-pointer border-2 border-primary rounded-lg p-0.5 shadow-hard-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="stripe-color2"
              className="font-bold text-[0.8125rem]"
            >
              Nền Web: Màu sọc 2
            </label>
            <input
              id="stripe-color2"
              type="color"
              value={
                settings.stripeColor2?.startsWith("#") &&
                settings.stripeColor2.length === 7
                  ? settings.stripeColor2
                  : "#F4ECD8"
              }
              onChange={(e) =>
                setSettings({ ...settings, stripeColor2: e.target.value })
              }
              className="w-10 h-10 cursor-pointer border-2 border-primary rounded-lg p-0.5 shadow-hard-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="border-color"
              className="font-bold text-[0.8125rem]"
            >
              Viền & Đổ bóng (Border)
            </label>
            <input
              id="border-color"
              type="color"
              value={
                settings.border?.startsWith("#") && settings.border.length === 7
                  ? settings.border
                  : "#E7DBDC"
              }
              onChange={(e) =>
                setSettings({ ...settings, border: e.target.value })
              }
              className="w-10 h-10 cursor-pointer border-2 border-primary rounded-lg p-0.5 shadow-hard-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="grid-color"
              className="font-bold text-[0.8125rem]"
            >
              Màu kẻ lưới (Grid Line)
            </label>
            <input
              id="grid-color"
              type="color"
              value={
                settings.gridLineColor?.startsWith("#") &&
                settings.gridLineColor.length === 7
                  ? settings.gridLineColor
                  : "#e2e8f0"
              }
              onChange={(e) =>
                setSettings({ ...settings, gridLineColor: e.target.value })
              }
              className="w-10 h-10 cursor-pointer border-2 border-primary rounded-lg p-0.5 shadow-hard-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="table-header-bg"
              className="font-bold text-[0.8125rem]"
            >
              Nền Tiêu đề Bảng (Header Bg)
            </label>
            <input
              id="table-header-bg"
              type="color"
              value={
                settings.tableHeaderBg?.startsWith("#") &&
                settings.tableHeaderBg.length === 7
                  ? settings.tableHeaderBg
                  : "#f4efe2"
              }
              onChange={(e) =>
                setSettings({ ...settings, tableHeaderBg: e.target.value })
              }
              className="w-10 h-10 cursor-pointer border-2 border-primary rounded-lg p-0.5 shadow-hard-sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="font-black text-xs text-primary/50 tracking-widest uppercase border-b-2 border-primary/10 pb-1">
            2. FONT CHỮ & HIỂN THỊ
          </h4>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[0.8125rem]">
              Font chữ Bảng (Table Font)
            </label>
            <select
              value={settings.tableFont || "var(--font-nunito)"}
              onChange={(e) =>
                setSettings({ ...settings, tableFont: e.target.value })
              }
              className="w-full border-2 border-primary rounded-lg p-2 font-bold text-sm outline-none focus:shadow-hard-sm transition-all bg-white"
            >
              <option value="var(--font-nunito)">Nunito (Mềm mại)</option>
              <option value="var(--font-quicksand)">Quicksand (Tròn trịa)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="font-black text-xs text-red-500/50 tracking-widest uppercase border-b-2 border-red-500/10 pb-1">
            3. DỮ LIỆU (DATA)
          </h4>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center justify-center gap-2 w-full bg-red-50 text-red-600 hover:bg-red-100 py-2.5 rounded-xl font-bold border border-red-200 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Xoá Toàn Bộ Dữ Liệu
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 flex gap-3 bg-background">
        <button
          onClick={saveSettings}
          className="flex-1 text-primary-foreground py-2.5 rounded-xl font-bold border-2 border-primary shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all bg-primary"
        >
          Lưu Lại
        </button>
        <button
          onClick={resetSettings}
          className="flex-1 bg-white text-primary py-2.5 rounded-xl font-bold border-2 border-primary hover:bg-primary/5 shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          Mặc định
        </button>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearAll}
        title="Xác nhận xóa toàn bộ dữ liệu"
        description="Hành động này sẽ xóa sạch toàn bộ dữ liệu đã tải lên và các kết quả tính toán. Bạn có chắc chắn muốn tiếp tục?"
        confirmText="Xoá sạch"
        variant="destructive"
      />
    </div>
  );
}
