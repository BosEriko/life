"use client";

import { useState } from "react";
import { App, Flex, Modal, Segmented, Typography } from "antd";
import { useAuth } from "@/components/auth-provider";
import { saveProfile } from "@/models/profile";
import {
  type HeightUnit,
  type Units,
  type VolumeUnit,
  type WeightUnit,
} from "@/lib/units";

const WEIGHT_OPTIONS = [
  { label: "Kilograms", value: "kg" },
  { label: "Pounds", value: "lb" },
];

const VOLUME_OPTIONS = [
  { label: "Millilitres", value: "ml" },
  { label: "Litres", value: "l" },
  { label: "Fl oz", value: "floz" },
];

const HEIGHT_OPTIONS = [
  { label: "Feet / inches", value: "ftin" },
  { label: "Centimetres", value: "cm" },
];

export function UnitsGate({ current }: { current: Units }) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [weight, setWeight] = useState<WeightUnit>(current.weight);
  const [volume, setVolume] = useState<VolumeUnit>(current.volume);
  const [height, setHeight] = useState<HeightUnit>(current.height);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await saveProfile(user.uid, {
        weightUnit: weight,
        volumeUnit: volume,
        heightUnit: height,
      });
    } catch {
      message.error("Could not save. Try again.");
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      centered
      closable={false}
      mask={{ closable: false }}
      keyboard={false}
      title="Choose your units"
      okText="Save"
      cancelButtonProps={{ style: { display: "none" } }}
      confirmLoading={saving}
      onOk={handleSave}
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        Pick the units you want to see everywhere. You can change these later in
        your profile.
      </Typography.Paragraph>
      <Flex vertical gap={16}>
        <div>
          <Typography.Text strong>Weight</Typography.Text>
          <Segmented
            block
            style={{ marginTop: 4 }}
            options={WEIGHT_OPTIONS}
            value={weight}
            onChange={(value) => setWeight(value as WeightUnit)}
          />
        </div>
        <div>
          <Typography.Text strong>Water</Typography.Text>
          <Segmented
            block
            style={{ marginTop: 4 }}
            options={VOLUME_OPTIONS}
            value={volume}
            onChange={(value) => setVolume(value as VolumeUnit)}
          />
        </div>
        <div>
          <Typography.Text strong>Height</Typography.Text>
          <Segmented
            block
            style={{ marginTop: 4 }}
            options={HEIGHT_OPTIONS}
            value={height}
            onChange={(value) => setHeight(value as HeightUnit)}
          />
        </div>
      </Flex>
    </Modal>
  );
}
