"use client";

import { useState } from "react";
import {
  App,
  Checkbox,
  Flex,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Select,
} from "antd";
import {
  DRINK_CATEGORIES,
  FOOD_CATEGORIES,
  updateFood,
  type FoodItem,
  type FoodKind,
} from "@/models/foods";

const KIND_OPTIONS = [
  { label: "Food", value: "food" },
  { label: "Drink", value: "drink" },
];

export function FoodEditModal({
  item,
  onClose,
}: {
  item: FoodItem;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const [name, setName] = useState(item.name);
  const [kind, setKind] = useState<FoodKind>(item.kind);
  const [category, setCategory] = useState<string | undefined>(
    item.category || undefined,
  );
  const [junk, setJunk] = useState(item.junk);
  const [calories, setCalories] = useState<number | null>(item.calories);
  const [sodium, setSodium] = useState<number | null>(item.sodium);
  const [amount, setAmount] = useState(item.amount ?? "");

  const categories = kind === "food" ? FOOD_CATEGORIES : DRINK_CATEGORIES;
  const canSave = name.trim().length > 0;

  function changeKind(next: FoodKind) {
    setKind(next);
    setCategory(undefined);
  }

  function handleSave() {
    if (!canSave) return;
    updateFood(item.id, {
      name: name.trim(),
      kind,
      category: category ?? "",
      junk,
      calories,
      sodium,
      amount: amount.trim() ? amount.trim() : null,
    }).catch(() =>
      message.error("Could not save. You may not have permission."),
    );
    onClose();
  }

  return (
    <Modal
      open
      centered
      title="Edit item"
      okText="Save"
      okButtonProps={{ disabled: !canSave }}
      onOk={handleSave}
      onCancel={onClose}
    >
      <Flex vertical gap={12} style={{ marginTop: 8 }}>
        <Flex gap={8} wrap>
          <Input
            placeholder="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onPressEnter={handleSave}
            style={{ flex: 1, minWidth: 200 }}
          />
          <Segmented
            options={KIND_OPTIONS}
            value={kind}
            onChange={(value) => changeKind(value as FoodKind)}
          />
        </Flex>

        <Flex gap={8} wrap align="center">
          <Select
            placeholder="Category"
            value={category}
            onChange={(value) => setCategory(value)}
            options={categories.map((label) => ({ label, value: label }))}
            allowClear
            style={{ flex: 1, minWidth: 200 }}
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
            onChange={(value) => setCalories(value)}
            style={{ flex: 1, minWidth: 140 }}
          />
          <InputNumber
            placeholder="Sodium"
            min={0}
            precision={0}
            suffix="mg"
            value={sodium}
            onChange={(value) => setSodium(value)}
            style={{ flex: 1, minWidth: 140 }}
          />
        </Flex>

        <Input
          placeholder="Serving — e.g. 1 bowl, 330 ml (optional)"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          onPressEnter={handleSave}
        />
      </Flex>
    </Modal>
  );
}
