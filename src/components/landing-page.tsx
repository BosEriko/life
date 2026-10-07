"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import {
  ApiOutlined,
  CheckCircleFilled,
  CheckSquareOutlined,
  DatabaseOutlined,
  DisconnectOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  HeartOutlined,
  LockOutlined,
  MobileOutlined,
  SafetyOutlined,
  ShareAltOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Button, Collapse, Flex, Grid, theme, Typography } from "antd";
import { AppFooter } from "@/components/app-footer";
import { DashboardHeader } from "@/components/dashboard-header";
import { TERRACOTTA, TERRACOTTA_DARK, useIsDark } from "@/components/theme-provider";

const BRAND_GREEN = "#316342";

const PILLARS: { icon: ReactNode; title: string; body: string }[] = [
  { icon: <HeartOutlined />, title: "Health", body: "Weight, water, food, blood pressure and habits, with trends and gentle targets." },
  { icon: <FileTextOutlined />, title: "Journal", body: "Notes by day, routines that repeat, and to-dos you can see as a board." },
  { icon: <WalletOutlined />, title: "Finance", body: "Accounts, spending and income, with an emergency fund that shows how long your money lasts." },
  { icon: <DatabaseOutlined />, title: "Records", body: "A shared food and drink database and your full health history in one place." },
];

const FEATURES: { eyebrow: string; title: string; body: string; points: string[]; image: string; alt: string; width: number; height: number; maxWidth?: number }[] = [
  {
    eyebrow: "HEALTH",
    title: "See how your days add up.",
    body: "Log in a few taps from anywhere in the app, then watch the averages and trends take shape.",
    points: [
      "Weight, water, food and drink, blood pressure and daily habits",
      "Your own ideal ranges, so anything outside them is gently flagged",
      "Trend charts, weekly averages and habit heatmaps",
      "Quick-add buttons for the bottles and glasses you actually use",
    ],
    image: "phone",
    alt: "The Health dashboard on a phone, with weekly averages for weight, blood pressure, water, calories and sodium, and upcoming tasks.",
    width: 780,
    height: 1688,
    maxWidth: 340,
  },
  {
    eyebrow: "JOURNAL",
    title: "Plan the day, then let it go.",
    body: "Keep your thoughts, routines and to-dos next to your health entries, so everything about your day lives together.",
    points: [
      "Notes with checklists and links, browsable by date or on a calendar",
      "Routines that repeat daily, weekly, monthly or yearly",
      "To-dos with lists, priorities and due dates",
      "A board that sorts them into upcoming, to do, in progress and done",
    ],
    image: "board",
    alt: "The to-do board with columns for upcoming, to do, in progress and completed.",
    width: 1920,
    height: 675,
  },
  {
    eyebrow: "FINANCE",
    title: "Know how long your money lasts.",
    body: "Add the accounts you use, record what comes in and goes out, and let the app keep the balances right.",
    points: [
      "Cash, bank, e-wallet, savings, card and loan accounts",
      "Expenses, income and transfers with categories and labels",
      "An emergency fund goal you choose, with live coverage in months",
      "Analytics for cash flow, top categories and savings rate",
    ],
    image: "finance",
    alt: "The Finance dashboard showing emergency fund coverage against a six-month goal and four colored account cards.",
    width: 1920,
    height: 720,
  },
];

const EVERYDAY: { icon: ReactNode; title: string; body: string }[] = [
  { icon: <DisconnectOutlined />, title: "Works offline", body: "Keep logging without a connection. Everything syncs when you’re back online." },
  { icon: <MobileOutlined />, title: "Install it on your phone", body: "Add it to your home screen and open it like a regular app." },
  { icon: <LockOutlined />, title: "Private to your account", body: "Every account only ever sees its own data." },
  { icon: <FilePdfOutlined />, title: "PDF reports", body: "Download a report with summaries, daily tables and trend charts for any date range." },
  { icon: <ShareAltOutlined />, title: "Read-only share links", body: "Let family or a doctor see your data, with an optional expiry and view limit." },
  { icon: <ApiOutlined />, title: "Connect AI assistants", body: "Give Claude, ChatGPT or other MCP apps read-only access to ask about your own data." },
];

