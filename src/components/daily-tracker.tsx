"use client";

import { useEffect, useState } from "react";
import {
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Flex,
  Form,
  InputNumber,
  List,
  Spin,
  Statistic,
  Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "@/components/auth-provider";
import {
  saveDaily,
  todayKey,
  watchDailies,
  type DailyEntry,
  type DailyInput,
} from "@/lib/dailies";

type FormValues = {
  date: Dayjs;
  weight?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
};

function relativeDate(key: string): string {
  const diffDays = dayjs(todayKey()).diff(dayjs(key), "day");
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return dayjs(key).format("dddd");
  return dayjs(key).format("MMM D");
}

export function DailyTracker() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    return watchDailies(
      user.uid,
      (next) => {
        setEntries(next);
        setLoaded(true);
      },
      () => {
        message.error("Could not load your entries.");
        setLoaded(true);
      },
    );
  }, [user, message]);

  const latestWeight = entries.find((entry) => entry.weight != null);
  const latestBp = entries.find(
    (entry) => entry.systolic != null && entry.diastolic != null,
  );

  async function onFinish(values: FormValues) {
    if (!user) return;

    const input: DailyInput = {};
    if (values.weight != null) input.weight = values.weight;

    const hasSystolic = values.systolic != null;
    const hasDiastolic = values.diastolic != null;
    if (hasSystolic || hasDiastolic) {
      if (!hasSystolic || !hasDiastolic) {
        message.error("Enter both blood pressure numbers.");
        return;
      }
      input.systolic = values.systolic as number;
      input.diastolic = values.diastolic as number;
    }

    if (Object.keys(input).length === 0) {
      message.error("Enter at least one value.");
      return;
    }

    setSaving(true);
    try {
      await saveDaily(user.uid, values.date.format("YYYY-MM-DD"), input);
      form.resetFields(["weight", "systolic", "diastolic"]);
      message.success("Saved");
    } catch {
      message.error("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Flex vertical gap={24}>
      <Flex gap={12}>
        <Card size="small" style={{ flex: 1 }}>
          <Statistic
            title="Weight"
            value={latestWeight?.weight ?? "—"}
            suffix={latestWeight ? "kg" : undefined}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {latestWeight ? relativeDate(latestWeight.date) : "No data"}
          </Typography.Text>
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <Statistic
            title="Blood pressure"
            value={
              latestBp ? `${latestBp.systolic}/${latestBp.diastolic}` : "—"
            }
            suffix={latestBp ? "mmHg" : undefined}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {latestBp ? relativeDate(latestBp.date) : "No data"}
          </Typography.Text>
        </Card>
      </Flex>

      <Card title="Log entry">
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={{ date: dayjs() }}
          onFinish={onFinish}
        >
          <Form.Item
            label="Date"
            name="date"
            rules={[{ required: true, message: "Pick a date." }]}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="YYYY-MM-DD"
              maxDate={dayjs()}
              allowClear={false}
            />
          </Form.Item>

          <Form.Item label="Weight" name="weight">
            <InputNumber
              style={{ width: "100%" }}
              min={1}
              step={0.1}
              addonAfter="kg"
              placeholder="72.5"
            />
          </Form.Item>

          <Form.Item label="Blood pressure">
            <Flex gap={8} align="center">
              <Form.Item name="systolic" noStyle>
                <InputNumber
                  style={{ flex: 1 }}
                  min={1}
                  precision={0}
                  placeholder="120"
                />
              </Form.Item>
              <span>/</span>
              <Form.Item name="diastolic" noStyle>
                <InputNumber
                  style={{ flex: 1 }}
                  min={1}
                  precision={0}
                  placeholder="80"
                />
              </Form.Item>
              <Typography.Text type="secondary">mmHg</Typography.Text>
            </Flex>
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={saving}>
            Save
          </Button>
        </Form>
      </Card>

      <div>
        <Typography.Title level={5}>Recent</Typography.Title>
        {!loaded ? (
          <Flex justify="center" style={{ padding: 24 }}>
            <Spin />
          </Flex>
        ) : entries.length === 0 ? (
          <Empty description="No entries yet." />
        ) : (
          <List
            bordered
            dataSource={entries}
            renderItem={(entry) => (
              <List.Item>
                <Typography.Text strong>
                  {relativeDate(entry.date)}
                </Typography.Text>
                <Flex gap={16}>
                  {entry.weight != null ? (
                    <Typography.Text type="secondary">
                      <Typography.Text strong>{entry.weight}</Typography.Text> kg
                    </Typography.Text>
                  ) : null}
                  {entry.systolic != null && entry.diastolic != null ? (
                    <Typography.Text type="secondary">
                      <Typography.Text strong>
                        {entry.systolic}/{entry.diastolic}
                      </Typography.Text>{" "}
                      mmHg
                    </Typography.Text>
                  ) : null}
                </Flex>
              </List.Item>
            )}
          />
        )}
      </div>
    </Flex>
  );
}
