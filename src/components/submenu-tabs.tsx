"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Dropdown, theme } from "antd";
import { DownOutlined, EllipsisOutlined } from "@ant-design/icons";
import type { SubmenuTab } from "@/components/nav-items";
import { splitTabs } from "@/lib/submenu-layout";

type SubmenuTabsProps = { tabs: SubmenuTab[]; pathname: string; variant: "header" | "bottom" };

export function SubmenuTabs(props: SubmenuTabsProps) {
  return <MeasuredSubmenuTabs key={JSON.stringify([props.variant, props.tabs.map((tab) => tab.href)])} {...props} />;
}

function MeasuredSubmenuTabs({ tabs, pathname, variant }: SubmenuTabsProps) {
  const { token } = theme.useToken();
  const rowRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState<{ visible: number[]; overflow: number[] } | null>(null);
  const gap = variant === "header" ? 8 : 4;
  const activeIndex = tabs.findIndex((tab) => tab.href === pathname);

  useLayoutEffect(() => {
    const row = rowRef.current;
    const measure = measureRef.current;
    if (!row || !measure) return;
    const update = () => {
      const widths = Array.from(measure.children, (child) => (child as HTMLElement).offsetWidth);
      const moreWidth = widths.pop() ?? 0;
      setSplit(splitTabs(widths, moreWidth, row.clientWidth, gap, activeIndex));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(row);
    observer.observe(measure);
    return () => observer.disconnect();
  }, [tabs, gap, activeIndex]);

  const tabStyle = (active: boolean): CSSProperties =>
    variant === "header"
      ? {
          display: "inline-flex",
          flexShrink: 0,
          alignItems: "center",
          gap: 8,
          minHeight: 44,
          padding: "0 10px",
          marginBottom: -1,
          fontSize: 13,
          fontWeight: active ? 800 : 600,
          color: active ? token.colorPrimary : token.colorTextSecondary,
          borderBottom: `2px solid ${active ? token.colorPrimary : "transparent"}`,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }
      : {
          flex: "1 0 auto",
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          padding: "5px 8px",
          borderRadius: 10,
          fontSize: 11,
          lineHeight: 1.2,
          fontWeight: active ? 700 : 500,
          color: active ? token.colorPrimary : token.colorTextSecondary,
          background: active ? token.colorPrimaryBg : "transparent",
          textDecoration: "none",
          whiteSpace: "nowrap",
        };
  const moreStyle: CSSProperties = { ...tabStyle(false), border: 0, borderBottom: variant === "header" ? "2px solid transparent" : 0, background: "transparent", fontFamily: "inherit", cursor: "pointer", flex: "0 0 auto" };
  const moreContent = variant === "header" ? <>More <DownOutlined style={{ fontSize: 10 }} /></> : <><EllipsisOutlined style={{ fontSize: 15 }} />More</>;
  const iconStyle = variant === "bottom" ? { fontSize: 15 } : undefined;

  const visible = split ? split.visible : tabs.map((_, index) => index);
  const overflow = split ? split.overflow : [];

  return (
    <div data-tour="submenu" style={{ position: "relative", minWidth: 0 }}>
      <div ref={rowRef} style={{ display: "flex", gap, overflow: "hidden", minWidth: 0 }}>
        {visible.map((index) => {
          const { href, label, Icon } = tabs[index];
          const active = index === activeIndex;
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} style={tabStyle(active)}>
              <Icon style={iconStyle} />
              {label}
            </Link>
          );
        })}
        {overflow.length > 0 && (
          <Dropdown
            trigger={["click"]}
            placement={variant === "header" ? "bottomRight" : "topRight"}
            menu={{
              items: overflow.map((index) => {
                const { href, label, Icon } = tabs[index];
                return { key: href, icon: <Icon />, label: <Link href={href}>{label}</Link> };
              }),
            }}
          >
            <button type="button" aria-label={`More ${overflow.length === 1 ? "page" : "pages"}`} style={moreStyle}>
              {moreContent}
            </button>
          </Dropdown>
        )}
      </div>
      <div ref={measureRef} aria-hidden style={{ position: "absolute", top: 0, left: 0, display: "flex", gap, visibility: "hidden", pointerEvents: "none", height: 0, overflow: "hidden" }}>
        {tabs.map(({ href, label, Icon }, index) => (
          <span key={href} style={{ ...tabStyle(index === activeIndex), flex: "0 0 auto" }}>
            <Icon style={iconStyle} />
            {label}
          </span>
        ))}
        <span style={moreStyle}>{moreContent}</span>
      </div>
    </div>
  );
}
