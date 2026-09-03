"use client";

import { useEffect, useState, type ReactNode } from "react";
import { App, ConfigProvider, theme } from "antd";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function prefersDark(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia(DARK_QUERY).matches
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
      <App style={{ minHeight: "100dvh" }}>{children}</App>
    </ConfigProvider>
  );
}
