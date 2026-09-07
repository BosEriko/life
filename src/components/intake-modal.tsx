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
  Segmented,
  Select,
  theme,
  TimePicker,
  Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Icon } from "@/components/icon";
import { Tip } from "@/components/tip";
import { requestIntakeEnrichment } from "@/models/claude-integration";
import { relativeDate, todayKey } from "@/models/dailies";
import { evaluateIdeal, rangeText, type Ideals } from "@/models/ideals";
import {
  addIntake,
  dailyIntake,
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
  ideals,
}: {
  open: boolean;
  onClose: () => void;
  entries: IntakeEntry[];
  ideals: Ideals;
}) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [date, setDate] = useState<Dayjs>(() => dayjs());
  const [time, setTime] = useState<Dayjs>(() => dayjs());
  const [kind, setKind] = useState<IntakeKind>("food");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [junk, setJunk] = useState(false);
  const [calories, setCalories] = useState<number | null>(null);
  const [sodium, setSodium] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const dateKey = date.format("YYYY-MM-DD");
  const canAdd = category != null && name.trim().length > 0;
  const categoryOptions = (
    kind === "food" ? FOOD_CATEGORIES : DRINK_CATEGORIES
  ).map((value) => ({ label: value, value }));

  function resetEntry() {
    setTime(dayjs());
    setName("");
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
  const calorieStatus = evaluateIdeal(
    dayEntries.some((entry) => entry.calories != null)
      ? (totals?.calories ?? null)
      : null,
    ideals.calories,
  );
  const sodiumStatus = evaluateIdeal(
    dayEntries.some((entry) => entry.sodium != null)
      ? (totals?.sodium ?? null)
      : null,
    ideals.sodium,
  );
  const totalTip = [
    calorieStatus === "low" || calorieStatus === "high"
      ? `Calories ${calorieStatus === "high" ? "above" : "below"} your ideal (${rangeText(ideals.calories)} kcal).`
      : null,
    sodiumStatus === "low" || sodiumStatus === "high"
      ? `Sodium ${sodiumStatus === "high" ? "above" : "below"} your ideal (${rangeText(ideals.sodium)} mg).`
      : null,
  ]
    .filter((part): part is string => part != null)
    .join(" ");

  function handleAdd() {
    if (!user || category == null || name.trim().length === 0) return;
    const nm = name.trim();
    const cal = typeof calories === "number" ? calories : null;
    const sod = typeof sodium === "number" ? sodium : null;
    const amt = amount.trim() ? amount.trim() : null;
    const nt = note.trim() ? note.trim() : null;

    const { id, done } = addIntake(user.uid, {
      date: dateKey,
      time: time.format("HH:mm"),
      kind,
      name: nm,
      category,
      junk,
      calories: cal,
      sodium: sod,
      amount: amt,
      note: nt,
    });
    done.catch(() => message.error("Could not add entry."));

    const missing: ("calories" | "sodium")[] = [];
    if (cal == null) missing.push("calories");
    if (sod == null) missing.push("sodium");
    if (
      missing.length > 0 &&
      typeof navigator !== "undefined" &&
      navigator.onLine
    ) {
      requestIntakeEnrichment(user, {
        id,
        kind,
        name: nm,
        category,
        amount: amt,
        note: nt,
        calories: cal,
        sodium: sod,
        fields: missing,
      }).catch(() => {});
    }

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
          onChange={setCategory}
          style={{ width: "100%" }}
        />

        <Input
          placeholder={
            kind === "food" ? "Name (e.g. Chicken adobo)" : "Name (e.g. Iced latte)"
          }
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

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
          <Tip title={totalTip || undefined}>
            <Typography.Text
              type={totalTip ? undefined : "secondary"}
              style={{
                fontSize: 12,
                cursor: totalTip ? "help" : undefined,
                color: totalTip ? token.colorError : undefined,
              }}
            >
              {totalsLine(totals)}
            </Typography.Text>
          </Tip>
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
                  <Typography.Text strong>
                    {entry.name || entry.category}
                  </Typography.Text>
                  {entry.name && entry.category ? (
                    <Typography.Text type="secondary">
                      {" "}
                      · {entry.category}
                    </Typography.Text>
                  ) : null}
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
              <ConfirmDeleteButton
                ariaLabel="Delete entry"
                onConfirm={() => handleDelete(entry.id)}
              />
            </Flex>
          ))}
        </Flex>
      )}
    </Modal>
  );
}