const STEPS: { title: string; body: string }[] = [
  { title: "Create your account", body: "Sign up with email or Google and pick the units you’re used to." },
  { title: "Take the short tour", body: "A quick walkthrough and a checklist show you what to try first." },
  { title: "Log a little each day", body: "A few seconds at a time is enough. The patterns build themselves." },
];

const FAQ: { question: string; answer: string }[] = [
  { question: "Who can see my data?", answer: "Only you, while you’re signed in. Each account only ever sees its own entries. If you want someone else to see them, you create a read-only share link and decide when it expires." },
  { question: "Does it work without an internet connection?", answer: "Yes. Your entries are saved on your device first and sync automatically when your connection comes back." },
  { question: "Can I get my data out?", answer: "You can download a PDF report for any date range and choose which fields it includes. You can also connect an AI assistant with read-only access to ask questions about your history." },
  { question: "Can I use it on my phone?", answer: "Yes. It’s designed for phones first, and you can install it on your home screen so it opens like a regular app." },
  { question: "What if I stop using it?", answer: "You can delete your account from your profile whenever you like." },
];

function Screenshot({ name, alt, width, height, priority = false, sizes }: { name: string; alt: string; width: number; height: number; priority?: boolean; sizes: string }) {
  const { token } = theme.useToken();
  const isDark = useIsDark();
  return (
    <div
      style={{
        borderRadius: token.borderRadiusLG + 4,
        border: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
        boxShadow: "0 24px 60px -24px rgba(23, 50, 29, 0.35)",
        overflow: "hidden",
        lineHeight: 0,
      }}
    >
      <Image
        src={`/landing/${name}-${isDark ? "dark" : "light"}.webp`}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </div>
  );
}

function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <Typography.Text style={{ display: "block", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color }}>
      {children}
    </Typography.Text>
  );
}

