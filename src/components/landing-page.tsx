"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ApiOutlined,
  CompassOutlined,
  CheckCircleFilled,
  CheckSquareOutlined,
  DatabaseOutlined,
  DisconnectOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  HeartOutlined,
  LineChartOutlined,
  LockOutlined,
  PlusOutlined,
  MobileOutlined,
  ShareAltOutlined,
  UserAddOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Button, Collapse, Flex, Grid, theme, Typography } from "antd";
import { AppFooter } from "@/components/app-footer";
import { DashboardHeader } from "@/components/dashboard-header";
import { DeviceScreenshot as Screenshot } from "@/components/device-screenshot";
import { Icon } from "@/components/icon";
import { accentColor, type Accent } from "@/lib/accents";
import { TERRACOTTA, TERRACOTTA_DARK, useIsDark } from "@/components/theme-provider";

const BRAND_GREEN = "#316342";

const CTA_CHIPS: { icon: ReactNode; label: string; value: string }[] = [
  { icon: <HeartOutlined />, label: "Weight this week", value: "70.3 kg" },
  { icon: <CheckSquareOutlined />, label: "Routines done today", value: "3 of 4" },
  { icon: <WalletOutlined />, label: "Emergency fund", value: "4.8 months" },
];

const PILLARS: { icon: ReactNode; title: string; body: string; accent: Accent; showcase?: string }[] = [
  { icon: <HeartOutlined />, title: "Health", body: "Log the basics in seconds and watch gentle trends take shape.", accent: "bp", showcase: "health" },
  { icon: <FileTextOutlined />, title: "Journal", body: "Write it down, plan it out, and check it off.", accent: "notes", showcase: "journal" },
  { icon: <WalletOutlined />, title: "Finance", body: "See where your money goes and how long it would last.", accent: "habits", showcase: "finance" },
  { icon: <DatabaseOutlined />, title: "Records", body: "Look things up and look back on your full history.", accent: "weight" },
];

const FEATURES: { key: string; icon: ReactNode; label: string; title: string; points: string[]; image: string; alt: string; width: number; height: number; device: "desktop" | "phone"; path: string; accent: Accent }[] = [
  {
    key: "health",
    icon: <HeartOutlined />,
    label: "Health",
    title: "See how your days add up.",
    points: ["Weight, water, food, blood pressure and habits", "Ideal ranges that gently flag what’s off", "Trends, weekly averages and heatmaps"],
    image: "phone",
    alt: "The Health dashboard on a phone, with weekly averages for weight, blood pressure, water, calories and sodium, and upcoming tasks.",
    width: 780,
    height: 1688,
    device: "phone",
    path: "/",
    accent: "bp",
  },
  {
    key: "journal",
    icon: <FileTextOutlined />,
    label: "Journal",
    title: "Plan the day, then let it go.",
    points: ["Notes by date or on a calendar", "Routines that repeat on your schedule", "To-dos on a list or a board"],
    image: "board",
    alt: "The to-do board with columns for upcoming, to do, in progress and completed.",
    width: 1836,
    height: 675,
    device: "desktop",
    path: "/journal/board",
    accent: "notes",
  },
  {
    key: "finance",
    icon: <WalletOutlined />,
    label: "Finance",
    title: "Know how long your money lasts.",
    points: ["Cash, bank, e-wallet and card accounts", "Expenses, income and transfers", "An emergency fund goal you choose"],
    image: "finance",
    alt: "The Finance dashboard showing emergency fund coverage against a six-month goal and four colored account cards.",
    width: 1836,
    height: 720,
    device: "desktop",
    path: "/finance/dashboard",
    accent: "habits",
  },
];

const HEALTH_HIGHLIGHTS: { label: string; value: string; note: string; accent: Accent }[] = [
  { label: "Weight", value: "70.3 kg", note: "−0.3 kg vs last week", accent: "weight" },
  { label: "Blood pressure", value: "117/76", note: "Within your range", accent: "bp" },
  { label: "Water", value: "2.63 L", note: "On target today", accent: "water" },
];

