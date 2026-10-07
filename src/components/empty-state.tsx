"use client";

import type { ReactNode } from "react";
import { Empty, Typography } from "antd";

export function EmptyState({ title, description, action }: { title?: ReactNode; description: ReactNode; action?: ReactNode }) {
  return (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <span style={{ display: "inline-block", maxWidth: 380 }}>
          {title && <Typography.Text strong style={{ display: "block", marginBottom: 4 }}>{title}</Typography.Text>}
          <Typography.Text type="secondary">{description}</Typography.Text>
        </span>
      }
    >
      {action}
    </Empty>
  );
}
