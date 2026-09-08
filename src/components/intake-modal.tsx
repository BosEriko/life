"use client";

import { useMemo, useRef, useState, type ComponentRef } from "react";
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
import { useHealthHistory } from "@/components/use-health-history";
import { useDayIntake } from "@/components/use-day-records";
import { mergeById } from "@/lib/merge-records";
import { isOutsideEatingWindow } from "@/lib/eating-window";
import { Icon } from "@/components/icon";
import { IdealTip } from "@/components/ideal-tip";
import { useUnitsContext } from "@/components/units-provider";
import { postActivityIfShared } from "@/models/community";
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
  const {
    intake: intakeWindow,
    ideals,
    cutoff,
    communityPrefs,
  } = useHealthData();
  const { profile } = useUnitsContext();
  const history = useHealthHistory(open, cutoff);
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
  const nameRef = useRef<ComponentRef<typeof AutoComplete>>(null);

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

  const nameHistory = useMemo(
    () => mergeById(intakeWindow, history.intake),
    [intakeWindow, history.intake],
  );

  const nameOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: { value: string }[] = [];
    for (const entry of nameHistory) {
      const trimmed = entry.name?.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ value: trimmed });
    }
    return out;
  }, [nameHistory]);
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

    postActivityIfShared(
      user.uid,
      communityPrefs,
      profile.name,
      "food",
      `logged ${nm}`,
    );
    if (cal != null) {
      postActivityIfShared(
        user.uid,
        communityPrefs,
        profile.name,
        "calories",
        `ate ${cal.toLocaleString()} kcal`,
      );
    }
    if (sod != null) {
      postActivityIfShared(
        user.uid,
        communityPrefs,
        profile.name,
        "sodium",
        `${sod.toLocaleString()} mg sodium`,
      );
    }

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

        <Select
          placeholder={
            kind === "food" ? "What kind of food?" : "What kind of drink?"
          }
          options={categoryOptions}
          value={category}
          onChange={setCategory}
          style={{ width: "100%" }}
        />

        <AutoComplete
          ref={nameRef}
          options={nameOptions}
          value={name}
          onChange={(value) => setName(value)}
          filterOption={(input, option) =>
            (option?.value ?? "")
              .toLowerCase()
              .includes(input.trim().toLowerCase())
          }
          placeholder={
            kind === "food" ? "Name (e.g. Chicken adobo)" : "Name (e.g. Iced latte)"
          }
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
                  <span
                    style={{
                      color: isOutsideEatingWindow(entry.time, eatWindow)
                        ? token.colorError
                        : undefined,
                    }}
                  >
                    {formatIntakeTime(entry.date, entry.time)}
                  </span>
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
          ))}
        </Flex>
      )}
    </Modal>
  );
}
