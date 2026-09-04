"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { App, ConfigProvider, theme } from "antd";

const DARK_QUERY = "(prefers-color-scheme: dark)";

const SHARED = {
  borderRadius: 8,
};

const LIGHT_TOKENS = {
  ...SHARED,
  colorPrimary: "#4f9d7a",
  colorBgLayout: "#f2f5f2",
  colorBgContainer: "#ffffff",
  colorBgElevated: "#ffffff",
};

const DARK_TOKENS = {
  ...SHARED,
  colorPrimary: "#5cae89",
  colorBgBase: "#1b211e",
  colorTextBase: "#e8e8e3",
  colorBgLayout: "#171c1a",
  colorBgContainer: "#212824",
  colorBgElevated: "#28302b",
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
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <ConfigProvider
      theme={{
        algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: dark ? DARK_TOKENS : LIGHT_TOKENS,
      }}
    >
      <App>
        <DarkContext.Provider value={dark}>
          <Background>{children}</Background>
        </DarkContext.Provider>
      </App>
    </ConfigProvider>
  );
}
