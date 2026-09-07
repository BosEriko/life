"use client";

import { useEffect, useState } from "react";
import { App, Button, Modal, Typography } from "antd";
import { useAuth } from "@/components/auth-provider";
import { isAdminEmail } from "@/lib/admin";
import { testClaudeConnection } from "@/models/claude-integration";
import {
  watchAnthropicCreditAlert,
  type CreditAlert as CreditAlertData,
} from "@/models/admin-alerts";

const DISMISS_KEY = "anthropic-credit-alert-dismissed";

export function CreditAlert() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const admin = isAdminEmail(user?.email);

  const [alert, setAlert] = useState<CreditAlertData | null>(null);
  const [dismissedAt, setDismissedAt] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(DISMISS_KEY);
    } catch {
      return null;
    }
  });
  const [rechecking, setRechecking] = useState(false);

  useEffect(() => {
    if (!admin) return;
    return watchAnthropicCreditAlert(setAlert, () => {});
  }, [admin]);

  if (!admin || !alert?.exhausted) return null;
  if (alert.updatedAt && alert.updatedAt === dismissedAt) return null;

  function dismiss() {
    if (alert?.updatedAt) {
      try {
        window.localStorage.setItem(DISMISS_KEY, alert.updatedAt);
      } catch {}
      setDismissedAt(alert.updatedAt);
    }
  }

  async function recheck() {
    if (!user) return;
    setRechecking(true);
    try {
      const { ok } = await testClaudeConnection(user);
      if (ok) message.success("Anthropic credits are available again.");
      else message.warning("Still out of credits.");
    } catch {
      message.error("Could not recheck.");
    } finally {
      setRechecking(false);
    }
  }

  return (
    <Modal
      open
      centered
      title="Anthropic credits exhausted"
      onCancel={dismiss}
      footer={[
        <Button key="dismiss" onClick={dismiss}>
          Dismiss
        </Button>,
        <Button
          key="recheck"
          type="primary"
          loading={rechecking}
          onClick={recheck}
        >
          Recheck
        </Button>,
      ]}
    >
      <Typography.Paragraph>
        Claude autofill is failing because the Anthropic account is out of
        credits. Users with autofill enabled will silently get no calorie or
        sodium estimates until it is topped up.
      </Typography.Paragraph>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        Add credits at console.anthropic.com under Plans &amp; Billing, then
        Recheck.
      </Typography.Paragraph>
      {alert.message ? (
        <Typography.Paragraph
          type="secondary"
          style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}
        >
          {alert.message}
        </Typography.Paragraph>
      ) : null}
    </Modal>
  );
}
