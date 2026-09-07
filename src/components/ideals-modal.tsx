"use client";

import { useEffect, useState } from "react";
import { App, Flex, Form, InputNumber, Modal, Typography } from "antd";
import { useAuth } from "@/components/auth-provider";
import { saveIdeals, type IdealKey, type Ideals } from "@/models/ideals";
import { useUnits } from "@/components/units-provider";
import {
  fromKg,
  fromMl,
  toKg,
  toMl,
  volumeStep,
  volumeSuffix,
  weightStep,
  weightSuffix,
} from "@/lib/units";

const ROWS: { key: IdealKey; label: string }[] = [
  { key: "weight", label: "Weight" },
  { key: "systolic", label: "BP systolic" },
  { key: "diastolic", label: "BP diastolic" },
  { key: "water", label: "Water" },
  { key: "calories", label: "Calories" },
  { key: "sodium", label: "Sodium" },
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
  const units = useUnits();
  const { user } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormShape>();
  const [saving, setSaving] = useState(false);

  const toDisplay = (key: IdealKey, value: number | null): number | null => {
    if (value == null) return null;
    if (key === "weight") {
      return Math.round(fromKg(value, units.weight) * 10) / 10;
    }
    if (key === "water") {
      return Math.round(fromMl(value, units.volume) * 100) / 100;
    }
    return value;
  };

  const toStored = (key: IdealKey, value: number | null): number | null => {
    if (value == null) return null;
    if (key === "weight") return Math.round(toKg(value, units.weight) * 100) / 100;
    if (key === "water") return Math.round(toMl(value, units.volume));
    return value;
  };

  const unitLabel = (key: IdealKey): string => {
    if (key === "weight") return weightSuffix(units.weight);
    if (key === "water") return volumeSuffix(units.volume);
    if (key === "calories") return "kcal";
    if (key === "sodium") return "mg";
    return "mmHg";
  };

  const stepFor = (key: IdealKey): number | undefined => {
    if (key === "weight") return weightStep(units.weight);
    if (key === "water") return volumeStep(units.volume);
    return undefined;
  };

  useEffect(() => {
    if (!open) return;
    const shaped = {} as FormShape;
    for (const { key } of ROWS) {
      shaped[key] = {
        min: toDisplay(key, ideals[key].min),
        max: toDisplay(key, ideals[key].max),
      };
    }
    form.setFieldsValue(shaped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ideals, form, units]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const values = form.getFieldsValue();
      const next = {} as Ideals;
      for (const { key } of ROWS) {
        next[key] = {
          min: toStored(
            key,
            typeof values[key]?.min === "number" ? values[key].min : null,
          ),
          max: toStored(
            key,
            typeof values[key]?.max === "number" ? values[key].max : null,
          ),
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
      centered
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
                  step={stepFor(row.key)}
                  style={{ flex: 1 }}
                />
              </Form.Item>
              <span>–</span>
              <Form.Item name={[row.key, "max"]} noStyle>
                <InputNumber
                  placeholder="max"
                  min={0}
                  step={stepFor(row.key)}
                  style={{ flex: 1 }}
                />
              </Form.Item>
              <Typography.Text type="secondary" style={{ width: 44 }}>
                {unitLabel(row.key)}
              </Typography.Text>
            </Flex>
          </Form.Item>
        ))}
      </Form>
    </Modal>
  );
}
