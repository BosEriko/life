"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { App, ConfigProvider, theme } from "antd";

const MODE_KEY = "theme-mode";

export type ThemeMode = "light" | "dark";

export const TERRACOTTA = "#8c442c";
export const TERRACOTTA_DARK = "#e0a58f";

const FONT_SANS =
  'var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const SHARED = {
  borderRadius: 8,
  borderRadiusLG: 12,
  fontFamily: FONT_SANS,
  controlOutlineWidth: 0,
  controlHeight: 40,
};

const LIGHT_TOKENS = {
  ...SHARED,
  colorPrimary: "#316342",
  colorLink: "#316342",
  colorPrimaryBg: "#e1efe5",
  colorPrimaryBgHover: "#d2e7d8",
  colorError: TERRACOTTA,
  colorErrorBg: "#f8e9e3",
  colorText: "#172019",
  colorTextSecondary: "#607066",
  colorBgLayout: "#f2fcf5",
  colorBgContainer: "#ffffff",
  colorBgElevated: "#ffffff",
  colorFillSecondary: "#e7f3ea",
  colorFillTertiary: "#eef6f0",
  colorBorder: "#cfded3",
  colorBorderSecondary: "#cfded3",
  boxShadowTertiary: "0 8px 26px 0 rgba(23, 50, 29, 0.07)",
};

const DARK_TOKENS = {
  ...SHARED,
  colorPrimary: "#9dd3aa",
  colorLink: "#9dd3aa",
  colorError: TERRACOTTA_DARK,
  colorBgBase: "#10140f",
  colorTextBase: "#e2e8e0",
  colorBgLayout: "#10140f",
  colorBgContainer: "#1a211c",
  colorBgElevated: "#1f2721",
  colorFillSecondary: "#232b25",
  colorBorderSecondary: "#2a352d",
  boxShadowTertiary: "0 8px 26px 0 rgba(0, 0, 0, 0.35)",
};

const LIGHT_COMPONENTS = {
  Button: { fontWeight: 700 },
  Tooltip: { controlHeight: 0 },
  Segmented: { trackPadding: 4, trackBg: "#e7f3ea" },
  Table: { headerBg: "#e7f3ea", headerColor: "#607066" },
};

const DARK_COMPONENTS = {
  Button: { fontWeight: 700, primaryColor: "#10140f" },
  Tooltip: { controlHeight: 0 },
  Segmented: { trackPadding: 4 },
};

const DarkContext = createContext(false);

export function useIsDark(): boolean {
  return useContext(DarkContext);
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
    if (value === "dark") return "dark";
  } catch {
    // localStorage unavailable
  }
  return "light";
}

function modeServerSnapshot(): ThemeMode {
  return "light";
}

export function setThemeMode(mode: ThemeMode) {
  try {
    window.localStorage.setItem(MODE_KEY, mode);
  } catch {
    // localStorage unavailable
  }
  modeListeners.forEach((listener) => listener());
}

const ThemeModeContext = createContext<ThemeMode>("light");

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
  const mode = useSyncExternalStore(
    modeSubscribe,
    modeSnapshot,
    modeServerSnapshot,
  );
  const dark = mode === "dark";

  return (
    <ConfigProvider
      theme={{
        algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: dark ? DARK_TOKENS : LIGHT_TOKENS,
        components: dark ? DARK_COMPONENTS : LIGHT_COMPONENTS,
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
