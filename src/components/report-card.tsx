"use client";

import { useState } from "react";
import { Button, Card, Typography } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { ReportModal } from "@/components/report-modal";

export function ReportCard() {
  const [open, setOpen] = useState(false);
  return (
    <Card
      size="small"
      title={
        <>
          <DownloadOutlined style={{ marginRight: 8 }} />
          Report
        </>
      }
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginTop: 0, marginBottom: 16 }}>
        A PDF of your history — choose a date range and which fields to include.
      </Typography.Paragraph>
      <Button icon={<DownloadOutlined />} onClick={() => setOpen(true)}>
        Download report
      </Button>
      <ReportModal open={open} onClose={() => setOpen(false)} />
    </Card>
  );
}
