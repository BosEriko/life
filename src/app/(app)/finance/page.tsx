"use client";

import { Card, Result, theme } from "antd";
import { ToolOutlined } from "@ant-design/icons";
import { PageHeading } from "@/components/page-heading";

export default function FinancePage() {
  const { token } = theme.useToken();

  return (
    <div>
      <PageHeading title="Finance" subtitle="Track your money alongside your health." />
      <Card style={{ boxShadow: token.boxShadowTertiary }}>
        <Result
          icon={<ToolOutlined style={{ color: token.colorPrimary }} />}
          title="Under maintenance"
          subTitle="Finance isn't ready yet. Check back soon."
        />
      </Card>
    </div>
  );
}
