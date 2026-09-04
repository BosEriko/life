"use client";

import { useEffect, useState } from "react";
import { App, Flex, Form, InputNumber, Modal, Typography } from "antd";
import { useAuth } from "@/components/auth-provider";
import { saveIdeals, type IdealKey, type Ideals } from "@/lib/ideals";

const ROWS: {
  key: IdealKey;
  label: string;
  unit: string;
  step?: number;
}[] = [
  { key: "weight", label: "Weight", unit: "kg", step: 0.1 },
  { key: "systolic", label: "BP systolic", unit: "mmHg" },
  { key: "diastolic", label: "BP diastolic", unit: "mmHg" },
  { key: "water", label: "Water", unit: "ml", step: 100 },
];

type FormShape = Record<IdealKey, { min: number | null; max: number | null }>;

export function IdealsModal({
  open,
  onClose,
  ideals,
}: {
  open: boolean;
  onClose: () => void;
  ideals: Ideals;
}) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormShape>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) form.setFieldsValue(ideals);
  }, [open, ideals, form]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const values = form.getFieldsValue();
      const next = {} as Ideals;
      for (const { key } of ROWS) {
        next[key] = {
          min: typeof values[key]?.min === "number" ? values[key].min : null,
          max: typeof values[key]?.max === "number" ? values[key].max : null,
        };
      }
      await saveIdeals(user.uid, next);
      message.success("Ideals saved");
      onClose();
    } catch {
      message.error("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Ideal ranges"
      okText="Save"
      confirmLoading={saving}
      onOk={handleSave}
      onCancel={onClose}
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        Averages outside these ranges get flagged. Leave a field blank for no
        limit.
      </Typography.Paragraph>
      <Form form={form} layout="vertical">
        {ROWS.map((row) => (
          <Form.Item
            key={row.key}
            label={row.label}
            style={{ marginBottom: 12 }}
          >
            <Flex gap={8} align="center">
              <Form.Item name={[row.key, "min"]} noStyle>
                <InputNumber
                  placeholder="min"
                  min={0}
                  step={row.step}
                  style={{ flex: 1 }}
                />
              </Form.Item>
              <span>–</span>
              <Form.Item name={[row.key, "max"]} noStyle>
                <InputNumber
                  placeholder="max"
                  min={0}
                  step={row.step}
                  style={{ flex: 1 }}
                />
              </Form.Item>
              <Typography.Text type="secondary" style={{ width: 44 }}>
                {row.unit}
              </Typography.Text>
            </Flex>
          </Form.Item>
        ))}
      </Form>
    </Modal>
  );
}
