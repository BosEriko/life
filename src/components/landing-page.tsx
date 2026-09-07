"use client";

import {
  ArrowRightOutlined,
  CheckCircleFilled,
  LockOutlined,
} from "@ant-design/icons";
import { Button, Card, Flex, Grid, theme, Typography } from "antd";
import { Icon, type IconName } from "@/components/icon";
import { TERRACOTTA, TERRACOTTA_DARK, useIsDark } from "@/components/theme-provider";

const FEATURES: {
  icon: IconName;
  title: string;
  text: string;
}[] = [
  {
    icon: "habits",
    title: "Build your daily rhythm",
    text: "Keep simple good and bad habits visible without turning your day into a complicated checklist.",
  },
  {
    icon: "water",
    title: "Log water and intake",
    text: "Record drinks, meals, calories, and sodium in a few taps—with your preferred units.",
  },
  {
    icon: "bp",
    title: "Follow the vital details",
    text: "Track weight and individual blood-pressure readings, including time, arm, and posture.",
  },
  {
    icon: "target",
    title: "Understand your ideals",
    text: "Set personal ranges and quickly see when a daily value or average falls above or below them.",
  },
  {
    icon: "trends",
    title: "See the longer story",
    text: "Move through dates, compare time windows, and browse your complete history in one summary.",
  },
  {
    icon: "logEntry",
    title: "Keep context with notes",
    text: "Write down how the day felt, revisit notes by date, and keep the numbers connected to real life.",
  },
];