const ROTATE_MS = 6000;
const SHOWCASE_HEIGHT = 400;

const PRIVACY_POINTS = ["Only you can see your entries", "Sharing is read-only and up to you", "Delete your account anytime"];

const EVERYDAY: { icon: ReactNode; title: string; body: string; accent: Accent }[] = [
  { icon: <DisconnectOutlined />, title: "Works offline", body: "Keep logging without a connection. Everything syncs when you’re back online.", accent: "water" },
  { icon: <MobileOutlined />, title: "Install it on your phone", body: "Add it to your home screen and open it like a regular app.", accent: "weight" },
  { icon: <FilePdfOutlined />, title: "PDF reports", body: "Download a report with summaries, daily tables and trend charts for any date range.", accent: "bp" },
  { icon: <ShareAltOutlined />, title: "Read-only share links", body: "Let family or a doctor see your data, with an optional expiry and view limit.", accent: "calories" },
  { icon: <ApiOutlined />, title: "Connect AI assistants", body: "Give Claude, ChatGPT or other MCP apps read-only access to ask about your own data.", accent: "bpLow" },
];

const STEPS: { icon: ReactNode; title: string; body: string; accent: Accent }[] = [
  { icon: <UserAddOutlined />, title: "Create your account", body: "Sign up with email or Google and pick the units you’re used to.", accent: "weight" },
  { icon: <CompassOutlined />, title: "Take the short tour", body: "A quick walkthrough and a checklist show you what to try first.", accent: "bpLow" },
  { icon: <LineChartOutlined />, title: "Log a little each day", body: "A few seconds at a time is enough. The patterns build themselves.", accent: "calories" },
];

const FAQ: { question: string; answer: string }[] = [
  { question: "Who can see my data?", answer: "Only you, while you’re signed in. Each account only ever sees its own entries. If you want someone else to see them, you create a read-only share link and decide when it expires." },
  { question: "Does it work without an internet connection?", answer: "Yes. Your entries are saved on your device first and sync automatically when your connection comes back." },
  { question: "Can I get my data out?", answer: "You can download a PDF report for any date range and choose which fields it includes. You can also connect an AI assistant with read-only access to ask questions about your history." },
  { question: "Can I use it on my phone?", answer: "Yes. It’s designed for phones first, and you can install it on your home screen so it opens like a regular app." },
  { question: "What if I stop using it?", answer: "You can delete your account from your profile whenever you like." },
];

function TiltCard({ children }: { children: ReactNode }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const sheen = sheenRef.current;
    if (!card || !sheen) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const move = (event: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        card.style.transition = "transform 120ms ease-out";
        card.style.transform = `perspective(1400px) rotateX(${(-y * 10).toFixed(2)}deg) rotateY(${(x * 12).toFixed(2)}deg)`;
        sheen.style.opacity = "1";
        sheen.style.background = `radial-gradient(60% 60% at ${((x + 0.5) * 100).toFixed(1)}% ${((y + 0.5) * 100).toFixed(1)}%, rgba(255, 255, 255, 0.18), transparent 65%)`;
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      card.style.transition = "transform 500ms cubic-bezier(0.22, 1, 0.36, 1)";
      card.style.transform = "";
      sheen.style.opacity = "0";
    };
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div ref={cardRef} className="landing-tilt" style={{ position: "relative" }}>
      {children}
      <div ref={sheenRef} aria-hidden style={{ position: "absolute", inset: 0, borderRadius: 14, opacity: 0, transition: "opacity 300ms ease", pointerEvents: "none", mixBlendMode: "soft-light" }} />
    </div>
  );
}

