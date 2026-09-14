"use client";

import { useEffect, useMemo, useState } from "react";
import {
  App,
  AutoComplete,
  Button,
  Card,
  Flex,
  Input,
  Typography,
  theme,
} from "antd";
import { useAuth } from "@/components/auth-provider";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import {
  addMedicalTag,
  COMMON_CATEGORIES,
  deleteMedicalTag,
  watchMedicalTags,
  type MedicalTag,
} from "@/models/medical-tags";

export function MedicalTagsCard() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();

  const [tags, setTags] = useState<MedicalTag[]>([]);
  const [category, setCategory] = useState("");
  const [label, setLabel] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    return watchMedicalTags(user.uid, setTags, () => {});
  }, [user]);

  const categoryOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: { value: string }[] = [];
    for (const value of [...COMMON_CATEGORIES, ...tags.map((tag) => tag.category)]) {
      const key = value.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({ value });
    }
    return out;
  }, [tags]);

  const canAdd = category.trim().length > 0 && label.trim().length > 0;

  function handleAdd() {
    if (!user || !canAdd) return;
    addMedicalTag(user.uid, category.trim(), label.trim()).catch(() =>
      message.error("Could not add that."),
    );
    setCategory("");
    setLabel("");
  }

  function handleDelete(id: string) {
    if (!user) return;
    setDeletingId(id);
    deleteMedicalTag(user.uid, id)
      .catch(() => message.error("Could not delete that."))
      .finally(() => setDeletingId(null));
  }

  return (
    <Card size="small" title="Medical Information">
      <Typography.Paragraph
        type="secondary"
        style={{ fontSize: 13, marginTop: 0, marginBottom: 16 }}
      >
        Allergies, medications, conditions — anything worth having on record.
        Exposed to anything reading your data through MCP.
      </Typography.Paragraph>

      <Flex gap={8} wrap style={{ marginBottom: 12 }}>
        <AutoComplete
          options={categoryOptions}
          value={category}
          onChange={setCategory}
          filterOption={(input, option) =>
            (option?.value ?? "")
              .toLowerCase()
              .includes(input.trim().toLowerCase())
          }
          placeholder="Category (e.g. Allergy)"
          style={{ flex: 1, minWidth: 150 }}
        />
        <Input
          placeholder="Label (e.g. Peanuts)"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          onPressEnter={handleAdd}
          style={{ flex: 1, minWidth: 150 }}
        />
        <Button type="primary" disabled={!canAdd} onClick={handleAdd}>
          Add
        </Button>
      </Flex>

      {tags.length === 0 ? (
        <Typography.Text type="secondary">
          Nothing on record yet.
        </Typography.Text>
      ) : (
        <Flex vertical>
          {tags.map((tag, index) => (
            <Flex
              key={tag.id}
              align="center"
              justify="space-between"
              gap={8}
              style={{
                padding: "8px 0",
                borderTop:
                  index === 0
                    ? undefined
                    : `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              <Typography.Text>
                <Typography.Text type="secondary">
                  {tag.category}:
                </Typography.Text>{" "}
                {tag.label}
              </Typography.Text>
              <ConfirmDeleteButton
                ariaLabel={`Delete ${tag.label}`}
                loading={deletingId === tag.id}
                onConfirm={() => handleDelete(tag.id)}
              />
            </Flex>
          ))}
        </Flex>
      )}
    </Card>
  );
}
