"use client";

import { useState } from "react";
import { Button, Input, Typography, theme } from "antd";
import { Tip } from "@/components/tip";
import { CATEGORY_ICON_NAMES, CategoryGlyph } from "@/components/finance-category-icon";

export function FinanceIconPicker({ value, color, onChange }: { value: string; color: string; onChange: (icon: string) => void }) {
  const { token } = theme.useToken();
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const icons = CATEGORY_ICON_NAMES.filter((name) => !query || name.replace(/-/g, " ").includes(query));
  return <>
    <Input aria-label="Search icons" placeholder="Search icons…" value={search} onChange={(event) => setSearch(event.target.value)} allowClear style={{ marginBottom: 8 }} />
    <div role="listbox" aria-label="Icon" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))", gap: 6, maxHeight: 200, overflowY: "auto", padding: 2 }}>
      {icons.map((name) => (
        <Tip key={name} title={name.replace(/-/g, " ")}>
          <Button role="option" aria-selected={name === value} aria-label={name.replace(/-/g, " ")} onClick={() => onChange(name)} style={{ height: 40, padding: 0, borderColor: name === value ? token.colorPrimary : undefined, background: name === value ? token.colorPrimaryBg : undefined }} icon={<CategoryGlyph icon={name} style={{ fontSize: 16, color: name === value ? color : undefined }} />} />
        </Tip>
      ))}
      {icons.length === 0 && <Typography.Text type="secondary" style={{ gridColumn: "1 / -1" }}>No icons match.</Typography.Text>}
    </div>
  </>;
}
