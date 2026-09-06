"use client";

import { usePathname, useRouter } from "next/navigation";
import { Grid, theme } from "antd";
import { NAV } from "@/components/nav-items";

export function MobileNav() {
  const screens = Grid.useBreakpoint();
  const router = useRouter();
  const pathname = usePathname();
  const { token } = theme.useToken();

  if (screens.md !== false) return null;

  return (
    <nav
      style={{
        position: "fixed",
        insetInline: 0,
        bottom: 0,
        zIndex: 1000,
        display: "flex",
        background: token.colorBgContainer,
        borderTop: `1px solid ${token.colorBorderSecondary}`,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {NAV.map((item) => {
        const active = pathname === item.key;
        return (
          <button
            key={item.key}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => router.push(item.key)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              padding: "8px 0 10px",
              border: "none",
              background: "transparent",
              color: active ? token.colorPrimary : token.colorTextSecondary,
              fontSize: 11,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            <item.Icon style={{ fontSize: 18 }} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
