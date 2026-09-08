"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Grid, theme } from "antd";
import {
  FileTextOutlined,
  HeartOutlined,
  IdcardOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import type { CSSProperties, ComponentType } from "react";
import { Icon } from "@/components/icon";
import { NotesModal } from "@/components/notes-modal";

type NavButton = {
  key: string;
  label: string;
  Icon: ComponentType<{ style?: CSSProperties }>;
};

const LEFT: NavButton[] = [
  { key: "/", label: "Health", Icon: HeartOutlined },
  { key: "/notes", label: "Notes", Icon: FileTextOutlined },
];

const RIGHT: NavButton[] = [
  { key: "/summary", label: "Summary", Icon: UnorderedListOutlined },
  { key: "/profile", label: "Profile", Icon: IdcardOutlined },
];

export function MobileNav() {
  const screens = Grid.useBreakpoint();
  const router = useRouter();
  const pathname = usePathname();
  const { token } = theme.useToken();
  const [addOpen, setAddOpen] = useState(false);

  if (screens.md !== false) return null;

  const flatButton = (item: NavButton) => {
    const active = pathname === item.key;
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
      <nav
        style={{
          position: "fixed",
          insetInline: 0,
          bottom: 0,
          zIndex: 1000,
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
              style={{ marginRight: 0, opacity: 1, fontSize: 18 }}
            />
          </button>
        </div>

        {RIGHT.map(flatButton)}
      </nav>

      <NotesModal open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
