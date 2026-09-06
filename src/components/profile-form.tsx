"use client";

import { useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  DatePicker,
  Flex,
  Form,
  Input,
  InputNumber,
  Segmented,
  Select,
  Typography,
} from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { ReportModal } from "@/components/report-modal";
import {
  EMPTY_PROFILE,
  saveProfile,
  watchProfile,
  type Profile,
  type Sex,
} from "@/models/profile";
import {
  DEFAULT_UNITS,
  cmToFeetInches,
  feetInchesToCm,
  type HeightUnit,
  type VolumeUnit,
  type WeightUnit,
} from "@/lib/units";

type FormShape = {
  name?: string;
  birthday?: Dayjs;
  heightFeet?: number;
  heightInches?: number;
  heightCm?: number;
  sex?: Sex;
  timezone?: string;
  weightUnit?: WeightUnit;
  volumeUnit?: VolumeUnit;
  heightUnit?: HeightUnit;
};

const SEX_OPTIONS: { label: string; value: Sex }[] = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Prefer not to say", value: "unspecified" },
];

const WEIGHT_UNIT_OPTIONS = [
  { label: "kg", value: "kg" },
  { label: "lb", value: "lb" },
];

const VOLUME_UNIT_OPTIONS = [
  { label: "ml", value: "ml" },
  { label: "L", value: "l" },
  { label: "fl oz", value: "floz" },
];

const HEIGHT_UNIT_OPTIONS = [
  { label: "ft / in", value: "ftin" },
  { label: "cm", value: "cm" },
];

const ITEM_STYLE = { marginBottom: 14 };

function timezoneOptions(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [];
  }
}

function detectedTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

