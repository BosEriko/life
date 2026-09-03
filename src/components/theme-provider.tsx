"use client";

import { useEffect, useState, type ReactNode } from "react";
import { App, ConfigProvider, theme } from "antd";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function prefersDark(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia(DARK_QUERY).matches
  );
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
  const [dark, setDark] = useState(prefersDark);

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => setDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <ConfigProvider
      theme={{
        algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <App>
        <Background>{children}</Background>
      </App>
    </ConfigProvider>
  );
}
