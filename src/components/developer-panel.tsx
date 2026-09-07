"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  App,
  Button,
  Card,
  Divider,
  Flex,
  Modal,
  Spin,
  Tabs,
  theme,
  Typography,
} from "antd";
import { CodeOutlined, CopyOutlined, KeyOutlined } from "@ant-design/icons";
import { useAuth } from "@/components/auth-provider";
import { confirmDestroy } from "@/lib/confirm-destroy";
import { generateMcpKey, watchMcpKey, type McpKeyMeta } from "@/models/mcp-key";

const KEY_PLACEHOLDER = "<YOUR_MCP_KEY>";

const PRE_STYLE: CSSProperties = {
  margin: "4px 0 0",
  padding: 12,
  borderRadius: 8,
  fontSize: 12,
  overflowX: "auto",
  background: "rgba(127,127,127,0.12)",
};

export function DeveloperPanel() {
  const { user } = useAuth();
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();
  const [meta, setMeta] = useState<McpKeyMeta | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [copyBusy, setCopyBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    return watchMcpKey(
      user.uid,
      (next) => {
        setMeta(next);
        setLoaded(true);
      },
      () => setLoaded(true),
    );
  }, [user]);

  async function handleGenerate() {
    if (!user) return;
    setBusy(true);
    try {
      setFreshKey(await generateMcpKey(user.uid));
    } catch {
      message.error("Could not generate a key.");
    } finally {
      setBusy(false);
    }
  }

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://life.boseriko.com";

  function mcpUrl(key: string): string {
    return `${origin}/api/mcp/${key}`;
  }

  const shownUrl = mcpUrl(freshKey ?? KEY_PLACEHOLDER);

  const testCommand = `curl -s "${shownUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`;

  const jsonConfig = `{\n  "mcpServers": {\n    "life-tracker": { "url": "${shownUrl}" }\n  }\n}`;
  const codexConfig = `[mcp_servers.life-tracker]\nurl = "${shownUrl}"`;

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      message.success("MCP URL copied");
    } catch {
      message.error("Could not copy.");
    }
  }

  async function copyWithNewKey() {
    if (!user) return;
    setCopyBusy(true);
    try {
      const key = await generateMcpKey(user.uid);
      setFreshKey(key);
      await copyText(mcpUrl(key));
      setConfirmOpen(false);
    } catch {
      message.error("Could not generate a key.");
    } finally {
      setCopyBusy(false);
    }
  }

  async function copyWithPlaceholder() {
    await copyText(mcpUrl(KEY_PLACEHOLDER));
    setConfirmOpen(false);
  }

  const cardStyle = {
    borderColor: token.colorBorderSecondary,
    borderRadius: token.borderRadiusLG,
    boxShadow: token.boxShadowTertiary,
  };

  return (
    <div>
      <Flex align="center" gap={10} style={{ marginBottom: 4 }}>
        <CodeOutlined style={{ color: token.colorPrimary, fontSize: 22 }} />
        <Typography.Title level={3} style={{ margin: 0 }}>
          Developer · MCP
        </Typography.Title>
      </Flex>
      <Typography.Paragraph type="secondary" style={{ margin: "0 0 24px" }}>
        Connect your entries, targets, and presets to any MCP-capable agent.
        Your server is read-only.
      </Typography.Paragraph>

      <Modal
        open={confirmOpen}
        centered
        title="Copy with MCP key?"
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

      <Flex vertical gap={24}>
        <Card title="Access" style={cardStyle} styles={{ body: { padding: 24 } }}>
          <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 4 }}>
            MCP server URL
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
            Streamable HTTP. The key lives in the URL, so treat the whole URL as
            the secret. On copy you&apos;ll be asked whether to use a real key or
            a placeholder.
          </Typography.Paragraph>
          <Button
            type="primary"
            icon={<CopyOutlined />}
            onClick={() => setConfirmOpen(true)}
          >
            Copy MCP URL
          </Button>

          <Divider />

          <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 4 }}>
            MCP key
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
                Copy it now. It is shown once and cannot be retrieved after you
                leave or refresh this page.
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
              No MCP key yet.
            </Typography.Paragraph>
          )}

          <div>
            {meta && !freshKey ? (
              <Button
                type="primary"
                icon={<KeyOutlined />}
                loading={busy}
                onClick={() =>
                  confirmDestroy(modal, {
                    title: "Invalidate the current key?",
                    content: "Anything using the old key stops working.",
                    okText: "Regenerate",
                    onOk: handleGenerate,
                  })
                }
              >
                Regenerate key
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<KeyOutlined />}
                loading={busy}
                onClick={handleGenerate}
              >
                {meta || freshKey ? "Regenerate key" : "Generate MCP key"}
              </Button>
            )}
          </div>
        </Card>

        <Card
          title="Connect it"
          style={cardStyle}
          styles={{ body: { padding: 24 } }}
        >
          <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
            Add it as a remote MCP server. Transport is Streamable HTTP with no
            authentication — the key is already in the URL.
          </Typography.Paragraph>
          <Tabs
            size="small"
            style={{ marginBottom: 12 }}
            items={[
              {
                key: "claude",
                label: "Claude",
                children: (
                  <Typography.Paragraph
                    style={{ fontSize: 13, marginBottom: 0 }}
                  >
                    claude.ai or Claude Desktop → Settings →{" "}
                    <strong>Connectors</strong> → Add custom connector → paste
                    the URL, leave authentication as <strong>None</strong>.
                  </Typography.Paragraph>
                ),
              },
              {
                key: "chatgpt",
                label: "ChatGPT",
                children: (
                  <Typography.Paragraph
                    style={{ fontSize: 13, marginBottom: 0 }}
                  >
                    Settings → <strong>Connectors</strong> → enable{" "}
                    <em>Developer mode</em> → Add custom connector → paste the
                    URL, choose <strong>No authentication</strong>. Enable it in
                    a chat.
                  </Typography.Paragraph>
                ),
              },
              {
                key: "codex",
                label: "Codex",
                children: (
                  <>
                    <Typography.Paragraph
                      style={{ fontSize: 13, marginBottom: 0 }}
                    >
                      Add to{" "}
                      <Typography.Text code>
                        ~/.codex/config.toml
                      </Typography.Text>
                      :
                    </Typography.Paragraph>
                    <pre style={PRE_STYLE}>
                      <code>{codexConfig}</code>
                    </pre>
                  </>
                ),
              },
              {
                key: "config",
                label: "Config file",
                children: (
                  <>
                    <Typography.Paragraph
                      style={{ fontSize: 13, marginBottom: 0 }}
                    >
                      Cursor, VS Code, Windsurf, Claude Desktop, etc. —{" "}
                      <Typography.Text code>mcp.json</Typography.Text> /{" "}
                      <Typography.Text code>
                        claude_desktop_config.json
                      </Typography.Text>
                      :
                    </Typography.Paragraph>
                    <pre style={PRE_STYLE}>
                      <code>{jsonConfig}</code>
                    </pre>
                  </>
                ),
              },
            ]}
          />
        </Card>

        <Card
          title="API reference"
          style={cardStyle}
          styles={{ body: { padding: 24 } }}
        >
          <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 4 }}>
            Tools
          </Typography.Title>
          <ul
            style={{ paddingInlineStart: 18, fontSize: 13, margin: "0 0 20px" }}
          >
            <li>
          <Typography.Text code>get_entries</Typography.Text> /{" "}
          <Typography.Text code>get_bp</Typography.Text> /{" "}
          <Typography.Text code>get_water</Typography.Text> /{" "}
          <Typography.Text code>get_intake</Typography.Text> /{" "}
          <Typography.Text code>get_notes</Typography.Text> —{" "}
          <Typography.Text code>range</Typography.Text> (
          <Typography.Text code>7d</Typography.Text>/
          <Typography.Text code>30d</Typography.Text>/
          <Typography.Text code>90d</Typography.Text>/
          <Typography.Text code>1y</Typography.Text>/
          <Typography.Text code>all</Typography.Text>),{" "}
          <Typography.Text code>from</Typography.Text>/
          <Typography.Text code>to</Typography.Text> (
          <Typography.Text code>YYYY-MM-DD</Typography.Text>),{" "}
          <Typography.Text code>limit</Typography.Text> (≤ 2000).{" "}
          <Typography.Text code>get_entries</Typography.Text> gives each day&apos;s
          roll-up; <Typography.Text code>get_bp</Typography.Text> /{" "}
          <Typography.Text code>get_water</Typography.Text> /{" "}
          <Typography.Text code>get_intake</Typography.Text> /{" "}
          <Typography.Text code>get_notes</Typography.Text> give every individual
          entry.
            </li>
            <li>
          <Typography.Text code>get_ideals</Typography.Text>,{" "}
          <Typography.Text code>get_presets</Typography.Text>,{" "}
          <Typography.Text code>get_profile</Typography.Text> — no arguments.
            </li>
            <li>
          <Typography.Text code>search</Typography.Text> /{" "}
          <Typography.Text code>fetch</Typography.Text> — same data as documents.
            </li>
          </ul>

          <Typography.Title level={5} style={{ marginBottom: 4 }}>
            Test it
          </Typography.Title>
          <pre style={PRE_STYLE}>
            <code>{testCommand}</code>
          </pre>
        </Card>
      </Flex>
    </div>
  );
}
