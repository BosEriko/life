"use client";

import { useEffect, useState } from "react";
import { App, Button, Modal, Popconfirm, Spin, Typography } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import { useAuth } from "@/components/auth-provider";
import { generateApiKey, watchApiKey, type ApiKeyMeta } from "@/models/api-key";

const KEY_PLACEHOLDER = "<YOUR_API_KEY>";

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [copyBusy, setCopyBusy] = useState(false);

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
    setConfirmOpen(false);
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

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://life.boseriko.com";

  function mcpUrl(key: string): string {
    return `${origin}/api/mcp/${key}`;
  }

  const shownUrl = mcpUrl(freshKey ?? KEY_PLACEHOLDER);

  const testCommand = `curl -s "${shownUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`;

  function instructionsFor(key: string): string {
    return `# Skill: Life Tracker (MCP)

## Description
My personal health tracker is exposed as an MCP server. Connect to it and read
my weight, blood pressure, water intake, and daily habits to answer my questions.

## MCP server
URL: ${mcpUrl(key)}
Transport: Streamable HTTP. Read-only. No auth header — the key is in the URL.

## Tools
- get_entries({ range?, from?, to?, limit? }) -> daily entries, newest first.
    range: 7d | 30d | 90d | 1y | all (default all), counted in UTC.
    from / to: YYYY-MM-DD inclusive; from overrides range.
    limit: max number of days, 1-2000.
  Each entry: date, weight (kg), systolic/diastolic (mmHg), bpTime "HH:mm",
  bpPosture "sitting"|"standing", bpArm "left"|"right", water (ml), notes,
  junkFood, junkDrink, bath, brushTeeth (booleans), updatedAt. Any field may be null.
- get_ideals() -> target { min, max } for weight, systolic, diastolic, water
  (a metric is null when no target is set).
- get_presets() -> my labelled water containers, each { name, ml }.
- search(query) / fetch(id) -> the same data as documents
  (entries-7d ... entries-all, ideals, presets).

## How to answer
1. Call get_entries with a range that fits the question.
2. Compute averages, trends, streaks, and counts from the entries.
3. Compare against get_ideals when I ask about targets.
4. State the date range you used.`;
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      message.success("Instructions copied");
    } catch {
      message.error("Could not copy.");
    }
  }

  async function copyWithNewKey() {
    if (!user) return;
    setCopyBusy(true);
    try {
      const key = await generateApiKey(user.uid);
      setFreshKey(key);
      await copyText(instructionsFor(key));
      setConfirmOpen(false);
    } catch {
      message.error("Could not generate a key.");
    } finally {
      setCopyBusy(false);
    }
  }

  async function copyWithPlaceholder() {
    await copyText(instructionsFor(KEY_PLACEHOLDER));
    setConfirmOpen(false);
  }

  return (
    <Modal
      open={open}
      title="Developer · MCP"
      footer={null}
      onCancel={handleClose}
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        Your entries, targets, and presets as an MCP server — connect it to
        ChatGPT (or Claude) so it can read your data. Read-only.
      </Typography.Paragraph>

      <div style={{ marginBottom: 20 }}>
        <Button icon={<CopyOutlined />} onClick={() => setConfirmOpen(true)}>
          Copy ChatGPT instructions
        </Button>
        <Typography.Paragraph
          type="secondary"
          style={{ fontSize: 12, marginTop: 6, marginBottom: 0 }}
        >
          A skill-format block for a Custom GPT&apos;s instructions or a chat.
          You&apos;ll be asked whether to embed a fresh key.
        </Typography.Paragraph>
      </div>

      <Modal
        open={confirmOpen}
        title="Copy with API key?"
        onCancel={() => setConfirmOpen(false)}
        footer={[
          <Button key="placeholder" onClick={copyWithPlaceholder}>
            No — use a placeholder
          </Button>,
          <Button
            key="newkey"
            type="primary"
            loading={copyBusy}
            onClick={copyWithNewKey}
          >
            Yes — generate a new key
          </Button>,
        ]}
      >
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          <strong>Yes</strong> generates a new key and embeds it in the copied
          URL — this invalidates any key currently in use.{" "}
          <strong>No</strong> copies a version with a{" "}
          <Typography.Text code>{KEY_PLACEHOLDER}</Typography.Text> placeholder.
        </Typography.Paragraph>
      </Modal>

      <Typography.Title level={5} style={{ marginBottom: 4 }}>
        MCP server URL
      </Typography.Title>
      <Typography.Paragraph style={{ marginBottom: 4 }}>
        <Typography.Text code copyable={{ text: shownUrl }}>
          {shownUrl}
        </Typography.Text>
      </Typography.Paragraph>
      <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
        Streamable HTTP. The key lives in the URL, so treat the whole URL as the
        secret.
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
        Connect in ChatGPT
      </Typography.Title>
      <ol style={{ paddingInlineStart: 18, fontSize: 13, margin: "0 0 12px" }}>
        <li>
          Settings → Connectors → turn on <em>Developer mode</em> → Add custom
          connector.
        </li>
        <li>
          Paste the URL above, choose <strong>No authentication</strong>, save.
        </li>
        <li>In a chat, enable the connector and ask about your data.</li>
      </ol>

      <Typography.Title level={5} style={{ marginBottom: 4 }}>
        Tools
      </Typography.Title>
      <ul style={{ paddingInlineStart: 18, fontSize: 13, margin: "0 0 12px" }}>
        <li>
          <Typography.Text code>get_entries</Typography.Text> —{" "}
          <Typography.Text code>range</Typography.Text> (
          <Typography.Text code>7d</Typography.Text>/
          <Typography.Text code>30d</Typography.Text>/
          <Typography.Text code>90d</Typography.Text>/
          <Typography.Text code>1y</Typography.Text>/
          <Typography.Text code>all</Typography.Text>),{" "}
          <Typography.Text code>from</Typography.Text>/
          <Typography.Text code>to</Typography.Text> (
          <Typography.Text code>YYYY-MM-DD</Typography.Text>),{" "}
          <Typography.Text code>limit</Typography.Text> (≤ 2000).
        </li>
        <li>
          <Typography.Text code>get_ideals</Typography.Text>,{" "}
          <Typography.Text code>get_presets</Typography.Text> — no arguments.
        </li>
        <li>
          <Typography.Text code>search</Typography.Text> /{" "}
          <Typography.Text code>fetch</Typography.Text> — same data as documents.
        </li>
      </ul>

      <Typography.Title level={5} style={{ marginBottom: 4 }}>
        Test it
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
          <code>{testCommand}</code>
        </pre>
      </Typography.Paragraph>
    </Modal>
  );
}
