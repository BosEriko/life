"use client";

import { useEffect, useReducer, useState } from "react";
import { App, Button, Card, Flex, Input, Tag, Tooltip, Typography } from "antd";
import { IdcardOutlined } from "@ant-design/icons";
import { sendEmailVerification, updateProfile } from "firebase/auth";
import { useAuth } from "@/components/auth-provider";

const RESEND_LOCK_MS = 24 * 60 * 60 * 1000;

function resendStorageKey(uid: string) {
  return `emailVerifyResentAt:${uid}`;
}

function readResentAt(uid: string): number {
  try {
    const raw = localStorage.getItem(resendStorageKey(uid));
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

const LABEL_STYLE = { display: "block", marginBottom: 8 } as const;

export function AccountCard() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [, refresh] = useReducer((count: number) => count + 1, 0);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [photoDraft, setPhotoDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [resentAt, setResentAt] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    let active = true;
    const apply = () => {
      if (!active) return;
      setResentAt(readResentAt(uid));
      setNow(Date.now());
      refresh();
    };
    user.reload().then(apply, apply);
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (resentAt === 0) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [resentAt]);

  const committedName = user?.displayName ?? "";
  const committedPhoto = user?.photoURL ?? "";
  const name = nameDraft ?? committedName;
  const photo = photoDraft ?? committedPhoto;
  const verified = user?.emailVerified ?? false;

  const dirty =
    user != null &&
    (name.trim() !== committedName || photo.trim() !== committedPhoto);

  const unlockAt = resentAt > 0 ? resentAt + RESEND_LOCK_MS : 0;
  const locked = unlockAt > 0 && now > 0 && now < unlockAt;
  const hoursLeft = locked ? Math.ceil((unlockAt - now) / 3_600_000) : 0;

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user, {
        displayName: name.trim() || null,
        photoURL: photo.trim() || null,
      });
      await user.reload();
      setNameDraft(null);
      setPhotoDraft(null);
      refresh();
      message.success("Account updated");
    } catch {
      message.error("Could not update. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function resendVerification() {
    if (!user || locked) return;
    setSending(true);
    try {
      await sendEmailVerification(user);
      const ts = Date.now();
      try {
        localStorage.setItem(resendStorageKey(user.uid), String(ts));
      } catch {
        // ignore unavailable storage
      }
      setResentAt(ts);
      setNow(ts);
      message.success("Verification email sent");
    } catch {
      message.error("Could not send right now. Try again later.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card
      size="small"
      title={
        <>
          <IdcardOutlined style={{ marginRight: 8 }} />
          Account
        </>
      }
    >
      <Typography.Paragraph
        type="secondary"
        style={{ fontSize: 13, marginTop: 0, marginBottom: 16 }}
      >
        Your sign-in identity, managed by Firebase Authentication — separate
        from the personal details below.
      </Typography.Paragraph>

      <div style={{ marginBottom: 14 }}>
        <Typography.Text style={LABEL_STYLE}>Display name</Typography.Text>
        <Input
          value={name}
          onChange={(event) => setNameDraft(event.target.value)}
          placeholder="Shown across the app"
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <Typography.Text style={LABEL_STYLE}>Photo URL</Typography.Text>
        <Input
          value={photo}
          onChange={(event) => setPhotoDraft(event.target.value)}
          placeholder="https://…"
        />
      </div>

      <div style={{ marginBottom: 4 }}>
        <Typography.Text style={LABEL_STYLE}>Email</Typography.Text>
        <Flex align="center" gap={10} wrap>
          <Typography.Text>{user?.email ?? "—"}</Typography.Text>
          {verified ? (
            <Tag color="green">Verified</Tag>
          ) : (
            <Tag color="warning">Unverified</Tag>
          )}
        </Flex>
      </div>

      <Flex gap={8} wrap style={{ marginTop: 20 }}>
        <Button
          type="primary"
          loading={saving}
          disabled={!dirty}
          onClick={handleSave}
        >
          Save account
        </Button>
        {verified ? null : (
          <Tooltip
            title={
              locked
                ? `You can resend in ${hoursLeft} hour${
                    hoursLeft === 1 ? "" : "s"
                  }`
                : undefined
            }
          >
            <span style={{ display: "inline-flex" }}>
              <Button
                loading={sending}
                disabled={locked}
                onClick={resendVerification}
              >
                Resend verification
              </Button>
            </span>
          </Tooltip>
        )}
      </Flex>
    </Card>
  );
}
