"use client";

import type { CSSProperties, ReactNode } from "react";
import { Flex, Typography, theme } from "antd";

export type SideMenuItem = {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  count?: number;
};

export function SideMenu({
  ariaLabel,
  title,
  extra,
  items,
  selectedKey,
  onSelect,
  empty,
  children,
}: {
  ariaLabel: string;
  title?: ReactNode;
  extra?: ReactNode;
  items: SideMenuItem[];
  selectedKey?: string;
  onSelect: (key: string) => void;
  empty?: ReactNode;
  children?: ReactNode;
}) {
  const { token } = theme.useToken();

  return (
    <nav
      aria-label={ariaLabel}
      className="side-menu"
      style={{
        minWidth: 0,
        overflow: "hidden",
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadowTertiary,
        "--side-menu-hover": token.colorFillTertiary,
        "--side-menu-active": token.colorPrimaryBg,
        "--side-menu-line": token.colorBorderSecondary,
      } as CSSProperties}
    >
      {title ? (
        <Flex
          align="center"
          justify="space-between"
          gap={8}
          style={{ minHeight: 44, padding: "6px 8px 6px 16px", borderBottom: `1px solid ${token.colorBorderSecondary}` }}
        >
          <Typography.Text strong>{title}</Typography.Text>
          {extra}
        </Flex>
      ) : null}
      {children ? (
        children
      ) : items.length === 0 && empty ? (
        <div style={{ padding: "12px 16px" }}>{empty}</div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {items.map((item) => {
            const selected = item.key === selectedKey;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  className="side-menu-item"
                  aria-current={selected ? "page" : undefined}
                  onClick={() => onSelect(item.key)}
                  style={{
                    color: selected ? token.colorPrimary : token.colorText,
                    fontWeight: selected ? 700 : 400,
                    background: selected ? token.colorPrimaryBg : undefined,
                  }}
                >
                  {item.icon ? <span style={{ display: "inline-flex", fontSize: 15 }}>{item.icon}</span> : null}
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>
                    {item.label}
                  </span>
                  {item.count !== undefined ? (
                    <Typography.Text type="secondary" style={{ fontSize: 12, color: selected ? token.colorPrimary : undefined }}>
                      {item.count}
                    </Typography.Text>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