export function LandingPage() {
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const compact = screens.md !== true;
  const isDark = useIsDark();
  const warm = isDark ? TERRACOTTA_DARK : TERRACOTTA;
  const sectionPadding = compact ? "56px 20px" : "88px 20px";
  const container = { maxWidth: 1200, margin: "0 auto" } as const;
  const sectionTitle = { margin: "12px 0 12px", fontSize: "clamp(26px, 4vw, 34px)", fontWeight: 800, lineHeight: 1.2 } as const;

  return (
    <div style={{ minHeight: "100dvh", overflow: "hidden" }}>
      <DashboardHeader />

      <main>
        <section style={{ ...container, padding: compact ? "48px 20px 64px" : "72px 20px 96px" }}>
          <div style={{ display: "grid", gridTemplateColumns: compact ? "minmax(0, 1fr)" : "minmax(0, 5fr) minmax(0, 6fr)", alignItems: "center", gap: compact ? 48 : 64 }}>
            <div style={{ minWidth: 0 }}>
              <Eyebrow>HEALTH · JOURNAL · MONEY</Eyebrow>
              <Typography.Title level={1} style={{ margin: "16px 0", fontSize: "clamp(36px, 5vw, 52px)", lineHeight: 1.08, fontWeight: 800 }}>
                A calm place for your health, plans and money.
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ fontSize: 16, lineHeight: 1.65, margin: 0, maxWidth: 520 }}>
                Keep a private, everyday record of how you feel, what you plan and where your money goes, then notice the patterns without pressure.
              </Typography.Paragraph>
              <Flex gap={8} wrap style={{ marginTop: 28 }}>
                <Button type="primary" size="large" href="/register" style={{ height: 48, paddingInline: 24 }}>
                  Create your account
                </Button>
                <Button size="large" href="/login" style={{ height: 48 }}>
                  I already have an account
                </Button>
              </Flex>
              <Flex gap={16} wrap style={{ marginTop: 20 }}>
                {["Private by default", "Works offline", "Export anytime"].map((item) => (
                  <Typography.Text key={item} type="secondary" style={{ fontSize: 13 }}>
                    <CheckCircleFilled style={{ color: token.colorPrimary, marginRight: 6 }} />
                    {item}
                  </Typography.Text>
                ))}
              </Flex>
            </div>

            <div style={{ minWidth: 0 }}>
              <Screenshot name="health" alt="The Health dashboard with weekly averages for weight, blood pressure, water, calories and sodium, a weight trend chart, and upcoming tasks." width={1920} height={1350} priority sizes="(max-width: 767px) 100vw, 640px" />
            </div>
          </div>
        </section>

        <section style={{ padding: sectionPadding, background: token.colorBgContainer, borderBlock: `1px solid ${token.colorBorderSecondary}` }}>
          <div style={container}>
            <Flex vertical align="center" style={{ textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
              <Eyebrow color={warm}>EVERYTHING IN ONE PLACE</Eyebrow>
              <Typography.Title level={2} style={sectionTitle}>Four parts of your life, one calm app.</Typography.Title>
              <Typography.Paragraph type="secondary" style={{ fontSize: 15, lineHeight: 1.7, margin: 0 }}>
                Each section stands on its own, and they all share the same simple way of logging.
              </Typography.Paragraph>
            </Flex>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 16, marginTop: compact ? 32 : 48 }}>
              {PILLARS.map((pillar) => (
                <div key={pillar.title} style={{ padding: 24, borderRadius: token.borderRadiusLG, background: token.colorFillSecondary }}>
                  <span aria-hidden style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: `color-mix(in srgb, ${token.colorPrimary} 18%, ${token.colorBgContainer})`, color: token.colorPrimary, fontSize: 20 }}>
                    {pillar.icon}
                  </span>
                  <Typography.Title level={3} style={{ margin: "16px 0 6px", fontSize: 18, fontWeight: 800 }}>{pillar.title}</Typography.Title>
                  <Typography.Text type="secondary" style={{ fontSize: 14, lineHeight: 1.6 }}>{pillar.body}</Typography.Text>
                </div>
              ))}
            </div>
          </div>
        </section>

        {FEATURES.map((feature, index) => {
          const imageFirst = !compact && index % 2 === 1;
          const text = (
            <div key="text" style={{ minWidth: 0 }}>
              <Eyebrow color={warm}>{feature.eyebrow}</Eyebrow>
              <Typography.Title level={2} style={sectionTitle}>{feature.title}</Typography.Title>
              <Typography.Paragraph type="secondary" style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 20 }}>{feature.body}</Typography.Paragraph>
              <Flex vertical gap={12}>
                {feature.points.map((point) => (
                  <Flex key={point} gap={10} align="flex-start">
                    <CheckSquareOutlined aria-hidden style={{ color: token.colorPrimary, fontSize: 16, marginTop: 3 }} />
                    <Typography.Text style={{ fontSize: 15, lineHeight: 1.6 }}>{point}</Typography.Text>
                  </Flex>
                ))}
              </Flex>
            </div>
          );
          const image = (
            <div key="image" style={{ minWidth: 0, width: "100%", maxWidth: feature.maxWidth, justifySelf: "center" }}>
              <Screenshot name={feature.image} alt={feature.alt} width={feature.width} height={feature.height} sizes={feature.maxWidth ? `${feature.maxWidth}px` : "(max-width: 767px) 100vw, 700px"} />
            </div>
          );
          return (
            <section key={feature.image} style={{ ...container, padding: sectionPadding }}>
              <div style={{ display: "grid", gridTemplateColumns: compact ? "minmax(0, 1fr)" : imageFirst ? "minmax(0, 7fr) minmax(0, 5fr)" : "minmax(0, 5fr) minmax(0, 7fr)", alignItems: "center", gap: compact ? 32 : 64 }}>
                {imageFirst ? [image, text] : [text, image]}
              </div>
            </section>
          );
        })}

        <section style={{ padding: sectionPadding, background: token.colorBgContainer, borderBlock: `1px solid ${token.colorBorderSecondary}` }}>
          <div style={container}>
            <Flex vertical align="center" style={{ textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
              <Eyebrow color={warm}>MADE FOR EVERYDAY USE</Eyebrow>
              <Typography.Title level={2} style={sectionTitle}>Your history belongs to you.</Typography.Title>
            </Flex>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 16, marginTop: compact ? 32 : 48 }}>
              {EVERYDAY.map((item) => (
                <Flex key={item.title} gap={14} align="flex-start" style={{ padding: 20, borderRadius: token.borderRadiusLG, border: `1px solid ${token.colorBorderSecondary}` }}>
                  <span aria-hidden style={{ color: token.colorPrimary, fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <Typography.Text strong style={{ display: "block", fontSize: 15 }}>{item.title}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 14, lineHeight: 1.6 }}>{item.body}</Typography.Text>
                  </div>
                </Flex>
              ))}
            </div>
          </div>
        </section>

        <section style={{ ...container, padding: sectionPadding }}>
          <Flex vertical align="center" style={{ textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
            <Eyebrow color={warm}>HOW IT WORKS</Eyebrow>
            <Typography.Title level={2} style={sectionTitle}>Up and running in a minute.</Typography.Title>
          </Flex>
          <ol style={{ listStyle: "none", padding: 0, margin: `${compact ? 32 : 48}px 0 0`, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 24 }}>
            {STEPS.map((step, index) => (
              <li key={step.title} style={{ minWidth: 0 }}>
                <span aria-hidden style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", background: token.colorPrimaryBg, color: token.colorPrimary, fontWeight: 800 }}>
                  {index + 1}
                </span>
                <Typography.Title level={3} style={{ margin: "14px 0 6px", fontSize: 18, fontWeight: 800 }}>{step.title}</Typography.Title>
                <Typography.Text type="secondary" style={{ fontSize: 15, lineHeight: 1.6 }}>{step.body}</Typography.Text>
              </li>
            ))}
          </ol>
        </section>

        <section style={{ padding: sectionPadding, background: token.colorBgContainer, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <Flex vertical align="center" style={{ textAlign: "center" }}>
              <Eyebrow color={warm}>QUESTIONS</Eyebrow>
              <Typography.Title level={2} style={sectionTitle}>Good to know.</Typography.Title>
            </Flex>
            <Collapse
              bordered={false}
              style={{ marginTop: 24, background: "transparent" }}
              items={FAQ.map((item) => ({
                key: item.question,
                label: <Typography.Text strong style={{ fontSize: 15 }}>{item.question}</Typography.Text>,
                children: <Typography.Paragraph type="secondary" style={{ fontSize: 15, lineHeight: 1.7, margin: 0 }}>{item.answer}</Typography.Paragraph>,
                style: { marginBottom: 8, borderRadius: token.borderRadiusLG, background: token.colorFillSecondary, border: 0 },
              }))}
            />
          </div>
        </section>

        <section style={{ padding: sectionPadding }}>
          <Flex vertical align="center" style={{ ...container, maxWidth: 820, textAlign: "center", padding: compact ? "40px 20px" : "56px 40px", borderRadius: 24, background: BRAND_GREEN }}>
            <SafetyOutlined aria-hidden style={{ fontSize: 28, color: "#ffffff" }} />
            <Typography.Title level={2} style={{ ...sectionTitle, color: "#ffffff" }}>Start your private record today.</Typography.Title>
            <Typography.Paragraph style={{ fontSize: 15, lineHeight: 1.7, color: "#ffffff", opacity: 0.9, maxWidth: 520 }}>
              It takes a minute to set up, and a few seconds a day to keep going.
            </Typography.Paragraph>
            <Flex gap={8} wrap justify="center" style={{ marginTop: 8 }}>
              <Button size="large" href="/register" style={{ height: 48, paddingInline: 24, background: "#ffffff", color: BRAND_GREEN, borderColor: "#ffffff", fontWeight: 700 }}>
                Create your account
              </Button>
              <Button size="large" type="text" href="/login" style={{ height: 48, color: "#ffffff" }}>
                Sign in
              </Button>
            </Flex>
          </Flex>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
