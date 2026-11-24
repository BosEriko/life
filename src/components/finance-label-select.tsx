"use client";

import { Flex, Select, Tag } from "antd";
import { useHealthData } from "@/components/health-data-provider";
import { recordLabels, type FinanceLabel } from "@/lib/finance-labels";

export function LabelDot({ color }: { color: string }) {
  return <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, flexShrink: 0, background: color }} />;
}

export function LabelTag({ label }: { label: Pick<FinanceLabel, "name" | "color"> }) {
  return <Tag color={label.color} style={{ marginInlineEnd: 0, maxWidth: "100%", whiteSpace: "normal", overflowWrap: "anywhere" }}>{label.name}</Tag>;
}

export function LabelTags({ ids }: { ids: string[] }) {
  const { financeLabels } = useHealthData();
  const labels = recordLabels(financeLabels, ids);
  if (labels.length === 0) return null;
  return <Flex gap={4} wrap style={{ marginTop: 8 }}>{labels.map((label) => <LabelTag key={label.id} label={label} />)}</Flex>;
}

export function LabelMultiSelect({ value, onChange, ariaLabel, placeholder, disabled }: { value: string[]; onChange: (ids: string[]) => void; ariaLabel: string; placeholder?: string; disabled?: boolean }) {
  const { financeLabels } = useHealthData();
  const known = new Set(financeLabels.map((label) => label.id));
  return (
    <Select
      mode="multiple"
      aria-label={ariaLabel}
      value={value.filter((id) => known.has(id))}
      disabled={disabled}
      onChange={onChange}
      placeholder={placeholder}
      allowClear
      optionFilterProp="search"
      notFoundContent="No labels yet. Add them in Profile › Finance."
      options={financeLabels.map((label) => ({ value: label.id, search: label.name, label: <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><LabelDot color={label.color} />{label.name}</span> }))}
    />
  );
}
