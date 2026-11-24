"use client";

import { Select } from "antd";
import type { FinanceCategory } from "@/lib/finance-categories";
import { useHealthData } from "@/components/health-data-provider";
import { CategoryBadge } from "@/components/finance-category-icon";
import { categoryTree, DELETED_CATEGORY_ID, mainCategory, resolveCategory } from "@/lib/finance-categories";

function categoryOptions(categories: FinanceCategory[], includeDeleted: boolean) {
  return categoryTree(categories).filter(({ category }) => category.id !== DELETED_CATEGORY_ID || includeDeleted).map(({ category, depth }) => ({
    value: category.id,
    depth,
    search: depth ? `${mainCategory(categories, category).name} ${category.name}` : category.name,
    disabled: category.id === DELETED_CATEGORY_ID,
    label: (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <CategoryBadge category={category} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{category.name}</span>
      </span>
    ),
  }));
}

const renderOption = (option: { label?: React.ReactNode; data: { depth?: number } }) => <div style={{ paddingLeft: option.data.depth ? 24 : 0, fontWeight: option.data.depth ? undefined : 600 }}>{option.label}</div>;

export function CategoryMultiSelect({ value, onChange, ariaLabel, placeholder }: { value: string[]; onChange: (ids: string[]) => void; ariaLabel: string; placeholder?: string }) {
  const { financeCategories: categories } = useHealthData();
  const known = new Set(categories.map((category) => category.id));
  return <Select mode="multiple" aria-label={ariaLabel} value={value.filter((id) => known.has(id))} onChange={onChange} placeholder={placeholder} showSearch={{ optionFilterProp: "search" }} options={categoryOptions(categories, false)} optionRender={renderOption} allowClear />;
}

export function CategorySelect({ value, onChange, disabled, ariaLabel, placeholder = "Select a category" }: { value?: string; onChange: (id: string) => void; disabled?: boolean; ariaLabel: string; placeholder?: string }) {
  const { financeCategories: categories } = useHealthData();
  const current = value ? resolveCategory(categories, value) : undefined;
  return (
    <Select
      aria-label={ariaLabel}
      value={current?.id}
      disabled={disabled}
      onChange={onChange}
      placeholder={placeholder}
      showSearch={{ optionFilterProp: "search" }}
      options={categoryOptions(categories, current?.id === DELETED_CATEGORY_ID)}
      optionRender={renderOption}
    />
  );
}