function HeroBackdrop({ dark }: { dark: boolean }) {
  const { token } = theme.useToken();
  const leaf = accentColor("habits", dark);
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(color-mix(in srgb, ${token.colorPrimary} ${dark ? 30 : 22}%, transparent) 1px, transparent 1.6px)`,
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(70% 70% at 70% 35%, #000 0%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(70% 70% at 70% 35%, #000 0%, transparent 75%)",
        }}
      />
      <svg viewBox="0 0 1440 220" preserveAspectRatio="none" style={{ position: "absolute", left: 0, bottom: -1, width: "100%", height: 160 }}>
        <path d="M0 120 C 240 60 420 170 720 120 C 1000 74 1180 150 1440 96 L 1440 220 L 0 220 Z" fill={`color-mix(in srgb, ${leaf} ${dark ? 10 : 9}%, transparent)`} />
        <path d="M0 168 C 260 120 520 200 820 160 C 1080 126 1260 178 1440 150 L 1440 220 L 0 220 Z" fill={`color-mix(in srgb, ${token.colorPrimary} ${dark ? 12 : 10}%, transparent)`} />
      </svg>
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
  const [active, setActive] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [showcaseVisible, setShowcaseVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const showcaseRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const elapsed = useRef(0);
  const elapsedFor = useRef(0);
  const rotating = !stopped && showcaseVisible && !reducedMotion;
  const showFeature = (key: string) => {
    setActive(Math.max(0, FEATURES.findIndex((feature) => feature.key === key)));
    setStopped(true);
    showcaseRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  };

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    const node = showcaseRef.current;
    if (!node || !("IntersectionObserver" in window)) return () => query.removeEventListener("change", update);
    const observer = new IntersectionObserver(([entry]) => setShowcaseVisible(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(node);
    return () => {
      query.removeEventListener("change", update);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (elapsedFor.current !== active) {
      elapsedFor.current = active;
      elapsed.current = 0;
    }
    if (progressRef.current) progressRef.current.style.transform = `scaleX(${elapsed.current / ROTATE_MS})`;
    if (!rotating) return;
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      elapsed.current += now - last;
      last = now;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${Math.min(1, elapsed.current / ROTATE_MS)})`;
      if (elapsed.current >= ROTATE_MS) {
        setActive((current) => (current + 1) % FEATURES.length);
        return;
      }
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [rotating, active]);
  const warm = isDark ? TERRACOTTA_DARK : TERRACOTTA;
  const sectionPadding = compact ? "56px 20px" : "88px 20px";
  const container = { maxWidth: 1200, margin: "0 auto" } as const;
  const sectionTitle = { margin: "12px 0 12px", fontSize: "clamp(26px, 4vw, 34px)", fontWeight: 800, lineHeight: 1.2 } as const;
  const delay = (index: number) => ({ "--reveal-delay": `${index * 80}ms` }) as CSSProperties;
  const tint = (accent: Accent, size: number): CSSProperties => {
    const color = accentColor(accent, isDark);
    return { display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: size, height: size, borderRadius: 12, background: `color-mix(in srgb, ${color} ${isDark ? 20 : 14}%, ${token.colorBgContainer})`, color, fontSize: size * 0.45 };
  };

  useEffect(() => {
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    const items = Array.from(document.querySelectorAll<HTMLElement>(".reveal:not(.is-visible)"));
    for (const item of items) if (item.getBoundingClientRect().top < window.innerHeight) item.classList.add("is-visible");
    root.classList.add("reveal-ready");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    for (const item of items) if (!item.classList.contains("is-visible")) observer.observe(item);
    return () => {
      observer.disconnect();
      root.classList.remove("reveal-ready");
    };
  }, [compact]);

  return (
    <div style={{ minHeight: "100dvh", overflow: "hidden", "--landing-accent": token.colorPrimary } as CSSProperties}>
      <DashboardHeader />

      <main>
        <section style={{ position: "relative", overflow: "hidden", background: token.colorBgLayout }}>
          <HeroBackdrop dark={isDark} />
          <div style={{ ...container, position: "relative", padding: compact ? "48px 20px 72px" : "72px 20px 112px" }}>
          <div style={{ display: "grid", gridTemplateColumns: compact ? "minmax(0, 1fr)" : "minmax(0, 5fr) minmax(0, 6fr)", alignItems: "center", gap: compact ? 48 : 64 }}>
            <div className="landing-hero-in" style={{ minWidth: 0 }}>
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

            <div className="landing-hero-in" style={{ minWidth: 0, ...delay(2) }}>
              <TiltCard>
                <Screenshot name="health" alt="The Health dashboard with weekly averages for weight, blood pressure, water, calories and sodium, a weight trend chart, and upcoming tasks." width={1920} height={1350} device="desktop" path="/" priority sizes="(max-width: 767px) 100vw, 640px" />
              </TiltCard>
            </div>
          </div>
          </div>
        </section>

        <section style={{ padding: sectionPadding, background: token.colorBgContainer, borderBlock: `1px solid ${token.colorBorderSecondary}` }}>
          <div style={container}>
            <Flex vertical align="center" className="reveal" style={{ textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
              <Eyebrow color={warm}>EVERYTHING IN ONE PLACE</Eyebrow>
              <Typography.Title level={2} style={sectionTitle}>Four parts of your life, one calm app.</Typography.Title>
              <Typography.Paragraph type="secondary" style={{ fontSize: 15, lineHeight: 1.7, margin: 0 }}>
                Each section stands on its own, and they all share the same simple way of logging.
              </Typography.Paragraph>
            </Flex>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 20, marginTop: compact ? 32 : 48 }}>
              {PILLARS.map((pillar, index) => {
                const color = accentColor(pillar.accent, isDark);
                return (
                  <div key={pillar.title} className="reveal" style={{ ...delay(index), minWidth: 0 }}>
                    <div className="landing-card landing-card-flat" style={{ "--card-accent": color, height: "100%", display: "flex", flexDirection: "column", padding: 24, borderRadius: token.borderRadiusLG + 2, background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}` } as CSSProperties}>
                      <span aria-hidden className="landing-card-icon" style={tint(pillar.accent, 44)}>{pillar.icon}</span>
                      <Typography.Title level={3} style={{ margin: "16px 0 6px", fontSize: 18, fontWeight: 800 }}>{pillar.title}</Typography.Title>
                      <Typography.Text type="secondary" style={{ fontSize: 14, lineHeight: 1.6 }}>{pillar.body}</Typography.Text>
                      {pillar.showcase && (
                        <button type="button" className="landing-pillar-link" onClick={() => showFeature(pillar.showcase!)} style={{ alignSelf: "flex-start", marginTop: "auto", padding: "16px 0 0", border: 0, background: "none", color, font: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                          See it in action <span aria-hidden className="landing-arrow">→</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section ref={showcaseRef} onClick={() => setStopped(true)} style={{ ...container, padding: sectionPadding }}>
          <Flex vertical align="center" className="reveal" style={{ textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
            <Eyebrow color={warm}>SEE IT IN ACTION</Eyebrow>
            <Typography.Title level={2} style={sectionTitle}>Everything you need, nothing you don’t.</Typography.Title>
          </Flex>
          <div className="reveal" style={{ ...delay(1), display: "grid", gridTemplateColumns: compact ? "minmax(0, 1fr)" : "minmax(0, 4fr) minmax(0, 8fr)", alignItems: "center", gap: compact ? 20 : 48, marginTop: compact ? 28 : 48 }}>
            <div role="tablist" aria-label="App sections" style={{ display: compact ? "grid" : "flex", gridTemplateColumns: compact ? "repeat(3, minmax(0, 1fr))" : undefined, flexDirection: compact ? undefined : "column", gap: compact ? 8 : 12, minWidth: 0 }}>
              {FEATURES.map((feature, index) => {
                const selected = index === active;
                const color = accentColor(feature.accent, isDark);
                return (
                  <button
                    key={feature.key}
                    id={`showcase-tab-${feature.key}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls="showcase-panel"
                    onClick={() => {
                      setActive(index);
                      setStopped(true);
                    }}
                    className="landing-tab"
                    style={{
                      position: "relative",
                      overflow: "hidden",
                      minWidth: 0,
                      display: "flex",
                      flexDirection: compact ? "column" : "row",
                      alignItems: compact ? "center" : "flex-start",
                      gap: compact ? 6 : 14,
                      padding: compact ? "10px 6px" : "16px 18px",
                      borderRadius: token.borderRadiusLG + 2,
                      border: `1px solid ${selected ? `color-mix(in srgb, ${color} 45%, ${token.colorBorderSecondary})` : token.colorBorderSecondary}`,
                      background: selected ? token.colorBgContainer : "transparent",
                      boxShadow: selected && !compact ? "0 14px 34px -20px rgba(23, 50, 29, 0.35)" : "none",
                      color: token.colorText,
                      font: "inherit",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    {selected && !stopped && !reducedMotion && (
                      <span ref={progressRef} aria-hidden className="landing-tab-progress" style={{ background: color }} />
                    )}
                    <span aria-hidden style={tint(feature.accent, compact ? 30 : 40)}>{feature.icon}</span>
                    <span style={{ minWidth: 0, textAlign: compact ? "center" : "left" }}>
                      <span style={{ display: "block", fontSize: compact ? 13 : 16, fontWeight: 800, whiteSpace: "nowrap" }}>{feature.label}</span>
                      {!compact && <span style={{ display: "block", marginTop: 2, color: token.colorTextSecondary, fontSize: 14 }}>{feature.title}</span>}
                      {!compact && selected && (
                        <span style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                          {feature.points.map((point) => (
                            <span key={point} style={{ fontSize: 13, lineHeight: 1.5 }}>
                              <CheckCircleFilled style={{ color, marginRight: 8 }} />
                              {point}
                            </span>
                          ))}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <div id="showcase-panel" role="tabpanel" aria-labelledby={`showcase-tab-${FEATURES[active].key}`} style={{ minWidth: 0, display: "grid", placeItems: "center", height: compact ? undefined : SHOWCASE_HEIGHT }}>
              {FEATURES[active].device === "phone" ? (
                <Flex key={FEATURES[active].key} className="landing-fade" align="center" justify="center" gap={compact ? 0 : 28} style={{ width: "100%" }}>
                  <div style={{ width: compact ? 220 : 230, flexShrink: 0 }}>
                    <Screenshot name={FEATURES[active].image} alt={FEATURES[active].alt} width={FEATURES[active].width} height={FEATURES[active].height} device="phone" path={FEATURES[active].path} sizes="230px" frameHeight={compact ? 420 : SHOWCASE_HEIGHT - 20} />
                  </div>
                  {!compact && (
                    <Flex vertical gap={12} style={{ minWidth: 0, flex: "0 1 280px" }}>
                      {HEALTH_HIGHLIGHTS.map((item, index) => {
                        const color = accentColor(item.accent, isDark);
                        return (
                          <Flex key={item.label} align="center" gap={14} className="landing-tile" style={{ padding: "14px 16px", borderRadius: token.borderRadiusLG + 2, background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}`, boxShadow: "0 14px 34px -22px rgba(23, 50, 29, 0.35)", marginLeft: [0, 18, 6][index] }}>
                            <span aria-hidden style={{ width: 4, alignSelf: "stretch", borderRadius: 999, background: color }} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12, color: token.colorTextSecondary }}>{item.label}</div>
                              <div style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: "tabular-nums", lineHeight: 1.3 }}>{item.value}</div>
                              <div style={{ fontSize: 12, color }}>{item.note}</div>
                            </div>
                          </Flex>
                        );
                      })}
                    </Flex>
                  )}
                </Flex>
              ) : (
                <div key={FEATURES[active].key} className="landing-fade" style={{ width: "100%" }}>
                  <Screenshot name={FEATURES[active].image} alt={FEATURES[active].alt} width={FEATURES[active].width} height={FEATURES[active].height} device="desktop" path={FEATURES[active].path} sizes="(max-width: 767px) 100vw, 780px" />
                </div>
              )}
            </div>
            {compact && (
              <Flex vertical gap={8} style={{ minWidth: 0 }}>
                <Typography.Text strong style={{ fontSize: 16 }}>{FEATURES[active].title}</Typography.Text>
                {FEATURES[active].points.map((point) => (
                  <Typography.Text key={point} style={{ fontSize: 14, lineHeight: 1.5 }}>
                    <CheckCircleFilled style={{ color: accentColor(FEATURES[active].accent, isDark), marginRight: 8 }} />
                    {point}
                  </Typography.Text>
                ))}
              </Flex>
            )}
          </div>
        </section>

        <section style={{ padding: sectionPadding, background: token.colorBgContainer, borderBlock: `1px solid ${token.colorBorderSecondary}` }}>
          <div style={container}>
            <div className="reveal" style={{ maxWidth: 640 }}>
              <Eyebrow color={warm}>MADE FOR EVERYDAY USE</Eyebrow>
              <Typography.Title level={2} style={sectionTitle}>Your history belongs to you.</Typography.Title>
              <Typography.Paragraph type="secondary" style={{ fontSize: 15, lineHeight: 1.7, margin: 0 }}>
                Private by default, ready when you’re offline, and easy to take with you.
              </Typography.Paragraph>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: compact ? "minmax(0, 1fr)" : "repeat(3, minmax(0, 1fr))", gap: 16, marginTop: compact ? 32 : 48 }}>
              <div className="reveal" style={{ gridRow: compact ? undefined : "span 2", minWidth: 0 }}>
                <div className="landing-card" style={{ position: "relative", overflow: "hidden", height: "100%", padding: compact ? 24 : 32, borderRadius: token.borderRadiusLG + 4, color: "#ffffff", background: `radial-gradient(100% 80% at 0% 0%, rgba(255, 255, 255, 0.16), transparent 60%), linear-gradient(160deg, ${BRAND_GREEN}, #24502f)` }}>
                  <LockOutlined aria-hidden style={{ position: "absolute", right: -24, bottom: -28, fontSize: 170, opacity: 0.08, pointerEvents: "none" }} />
                  <span aria-hidden className="landing-card-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 14, background: "rgba(255, 255, 255, 0.16)", fontSize: 24 }}>
                    <LockOutlined />
                  </span>
                  <Typography.Title level={3} style={{ margin: "20px 0 8px", fontSize: 22, fontWeight: 800, color: "#ffffff" }}>Private to your account</Typography.Title>
                  <Typography.Paragraph style={{ fontSize: 15, lineHeight: 1.7, color: "#ffffff", opacity: 0.9, marginBottom: 20 }}>
                    Every account only ever sees its own data. Nothing is shared unless you choose to share it.
                  </Typography.Paragraph>
                  <Flex vertical gap={10} style={{ position: "relative" }}>
                    {PRIVACY_POINTS.map((point) => (
                      <Typography.Text key={point} style={{ color: "#ffffff", fontSize: 14 }}>
                        <CheckCircleFilled style={{ marginRight: 8, opacity: 0.9 }} />
                        {point}
                      </Typography.Text>
                    ))}
                  </Flex>
                </div>
              </div>
              {EVERYDAY.map((item, index) => {
                const wide = !compact && index === EVERYDAY.length - 1;
                return (
                  <div key={item.title} className="reveal" style={{ ...delay(wide ? 1 : (index % 2) + 1), minWidth: 0, gridColumn: wide ? "1 / -1" : undefined }}>
                    <div className="landing-tile" style={{ height: "100%", display: wide ? "flex" : "block", alignItems: "center", gap: 18, padding: 22, borderRadius: token.borderRadiusLG + 4, background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}` }}>
                      <span aria-hidden style={tint(item.accent, 40)}>{item.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <Typography.Text strong style={{ display: "block", fontSize: 16, marginTop: wide ? 0 : 14 }}>{item.title}</Typography.Text>
                        <Typography.Text type="secondary" style={{ display: "block", fontSize: 14, lineHeight: 1.6, marginTop: 4 }}>{item.body}</Typography.Text>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section style={{ ...container, padding: sectionPadding }}>
          <Flex vertical align="center" className="reveal" style={{ textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
            <Eyebrow color={warm}>HOW IT WORKS</Eyebrow>
            <Typography.Title level={2} style={sectionTitle}>Up and running in a minute.</Typography.Title>
          </Flex>
          <ol className={`landing-steps${compact ? " landing-steps-vertical" : ""}`} style={{ "--steps-line": token.colorBorder, listStyle: "none", padding: 0, margin: `${compact ? 32 : 56}px 0 0`, display: "grid", gridTemplateColumns: compact ? "minmax(0, 1fr)" : "repeat(3, minmax(0, 1fr))", gap: compact ? 20 : 28 } as CSSProperties}>
            {STEPS.map((step, index) => (
              <li key={step.title} className="reveal" style={{ ...delay(index), minWidth: 0, position: "relative", display: compact ? "grid" : "flex", flexDirection: compact ? undefined : "column", gridTemplateColumns: compact ? "48px minmax(0, 1fr)" : undefined, gap: compact ? 16 : undefined }}>
                <span aria-hidden style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, margin: compact ? 0 : "0 auto 20px", borderRadius: "50%", background: `linear-gradient(135deg, ${BRAND_GREEN}, #24502f)`, color: "#ffffff", fontSize: 18, fontWeight: 800, boxShadow: `0 0 0 6px ${token.colorBgLayout}` }}>
                  {index + 1}
                </span>
                <div className="landing-card" style={{ minWidth: 0, flex: compact ? undefined : 1, padding: 24, borderRadius: token.borderRadiusLG, background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}`, textAlign: compact ? "left" : "center" }}>
                  <span aria-hidden className="landing-card-icon" style={tint(step.accent, 40)}>
                    {step.icon}
                  </span>
                  <Typography.Text type="secondary" style={{ display: "block", marginTop: 14, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>STEP {index + 1}</Typography.Text>
                  <Typography.Title level={3} style={{ margin: "4px 0 6px", fontSize: 18, fontWeight: 800 }}>{step.title}</Typography.Title>
                  <Typography.Text type="secondary" style={{ fontSize: 15, lineHeight: 1.6 }}>{step.body}</Typography.Text>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section style={{ padding: sectionPadding, background: token.colorBgContainer, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          <div style={{ ...container, display: "grid", gridTemplateColumns: compact ? "minmax(0, 1fr)" : "minmax(0, 2fr) minmax(0, 3fr)", gap: compact ? 24 : 64, alignItems: "start" }}>
            <div className="reveal" style={{ minWidth: 0 }}>
              <Eyebrow color={warm}>QUESTIONS</Eyebrow>
              <Typography.Title level={2} style={sectionTitle}>Good to know.</Typography.Title>
              <Typography.Paragraph type="secondary" style={{ fontSize: 15, lineHeight: 1.7, margin: 0, maxWidth: 380 }}>
                The short answers to what people usually ask before they start.
              </Typography.Paragraph>
            </div>
            <Collapse
              ghost
              accordion
              className="reveal landing-faq"
              expandIconPlacement="end"
              defaultActiveKey={FAQ[0].question}
              expandIcon={({ isActive }) => (
                <span aria-hidden className="landing-faq-icon" style={{ rotate: isActive ? "45deg" : "0deg", color: isActive ? token.colorTextLightSolid : token.colorPrimary, background: isActive ? BRAND_GREEN : token.colorPrimaryBg }}>
                  <PlusOutlined />
                </span>
              )}
              style={{ ...delay(1), minWidth: 0, borderTop: `1px solid ${token.colorBorderSecondary}` }}
              items={FAQ.map((item) => ({
                key: item.question,
                label: <Typography.Text strong style={{ fontSize: 16 }}>{item.question}</Typography.Text>,
                children: <Typography.Paragraph type="secondary" style={{ fontSize: 15, lineHeight: 1.7, margin: 0, maxWidth: 620 }}>{item.answer}</Typography.Paragraph>,
                style: { borderBottom: `1px solid ${token.colorBorderSecondary}`, borderRadius: 0 },
              }))}
            />
          </div>
        </section>

        <section
          style={{
            position: "relative",
            overflow: "hidden",
            padding: compact ? "64px 20px" : "104px 20px",
            color: "#ffffff",
            background: `radial-gradient(80% 120% at 0% 0%, rgba(255, 255, 255, 0.14), transparent 60%), radial-gradient(60% 90% at 100% 100%, rgba(0, 0, 0, 0.18), transparent 70%), linear-gradient(135deg, ${BRAND_GREEN} 0%, #24502f 100%)`,
          }}
        >
          <Icon name="brand" aria-hidden style={{ position: "absolute", right: compact ? -50 : "4%", bottom: compact ? -60 : -90, fontSize: compact ? 220 : 380, opacity: 0.07, margin: 0, color: "#ffffff", pointerEvents: "none" }} />
          <div className="reveal" style={{ ...container, position: "relative" }}>
            <div style={{ display: "grid", gridTemplateColumns: compact ? "minmax(0, 1fr)" : "minmax(0, 3fr) minmax(0, 2fr)", alignItems: "center", gap: compact ? 32 : 48 }}>
              <div style={{ minWidth: 0 }}>
                <Typography.Text style={{ display: "block", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#ffffff", opacity: 0.85 }}>
                  READY WHEN YOU ARE
                </Typography.Text>
                <Typography.Title level={2} style={{ ...sectionTitle, color: "#ffffff", fontSize: "clamp(28px, 4.5vw, 40px)" }}>
                  Start your private record today.
                </Typography.Title>
                <Typography.Paragraph style={{ fontSize: 16, lineHeight: 1.7, color: "#ffffff", opacity: 0.9, maxWidth: 520, marginBottom: 20 }}>
                  It takes a minute to set up, and a few seconds a day to keep going. A short tour shows you around.
                </Typography.Paragraph>
                <Flex gap={16} wrap style={{ marginBottom: 28 }}>
                  {["Private to your account", "Works offline", "Delete anytime"].map((item) => (
                    <Typography.Text key={item} style={{ color: "#ffffff", fontSize: 14 }}>
                      <CheckCircleFilled style={{ marginRight: 6, opacity: 0.9 }} />
                      {item}
                    </Typography.Text>
                  ))}
                </Flex>
                <Flex gap={8} wrap>
                  <Button size="large" href="/register" style={{ height: 48, paddingInline: 24, background: "#ffffff", color: BRAND_GREEN, borderColor: "#ffffff", fontWeight: 700 }}>
                    Create your account
                  </Button>
                  <Button size="large" href="/login" style={{ height: 48, color: "#ffffff", background: "rgba(255, 255, 255, 0.08)", borderColor: "rgba(255, 255, 255, 0.45)" }}>
                    Sign in
                  </Button>
                </Flex>
              </div>
              <div aria-hidden style={{ display: "grid", gridTemplateColumns: compact ? "repeat(auto-fit, minmax(min(100%, 150px), 1fr))" : "minmax(0, 1fr)", gap: 12, justifyItems: compact ? "stretch" : "end" }}>
                {CTA_CHIPS.map((chip, index) => (
                  <Flex
                    key={chip.label}
                    align="center"
                    gap={12}
                    className="landing-chip"
                    style={{
                      width: compact ? "100%" : 260,
                      padding: "14px 16px",
                      borderRadius: 16,
                      background: "rgba(255, 255, 255, 0.12)",
                      border: "1px solid rgba(255, 255, 255, 0.18)",
                      backdropFilter: "blur(6px)",
                      transform: compact ? undefined : `translateX(${[-24, 8, -8][index]}px)`,
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, background: "rgba(255, 255, 255, 0.16)", fontSize: 16 }}>
                      {chip.icon}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, opacity: 0.85 }}>{chip.label}</div>
                      <div style={{ fontSize: 17, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{chip.value}</div>
                    </div>
                  </Flex>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
