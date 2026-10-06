"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Grid, theme } from "antd";
import { Icon } from "@/components/icon";
import { NAV, submenuFor, type NavItem } from "@/components/nav-items";
import { SubmenuTabs } from "@/components/submenu-tabs";
import { NotesModal } from "@/components/notes-modal";

const SPLIT = Math.ceil(NAV.length / 2);
const LEFT = NAV.slice(0, SPLIT);
const RIGHT = NAV.slice(SPLIT);

export function MobileNav() {
  const screens = Grid.useBreakpoint();
  const router = useRouter();
  const pathname = usePathname();
  const { token } = theme.useToken();
  const [addOpen, setAddOpen] = useState(false);
  const subnavRef = useRef<HTMLElement>(null);
  const submenu = submenuFor(pathname);
  const showSubnav = screens.md === false && !!submenu;

  useEffect(() => {
    const root = document.documentElement;
    const node = subnavRef.current;
    if (!showSubnav || !node) {
      root.style.removeProperty("--mobile-subnav-height");
      return;
    }
    const observer = new ResizeObserver(() => root.style.setProperty("--mobile-subnav-height", `${node.offsetHeight}px`));
    observer.observe(node);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--mobile-subnav-height");
    };
  }, [showSubnav]);

  if (screens.md !== false) return null;

  const flatButton = (item: NavItem) => {
    const active = pathname.split("/")[1] === item.key.split("/")[1];
    return (
      <button
        key={item.key}
        type="button"
        aria-current={active ? "page" : undefined}
        onClick={() => router.push(item.key)}
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          padding: "9px 0 10px",
          border: "none",
          background: "transparent",
          color: active ? token.colorPrimary : token.colorTextSecondary,
          fontSize: 11,
          fontWeight: active ? 600 : 400,
          fontFamily: "inherit",
          cursor: "pointer",
        }}
      >
        {active ? (
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: 26,
              height: 3,
              borderRadius: "0 0 3px 3px",
              background: token.colorPrimary,
            }}
          />
        ) : null}
        <item.Icon style={{ fontSize: 18 }} />
        {item.label}
      </button>
    );
  };

  return (
    <>
      <div style={{ position: "fixed", insetInline: 0, bottom: 0, zIndex: 1000 }}>
      {showSubnav && (
        <nav
          ref={subnavRef}
          aria-label={submenu.label}
          style={{
            padding: "6px 8px",
            background: `color-mix(in srgb, ${token.colorBgContainer} 55%, ${token.colorBgLayout})`,
            borderTop: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <SubmenuTabs tabs={submenu.tabs} pathname={pathname} variant="bottom" />
        </nav>
      )}
      <nav
        style={{
          display: "flex",
          alignItems: "stretch",
          background: token.colorBgContainer,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {LEFT.map(flatButton)}

        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            aria-label="Add note"
            onClick={() => setAddOpen(true)}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              border: "none",
              background: token.colorPrimary,
              color: token.colorTextLightSolid,
              cursor: "pointer",
            }}
          >
            <Icon
              name="logEntry"
              style={{ marginRight: 0, opacity: 1, fontSize: 18, color: "inherit" }}
            />
          </button>
        </div>

        {RIGHT.map(flatButton)}
      </nav>
      </div>

      <NotesModal open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
