"use client";

import { Empty, Typography } from "antd";

export default function DailyNotesPage() {
  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        Daily Notes
      </Typography.Title>
      <Empty description="Nothing here yet." />
    </div>
  );
}
