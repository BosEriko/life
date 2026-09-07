"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Card, Flex, Switch, Table, Typography } from "antd";
import type { TableProps } from "antd";
import { useAuth } from "@/components/auth-provider";
import { isAdminEmail } from "@/lib/admin";
import { testClaudeConnection } from "@/models/claude-integration";
import {
  listAdminUsers,
  setUserClaudeAccess,
  type AdminUser,
} from "@/models/admin";

export function AdminPanel() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const router = useRouter();
  const admin = isAdminEmail(user?.email);

  const [rows, setRows] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!admin) {
      router.replace("/");
      return;
    }
    let active = true;
    listAdminUsers(user)
      .then((users) => {
        if (!active) return;
        setRows(users);
        setLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        message.error(
          error instanceof Error ? error.message : "Could not load users.",
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, admin, router, message]);

  if (!admin || !user) return null;

  async function toggle(row: AdminUser, next: boolean) {
    if (!user) return;
    setPending((prev) => ({ ...prev, [row.uid]: true }));
    setRows((prev) =>
      prev.map((item) =>
        item.uid === row.uid ? { ...item, claudeEnabled: next } : item,
      ),
    );
    try {
      await setUserClaudeAccess(user, row.uid, next);
    } catch {
      setRows((prev) =>
        prev.map((item) =>
          item.uid === row.uid ? { ...item, claudeEnabled: !next } : item,
        ),
      );
      message.error("Could not update that user.");
    } finally {
      setPending((prev) => ({ ...prev, [row.uid]: false }));
    }
  }

  async function handleTest() {
    if (!user) return;
    setTesting(true);
    try {
      const { ok, error } = await testClaudeConnection(user);
      if (ok) message.success("Anthropic key is working.");
      else message.error(error ?? "Anthropic key is not working.");
    } catch {
      message.error("Could not run the test.");
    } finally {
      setTesting(false);
    }
  }

  const columns: TableProps<AdminUser>["columns"] = [
    {
      title: "User",
      dataIndex: "email",
      render: (email: string | null, row) => (
        <Flex vertical>
          <Typography.Text>{email ?? row.uid}</Typography.Text>
          {row.displayName ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {row.displayName}
            </Typography.Text>
          ) : null}
        </Flex>
      ),
    },
    {
      title: "Claude autofill",
      dataIndex: "claudeEnabled",
      width: 140,
      render: (enabled: boolean, row) => (
        <Switch
          checked={enabled}
          loading={pending[row.uid]}
          onChange={(next) => toggle(row, next)}
        />
      ),
    },
  ];

  return (
    <div>
      <Flex
        align="flex-start"
        justify="space-between"
        gap={16}
        wrap
        style={{ marginBottom: 16 }}
      >
        <div>
          <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 4 }}>
            Admin
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
            Grant or revoke Claude autofill per user. Enabled users get calories
            and sodium estimated when they leave those fields blank.
          </Typography.Paragraph>
        </div>
        <Button size="small" loading={testing} onClick={handleTest}>
          Test Anthropic key
        </Button>
      </Flex>

      <Card
        size="small"
        styles={{ body: { padding: 0 } }}
        style={{ overflow: "hidden" }}
      >
        <Table<AdminUser>
          className="flush-table"
          rowKey="uid"
          size="middle"
          loading={loading}
          dataSource={rows}
          columns={columns}
          pagination={false}
          locale={{ emptyText: "No users." }}
        />
      </Card>
    </div>
  );
}
