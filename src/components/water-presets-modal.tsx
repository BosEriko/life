"use client";

import { useState } from "react";
import { App, Button, Flex, Input, InputNumber, Modal, Typography } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { useAuth } from "@/components/auth-provider";
import { useUnits } from "@/components/units-provider";
import {
  formatVolume,
  toMl,
  volumeDecimals,
  volumeStep,
  volumeSuffix,
} from "@/lib/units";
import {
  addWaterPreset,
  deleteWaterPreset,
  type WaterPreset,
} from "@/models/presets";

export function WaterPresetsModal({
  open,
  onClose,
  presets,
}: {
  open: boolean;
  onClose: () => void;
  presets: WaterPreset[];
}) {
  const units = useUnits();
  const { user } = useAuth();
  const { message } = App.useApp();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const canAdd =
    name.trim().length > 0 && typeof amount === "number" && amount > 0;

  async function handleAdd() {
    if (!user || !canAdd) return;
    setBusy(true);
    try {
      await addWaterPreset(
        user.uid,
        name.trim(),
        Math.round(toMl(amount, units.volume)),
      );
      setName("");
      setAmount(null);
    } catch {
      message.error("Could not add preset.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!user) return;
    try {
      await deleteWaterPreset(user.uid, id);
    } catch {
      message.error("Could not delete preset.");
    }
  }

  return (
    <Modal
      open={open}
      centered
      title="Water presets"
      footer={null}
      onCancel={onClose}
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        Name each bottle or glass and its size. They become the quick-add buttons
        under Water.
      </Typography.Paragraph>

      <Flex gap={8} align="center" style={{ marginBottom: 16 }}>
        <Input
          placeholder="Name (e.g. Small bottle)"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onPressEnter={handleAdd}
          style={{ flex: 1 }}
        />
        <InputNumber
          placeholder={volumeSuffix(units.volume)}
          min={volumeDecimals(units.volume) > 0 ? 0.01 : 1}
          step={volumeStep(units.volume)}
          precision={volumeDecimals(units.volume)}
          value={amount}
          onChange={(value) => setAmount(value)}
          style={{ width: 110 }}
        />
        <Button
          type="primary"
          loading={busy}
          disabled={!canAdd}
          onClick={handleAdd}
        >
          Add
        </Button>
      </Flex>

      {presets.length === 0 ? (
        <Typography.Text type="secondary">No presets yet.</Typography.Text>
      ) : (
        <Flex vertical>
          {presets.map((preset) => (
            <Flex
              key={preset.id}
              align="center"
              justify="space-between"
              style={{ padding: "8px 0" }}
            >
              <Typography.Text>
                <Typography.Text strong>{preset.name}</Typography.Text> ·{" "}
                {formatVolume(preset.ml, units.volume)}
              </Typography.Text>
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(preset.id)}
              />
            </Flex>
          ))}
        </Flex>
      )}
    </Modal>
  );
}
