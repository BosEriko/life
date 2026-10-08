"use client";

import { theme } from "antd";
import { LinkOutlined } from "@ant-design/icons";
import { linkLabel, todoLink, type Todo } from "@/lib/todos";

export function TodoLinkChip({ todo }: { todo: Pick<Todo, "link"> & { links?: unknown } }) {
  const { token } = theme.useToken();
  const link = todoLink(todo);
  if (!link) return null;
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      title={link}
      onClick={(event) => event.stopPropagation()}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, maxWidth: "100%", marginTop: 8, padding: "2px 10px", borderRadius: 999, fontSize: 12, color: token.colorPrimary, background: token.colorPrimaryBg, textDecoration: "none" }}
    >
      <LinkOutlined aria-hidden />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}>{linkLabel(link)}</span>
    </a>
  );
}
