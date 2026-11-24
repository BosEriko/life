"use client";

import { Select } from "antd";
import { useHealthData } from "@/components/health-data-provider";
import { CategoryBadge } from "@/components/finance-category-icon";
import { categoryTree, DELETED_CATEGORY_ID, mainCategory, resolveCategory } from "@/lib/finance-categories";

export function CategorySelect({ value, onChange, disabled, ariaLabel, placeholder = "Select a category" }: { value?: string; onChange: (id: string) => void; disabled?: boolean; ariaLabel: string; placeholder?: string }) {
  const { financeCategories: categories } = useHealthData();
  const current = value ? resolveCategory(categories, value) : undefined;
  const rows = categoryTree(categories).filter(({ category }) => category.id !== DELETED_CATEGORY_ID || current?.id === DELETED_CATEGORY_ID);
  const options = rows.map(({ category, depth }) => ({
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
  return (
    <Select
      aria-label={ariaLabel}
      value={current?.id}
      disabled={disabled}
      onChange={onChange}
      placeholder={placeholder}
      showSearch={{ optionFilterProp: "search" }}
      options={options}
      optionRender={(option) => <div style={{ paddingLeft: option.data.depth ? 24 : 0, fontWeight: option.data.depth ? undefined : 600 }}>{option.label}</div>}
    />
  );
}
