"use client";

import { useEffect, useState } from "react";
import {
  App,
  Button,
  Card,
  Checkbox,
  Flex,
  Input,
  InputNumber,
  Select,
  Table,
  Tag,
  Typography,
} from "antd";
import type { TableProps } from "antd";
import { CopyOutlined, ShareAltOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import {
  createShareLink,
  deleteShareLink,
  inviteUrl,
  listShareLinks,
  shareLinkStatus,
  type ShareLink,
} from "@/models/share-links";

const EXPIRY_OPTIONS = [
  { label: "Never", value: "never" },
  { label: "1 hour", value: String(60 * 60 * 1000) },
  { label: "1 day", value: String(24 * 60 * 60 * 1000) },
  { label: "7 days", value: String(7 * 24 * 60 * 60 * 1000) },
  { label: "30 days", value: String(30 * 24 * 60 * 60 * 1000) },
];

const STATUS_TAG: Record<
  ReturnType<typeof shareLinkStatus>,
  { text: string; color: string }
> = {
  active: { text: "Active", color: "green" },
  revoked: { text: "Revoked", color: "default" },
  expired: { text: "Expired", color: "default" },
  exhausted: { text: "Used up", color: "default" },
};

export function SharePanel() {
  const { user } = useAuth();
  const { message } = App.useApp();

  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);

  const [label, setLabel] = useState("");
  const [expiry, setExpiry] = useState("never");
  const [limited, setLimited] = useState(false);
  const [maxUses, setMaxUses] = useState<number | null>(10);
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<ShareLink | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    listShareLinks(user)
      .then((next) => {
        if (active) setLinks(next);
      })
      .catch(() => message.error("Could not load your links."))
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [user, message]);

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      message.success("Link copied");
    } catch {
      message.error("Could not copy.");
    }
  }

  async function handleCreate() {
    if (!user) return;
    setCreating(true);
    try {
      const link = await createShareLink(user, {
        label: label.trim() ? label.trim() : null,
        expiresInMs: expiry === "never" ? null : Number(expiry),
        maxUses: limited ? (maxUses ?? null) : null,
      });
      setLinks((prev) => [link, ...prev]);
      setJustCreated(link);
      setLabel("");
      setExpiry("never");
      setLimited(false);
      setMaxUses(10);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Could not create a link.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(code: string) {
    if (!user) return;
    setDeletingCode(code);
    try {
      await deleteShareLink(user, code);
      setLinks((prev) => prev.filter((link) => link.code !== code));
      if (justCreated?.code === code) setJustCreated(null);
    } catch {
      message.error("Could not delete that link.");
    } finally {
      setDeletingCode(null);
    }
  }

  const columns: TableProps<ShareLink>["columns"] = [
    {
      title: "Label",
      dataIndex: "label",
      render: (value: string | null) => value ?? "—",
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      render: (value: number | null) =>
        value ? dayjs(value).format("MMM D, YYYY") : "—",
    },
    {
      title: "Expires",
      dataIndex: "expiresAt",
      render: (value: number | null) =>
        value ? dayjs(value).format("MMM D, YYYY h:mm A") : "Never",
    },
    {
      title: "Views",
      dataIndex: "useCount",
      render: (value: number, row) =>
        row.maxUses != null ? `${value} / ${row.maxUses}` : `${value}`,
    },
    {
      title: "Status",
      key: "status",
      render: (_value, row) => {
        const status = STATUS_TAG[shareLinkStatus(row)];
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: "",
      key: "actions",
      width: 90,
      render: (_value, row) => (
        <Flex gap={4} justify="flex-end">
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            aria-label="Copy link"
            onClick={() => copyText(inviteUrl(row.code))}
          />
          <ConfirmDeleteButton
            ariaLabel="Delete link"
            loading={deletingCode === row.code}
            onConfirm={() => handleDelete(row.code)}
          />
        </Flex>
      ),
    },
  ];

  return (
    <div>
      <Flex align="center" gap={10} style={{ marginBottom: 4 }}>
        <ShareAltOutlined style={{ fontSize: 22 }} />
        <Typography.Title level={3} style={{ margin: 0 }}>
          Share
        </Typography.Title>
      </Flex>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 20 }}>
        Create a link so someone can see your data without signing in — like a
        Discord invite. Set an expiry, a view limit, both, or neither.
      </Typography.Paragraph>

      <Flex vertical gap={20}>
        <Card size="small" title="Create a link">
          <Flex vertical gap={12}>
            <Input
              placeholder="Label (optional, e.g. For mom)"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              maxLength={60}
            />
            <Flex gap={8} wrap align="center">
              <Select
                value={expiry}
                onChange={setExpiry}
                options={EXPIRY_OPTIONS}
                style={{ minWidth: 140 }}
              />
              <Checkbox
                checked={limited}
                onChange={(event) => setLimited(event.target.checked)}
              >
                Limit views
              </Checkbox>
              {limited ? (
                <InputNumber
                  min={1}
                  value={maxUses}
                  onChange={setMaxUses}
                  style={{ width: 90 }}
                />
              ) : null}
            </Flex>
            <Button
              type="primary"
              loading={creating}
              onClick={handleCreate}
              style={{ alignSelf: "flex-start" }}
            >
              Create link
            </Button>

            {justCreated ? (
              <Flex
                gap={8}
                align="center"
                wrap
                style={{ marginTop: 4 }}
              >
                <Typography.Text code copyable={false} style={{ flex: 1 }}>
                  {inviteUrl(justCreated.code)}
                </Typography.Text>
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyText(inviteUrl(justCreated.code))}
                >
                  Copy
                </Button>
              </Flex>
            ) : null}
          </Flex>
        </Card>

        <Card
          size="small"
          styles={{ body: { padding: 0 } }}
          style={{ overflow: "hidden" }}
        >
          <Table<ShareLink>
            className="flush-table"
            rowKey="code"
            size="middle"
            loading={!loaded}
            dataSource={links}
            columns={columns}
            pagination={false}
            scroll={{ x: 640 }}
            locale={{ emptyText: "No links yet." }}
          />
        </Card>
      </Flex>
    </div>
  );
}
