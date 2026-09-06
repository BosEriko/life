"use client";

import { useRouter } from "next/navigation";
import { Button, Flex, Grid, theme, Typography } from "antd";
import { Icon } from "@/components/icon";

export function AppFooter() {
  const { token } = theme.useToken();
  const router = useRouter();
  const screens = Grid.useBreakpoint();
  const compact = screens.md === false;

  return (
    <footer
      style={{
        background: token.colorBgContainer,
        borderTop: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Flex
        align="center"
        justify="space-between"
        gap={compact ? 12 : 16}
        wrap
        vertical={compact}
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          paddingInline: 20,
          paddingTop: 24,
          paddingBottom: compact
            ? "calc(24px + 72px + env(safe-area-inset-bottom))"
            : 24,
        }}
      >
        <Flex align="center" gap={10}>
          <div
            style={{
              width: 26,
              height: 26,
              flexShrink: 0,
              borderRadius: 7,
              background: token.colorPrimary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon
              name="brand"
              style={{
                margin: 0,
                opacity: 1,
                color: token.colorTextLightSolid,
                fontSize: 13,
              }}
            />
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Bos Eriko&apos;s Life Tracker © {new Date().getFullYear()}
          </Typography.Text>
        </Flex>

        <Button
          type="text"
          size="small"
          onClick={() => router.push("/developer")}
        >
          Developer
        </Button>
      </Flex>
    </footer>
  );
}
