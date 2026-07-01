/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AppDataProvider } from "./lib/contexts/AppDataContext";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import { Toaster, toast } from "sonner";
import { LoadingWrapper } from "./components/shared/LoadingWrapper";
import {
  type UiSettings,
  loadUiSettings,
  applyUiSettings,
  UI_SETTINGS_KEY,
} from "./lib/ui-settings";

export default function App() {
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === UI_SETTINGS_KEY + "_small" && e.newValue) {
        try {
          applyUiSettings(JSON.parse(e.newValue));
        } catch (err) {
          console.error("Failed to parse small ui settings string from localStorage on storage event.", err);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    const loadAndApply = async () => {
      // 1. Try fast load from localStorage (small settings only)
      const fastSaved = localStorage.getItem(UI_SETTINGS_KEY + "_small");
      if (fastSaved) {
        try {
          applyUiSettings(JSON.parse(fastSaved));
        } catch (e) {
          console.error("Failed to apply fastSaved settings from localStorage", e);
        }
      } else {
        // Fallback to legacy full settings in localStorage
        const legacySaved = localStorage.getItem(UI_SETTINGS_KEY);
        if (legacySaved) {
          try {
            applyUiSettings(JSON.parse(legacySaved));
          } catch (e) {
            console.error("Failed to apply legacySaved settings from localStorage", e);
          }
        }
      }

      // 2. Load full settings from localforage (including images)
      try {
        const fullSaved = await loadUiSettings();
        if (fullSaved) {
          applyUiSettings(fullSaved);
        }
      } catch (e) {
        console.error("Failed to load full UI settings", e);
        toast.error("Lỗi khi tải cài đặt");
      }
    };

    loadAndApply();

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return (
    <ErrorBoundary>
      <AppDataProvider>
        <LoadingWrapper>
          <RouterProvider router={router} />
        </LoadingWrapper>
        <Toaster position="top-right" richColors visibleToasts={1} />
      </AppDataProvider>
    </ErrorBoundary>
  );
}
