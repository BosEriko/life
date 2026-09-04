"use client";

import { Tag } from "antd";
import { useIsDark, TERRACOTTA, TERRACOTTA_DARK } from "@/components/theme-provider";
import type { IdealStatus } from "@/models/ideals";

const LABELS: Record<Exclude<IdealStatus, "unset">, string> = {
  ok: "In range",
  low: "Below range",
  high: "Above range",
};

export function IdealBadge({ status }: { status: IdealStatus }) {
  const isDark = useIsDark();

  if (status === "unset") return null;

  const off = status === "low" || status === "high";
  const accent = isDark ? TERRACOTTA_DARK : TERRACOTTA;

  return (
    <Tag
      bordered
      style={{
        marginInlineStart: 8,
        marginInlineEnd: 0,
        fontSize: 11,
        lineHeight: "18px",
        borderColor: off ? accent : undefined,
        color: off ? accent : undefined,
        background: off ? "transparent" : undefined,
      }}
      color={off ? undefined : "green"}
    >
      {LABELS[status]}
    </Tag>
  );
}
