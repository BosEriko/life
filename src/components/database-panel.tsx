"use client";

import { useEffect, useState } from "react";
import {
  App,
  Button,
  Card,
  Checkbox,
  Flex,
  Input,
  InputNumber,
  Segmented,
  Select,
  Spin,
  theme,
  Typography,
} from "antd";
import { DatabaseOutlined, DeleteOutlined } from "@ant-design/icons";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import {
  addFood,
  deleteFood,
  DRINK_CATEGORIES,
  FOOD_CATEGORIES,
  watchFoods,
  type FoodItem,
  type FoodKind,
} from "@/models/foods";

const KIND_OPTIONS = [
  { label: "Food", value: "food" },
  { label: "Drink", value: "drink" },
];

function summaryLine(item: FoodItem): string {
  const parts: string[] = [];
  if (item.category) parts.push(item.category);
  if (item.calories != null) parts.push(`${item.calories.toLocaleString()} kcal`);
  if (item.sodium != null) parts.push(`${item.sodium.toLocaleString()} mg`);
  if (item.amount) parts.push(item.amount);
  return parts.join(" · ");
}

export function DatabasePanel() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();

  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [name, setName] = useState("");
  const [kind, setKind] = useState<FoodKind>("food");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [junk, setJunk] = useState(false);
  const [calories, setCalories] = useState<number | null>(null);
  const [sodium, setSodium] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    return watchFoods(
      (next) => {
        setFoods(next);
        setLoaded(true);
      },
      () => setLoaded(true),
    );
  }, [user]);

  const categories = kind === "food" ? FOOD_CATEGORIES : DRINK_CATEGORIES;
  const canAdd = name.trim().length > 0;

  function changeKind(next: FoodKind) {
    setKind(next);
    setCategory(undefined);
  }

  async function handleAdd() {
    if (!user || !canAdd) return;
    setBusy(true);
    try {
      await addFood(user.uid, {
        name: name.trim(),
        kind,
        category: category ?? "",
        junk,
        calories,
        sodium,
        amount: amount.trim() ? amount.trim() : null,
      });
      setName("");
      setJunk(false);
      setCalories(null);
      setSodium(null);
      setAmount("");
    } catch {
      message.error("Could not add item.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!user) return;
    try {
      await deleteFood(id);
    } catch {
      message.error("Could not delete item.");
    }
  }

  return (
    <div>
      <Flex align="center" gap={10} style={{ marginBottom: 4 }}>
        <DatabaseOutlined style={{ color: token.colorPrimary, fontSize: 22 }} />
        <Typography.Title level={3} style={{ margin: 0 }}>
          Database
        </Typography.Title>
      </Flex>
      <Typography.Paragraph type="secondary" style={{ margin: "0 0 24px" }}>
        A shared directory of foods and drinks — name, calories, sodium, and the
        rest. Everyone can add to it, and entries show up when you log food.
      </Typography.Paragraph>

      <Flex vertical gap={24}>
        <Card size="small" title="Add item">
          <Flex vertical gap={12}>
            <Flex gap={8} wrap>
              <Input
                placeholder="Name (e.g. Chicken adobo)"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onPressEnter={handleAdd}
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
              onPressEnter={handleAdd}
            />

            <Button
              type="primary"
              loading={busy}
              disabled={!canAdd}
              onClick={handleAdd}
              style={{ alignSelf: "flex-start" }}
            >
              Add item
            </Button>
          </Flex>
        </Card>

        <Card size="small" title={`Items · ${foods.length}`}>
          {!loaded ? (
            <Spin />
          ) : foods.length === 0 ? (
            <Typography.Text type="secondary">
              No items yet. Add one above.
            </Typography.Text>
          ) : (
            <Flex vertical>
              {foods.map((item) => {
                const summary = summaryLine(item);
                return (
                  <Flex
                    key={item.id}
                    align="flex-start"
                    justify="space-between"
                    gap={8}
                    style={{
                      padding: "10px 0",
                      borderTop: `1px solid ${token.colorBorderSecondary}`,
                    }}
                  >
                    <Flex vertical gap={2} style={{ minWidth: 0 }}>
                      <Typography.Text>
                        <Icon name={item.kind} />
                        <Typography.Text strong>{item.name}</Typography.Text>
                        {item.junk ? (
                          <Icon
                            name="junk"
                            style={{ marginLeft: 8, marginRight: 0 }}
                          />
                        ) : null}
                      </Typography.Text>
                      {summary ? (
                        <Typography.Text
                          type="secondary"
                          style={{ fontSize: 13 }}
                        >
                          {summary}
                        </Typography.Text>
                      ) : null}
                    </Flex>
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      aria-label={`Delete ${item.name}`}
                      onClick={() => handleDelete(item.id)}
                    />
                  </Flex>
                );
              })}
            </Flex>
          )}
        </Card>
      </Flex>
    </div>
  );
}
