"use client";

import { Flex, theme, Typography } from "antd";
import { useSaveStatus } from "@/components/save-status";

export function SavePill() {
  const { state } = useSaveStatus();
  const { token } = theme.useToken();

  const { text, color } = {
    idle: { text: "Auto-saving", color: token.colorSuccess },
    pending: { text: "Unsaved changes", color: token.colorWarning },
    saving: { text: "Saving…", color: token.colorInfo },
    offline: { text: "Saved offline · will sync", color: token.colorWarning },
    error: { text: "Save failed", color: token.colorError },
  }[state];

  return (
    <Flex
      align="center"
      gap={6}
      style={{
        padding: "3px 10px",
        borderRadius: 999,
        background: token.colorFillSecondary,
      }}
    >
      <span
        style={{ width: 7, height: 7, borderRadius: "50%", background: color }}
      />
      <Typography.Text style={{ fontSize: 12 }}>{text}</Typography.Text>
    </Flex>
  );
}
