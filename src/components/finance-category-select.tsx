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
  const current = value.filter((id) => known.has(id));
  const subsOf = (id: string) => categories.filter((category) => category.parentId === id && category.id !== DELETED_CATEGORY_ID).map((category) => category.id);
  function change(next: string[]) {
    const picked = new Set(next);
    const added = next.filter((id) => !current.includes(id));
    const removed = current.filter((id) => !picked.has(id));
    for (const id of added) for (const sub of subsOf(id)) picked.add(sub);
    for (const id of removed) {
      for (const sub of subsOf(id)) picked.delete(sub);
      const parent = categories.find((category) => category.id === id)?.parentId;
      if (parent) picked.delete(parent);
    }
    for (const main of categories.filter((category) => category.parentId === null)) {
      const subs = subsOf(main.id);
      if (subs.length > 0 && subs.every((sub) => picked.has(sub)) && !removed.some((id) => subs.includes(id) || id === main.id)) picked.add(main.id);
    }
    onChange(categoryTree(categories).map(({ category }) => category.id).filter((id) => picked.has(id)));
  }
  return <Select mode="multiple" aria-label={ariaLabel} value={current} onChange={change} placeholder={placeholder} showSearch={{ optionFilterProp: "search" }} options={categoryOptions(categories, false)} optionRender={renderOption} maxTagCount="responsive" allowClear />;
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
