"use client";

import { theme } from "antd";
import { Icon } from "@/components/icon";

export function BrandLoader({ size = 40 }: { size?: number }) {
  const { token } = theme.useToken();

  return (
    <span
      role="status"
      aria-label="Loading"
      className="brand-loader"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        background: token.colorPrimary,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span className="brand-loader-glyph">
        <Icon
          name="brand"
          style={{
            margin: 0,
            opacity: 1,
            color: token.colorTextLightSolid,
            fontSize: Math.round(size * 0.46),
          }}
        />
      </span>
    </span>
  );
}
