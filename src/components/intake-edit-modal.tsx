"use client";

import { useState } from "react";
import {
  App,
  Checkbox,
  DatePicker,
  Flex,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Select,
  TimePicker,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { useIsIntelligent } from "@/components/use-is-intelligent";
import { enrichIntakeIfNeeded } from "@/models/claude-integration";
import { todayKey } from "@/models/dailies";
import {
  DRINK_CATEGORIES,
  FOOD_CATEGORIES,
  updateIntake,
  type IntakeEntry,
  type IntakeKind,
} from "@/models/intake";

const KIND_OPTIONS = [
  { label: "Food", value: "food" },
  { label: "Drink", value: "drink" },
];

export function IntakeEditModal({
  item,
  onClose,
}: {
  item: IntakeEntry;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const { user } = useAuth();
  const isIntelligent = useIsIntelligent();

  const [date, setDate] = useState<Dayjs>(() => dayjs(item.date));
  const [time, setTime] = useState<Dayjs>(() =>
    dayjs(`${item.date}T${item.time}`),
  );
  const [kind, setKind] = useState<IntakeKind>(item.kind);
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState<string | null>(
    item.category || null,
  );
  const [junk, setJunk] = useState(item.junk);
  const [calories, setCalories] = useState<number | null>(item.calories);
  const [sodium, setSodium] = useState<number | null>(item.sodium);
  const [amount, setAmount] = useState(item.amount ?? "");
  const [note, setNote] = useState(item.note ?? "");

  const categoryOptions = (
    kind === "food" ? FOOD_CATEGORIES : DRINK_CATEGORIES
  ).map((value) => ({ label: value, value }));
  const canSave = category != null && name.trim().length > 0;

  function changeKind(next: IntakeKind) {
    setKind(next);
    setCategory(null);
    setJunk(false);
  }

  function handleSave() {
    if (!user || category == null || name.trim().length === 0) return;
    const input = {
      date: date.format("YYYY-MM-DD"),
      time: time.format("HH:mm"),
      kind,
      name: name.trim(),
      category,
      junk,
      calories: typeof calories === "number" ? calories : null,
      sodium: typeof sodium === "number" ? sodium : null,
      amount: amount.trim() ? amount.trim() : null,
      note: note.trim() ? note.trim() : null,
    };
    updateIntake(user.uid, item.id, input)
      .then(() => {
        if (isIntelligent) {
          enrichIntakeIfNeeded(user, {
            id: item.id,
            kind: input.kind,
            name: input.name,
            category: input.category,
            amount: input.amount,
            note: input.note,
            calories: input.calories,
            sodium: input.sodium,
          });
        }
      })
      .catch(() => message.error("Could not save changes."));
    onClose();
  }

  return (
    <Modal
      open
      centered
      title="Edit entry"
      okText="Save"
      okButtonProps={{ disabled: !canSave }}
      onOk={handleSave}
      onCancel={onClose}
    >
      <Flex vertical gap={10} style={{ marginTop: 8 }}>
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

        <Input
          placeholder="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          style={{ width: "100%" }}
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
      </Flex>
    </Modal>
  );
}
