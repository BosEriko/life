"use client";

import type { ReactNode } from "react";
import { Flex, Typography } from "antd";

export function PageHeading({
  title,
  subtitle,
  extra,
  marginBottom = 24,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  extra?: ReactNode;
  marginBottom?: number;
}) {
  return (
    <Flex
      align="flex-end"
      justify="space-between"
      gap={16}
      wrap
      style={{ marginBottom }}
    >
      <div style={{ minWidth: 0, flex: "1 1 320px" }}>
        <Typography.Title
          level={1}
          style={{
            margin: 0,
            fontSize: "clamp(24px, 4vw, 30px)",
            fontWeight: 800,
            lineHeight: 1.2,
          }}
        >
          {title}
        </Typography.Title>
        {subtitle ? (
          <Typography.Paragraph
            type="secondary"
            style={{ margin: "6px 0 0", fontSize: 13 }}
          >
            {subtitle}
          </Typography.Paragraph>
        ) : null}
      </div>
      {extra ? (
        <Flex gap={8} wrap>
          {extra}
        </Flex>
      ) : null}
    </Flex>
  );
}
