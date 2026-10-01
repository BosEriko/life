"use client";

import type { ReactNode } from "react";
import {
  DatabaseOutlined,
  DisconnectOutlined,
  FileTextOutlined,
  HeartOutlined,
  SafetyOutlined,
  ScheduleOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { Button, Card, Flex, Grid, theme, Typography } from "antd";
import { AppFooter } from "@/components/app-footer";
import { DashboardHeader } from "@/components/dashboard-header";
import { Icon, type IconName } from "@/components/icon";
import { TERRACOTTA, TERRACOTTA_DARK, useIsDark } from "@/components/theme-provider";

const SNAPSHOT: { icon: IconName; label: string; value: string; note: string }[] = [
  { icon: "water", label: "Water", value: "1.9 L", note: "2.2 L goal" },
  { icon: "calories", label: "Calories", value: "1,840", note: "balanced" },
  { icon: "bp", label: "Blood pressure", value: "118 / 76", note: "in range" },
];

const FEATURES: { icon: ReactNode; label: string }[] = [
  { icon: <HeartOutlined />, label: "Health trends" },
  { icon: <FileTextOutlined />, label: "Notes by day" },
  { icon: <ScheduleOutlined />, label: "Gentle routines" },
  { icon: <DatabaseOutlined />, label: "Food database" },
  { icon: <ShareAltOutlined />, label: "Read-only sharing" },
  { icon: <DisconnectOutlined />, label: "Offline-first" },
];

export function LandingPage() {
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const compact = screens.md !== true;
  const isDark = useIsDark();
  const warm = isDark ? TERRACOTTA_DARK : TERRACOTTA;

  return (
    <div style={{ minHeight: "100dvh", overflow: "hidden" }}>
      <DashboardHeader />

      <main>
        <section
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: compact ? "48px 20px 56px" : "72px 20px 80px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
              alignItems: "center",
              gap: compact ? 40 : 72,
            }}
          >
            <div>
              <Typography.Text
                style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em" }}
              >
                YOUR DAYS, IN PERSPECTIVE
              </Typography.Text>
              <Typography.Title
                level={1}
                style={{
                  margin: "16px 0 16px",
                  maxWidth: 660,
                  fontSize: "clamp(36px, 5vw, 46px)",
                  lineHeight: 1.1,
                  fontWeight: 800,
                }}
              >
                A gentler way to understand your health.
              </Typography.Title>
              <Typography.Paragraph
                type="secondary"
                style={{ maxWidth: 660, fontSize: 15, lineHeight: 1.6, margin: 0 }}
              >
                Keep a private, everyday record of the things that shape how you
                feel — then notice the patterns without pressure.
              </Typography.Paragraph>
              <Flex gap={8} wrap style={{ marginTop: 24 }}>
                <Button type="primary" href="/register" style={{ height: 44 }}>
                  Start tracking
                </Button>
                <Button href="/login" style={{ height: 44 }}>
                  I already have an account
                </Button>
              </Flex>
              <Flex align="center" gap={8} style={{ marginTop: 18 }}>
                <SafetyOutlined style={{ color: token.colorTextSecondary }} />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Private by default · works offline · export anytime
                </Typography.Text>
              </Flex>
            </div>

            <Card
              styles={{ body: { padding: 20 } }}
              style={{
                maxWidth: 460,
                width: "100%",
                justifySelf: compact ? "stretch" : "end",
                boxShadow: token.boxShadowTertiary,
              }}
            >
              <Typography.Text style={{ display: "block", fontSize: 17 }}>
                TODAY
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Your daily snapshot
              </Typography.Text>

              <Flex vertical gap={12} style={{ marginTop: 18 }}>
                {SNAPSHOT.map((item) => (
                  <Flex
                    key={item.label}
                    align="center"
                    justify="space-between"
                    gap={12}
                    style={{
                      padding: "12px 14px",
                      borderRadius: token.borderRadius,
                      background: token.colorFillSecondary,
                    }}
                  >
                    <Typography.Text strong style={{ fontSize: 13 }}>
                      <Icon name={item.icon} />
                      {item.label}
                    </Typography.Text>
                    <Flex align="center" gap={12}>
                      <Typography.Text strong style={{ fontSize: 14 }}>
                        {item.value}
                      </Typography.Text>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: 999,
                          fontSize: 11,
                          background: token.colorPrimaryBgHover,
                          color: token.colorTextSecondary,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.note}
                      </span>
                    </Flex>
                  </Flex>
                ))}
              </Flex>
            </Card>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
              alignItems: "center",
              gap: compact ? 24 : 48,
              marginTop: compact ? 56 : 88,
            }}
          >
            <div>
              <Typography.Title
                level={2}
                style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.3 }}
              >
                Small entries. A clearer pattern.
              </Typography.Title>
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                Everything useful. Nothing overwhelming.
              </Typography.Text>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))",
                gap: 12,
                gridColumn: compact ? undefined : "span 2",
              }}
            >
              {FEATURES.map((feature) => (
                <Flex
                  key={feature.label}
                  align="center"
                  gap={10}
                  style={{
                    minHeight: 46,
                    padding: "0 16px",
                    borderRadius: token.borderRadius,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    background: token.colorBgContainer,
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: token.colorPrimary, fontSize: 15 }}>
                    {feature.icon}
                  </span>
                  {feature.label}
                </Flex>
              ))}
            </div>
          </div>
        </section>

        <section
          style={{
            padding: compact ? "56px 20px" : "80px 20px",
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            background: token.colorBgContainer,
          }}
        >
          <Flex
            vertical
            align="center"
            style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}
          >
            <Typography.Text
              style={{ color: warm, fontSize: 11, fontWeight: 800, letterSpacing: "0.1em" }}
            >
              MADE FOR REAL LIFE
            </Typography.Text>
            <Typography.Title
              level={2}
              style={{ margin: "12px 0", fontSize: "clamp(26px, 4vw, 32px)", fontWeight: 800 }}
            >
              Your health history should belong to you.
            </Typography.Title>
            <Typography.Paragraph
              type="secondary"
              style={{ maxWidth: 650, fontSize: 15, lineHeight: 1.7 }}
            >
              Entries are cached on your device for offline use and synchronize
              when your connection returns. Export a report whenever you want a
              copy to keep or share.
            </Typography.Paragraph>
            <Button type="primary" href="/register" style={{ marginTop: 8, height: 44 }}>
              Create your account
            </Button>
          </Flex>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
