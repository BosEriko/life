"use client";

import { useEffect, useState } from "react";
import { App, Button, Modal, Popconfirm, Spin, Typography } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import { useAuth } from "@/components/auth-provider";
import { generateApiKey, watchApiKey, type ApiKeyMeta } from "@/models/api-key";

export function DeveloperModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [meta, setMeta] = useState<ApiKeyMeta | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    return watchApiKey(
      user.uid,
      (next) => {
        setMeta(next);
        setLoaded(true);
      },
      () => setLoaded(true),
    );
  }, [user]);

  function handleClose() {
    setFreshKey(null);
    onClose();
  }

  async function handleGenerate() {
    if (!user) return;
    setBusy(true);
    try {
      setFreshKey(await generateApiKey(user.uid));
    } catch {
      message.error("Could not generate a key.");
    } finally {
      setBusy(false);
    }
  }

  const endpoint =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/export`
      : "/api/export";

  const keyLabel = freshKey ?? "<YOUR_API_KEY>";
  const curlExample = `curl -s "${endpoint}?range=30d" \\\n  -H "Authorization: Bearer ${keyLabel}"`;

  const chatgptInstructions = `# Skill: Life Tracker data

## Description
Read my personal health tracker (weight, blood pressure, water intake, daily
habits) through a read-only JSON API and answer from that data.

## When to use
Whenever I ask about my weight, blood pressure, hydration, habits, streaks,
averages, targets, or how any of these have changed over time.

## Endpoint
GET ${endpoint}
Header: Authorization: Bearer ${keyLabel}

## Parameters (all optional)
- range: 7d | 30d | 90d | 1y | all (default all). Keeps the last N days, UTC.
- from: YYYY-MM-DD, inclusive lower bound. Overrides range.
- to: YYYY-MM-DD, inclusive upper bound.
- limit: max number of days, newest first (default and max 2000).

## Response shape
{
  "generatedAt": ISO timestamp,
  "range": { "from": string|null, "to": string|null },
  "count": number of days,
  "dailies": [ {
    "date": "YYYY-MM-DD",
    "weight": kg, "systolic": mmHg, "diastolic": mmHg,
    "bpTime": "HH:mm", "bpPosture": "sitting"|"standing", "bpArm": "left"|"right",
    "water": ml, "notes": string,
    "junkFood": bool, "junkDrink": bool, "bath": bool, "brushTeeth": bool,
    "updatedAt": ISO
  } ],
  "ideals": { "weight": {min,max}|null, "systolic": ..., "diastolic": ..., "water": ... },
  "presets": [ { "name": string, "ml": number } ]
}
Any daily field may be null. Units: weight kg, blood pressure mmHg, water ml.
"presets" are my labelled water containers.

## How to answer
1. Pick a range that fits the question and call the endpoint.
2. Compute the answer from the JSON (averages, trends, streaks, counts).
3. When I ask about targets, compare against "ideals".
4. State the date range you used.

