"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { App, ConfigProvider, theme } from "antd";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const MODE_KEY = "theme-mode";

export type ThemeMode = "system" | "light" | "dark";

export const TERRACOTTA = "#8c442c";
export const TERRACOTTA_DARK = "#e0a58f";

const FONT_SANS =
  'var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const SHARED = {
  borderRadius: 10,
  borderRadiusLG: 14,
  fontFamily: FONT_SANS,
};

const LIGHT_TOKENS = {
  ...SHARED,
  colorPrimary: "#316342",
  colorText: "#151d1a",
  colorBgLayout: "#f2fcf5",
  colorBgContainer: "#ffffff",
  colorBgElevated: "#ffffff",
  colorFillSecondary: "#e6f0ea",
  colorFillTertiary: "#eef6f0",
  colorBorderSecondary: "#dbe5df",
};

const DARK_TOKENS = {
  ...SHARED,
  colorPrimary: "#9dd3aa",
  colorBgBase: "#10140f",
  colorTextBase: "#e2e8e0",
  colorBgLayout: "#10140f",
  colorBgContainer: "#1a211c",
  colorBgElevated: "#1f2721",
  colorFillSecondary: "#232b25",
};

const DarkContext = createContext(false);

export function useIsDark(): boolean {
  return useContext(DarkContext);
}

function subscribe(callback: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

const modeListeners = new Set<() => void>();

function modeSubscribe(callback: () => void) {
  modeListeners.add(callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key === MODE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    modeListeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function modeSnapshot(): ThemeMode {
  try {
    const value = window.localStorage.getItem(MODE_KEY);
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }
  } catch {
    // localStorage unavailable
  }
  return "system";
}

function modeServerSnapshot(): ThemeMode {
  return "system";
}

export function setThemeMode(mode: ThemeMode) {
  try {
    window.localStorage.setItem(MODE_KEY, mode);
  } catch {
    // localStorage unavailable
  }
  modeListeners.forEach((listener) => listener());
}

const ThemeModeContext = createContext<ThemeMode>("system");

export function useThemeMode(): {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
} {
  return {
    mode: useContext(ThemeModeContext),
    setMode: setThemeMode,
    isDark: useContext(DarkContext),
  };
}

function Background({ children }: { children: ReactNode }) {
  const { token } = theme.useToken();
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: token.colorBgLayout,
        color: token.colorText,
      }}
    >
      {children}
    </div>
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemDark = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const mode = useSyncExternalStore(
    modeSubscribe,
    modeSnapshot,
    modeServerSnapshot,
  );
  const dark = mode === "system" ? systemDark : mode === "dark";

  return (
    <ConfigProvider
      theme={{
        algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: dark ? DARK_TOKENS : LIGHT_TOKENS,
      }}
    >
      <App>
        <ThemeModeContext.Provider value={mode}>
          <DarkContext.Provider value={dark}>
            <Background>{children}</Background>
          </DarkContext.Provider>
        </ThemeModeContext.Provider>
      </App>
    </ConfigProvider>
  );
}
