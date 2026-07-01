import localforage from "localforage";
import { useState, useEffect } from "react";

export interface UiSettings {
  bg: string;
  bgImage: string;
  bgImageStyle?:
    | "cover"
    | "contain"
    | "original"
    | "pattern-sm"
    | "pattern-md"
    | "pattern-lg"
    | "brand-stripes-purple"
    | "brand-stripes-green"
    | "brand-stripes-brown";
  bgImageOpacity?: number;
  accent: string;
  text: string;
  border: string;
  fontSize: string;
  tablePadding: string;
  sidebarPos: "left" | "right";
  radius: string;
  titleAlign: string;
  tableFont?: string;
  autoSave?: boolean;
  showHelp?: boolean;
  stripeColor1?: string;
  stripeColor2?: string;
  gridLineColor?: string;
  showPivotSubtotals?: boolean;
  showGrandTotals?: boolean;
  showMktCols?: boolean;
  colWidthPreference?: "narrow" | "normal" | "wide";
  defaultAuditYear?: number;
  tableHeaderBg?: string;
}

export const defaultSettings: UiSettings = {
  bg: "#ffffff",
  bgImage: "",
  bgImageStyle: "cover",
  bgImageOpacity: 100,
  accent: "#B75C4C",
  text: "#8D4255",
  border: "#4E532B",
  fontSize: "13px",
  tablePadding: "12px 16px",
  sidebarPos: "left",
  radius: "1rem",
  titleAlign: "flex-start|left",
  tableFont: "var(--font-nunito)",
  autoSave: true,
  showHelp: true,
  stripeColor1: "#EBD7DB",
  stripeColor2: "#F4EAD1",
  gridLineColor: "#EBDCCB",
  tableHeaderBg: "#EBD7DB",
  showPivotSubtotals: true,
  showGrandTotals: true,
  showMktCols: true,
  colWidthPreference: "normal",
  defaultAuditYear: 2026,
};

export const UI_SETTINGS_KEY = "PayrollApp_UiSettings";

function isValidHex(color: unknown): boolean {
  return typeof color === "string" && /^#[0-9A-Fa-f]{6}$/.test(color);
}

export function applyUiSettings(settings: UiSettings) {
  const root = document.documentElement;

  root.classList.remove("dark");
  if (settings.bg) root.style.setProperty("--background", settings.bg);
  if (settings.text) root.style.setProperty("--foreground", settings.text);
  if (settings.border) root.style.setProperty("--border", settings.border);
  if (settings.accent) {
    root.style.setProperty("--accent", settings.accent);
    root.style.setProperty("--primary", settings.accent);
    root.style.setProperty("--ring", settings.accent);
  }

  if (settings.bgImageStyle?.startsWith("brand-stripes-")) {
    root.style.setProperty(
      "--bg-image-opacity",
      ((settings.bgImageOpacity ?? 100) / 100).toString(),
    );
    root.style.setProperty("--bg-image-size", "20px 20px");
    root.style.setProperty("--bg-image-repeat", "repeat");
    root.style.setProperty("--bg-image-attachment", "fixed");

    if (settings.bgImageStyle === "brand-stripes-purple") {
      root.style.setProperty("--bg-image", "var(--pattern-stripes-purple)");
    } else if (settings.bgImageStyle === "brand-stripes-green") {
      root.style.setProperty("--bg-image", "var(--pattern-stripes-green)");
    } else if (settings.bgImageStyle === "brand-stripes-brown") {
      root.style.setProperty("--bg-image", "var(--pattern-stripes-brown)");
    }
  } else if (settings.bgImage) {
    root.style.setProperty("--bg-image", `url(${settings.bgImage})`);
    root.style.setProperty("--bg-image-attachment", "fixed");
    root.style.setProperty(
      "--bg-image-opacity",
      ((settings.bgImageOpacity ?? 100) / 100).toString(),
    );
    if (settings.bgImageStyle === "pattern-sm") {
      root.style.setProperty("--bg-image-size", "50px");
      root.style.setProperty("--bg-image-repeat", "repeat");
      root.style.setProperty("--bg-image-position", "top left");
    } else if (settings.bgImageStyle === "pattern-md") {
      root.style.setProperty("--bg-image-size", "100px");
      root.style.setProperty("--bg-image-repeat", "repeat");
      root.style.setProperty("--bg-image-position", "top left");
    } else if (settings.bgImageStyle === "pattern-lg") {
      root.style.setProperty("--bg-image-size", "200px");
      root.style.setProperty("--bg-image-repeat", "repeat");
      root.style.setProperty("--bg-image-position", "top left");
    } else if (settings.bgImageStyle === "contain") {
      root.style.setProperty("--bg-image-size", "contain");
      root.style.setProperty("--bg-image-repeat", "no-repeat");
      root.style.setProperty("--bg-image-position", "center");
    } else if (settings.bgImageStyle === "original") {
      root.style.setProperty("--bg-image-size", "auto");
      root.style.setProperty("--bg-image-repeat", "no-repeat");
      root.style.setProperty("--bg-image-position", "center");
    } else {
      root.style.setProperty("--bg-image-size", "cover");
      root.style.setProperty("--bg-image-repeat", "no-repeat");
      root.style.setProperty("--bg-image-position", "center");
    }
  } else {
    root.style.removeProperty("--bg-image");
    root.style.removeProperty("--bg-image-size");
    root.style.removeProperty("--bg-image-repeat");
    root.style.removeProperty("--bg-image-position");
    root.style.removeProperty("--bg-image-attachment");
    root.style.setProperty("--bg-image-opacity", "0");
  }

  if (settings.accent) {
    root.style.setProperty("--accent", settings.accent);
    root.style.setProperty("--primary", settings.accent);
    root.style.setProperty("--ring", settings.accent);
  }
  if (settings.text) {
    root.style.setProperty("--foreground", settings.text);
  }
  if (settings.border) {
    root.style.setProperty("--border", settings.border);
    root.style.setProperty("--shadow-hard", `4px 4px 0px ${settings.border}`);
    root.style.setProperty(
      "--shadow-hard-sm",
      `2px 2px 0px ${settings.border}`,
    );
  }
  if (settings.fontSize)
    root.style.setProperty("--font-size", settings.fontSize);
  if (settings.tableFont)
    root.style.setProperty("--font-table", settings.tableFont);
  if (settings.tablePadding)
    root.style.setProperty("--table-padding", settings.tablePadding);
  if (settings.radius) root.style.setProperty("--radius", settings.radius);
  if (settings.stripeColor1)
    root.style.setProperty("--stripe-color1", settings.stripeColor1);
  if (settings.stripeColor2)
    root.style.setProperty("--stripe-color2", settings.stripeColor2);
  if (settings.gridLineColor)
    root.style.setProperty("--grid-line-color", settings.gridLineColor);
  if (settings.tableHeaderBg)
    root.style.setProperty("--table-header-bg", settings.tableHeaderBg);

  if (settings.titleAlign) {
    const [flexAlign, textAlign] = settings.titleAlign.split("|");
    root.style.setProperty("--title-align", flexAlign);
    root.style.setProperty("--text-align", textAlign);
  }

  if (settings.sidebarPos === "right") {
    document.body.classList.add("sidebar-right");
  } else {
    document.body.classList.remove("sidebar-right");
  }
}