## Example
curl -s "${endpoint}?range=30d" -H "Authorization: Bearer ${keyLabel}"`;

  async function copyInstructions() {
    try {
      await navigator.clipboard.writeText(chatgptInstructions);
      message.success("Instructions copied");
    } catch {
      message.error("Could not copy.");
    }
  }

  return (
    <Modal
      open={open}
      title="Developer · REST API"
      footer={null}
      onCancel={handleClose}
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        A read-only JSON endpoint for your entries, ideals, and presets — for
        pulling your data into ChatGPT or your own scripts.
      </Typography.Paragraph>

      <div style={{ marginBottom: 20 }}>
        <Button icon={<CopyOutlined />} onClick={copyInstructions}>
          Copy ChatGPT instructions
        </Button>
        <Typography.Paragraph
          type="secondary"
          style={{ fontSize: 12, marginTop: 6, marginBottom: 0 }}
        >
          A skill-format block to paste into a Custom GPT&apos;s instructions or a
          chat.
          {freshKey
            ? " Your new key is filled in."
            : " Replace the placeholder with a key from below."}
        </Typography.Paragraph>
      </div>

      <Typography.Title level={5} style={{ marginBottom: 4 }}>
        Endpoint
      </Typography.Title>
      <Typography.Paragraph style={{ marginBottom: 4 }}>
        <Typography.Text code copyable>{`GET ${endpoint}`}</Typography.Text>
      </Typography.Paragraph>
      <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
        Send the key as{" "}
        <Typography.Text code>Authorization: Bearer &lt;key&gt;</Typography.Text>{" "}
        or <Typography.Text code>x-api-key: &lt;key&gt;</Typography.Text>.
      </Typography.Paragraph>

      <Typography.Title level={5} style={{ marginBottom: 4 }}>
        API key
      </Typography.Title>

      {!loaded ? (
        <Spin />
      ) : freshKey ? (
        <>
          <Typography.Paragraph style={{ marginBottom: 4 }}>
            <Typography.Text code copyable={{ text: freshKey }}>
              {freshKey}
            </Typography.Text>
          </Typography.Paragraph>
          <Typography.Paragraph type="warning" style={{ fontSize: 13 }}>
            Copy it now. It is shown once and cannot be retrieved after you close
            this window or refresh the page.
          </Typography.Paragraph>
        </>
      ) : meta ? (
        <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
          A key is active ({meta.prefix}…
          {meta.createdAt
            ? `, created ${new Date(meta.createdAt).toLocaleDateString()}`
            : ""}
          ). Its value is never stored — regenerate to get a new one, which
          invalidates the current key.
        </Typography.Paragraph>
      ) : (
        <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
          No API key yet.
        </Typography.Paragraph>
      )}

      <div style={{ marginBottom: 20 }}>
        {meta && !freshKey ? (
          <Popconfirm
            title="Invalidate the current key?"
            description="Anything using the old key stops working."
            okText="Regenerate"
            onConfirm={handleGenerate}
          >
            <Button type="primary" loading={busy}>
              Regenerate key
            </Button>
          </Popconfirm>
        ) : (
          <Button type="primary" loading={busy} onClick={handleGenerate}>
            {meta || freshKey ? "Regenerate key" : "Generate API key"}
          </Button>
        )}
      </div>

      <Typography.Title level={5} style={{ marginBottom: 4 }}>
        Filters (query parameters)
      </Typography.Title>
      <ul style={{ paddingInlineStart: 18, fontSize: 13, margin: "0 0 12px" }}>
        <li>
          <Typography.Text code>range</Typography.Text> —{" "}
          <Typography.Text code>7d</Typography.Text>,{" "}
          <Typography.Text code>30d</Typography.Text>,{" "}
          <Typography.Text code>90d</Typography.Text>,{" "}
          <Typography.Text code>1y</Typography.Text>, or{" "}
          <Typography.Text code>all</Typography.Text> (default). Keeps the last N
          days, counted in UTC.
        </li>
        <li>
          <Typography.Text code>from</Typography.Text> /{" "}
          <Typography.Text code>to</Typography.Text> —{" "}
          <Typography.Text code>YYYY-MM-DD</Typography.Text>, inclusive.{" "}
          <Typography.Text code>from</Typography.Text> overrides{" "}
          <Typography.Text code>range</Typography.Text>.
        </li>
        <li>
          <Typography.Text code>limit</Typography.Text> — max number of days,
          newest first (default and max 2000).
        </li>
      </ul>

      <Typography.Title level={5} style={{ marginBottom: 4 }}>
        Example
      </Typography.Title>
      <Typography.Paragraph style={{ marginBottom: 0 }}>
        <pre
          style={{
            margin: 0,
            padding: 12,
            borderRadius: 8,
            fontSize: 12,
            overflowX: "auto",
            background: "rgba(127,127,127,0.12)",
          }}
        >
          <code>{curlExample}</code>
        </pre>
      </Typography.Paragraph>
      <Typography.Paragraph
        type="secondary"
        style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}
      >
        Also try <Typography.Text code>?from=2026-01-01&amp;to=2026-03-31</Typography.Text>{" "}
        or <Typography.Text code>?range=7d&amp;limit=100</Typography.Text>.
      </Typography.Paragraph>
    </Modal>
  );
}
