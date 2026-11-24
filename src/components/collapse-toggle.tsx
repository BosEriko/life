"use client";

import { Button } from "antd";
import { RightOutlined } from "@ant-design/icons";
import { Tip } from "@/components/tip";

export function CollapseToggle({ expanded, onToggle, label, count }: { expanded: boolean; onToggle: () => void; label: string; count?: number }) {
  const title = `${expanded ? "Hide" : "Show"} ${label}${count !== undefined && !expanded ? ` (${count})` : ""}`;
  return (
    <Tip title={title}>
      <Button type="text" size="small" aria-expanded={expanded} aria-label={title} onClick={onToggle} icon={<RightOutlined style={{ fontSize: 11, transition: "transform 0.2s", transform: expanded ? "rotate(90deg)" : undefined }} />} />
    </Tip>
  );
}
