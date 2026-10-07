"use client";

import Image from "next/image";
import { LockOutlined } from "@ant-design/icons";
import { theme } from "antd";
import { useIsDark } from "@/components/theme-provider";

export function DeviceScreenshot({ name, alt, width, height, device, path, priority = false, sizes, frameHeight }: { name: string; alt: string; width: number; height: number; device: "desktop" | "phone"; path: string; priority?: boolean; sizes: string; frameHeight?: number }) {
  const { token } = theme.useToken();
  const isDark = useIsDark();
  const image = (
    <Image
      src={`/landing/${name}-${isDark ? "dark" : "light"}.webp`}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      loading={priority ? "eager" : undefined}
      fetchPriority={priority ? "high" : undefined}
      style={{ width: "100%", height: "auto", display: "block" }}
    />
  );

  if (device === "phone") {
    return (
      <div className="landing-shot" style={{ position: "relative", padding: 9, borderRadius: 46, background: isDark ? "#2a332d" : "#16201a", boxShadow: "0 30px 60px -24px rgba(23, 50, 29, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.08)" }}>
        <div style={{ position: "relative", overflow: "hidden", borderRadius: 38, lineHeight: 0, height: frameHeight ? frameHeight - 18 : undefined }}>
          {image}
          <span aria-hidden style={{ position: "absolute", top: 10, left: "50%", width: "32%", height: 22, marginLeft: "-16%", borderRadius: 999, background: "#0b0f0c" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="landing-shot" style={{ borderRadius: 14, border: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgContainer, boxShadow: "0 24px 60px -24px rgba(23, 50, 29, 0.35)", overflow: "hidden" }}>
      <div aria-hidden style={{ display: "flex", alignItems: "center", gap: 12, height: 38, padding: "0 14px", background: token.colorFillTertiary, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <span style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((color) => <span key={color} style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />)}
        </span>
        <span style={{ flex: 1, minWidth: 0, maxWidth: 360, margin: "0 auto", padding: "4px 12px", borderRadius: 999, background: token.colorBgContainer, color: token.colorTextSecondary, fontSize: 11, lineHeight: 1.4, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          <LockOutlined style={{ marginRight: 6, fontSize: 10 }} />
          life.boseriko.com{path === "/" ? "" : path}
        </span>
        <span style={{ width: 42, flexShrink: 0 }} />
      </div>
      <div style={{ lineHeight: 0 }}>{image}</div>
    </div>
  );
}