export function LandingPage() {
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const compact = screens.md !== true;
  const isDark = useIsDark();
  const warm = isDark ? TERRACOTTA_DARK : TERRACOTTA;

  return (
    <div style={{ minHeight: "100dvh", overflow: "hidden" }}>
      <header
        style={{
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
        }}
      >
        <Flex
          align="center"
          justify="space-between"
          gap={16}
          style={{ maxWidth: 1120, margin: "0 auto", padding: "16px 20px" }}
        >
          <Flex align="center" gap={10}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: token.colorPrimary,
              }}
            >
              <Icon
                name="brand"
                style={{
                  margin: 0,
                  opacity: 1,
                  color: token.colorTextLightSolid,
                  fontSize: 17,
                }}
              />
            </div>
          </Flex>
          <Flex gap={8}>
            <Button href="/login">Sign in</Button>
            <Button type="primary" href="/register">
              Get started
            </Button>
          </Flex>
        </Flex>
      </header>

      <main>
        <section
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: compact ? "56px 20px 72px" : "88px 20px 104px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
              alignItems: "center",
              gap: compact ? 48 : 72,
            }}
          >
            <div>
              <Typography.Text
                strong
                style={{ color: token.colorPrimary, letterSpacing: "0.08em" }}
              >
                YOUR DAYS, IN PERSPECTIVE
              </Typography.Text>
              <Typography.Title
                level={1}
                style={{
                  margin: "14px 0 20px",
                  maxWidth: 650,
                  fontSize: "clamp(42px, 6vw, 68px)",
                  lineHeight: 1.04,
                  letterSpacing: "-0.045em",
                  fontWeight: 500,
                }}
              >
                A gentler way to understand your health.
              </Typography.Title>
              <Typography.Paragraph
                type="secondary"
                style={{ maxWidth: 590, fontSize: 18, lineHeight: 1.7 }}
              >
                Life Tracker brings habits, hydration, nutrition, weight, blood
                pressure, and personal notes into one calm daily view.
              </Typography.Paragraph>
              <Flex gap={12} wrap style={{ marginTop: 30 }}>
                <Button
                  type="primary"
                  size="large"
                  href="/register"
                  icon={<ArrowRightOutlined />}
                  iconPlacement="end"
                >
                  Start tracking
                </Button>
                <Button size="large" href="/login">
                  I already have an account
                </Button>
              </Flex>
              <Flex align="center" gap={8} style={{ marginTop: 20 }}>
                <LockOutlined style={{ color: token.colorTextSecondary }} />
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  Personal, private, and built to keep working offline.
                </Typography.Text>
              </Flex>
            </div>

            <Card
              styles={{ body: { padding: compact ? 22 : 30 } }}
              style={{
                borderColor: token.colorBorderSecondary,
                borderRadius: 24,
                boxShadow: token.boxShadowSecondary,
                transform: compact ? undefined : "rotate(1.5deg)",
              }}
            >
              <Flex align="center" justify="space-between" gap={12}>
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    TODAY
                  </Typography.Text>
                  <Typography.Title level={4} style={{ margin: "2px 0 0" }}>
                    Your daily snapshot
                  </Typography.Title>
                </div>
                <Icon
                  name="brand"
                  style={{ margin: 0, color: token.colorPrimary, fontSize: 24 }}
                />
              </Flex>

              <Flex vertical gap={12} style={{ marginTop: 28 }}>
                {[
                  { icon: "water" as IconName, label: "Water", value: "1.8 L", width: "76%" },
                  { icon: "calories" as IconName, label: "Calories", value: "1,740 kcal", width: "68%" },
                  { icon: "bp" as IconName, label: "Blood pressure", value: "118/76", width: "84%" },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      padding: 16,
                      borderRadius: token.borderRadiusLG,
                      background: token.colorFillTertiary,
                    }}
                  >
                    <Flex align="center" justify="space-between" gap={12}>
                      <Typography.Text>
                        <Icon name={item.icon} />
                        {item.label}
                      </Typography.Text>
                      <Typography.Text strong>{item.value}</Typography.Text>
                    </Flex>
                    <div
                      style={{
                        height: 5,
                        marginTop: 12,
                        borderRadius: 999,
                        background: token.colorFillSecondary,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: item.width,
                          height: "100%",
                          borderRadius: 999,
                          background: item.label === "Calories" ? warm : token.colorPrimary,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </Flex>

              <Flex align="center" gap={8} style={{ marginTop: 20 }}>
                <CheckCircleFilled style={{ color: token.colorSuccess }} />
                <Typography.Text type="secondary">
                  Small entries. A clearer pattern.
                </Typography.Text>
              </Flex>
            </Card>
          </div>
        </section>

        <section
          style={{
            borderBlock: `1px solid ${token.colorBorderSecondary}`,
            background: token.colorBgContainer,
          }}
        >
          <div
            style={{
              maxWidth: 1120,
              margin: "0 auto",
              padding: compact ? "64px 20px" : "88px 20px",
            }}
          >
            <Typography.Title
              level={2}
              style={{ maxWidth: 620, margin: "0 0 12px", fontWeight: 500 }}
            >
              Everything useful. Nothing overwhelming.
            </Typography.Title>
            <Typography.Paragraph
              type="secondary"
              style={{ maxWidth: 620, fontSize: 16, marginBottom: 40 }}
            >
              Capture the details that matter, then let the page turn them into
              a view you can actually use.
            </Typography.Paragraph>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
                gap: 32,
              }}
            >
              {FEATURES.map((feature) => (
                <article key={feature.title}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 12,
                      background: token.colorPrimary,
                      color: token.colorTextLightSolid,
                    }}
                  >
                    <Icon
                      name={feature.icon}
                      style={{ margin: 0, opacity: 1, fontSize: 17 }}
                    />
                  </div>
                  <Typography.Title level={4} style={{ margin: "16px 0 8px" }}>
                    {feature.title}
                  </Typography.Title>
                  <Typography.Paragraph
                    type="secondary"
                    style={{ lineHeight: 1.65, margin: 0 }}
                  >
                    {feature.text}
                  </Typography.Paragraph>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: compact ? "64px 20px" : "88px 20px" }}>
          <Flex
            vertical
            align="center"
            style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}
          >
            <Typography.Text strong style={{ color: warm }}>
              MADE FOR REAL LIFE
            </Typography.Text>
            <Typography.Title level={2} style={{ margin: "12px 0" }}>
              Your health history should belong to you.
            </Typography.Title>
            <Typography.Paragraph
              type="secondary"
              style={{ maxWidth: 650, fontSize: 16, lineHeight: 1.7 }}
            >
              Entries are cached on your device for offline use and synchronize
              when your connection returns. Export a report whenever you want a
              copy to keep or share.
            </Typography.Paragraph>
            <Button
              type="primary"
              size="large"
              href="/register"
              style={{ marginTop: 16 }}
            >
              Create your account
            </Button>
          </Flex>
        </section>
      </main>

      <footer
        style={{
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
        }}
      >
        <Flex
          align="center"
          justify="space-between"
          gap={16}
          wrap
          style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 20px" }}
        >
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Life Tracker © {new Date().getFullYear()}
          </Typography.Text>
          <Flex gap={8}>
            <Button type="text" size="small" href="/login">
              Sign in
            </Button>
            <Button type="text" size="small" href="/register">
              Register
            </Button>
          </Flex>
        </Flex>
      </footer>
    </div>
  );
}
