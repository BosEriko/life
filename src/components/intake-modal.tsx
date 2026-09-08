"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from "react";
import {
  App,
  AutoComplete,
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
import { useHealthData } from "@/components/health-data-provider";
import { useDayIntake } from "@/components/use-day-records";
import { eatingWindowSide } from "@/lib/eating-window";
import { Icon } from "@/components/icon";
import { IdealTip } from "@/components/ideal-tip";
import { requestIntakeEnrichment } from "@/models/claude-integration";
import { relativeDate, todayKey } from "@/models/dailies";
import { evaluateIdeal, rangeText } from "@/models/ideals";
import {
  addIntake,
  dailyIntake,
  deleteIntake,
  DRINK_CATEGORIES,
  FOOD_CATEGORIES,
  formatIntakeTime,
  type IntakeEntry,
  type IntakeKind,
} from "@/models/intake";
import { watchFoods, type FoodItem } from "@/models/foods";

const KIND_OPTIONS = [
  { label: "Food", value: "food" },
  { label: "Drink", value: "drink" },
];

function detailRest(entry: IntakeEntry): string {
  const parts: string[] = [];
  if (entry.calories != null) parts.push(`${entry.calories} kcal`);
  if (entry.sodium != null) parts.push(`${entry.sodium} mg`);
  if (entry.amount) parts.push(entry.amount);
  return parts.length > 0 ? ` · ${parts.join(" · ")}` : "";
}

function foodSummary(food: FoodItem): string {
  const parts: string[] = [];
  if (food.category) parts.push(food.category);
  if (food.calories != null) parts.push(`${food.calories} kcal`);
  if (food.sodium != null) parts.push(`${food.sodium} mg`);
  if (food.amount) parts.push(food.amount);
  return parts.join(" · ");
}

export function IntakeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { ideals } = useHealthData();
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
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const nameRef = useRef<ComponentRef<typeof AutoComplete>>(null);

  useEffect(() => {
    if (!user || !open) return;
    return watchFoods(setFoods, () => {});
  }, [user, open]);

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

  const intakeRows = useDayIntake(dateKey, open);
  const dayEntries = useMemo(
    () => [...intakeRows].sort((a, b) => b.time.localeCompare(a.time)),
    [intakeRows],
  );

  const totals = useMemo(
    () => dailyIntake(dayEntries).get(dateKey) ?? null,
    [dayEntries, dateKey],
  );

  const nameOptions = useMemo(() => {
    const byKey = new Map<string, { value: string; label: ReactNode }>();
    const ordered = [...foods].sort((a, b) => {
      const aMine = a.addedBy === user?.uid ? 0 : 1;
      const bMine = b.addedBy === user?.uid ? 0 : 1;
      return aMine - bMine;
    });
    for (const food of ordered) {
      const trimmed = food.name?.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (byKey.has(key)) continue;
      const summary = foodSummary(food);
      byKey.set(key, {
        value: trimmed,
        label: (
          <Flex justify="space-between" gap={8}>
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {trimmed}
            </span>
            {summary ? (
              <span
                style={{
                  color: token.colorTextTertiary,
                  fontSize: 12,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {summary}
              </span>
            ) : null}
          </Flex>
        ),
      });
    }
    return [...byKey.values()];
  }, [foods, token, user?.uid]);

  function handleNameSelect(value: string) {
    setName(value);
    const food = foods.find(
      (item) => item.name.trim().toLowerCase() === value.trim().toLowerCase(),
    );
    if (!food) return;
    setKind(food.kind);
    setCategory(food.category ? food.category : null);
    setJunk(food.junk);
    setCalories(food.calories);
    setSodium(food.sodium);
    setAmount(food.amount ?? "");
  }
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
  const calorieTip =
    calorieStatus === "low" || calorieStatus === "high"
      ? `Calories ${calorieStatus === "high" ? "above" : "below"} your ideal (${rangeText(
          ideals.calories,
        )} kcal)`
      : undefined;
  const sodiumTip =
    sodiumStatus === "low" || sodiumStatus === "high"
      ? `Sodium ${sodiumStatus === "high" ? "above" : "below"} your ideal (${rangeText(
          ideals.sodium,
        )} mg)`
      : undefined;
  const eatWindow = ideals.eatingWindow;
  const eatWindowLabel =
    eatWindow.start && eatWindow.end
      ? `${dayjs(`2000-01-01T${eatWindow.start}`).format("h:mm A")}–${dayjs(
          `2000-01-01T${eatWindow.end}`,
        ).format("h:mm A")}`
      : "";

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
      afterOpenChange={(opened) => {
        if (opened) nameRef.current?.focus();
      }}
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

        <AutoComplete
          ref={nameRef}
          options={nameOptions}
          value={name}
          onChange={(value) => setName(value)}
          onSelect={handleNameSelect}
          filterOption={(input, option) =>
            (option?.value ?? "")
              .toLowerCase()
              .includes(input.trim().toLowerCase())
          }
          placeholder={
            kind === "food"
              ? "Name (e.g. Chicken adobo)"
              : "Name (e.g. Iced latte)"
          }
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
            {totals.calories > 0 ? (
              <>
                <IdealTip
                  isAbove={calorieStatus === "high"}
                  isBelow={calorieStatus === "low"}
                  message={calorieTip}
                >
                  <Typography.Text
                    type="secondary"
                    style={{
                      fontSize: 12,
                      cursor: calorieTip ? "help" : undefined,
                      color: calorieTip ? token.colorError : undefined,
                    }}
                  >
                    {totals.calories} kcal
                  </Typography.Text>
                </IdealTip>
                {" · "}
              </>
            ) : null}
            {totals.sodium > 0 ? (
              <>
                <IdealTip
                  isAbove={sodiumStatus === "high"}
                  isBelow={sodiumStatus === "low"}
                  message={sodiumTip}
                >
                  <Typography.Text
                    type="secondary"
                    style={{
                      fontSize: 12,
                      cursor: sodiumTip ? "help" : undefined,
                      color: sodiumTip ? token.colorError : undefined,
                    }}
                  >
                    {totals.sodium} mg sodium
                  </Typography.Text>
                </IdealTip>
                {" · "}
              </>
            ) : null}
            {totals.count} item{totals.count === 1 ? "" : "s"}
          </Typography.Text>
        ) : null}
      </Flex>

      {dayEntries.length === 0 ? (
        <Typography.Text type="secondary">
          Nothing logged this day.
        </Typography.Text>
      ) : (
        <Flex vertical>
          {dayEntries.map((entry) => {
            const windowSide = eatingWindowSide(entry.time, eatWindow);
            return (
              <Flex
                key={entry.id}
                align="flex-start"
                justify="space-between"
                gap={8}
                style={{ padding: "8px 0" }}
              >
                <Flex vertical gap={2}>
                  <Typography.Text>
                    <Icon
                      name={entry.kind === "drink" ? "drink" : "food"}
                      style={{ marginRight: 6 }}
                    />
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
                      <Icon
                        name="junk"
                        style={{
                          marginRight: 0,
                          marginLeft: 6,
                          color: token.colorWarning,
                          opacity: 1,
                        }}
                      />
                    ) : null}
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    <IdealTip
                      isAbove={windowSide === "after"}
                      isBelow={windowSide === "before"}
                      message={
                        windowSide
                          ? `Logged ${windowSide} your eating window${
                              eatWindowLabel ? ` (${eatWindowLabel})` : ""
                            }`
                          : undefined
                      }
                    >
                      <span
                        style={{
                          color: windowSide ? token.colorError : undefined,
                          cursor: windowSide ? "help" : undefined,
                        }}
                      >
                        {formatIntakeTime(entry.date, entry.time)}
                      </span>
                    </IdealTip>
                    {detailRest(entry)}
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
            );
          })}
        </Flex>
      )}
    </Modal>
  );
}
