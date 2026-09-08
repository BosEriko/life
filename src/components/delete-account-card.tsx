"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Card, Flex, Input, theme, Typography } from "antd";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import {
  confirmAccountDeletion,
  requestAccountDeletion,
} from "@/models/account";

export function DeleteAccountCard() {
  const { user, signOut } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const router = useRouter();

  const [phase, setPhase] = useState<"idle" | "challenge">("idle");
  const [code, setCode] = useState("");
  const [otp, setOtp] = useState("");
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (phase !== "challenge") return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [phase]);

  const remaining =
    phase === "challenge" ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
  const expired = phase === "challenge" && remaining <= 0;

  async function startChallenge() {
    if (!user) return;
    setBusy(true);
    try {
      const { code: next, expiresIn } = await requestAccountDeletion(user);
      const nowMs = Date.now();
      setCode(next);
      setOtp("");
      setNow(nowMs);
      setDeadline(nowMs + expiresIn * 1000);
      setPhase("challenge");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Could not start deletion.",
      );
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    setPhase("idle");
    setOtp("");
    setCode("");
  }

  async function submit(value: string) {
    if (!user) return;
    setBusy(true);
    try {
      await confirmAccountDeletion(user, value);
      message.success("Your account and all its data have been deleted.");
      await signOut();
      router.replace("/");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Could not delete account.",
      );
      setOtp("");
      setBusy(false);
    }
  }

  function handleOtp(value: string) {
    setOtp(value);
    if (value.length === 6 && !expired && !busy) {
      void submit(value);
    }
  }

  const mmss = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(
    2,
    "0",
  )}`;

  return (
    <Card
      size="small"
      style={{ borderColor: token.colorErrorBorder }}
      title={
        <Typography.Text type="danger">
          <Icon name="alert" />
          Delete account
        </Typography.Text>
      }
    >
      {phase === "idle" ? (
        <>
          <Typography.Paragraph
            type="secondary"
            style={{ fontSize: 13, marginTop: 0 }}
          >
            Permanently removes your account and every record it holds — weight,
            blood pressure, water, food and drink, habits, notes, targets, and
            settings. This cannot be undone.
          </Typography.Paragraph>
          <Button danger loading={busy} onClick={startChallenge}>
            Delete account
          </Button>
        </>
      ) : (
        <>
          <Typography.Paragraph
            type="secondary"
            style={{ fontSize: 13, marginTop: 0, marginBottom: 8 }}
          >
            Type this code into the boxes below within{" "}
            <Typography.Text strong>{mmss}</Typography.Text> to confirm.
          </Typography.Paragraph>
          <Typography.Title
            level={3}
            style={{
              margin: "0 0 12px",
              letterSpacing: 8,
              fontVariantNumeric: "tabular-nums",
              color: expired ? token.colorTextDisabled : token.colorText,
            }}
          >
            {code}
          </Typography.Title>
          <Input.OTP
            length={6}
            value={otp}
            onChange={handleOtp}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
            disabled={busy || expired}
            status={expired ? "error" : undefined}
          />
          <Flex gap={8} style={{ marginTop: 14 }} align="center">
            {expired ? (
              <Button danger loading={busy} onClick={startChallenge}>
                Start over
              </Button>
            ) : null}
            <Button type="text" onClick={cancel} disabled={busy}>
              Cancel
            </Button>
          </Flex>
        </>
      )}
    </Card>
  );
}
