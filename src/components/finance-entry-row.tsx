"use client";

import type { ReactNode } from "react";
import { Flex, Grid, Typography } from "antd";

export function FinanceEntryRow({ icon, title, meta, children, amount, amountColor, actions }: { icon: ReactNode; title: ReactNode; meta?: ReactNode; children?: ReactNode; amount: ReactNode; amountColor?: string; actions?: ReactNode }) {
  const stacked = Grid.useBreakpoint().sm === false;
  return (
    <Flex justify="space-between" align="start" gap={12} wrap>
      <div style={{ minWidth: 0, flex: "1 1 180px", overflowWrap: "anywhere" }}>
        <Flex align="center" gap={8}>
          {icon}
          <Typography.Text strong style={{ minWidth: 0 }}>{title}</Typography.Text>
        </Flex>
        {meta && <div><Typography.Text type="secondary">{meta}</Typography.Text></div>}
        {children}
      </div>
      <Flex align="center" justify="space-between" gap={8} style={stacked ? { width: "100%" } : { marginLeft: "auto" }}>
        <Typography.Text strong style={{ fontSize: 16, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere", color: amountColor }}>{amount}</Typography.Text>
        {actions && <Flex gap={2} onKeyDown={(event) => event.stopPropagation()}>{actions}</Flex>}
      </Flex>
    </Flex>
  );
}
