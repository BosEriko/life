"use client";

import { Flex, theme, Typography } from "antd";
import { DatabaseOutlined } from "@ant-design/icons";

export function DatabasePanel() {
  const { token } = theme.useToken();

  return (
    <div>
      <Flex align="center" gap={10} style={{ marginBottom: 4 }}>
        <DatabaseOutlined style={{ color: token.colorPrimary, fontSize: 22 }} />
        <Typography.Title level={3} style={{ margin: 0 }}>
          Database
        </Typography.Title>
      </Flex>
      <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
        Browse and manage the raw records stored in your account. Coming soon.
      </Typography.Paragraph>
    </div>
  );
}