export async function loadUiSettings(): Promise<UiSettings> {
  const sanitize = (s: unknown): UiSettings => {
    const sObj = (s && typeof s === "object" ? s : {}) as Partial<UiSettings>;
    const result = { ...defaultSettings, ...sObj };
    // Force valid hex for specific fields
    if (!isValidHex(result.accent)) result.accent = defaultSettings.accent;
    if (!isValidHex(result.text)) result.text = defaultSettings.text;
    if (!isValidHex(result.border)) result.border = defaultSettings.border;
    if (!isValidHex(result.bg)) result.bg = defaultSettings.bg;
    if (result.stripeColor1 && !isValidHex(result.stripeColor1))
      result.stripeColor1 = defaultSettings.stripeColor1;
    if (result.stripeColor2 && !isValidHex(result.stripeColor2))
      result.stripeColor2 = defaultSettings.stripeColor2;
    if (result.gridLineColor && !isValidHex(result.gridLineColor))
      result.gridLineColor = defaultSettings.gridLineColor;
    if (result.tableHeaderBg && !isValidHex(result.tableHeaderBg))
      result.tableHeaderBg = defaultSettings.tableHeaderBg;

    // Validate bgImage URL (must start with http, https or data:)
    if (
      result.bgImage &&
      !result.bgImage.startsWith("http") &&
      !result.bgImage.startsWith("data:")
    ) {
      result.bgImage = "";
    }

    return result;
  };

  try {
    const saved = await localforage.getItem<UiSettings>(UI_SETTINGS_KEY);
    if (saved) return sanitize(saved);

    const legacySaved = localStorage.getItem(UI_SETTINGS_KEY);
    if (legacySaved) {
      try {
        const parsed = JSON.parse(legacySaved);
        return sanitize(parsed);
      } catch {
        // Ignore parsing errors
      }
    }
  } catch {
    // Ignore storage errors
  }
  return defaultSettings;
}

export function useUiSettings() {
  const [settings, setSettings] = useState<UiSettings>(defaultSettings);

  useEffect(() => {
    let active = true;
    const fetchSettings = async () => {
      try {
        const s = await loadUiSettings();
        if (active) {
          setSettings(s);
        }
      } catch (err) {
        console.error("Failed to load reactive UI settings:", err);
      }
    };

    fetchSettings();

    const handleUpdate = () => {
      fetchSettings();
    };

    window.addEventListener("ui-settings-changed", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      active = false;
      window.removeEventListener("ui-settings-changed", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return settings;
}
