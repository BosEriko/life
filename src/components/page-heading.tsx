"use client";

import type { ReactNode } from "react";
import { Flex, Typography, theme } from "antd";
import { usePathname } from "next/navigation";
import { NAV } from "@/components/nav-items";
import { useIsDark } from "@/components/theme-provider";
import { accentColor } from "@/lib/accents";

export function PageHeading({
  title,
  subtitle,
  extra,
  marginBottom = 24,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  extra?: ReactNode;
  marginBottom?: number;
}) {
  const pathname = usePathname();
  const dark = useIsDark();
  const { token } = theme.useToken();
  const section = NAV.find((item) => item.key.split("/")[1] === pathname.split("/")[1]);
  const accent = section ? accentColor(section.accent, dark) : token.colorPrimary;

  return (
    <Flex
      align="flex-end"
      justify="space-between"
      gap={16}
      wrap
      style={{ marginBottom }}
    >
      <Flex align="center" gap={12} style={{ minWidth: 0, flex: "1 1 320px" }}>
        {section && (
          <span aria-hidden style={{ display: "grid", placeItems: "center", width: 42, height: 42, flexShrink: 0, borderRadius: token.borderRadius, color: dark ? accent : `color-mix(in srgb, ${accent} 75%, ${token.colorText})`, background: `color-mix(in srgb, ${accent} ${dark ? 20 : 22}%, ${token.colorBgContainer})`, fontSize: 20 }}>
            <section.Icon />
          </span>
        )}
        <div style={{ minWidth: 0 }}>
          <Typography.Title
            level={1}
            style={{
              margin: 0,
              fontSize: "clamp(24px, 4vw, 30px)",
              fontWeight: 800,
              lineHeight: 1.2,
            }}
          >
            {title}
          </Typography.Title>
          {subtitle ? (
            <Typography.Paragraph
              type="secondary"
              style={{ margin: "6px 0 0", fontSize: 13 }}
            >
              {subtitle}
            </Typography.Paragraph>
          ) : null}
        </div>
      </Flex>
      {extra ? (
        <Flex gap={8} wrap data-tour="page-actions">
          {extra}
        </Flex>
      ) : null}
    </Flex>
  );
}
