"use client";

import { useMemo, useState } from "react";
import {
  App,
  Button,
  Checkbox,
  DatePicker,
  Flex,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  TimePicker,
  Typography,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { relativeDate, todayKey } from "@/models/dailies";
import {
  addIntake,
  dailyIntake,
  defaultJunk,
  deleteIntake,
  DRINK_CATEGORIES,
  FOOD_CATEGORIES,
  formatIntakeTime,
  type DailyIntake,
  type IntakeEntry,
  type IntakeKind,
} from "@/models/intake";

const KIND_OPTIONS = [
  { label: "Food", value: "food" },
  { label: "Drink", value: "drink" },
];

function totalsLine(totals: DailyIntake): string {
  const parts: string[] = [];
  if (totals.calories > 0) parts.push(`${totals.calories} kcal`);
  if (totals.sodium > 0) parts.push(`${totals.sodium} mg sodium`);
  parts.push(`${totals.count} item${totals.count === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

function detailLine(entry: IntakeEntry): string {
  const parts: string[] = [formatIntakeTime(entry.date, entry.time)];
  if (entry.calories != null) parts.push(`${entry.calories} kcal`);
  if (entry.sodium != null) parts.push(`${entry.sodium} mg`);
  if (entry.amount) parts.push(entry.amount);
  return parts.join(" · ");
}

export function IntakeModal({
  open,
  onClose,
  entries,
}: {
  open: boolean;
  onClose: () => void;
  entries: IntakeEntry[];
}) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [date, setDate] = useState<Dayjs>(() => dayjs());
  const [time, setTime] = useState<Dayjs>(() => dayjs());
  const [kind, setKind] = useState<IntakeKind>("food");
  const [category, setCategory] = useState<string | null>(null);
  const [junk, setJunk] = useState(false);
  const [calories, setCalories] = useState<number | null>(null);
  const [sodium, setSodium] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const dateKey = date.format("YYYY-MM-DD");
  const canAdd = category != null;
  const categoryOptions = (
    kind === "food" ? FOOD_CATEGORIES : DRINK_CATEGORIES
  ).map((value) => ({ label: value, value }));

  function resetEntry() {
    setTime(dayjs());
    setCategory(null);
    setJunk(false);
    setCalories(null);
    setSodium(null);
    setAmount("");
    setNote("");
  }

  function handleClose() {
    setDate(dayjs());
    setKind("food");
    resetEntry();
    onClose();
  }

  function changeKind(next: IntakeKind) {
    setKind(next);
    setCategory(null);
    setJunk(false);
  }

  function changeCategory(next: string) {
    setCategory(next);
    setJunk(defaultJunk(next));
  }

  const dayEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.date === dateKey)
        .sort((a, b) => b.time.localeCompare(a.time)),
    [entries, dateKey],
  );

  const totals = useMemo(
    () => dailyIntake(dayEntries).get(dateKey) ?? null,
    [dayEntries, dateKey],
  );

  function handleAdd() {
    if (!user || category == null) return;
    addIntake(user.uid, {
      date: dateKey,
      time: time.format("HH:mm"),
      kind,
      category,
      junk,
      calories: typeof calories === "number" ? calories : null,
      sodium: typeof sodium === "number" ? sodium : null,
      amount: amount.trim() ? amount.trim() : null,
      note: note.trim() ? note.trim() : null,
    }).catch(() => message.error("Could not add entry."));
    resetEntry();
  }

  function handleDelete(id: string) {
    if (!user) return;
    deleteIntake(user.uid, id).catch(() =>
      message.error("Could not delete entry."),
    );
  }

  return (
    <Modal
      open={open}
      centered
      title={
        <>
          <Icon name="intake" />
          Food &amp; drink
        </>
      }
      footer={null}
      onCancel={handleClose}
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        Log what you eat and drink. Mark it junk to count toward the habit
        graph.
      </Typography.Paragraph>

      <Flex vertical gap={10} style={{ marginBottom: 20 }}>
        <Flex gap={8} wrap>
          <DatePicker
            value={date}
            onChange={(value) => value && setDate(value)}
            format="YYYY-MM-DD"
            allowClear={false}
            inputReadOnly
            maxDate={dayjs(todayKey())}
            style={{ flex: 1, minWidth: 150 }}
          />
          <TimePicker
            value={time}
            onChange={(value) => value && setTime(value)}
            format="HH:mm"
            needConfirm={false}
            allowClear={false}
            style={{ width: 110 }}
          />
        </Flex>

        <Segmented
          block
          options={KIND_OPTIONS}
          value={kind}
          onChange={(value) => changeKind(value as IntakeKind)}
        />

        <Select
          placeholder={
            kind === "food" ? "What kind of food?" : "What kind of drink?"
          }
          options={categoryOptions}
          value={category}
          onChange={changeCategory}
          style={{ width: "100%" }}
        />

        <Flex gap={8} wrap>
          <InputNumber
            placeholder="Calories"
            min={0}
            precision={0}
            suffix="kcal"
            value={calories}
            onChange={setCalories}
            style={{ flex: 1, minWidth: 130 }}
          />
          <InputNumber
            placeholder="Sodium"
            min={0}
            precision={0}
            suffix="mg"
            value={sodium}
            onChange={setSodium}
            style={{ flex: 1, minWidth: 130 }}
          />
        </Flex>

        <Flex gap={12} wrap align="center">
          <Input
            placeholder="Amount (e.g. 1.5 servings)"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            style={{ flex: 1, minWidth: 160 }}
          />
          <Checkbox
            checked={junk}
            onChange={(event) => setJunk(event.target.checked)}
          >
            Junk
          </Checkbox>
        </Flex>

        <Input
          placeholder="Note (optional)"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />

        <Button type="primary" disabled={!canAdd} onClick={handleAdd}>
          Add
        </Button>
      </Flex>

      <Flex align="center" justify="space-between" gap={8}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          {relativeDate(dateKey)}
        </Typography.Title>
        {totals && totals.count > 0 ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {totalsLine(totals)}
          </Typography.Text>
        ) : null}
      </Flex>

      {dayEntries.length === 0 ? (
        <Typography.Text type="secondary">
          Nothing logged this day.
        </Typography.Text>
      ) : (
        <Flex vertical>
          {dayEntries.map((entry) => (
            <Flex
              key={entry.id}
              align="flex-start"
              justify="space-between"
              gap={8}
              style={{ padding: "8px 0" }}
            >
              <Flex vertical gap={2}>
                <Typography.Text>
                  <Typography.Text strong>{entry.category}</Typography.Text>
                  {entry.junk ? (
                    <Typography.Text type="warning"> · junk</Typography.Text>
                  ) : null}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {detailLine(entry)}
                </Typography.Text>
                {entry.note ? (
                  <Typography.Text
                    type="secondary"
                    style={{ fontSize: 12, fontStyle: "italic" }}
                  >
                    {entry.note}
                  </Typography.Text>
                ) : null}
              </Flex>
              <Popconfirm
                title="Delete this entry?"
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={() => handleDelete(entry.id)}
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
            </Flex>
          ))}
        </Flex>
      )}
    </Modal>
  );
}
