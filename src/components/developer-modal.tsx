"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { App, Button, Modal, Popconfirm, Spin, Tabs, Typography } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import { useAuth } from "@/components/auth-provider";
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

export function DeveloperModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [meta, setMeta] = useState<McpKeyMeta | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  function handleClose() {
    setFreshKey(null);
    onClose();
  }

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
    typeof window !== "undefined" ? window.location.origin : "https://life.boseriko.com";

  const mcpUrl = `${origin}/api/mcp`;
  const snippetKey = freshKey ?? KEY_PLACEHOLDER;

  const testCommand = `curl -s "${mcpUrl}" \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer ${snippetKey}" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`;

  const jsonConfig = `{\n  "mcpServers": {\n    "life-tracker": {\n      "url": "${mcpUrl}",\n      "headers": { "Authorization": "Bearer ${snippetKey}" }\n    }\n  }\n}`;
  const codexConfig = `[mcp_servers.life-tracker]\nurl = "${mcpUrl}"\nhttp_headers = { "Authorization" = "Bearer ${snippetKey}" }`;

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      message.success(`${label} copied`);
    } catch {
      message.error("Could not copy.");
    }
  }

  return (
    <Modal
      open={open}
      centered
      title="Developer · MCP"
      footer={null}
      onCancel={handleClose}
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        Your entries, targets, and presets as an MCP server — connect it to any
        MCP-capable agent so it can read your data. Read-only.
      </Typography.Paragraph>

      <Typography.Title level={5} style={{ marginBottom: 4 }}>
        MCP server URL
      </Typography.Title>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 4,
        }}
      >
        <Typography.Text code style={{ wordBreak: "break-all" }}>
          {mcpUrl}
        </Typography.Text>
        <Button
          size="small"
          icon={<CopyOutlined />}
          onClick={() => copyText(mcpUrl, "MCP URL")}
        >
          Copy
        </Button>
      </div>
      <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
        Streamable HTTP. Authenticate with your MCP key as a bearer token —{" "}
        <Typography.Text code>Authorization: Bearer &lt;key&gt;</Typography.Text>.
        The URL holds no secret.
      </Typography.Paragraph>

      <Typography.Title level={5} style={{ marginBottom: 4 }}>
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
          invalidates the current key. Pass it as{" "}
          <Typography.Text code>Authorization: Bearer &lt;key&gt;</Typography.Text>.
        </Typography.Paragraph>
      ) : (
        <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
          No MCP key yet.
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
            {meta || freshKey ? "Regenerate key" : "Generate MCP key"}
          </Button>
        )}
      </div>

      <Typography.Title level={5} style={{ marginBottom: 4 }}>
        Connect it
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
        Add it as a remote MCP server. Transport is Streamable HTTP; authenticate
        with your MCP key as a bearer token.
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
                <strong>Connectors</strong> → Add custom connector → paste the
                URL. If it accepts a bearer token, use your MCP key; otherwise
                use the <strong>Config file</strong> tab.
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
                <em>Developer mode</em> → Add custom connector → paste the URL and
                set authentication to a bearer token with your MCP key. Enable it
                in a chat.
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
                  Add to <Typography.Text code>~/.codex/config.toml</Typography.Text>:
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
                  <Typography.Text code>claude_desktop_config.json</Typography.Text>:
                </Typography.Paragraph>
                <pre style={PRE_STYLE}>
                  <code>{jsonConfig}</code>
                </pre>
              </>
            ),
          },
        ]}
      />

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
    </Modal>
  );
}