export function ProfileForm() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormShape>();
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [saving, setSaving] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const tzOptions = useMemo(() => timezoneOptions(), []);
  const heightUnit = Form.useWatch("heightUnit", form) ?? DEFAULT_UNITS.height;

  useEffect(() => {
    if (!user) return;
    return watchProfile(user.uid, setProfile, () => {});
  }, [user]);

  useEffect(() => {
    const hUnit = profile.heightUnit ?? DEFAULT_UNITS.height;
    const hasHeight =
      profile.heightFeet != null || profile.heightInches != null;
    form.setFieldsValue({
      name: profile.name ?? undefined,
      birthday: profile.birthday ? dayjs(profile.birthday) : undefined,
      heightFeet: profile.heightFeet ?? undefined,
      heightInches: profile.heightInches ?? undefined,
      heightCm:
        hUnit === "cm" && hasHeight
          ? feetInchesToCm(profile.heightFeet ?? 0, profile.heightInches ?? 0)
          : undefined,
      sex: profile.sex ?? undefined,
      timezone: profile.timezone ?? detectedTimezone(),
      weightUnit: profile.weightUnit ?? DEFAULT_UNITS.weight,
      volumeUnit: profile.volumeUnit ?? DEFAULT_UNITS.volume,
      heightUnit: hUnit,
    });
  }, [profile, form]);

  function switchHeightUnit(next: HeightUnit) {
    const values = form.getFieldsValue();
    if (next === "cm") {
      const feet = typeof values.heightFeet === "number" ? values.heightFeet : 0;
      const inches =
        typeof values.heightInches === "number" ? values.heightInches : 0;
      form.setFieldsValue({
        heightUnit: next,
        heightCm: feet || inches ? feetInchesToCm(feet, inches) : undefined,
      });
    } else {
      const cm = typeof values.heightCm === "number" ? values.heightCm : 0;
      const { feet, inches } = cm ? cmToFeetInches(cm) : { feet: 0, inches: 0 };
      form.setFieldsValue({
        heightUnit: next,
        heightFeet: cm ? feet : undefined,
        heightInches: cm ? inches : undefined,
      });
    }
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const values = form.getFieldsValue();

      let heightFeet =
        typeof values.heightFeet === "number" ? values.heightFeet : null;
      let heightInches =
        typeof values.heightInches === "number" ? values.heightInches : null;
      if (values.heightUnit === "cm") {
        if (typeof values.heightCm === "number" && values.heightCm > 0) {
          const converted = cmToFeetInches(values.heightCm);
          heightFeet = converted.feet;
          heightInches = converted.inches;
        } else {
          heightFeet = null;
          heightInches = null;
        }
      }

      await saveProfile(user.uid, {
        name: values.name?.trim() ? values.name.trim() : null,
        birthday: values.birthday ? values.birthday.format("YYYY-MM-DD") : null,
        heightFeet,
        heightInches,
        sex: values.sex ?? null,
        timezone: values.timezone ?? null,
        weightUnit: values.weightUnit ?? null,
        volumeUnit: values.volumeUnit ?? null,
        heightUnit: values.heightUnit ?? null,
      });
      message.success("Profile saved");
    } catch {
      message.error("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 4 }}>
        Profile
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Personal details used in reports and by anything reading your data
        through MCP.
      </Typography.Paragraph>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        onValuesChange={(changed) => {
          if (changed.heightUnit) {
            switchHeightUnit(changed.heightUnit as HeightUnit);
          }
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
            gap: 20,
            alignItems: "start",
          }}
        >
          <Card
            size="small"
            title={
              <>
                <Icon name="person" />
                Personal
              </>
            }
          >
            <Form.Item name="name" label="Name" style={ITEM_STYLE}>
              <Input placeholder="Your name" />
            </Form.Item>

            <Form.Item name="birthday" label="Birthday" style={ITEM_STYLE}>
              <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
            </Form.Item>

            <Form.Item label="Height" style={ITEM_STYLE}>
              {heightUnit === "cm" ? (
                <Form.Item name="heightCm" noStyle>
                  <InputNumber
                    placeholder="Centimetres"
                    min={0}
                    max={280}
                    suffix="cm"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              ) : (
                <Flex gap={8} align="center">
                  <Form.Item name="heightFeet" noStyle>
                    <InputNumber
                      placeholder="Feet"
                      min={0}
                      max={9}
                      style={{ flex: 1 }}
                    />
                  </Form.Item>
                  <Form.Item name="heightInches" noStyle>
                    <InputNumber
                      placeholder="Inches"
                      min={0}
                      max={11}
                      style={{ flex: 1 }}
                    />
                  </Form.Item>
                </Flex>
              )}
            </Form.Item>

            <Form.Item name="sex" label="Biological sex" style={ITEM_STYLE}>
              <Select placeholder="Select" options={SEX_OPTIONS} allowClear />
            </Form.Item>

            <Form.Item
              name="timezone"
              label="Timezone"
              style={{ marginBottom: 0 }}
            >
              {tzOptions.length > 0 ? (
                <Select
                  showSearch
                  placeholder="Select timezone"
                  options={tzOptions.map((tz) => ({ label: tz, value: tz }))}
                  allowClear
                />
              ) : (
                <Input placeholder="e.g. Asia/Manila" />
              )}
            </Form.Item>
          </Card>

          <Card
            size="small"
            title={
              <>
                <Icon name="presets" />
                Units
              </>
            }
          >
            <Typography.Paragraph
              type="secondary"
              style={{ fontSize: 13, marginTop: 0, marginBottom: 16 }}
            >
              Applied everywhere weight, water, and height are shown.
            </Typography.Paragraph>

            <Form.Item name="weightUnit" label="Weight" style={ITEM_STYLE}>
              <Segmented options={WEIGHT_UNIT_OPTIONS} />
            </Form.Item>

            <Form.Item name="volumeUnit" label="Water" style={ITEM_STYLE}>
              <Segmented options={VOLUME_UNIT_OPTIONS} />
            </Form.Item>

            <Form.Item
              name="heightUnit"
              label="Height"
              style={{ marginBottom: 0 }}
            >
              <Segmented options={HEIGHT_UNIT_OPTIONS} />
            </Form.Item>
          </Card>
        </div>

        <Flex gap={12} wrap style={{ marginTop: 20 }}>
          <Button type="primary" htmlType="submit" loading={saving}>
            Save changes
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => setReportOpen(true)}
          >
            Download report
          </Button>
        </Flex>
      </Form>

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}
