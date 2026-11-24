"use client";

import { useState } from "react";
import { App, Button, Card, ColorPicker, Empty, Flex, Form, Input, Typography, theme } from "antd";
import { EditOutlined, HolderOutlined, PlusOutlined, TagOutlined } from "@ant-design/icons";
import { AppModal } from "@/components/app-modal";
import { useAuth } from "@/components/auth-provider";
import { useHealthData } from "@/components/health-data-provider";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { SortableList } from "@/components/sortable-list";
import { Tip } from "@/components/tip";
import { LabelTag } from "@/components/finance-label-select";
import { LABEL_COLORS, labelValidation, type FinanceLabel } from "@/lib/finance-labels";
import { deleteFinanceLabel, reorderFinanceLabels, saveFinanceLabel } from "@/models/users/finance";

function LabelModal({ initial, onClose }: { initial: FinanceLabel; onClose: () => void }) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { financeLabels: labels } = useHealthData();
  const existing = labels.some((label) => label.id === initial.id);
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState(initial.color);
  function save() {
    if (!user) return;
    const label = { ...initial, name, color };
    const error = labelValidation(label, labels);
    if (error) { message.error(error); return; }
    void saveFinanceLabel(user.uid, label, labels).catch((reason: unknown) => message.error(reason instanceof Error ? reason.message : "Could not save the label."));
    message.success(navigator.onLine ? (existing ? "Label updated." : "Label added.") : "Label saved offline. It will sync when you reconnect.");
    onClose();
  }
  return <AppModal open title={existing ? "Edit label" : "Add label"} onCancel={onClose} footer={<Flex justify="flex-end"><Button type="primary" onClick={save}>{existing ? "Save changes" : "Add label"}</Button></Flex>}>
    <Form layout="vertical" onFinish={save}>
      <Form.Item label="Preview"><LabelTag label={{ name: name.trim() || "Label name", color }} /></Form.Item>
      <Form.Item label="Name" required><Input aria-label="Label name" value={name} onChange={(event) => setName(event.target.value)} maxLength={60} autoFocus /></Form.Item>
      <Form.Item label="Color" required style={{ marginBottom: 0 }}><ColorPicker aria-label="Label color" value={color} disabledAlpha showText onChangeComplete={(value) => setColor(value.toHexString().toUpperCase())} presets={[{ label: "Colors", colors: LABEL_COLORS }]} /></Form.Item>
    </Form>
  </AppModal>;
}

export function FinanceLabelsCard() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { financeLabels: labels, financeReady, financeError } = useHealthData();
  const [editing, setEditing] = useState<FinanceLabel | null>(null);
  const byId = new Map(labels.map((label) => [label.id, label]));
  const disabled = !financeReady || financeError;
  const blank = (): FinanceLabel => ({ id: crypto.randomUUID(), name: "", color: LABEL_COLORS[labels.length % LABEL_COLORS.length], order: labels.reduce((max, label) => Math.max(max, label.order + 1), 0) });
  function remove(label: FinanceLabel) {
    if (!user) return;
    void deleteFinanceLabel(user.uid, label.id).catch(() => message.error("Could not delete the label."));
    message.success(navigator.onLine ? "Label deleted. It's removed from your records." : "Deleted offline. It will sync when you reconnect.");
  }
  function reorder(order: string[]) {
    if (user) void reorderFinanceLabels(user.uid, order).catch(() => message.error("Could not save the label order."));
  }
  const rowStyle = { padding: "5px 6px 5px 12px", borderRadius: token.borderRadius, background: token.colorFillSecondary };
  const row = (label: FinanceLabel, handleProps: Record<string, unknown> = {}) => (
    <Flex align="center" gap={8}>
      <div {...handleProps} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, cursor: disabled ? undefined : "grab" }}>
        <HolderOutlined aria-hidden style={{ color: token.colorTextTertiary }} />
        <LabelTag label={label} />
      </div>
      <Flex gap={2}>
        <Tip title="Edit"><Button type="text" size="small" aria-label={`Edit ${label.name}`} icon={<EditOutlined />} disabled={disabled} onClick={() => setEditing(label)} /></Tip>
        <ConfirmDeleteButton ariaLabel={`Delete ${label.name}`} tooltip="Delete" hint="Tap again to delete. It's removed from your records." onConfirm={() => remove(label)} />
      </Flex>
    </Flex>
  );
  return (
    <Card size="small" title={<><TagOutlined style={{ marginRight: 8 }} />Labels</>} extra={<Button size="small" type="primary" icon={<PlusOutlined />} disabled={disabled} onClick={() => setEditing(blank())}>Add label</Button>}>
      <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginTop: 0, marginBottom: 16 }}>
        Tag records across categories, like a trip or a project. Drag to reorder.
      </Typography.Paragraph>
      {labels.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No labels yet." /> : (
        <Flex vertical gap={6}>
          <SortableList
            ids={labels.map((label) => label.id)}
            layout="list"
            disabled={disabled}
            onReorder={reorder}
            renderOverlay={(id) => { const label = byId.get(id); return label ? <div style={{ ...rowStyle, background: token.colorBgElevated }}>{row(label)}</div> : null; }}
            renderItem={(id, { ref, style, handlers }) => {
              const label = byId.get(id);
              if (!label) return null;
              return <div key={id} ref={ref} style={{ ...style, ...rowStyle }}>{row(label, { ...handlers, className: "reorder-item", "aria-label": `${label.name} label. Press Space to pick up and reorder.` })}</div>;
            }}
          />
        </Flex>
      )}
      {editing && <LabelModal key={editing.id} initial={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}
