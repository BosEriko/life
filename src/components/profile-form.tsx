"use client";

import { useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  DatePicker,
  Flex,
  Form,
  Input,
  InputNumber,
  Select,
  Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "@/components/auth-provider";
import {
  EMPTY_PROFILE,
  saveProfile,
  watchProfile,
  type Profile,
  type Sex,
} from "@/models/profile";

type FormShape = {
  name?: string;
  birthday?: Dayjs;
  heightFeet?: number;
  heightInches?: number;
  sex?: Sex;
  timezone?: string;
};

const SEX_OPTIONS: { label: string; value: Sex }[] = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Prefer not to say", value: "unspecified" },
];

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
  const tzOptions = useMemo(() => timezoneOptions(), []);

  useEffect(() => {
    if (!user) return;
    return watchProfile(user.uid, setProfile, () => {});
  }, [user]);

  useEffect(() => {
    form.setFieldsValue({
      name: profile.name ?? undefined,
      birthday: profile.birthday ? dayjs(profile.birthday) : undefined,
      heightFeet: profile.heightFeet ?? undefined,
      heightInches: profile.heightInches ?? undefined,
      sex: profile.sex ?? undefined,
      timezone: profile.timezone ?? detectedTimezone(),
    });
  }, [profile, form]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const values = form.getFieldsValue();
      await saveProfile(user.uid, {
        name: values.name?.trim() ? values.name.trim() : null,
        birthday: values.birthday ? values.birthday.format("YYYY-MM-DD") : null,
        heightFeet:
          typeof values.heightFeet === "number" ? values.heightFeet : null,
        heightInches:
          typeof values.heightInches === "number" ? values.heightInches : null,
        sex: values.sex ?? null,
        timezone: values.timezone ?? null,
      });
      message.success("Profile saved");
    } catch {
      message.error("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        Profile
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Personal details used in reports and by anything reading your data
        through MCP.
      </Typography.Paragraph>
      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Form.Item name="name" label="Name">
          <Input placeholder="Your name" />
        </Form.Item>

        <Form.Item name="birthday" label="Birthday">
          <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
        </Form.Item>

        <Form.Item label="Height">
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
        </Form.Item>

        <Form.Item name="sex" label="Biological sex">
          <Select placeholder="Select" options={SEX_OPTIONS} allowClear />
        </Form.Item>

        <Form.Item name="timezone" label="Timezone">
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

        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" loading={saving}>
            Save
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
