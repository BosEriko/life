"use client";

import { useEffect, useState } from "react";
import { Alert, App, Button, Card, Flex, Input, Popconfirm, Skeleton, Typography } from "antd";
import { ApiOutlined, DisconnectOutlined, ExportOutlined, SyncOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { connectWise, disconnectWise, getWiseStatus, syncWiseNow, WISE_TOKEN_URL, type WiseStatus } from "@/models/wise";

export function WiseCard() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [status, setStatus] = useState<WiseStatus | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState<"connect" | "sync" | "disconnect" | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getWiseStatus(user)
      .then((next) => { if (active) setStatus(next); })
      .catch(() => { if (active) setStatus({ connected: false }); });
    return () => { active = false; };
  }, [user]);

  async function run(kind: "connect" | "sync" | "disconnect", action: () => Promise<void>) {
    setBusy(kind);
    try {
      await action();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Something went wrong.");
      if (user) setStatus(await getWiseStatus(user).catch(() => status));
    } finally {
      setBusy(null);
    }
  }

  const connect = () => run("connect", async () => {
    if (!user) return;
    setStatus(await connectWise(user, token));
    setToken("");
    message.success("Wise connected. Your transactions are being imported into Finance.");
  });

  const sync = () => run("sync", async () => {
    if (!user) return;
    const result = await syncWiseNow(user, true);
    setStatus(await getWiseStatus(user));
    message.success(result.status === "skipped" ? "A sync just ran. Try again in a minute." : `Synced: ${result.added ?? 0} new, ${result.updated ?? 0} updated, ${result.removed ?? 0} removed.`);
  });

  const disconnect = () => run("disconnect", async () => {
    if (!user) return;
    await disconnectWise(user);
    setStatus({ connected: false });
    message.success("Wise disconnected. Your imported records and accounts stay in Finance.");
  });

  return (
    <Card size="small" title={<><ApiOutlined style={{ marginRight: 8 }} />Wise</>}>
      {status === null ? <Skeleton active paragraph={{ rows: 2 }} /> : status.connected ? (
        <Flex vertical gap={12}>
          <Typography.Paragraph type="secondary" style={{ fontSize: 13, margin: 0 }}>
            Connected{status.currencies.length ? ` · ${status.currencies.map((currency) => `Wise ${currency}`).join(", ")}` : ""}. New activity syncs automatically whenever you open Finance, and each Wise account&apos;s balance matches Wise.
          </Typography.Paragraph>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {status.lastSyncedAt ? `Last synced ${dayjs(status.lastSyncedAt).format("MMM D, YYYY h:mm A")}` : "Not synced yet"}
          </Typography.Text>
          {status.lastError && <Alert type="warning" showIcon message={status.lastError} />}
          <Flex gap={8} wrap>
            <Button icon={<SyncOutlined />} loading={busy === "sync"} disabled={busy !== null} onClick={sync}>Sync now</Button>
            <Popconfirm title="Disconnect Wise?" description="Imported records and accounts stay. They just stop updating." okText="Disconnect" onConfirm={disconnect}>
              <Button danger icon={<DisconnectOutlined />} loading={busy === "disconnect"} disabled={busy !== null}>Disconnect</Button>
            </Popconfirm>
          </Flex>
        </Flex>
      ) : (
        <Flex vertical gap={12}>
          <Typography.Paragraph type="secondary" style={{ fontSize: 13, margin: 0 }}>
            Import your Wise card payments, transfers and deposits into Finance automatically.
          </Typography.Paragraph>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
            <li>Open <Typography.Link href={WISE_TOKEN_URL} target="_blank" rel="noreferrer">Wise API tokens <ExportOutlined style={{ fontSize: 11 }} /></Typography.Link> and sign in.</li>
            <li>Choose <strong>Add new token</strong>, name it (like &quot;Life Tracker&quot;), and pick <strong>Read only</strong>.</li>
            <li>Finish the verification, copy the token, and paste it below.</li>
          </ol>
          <Input.Password placeholder="Paste your Wise API token" value={token} onChange={(event) => setToken(event.target.value)} onPressEnter={() => token.trim() && connect()} autoComplete="off" />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            The token is stored on the server only and never shown again. Disconnecting deletes it.
          </Typography.Text>
          <Button type="primary" icon={<ApiOutlined />} loading={busy === "connect"} disabled={!token.trim() || busy !== null} onClick={connect} style={{ alignSelf: "flex-start" }}>Connect Wise</Button>
        </Flex>
      )}
    </Card>
  );
}
