"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { FirebaseError } from "firebase/app";
import {
  Alert,
  Button,
  Divider,
  Flex,
  Form,
  Grid,
  Input,
  theme,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  CheckSquareOutlined,
  GoogleOutlined,
  HeartOutlined,
  LockOutlined,
  MailOutlined,
  SafetyOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/components/auth-provider";
import { DeviceScreenshot } from "@/components/device-screenshot";
import { Icon } from "@/components/icon";

type AuthFormProps = {
  mode: "login" | "register";
};

type FormValues = {
  email: string;
  password: string;
};

const COPY = {
  login: {
    panelTitle: "Welcome back.",
    panelBody: "Your entries, plans and money are right where you left them.",
    title: "Sign in",
    subtitle: "Good to see you again.",
    submit: "Sign in",
    switchPrompt: "Need an account?",
    switchHref: "/register",
    switchLabel: "Create one",
  },
  register: {
    panelTitle: "Start your private record.",
    panelBody: "A calm place for your health, plans and money. Setting up takes a minute.",
    title: "Create your account",
    subtitle: "A short tour will show you around once you’re in.",
    submit: "Create account",
    switchPrompt: "Already have an account?",
    switchHref: "/login",
    switchLabel: "Sign in",
  },
} as const;

const BRAND_GREEN = "#316342";

const TRUST = ["Private to your account", "Works offline", "Delete anytime"];

const CHIPS: { icon: ReactNode; label: string; value: string }[] = [
  { icon: <HeartOutlined />, label: "Weight this week", value: "70.3 kg" },
  { icon: <CheckSquareOutlined />, label: "Routines done today", value: "3 of 4" },
  { icon: <WalletOutlined />, label: "Emergency fund", value: "4.8 months" },
];

function messageForError(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-email":
        return "That email address is not valid.";
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Incorrect email or password.";
      case "auth/email-already-in-use":
        return "An account already exists for that email.";
      case "auth/weak-password":
        return "Password should be at least 6 characters.";
      case "auth/too-many-requests":
        return "Too many attempts. Try again later.";
      case "auth/account-exists-with-different-credential":
        return "An account already exists with this email. Sign in with the method you used originally.";
      case "auth/popup-blocked":
        return "Your browser blocked the sign-in popup. Allow popups and try again.";
      case "auth/unauthorized-domain":
        return "This domain is not authorized for sign-in.";
      default:
        return "Something went wrong. Please try again.";
    }
  }
  return "Something went wrong. Please try again.";
}

const DISMISSED_POPUP_CODES = [
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/user-cancelled",
];

export function AuthForm({ mode }: AuthFormProps) {
  const { signIn, register, signInWithGoogle } = useAuth();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const compact = screens.md !== true;
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const copy = COPY[mode];

  async function onFinish(values: FormValues) {
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await signIn(values.email, values.password);
      } else {
        await register(values.email, values.password);
      }
    } catch (err) {
      setError(messageForError(err));
      setSubmitting(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      if (
        err instanceof FirebaseError &&
        DISMISSED_POPUP_CODES.includes(err.code)
      ) {
        setSubmitting(false);
        return;
      }
      setError(messageForError(err));
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: compact ? "minmax(0, 1fr)" : "minmax(0, 5fr) minmax(0, 6fr)", minHeight: "100dvh", background: token.colorBgLayout }}>
      {!compact && (
        <aside
          style={{
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            padding: "32px 48px 40px",
            color: "#ffffff",
            background: `radial-gradient(80% 60% at 0% 0%, rgba(255, 255, 255, 0.14), transparent 60%), linear-gradient(160deg, ${BRAND_GREEN} 0%, #24502f 100%)`,
          }}
        >
          <Icon name="brand" style={{ position: "absolute", right: -60, bottom: -80, fontSize: 380, opacity: 0.07, margin: 0, color: "#ffffff", pointerEvents: "none" }} />
          <Link href="/" aria-label="Life Tracker home" style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 10, color: "#ffffff", textDecoration: "none", alignSelf: "flex-start" }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255, 255, 255, 0.16)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="brand" style={{ margin: 0, opacity: 1, color: "#ffffff", fontSize: 17 }} />
            </span>
            <span style={{ fontSize: 17, fontWeight: 800 }}>Life Tracker</span>
          </Link>
          <div className="landing-hero-in" style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 32, paddingBlock: 40 }}>
            <div>
              <Typography.Title level={2} style={{ margin: 0, color: "#ffffff", fontSize: "clamp(30px, 3.2vw, 40px)", fontWeight: 800, lineHeight: 1.15 }}>{copy.panelTitle}</Typography.Title>
              <Typography.Paragraph style={{ margin: "12px 0 0", color: "#ffffff", opacity: 0.88, fontSize: 16, lineHeight: 1.6, maxWidth: 420 }}>{copy.panelBody}</Typography.Paragraph>
            </div>
            <Flex align="center" gap={24}>
              <div style={{ width: 200, flexShrink: 0 }}>
                <DeviceScreenshot name="phone" alt="" width={780} height={1688} device="phone" path="/" sizes="200px" frameHeight={400} priority />
              </div>
              <Flex vertical gap={12} style={{ minWidth: 0 }}>
                {CHIPS.map((chip) => (
                  <Flex key={chip.label} align="center" gap={12} style={{ padding: "12px 14px", borderRadius: 16, background: "rgba(255, 255, 255, 0.12)", border: "1px solid rgba(255, 255, 255, 0.18)" }}>
                    <span aria-hidden style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 10, background: "rgba(255, 255, 255, 0.16)", fontSize: 15 }}>{chip.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, opacity: 0.85 }}>{chip.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{chip.value}</div>
                    </div>
                  </Flex>
                ))}
              </Flex>
            </Flex>
          </div>
          <Flex gap={16} wrap style={{ position: "relative" }}>
            {TRUST.map((item) => (
              <Typography.Text key={item} style={{ color: "#ffffff", fontSize: 13, opacity: 0.92 }}>
                <CheckCircleFilled style={{ marginRight: 6 }} />
                {item}
              </Typography.Text>
            ))}
          </Flex>
        </aside>
      )}

      <main style={{ display: "flex", flexDirection: "column", minWidth: 0, padding: compact ? "20px 20px 32px" : "32px 48px" }}>
        <Flex align="center" justify="space-between" gap={12} wrap>
          {compact ? (
            <Link href="/" aria-label="Life Tracker home" style={{ display: "inline-flex", alignItems: "center", gap: 10, color: token.colorText, textDecoration: "none" }}>
              <span style={{ width: 32, height: 32, borderRadius: 9, background: token.colorPrimary, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="brand" style={{ margin: 0, opacity: 1, color: token.colorTextLightSolid, fontSize: 16 }} />
              </span>
              <span style={{ fontSize: 16, fontWeight: 800 }}>Life Tracker</span>
            </Link>
          ) : (
            <Link href="/" style={{ color: token.colorTextSecondary, fontSize: 14 }}>
              <ArrowLeftOutlined style={{ marginRight: 8 }} />
              Back to home
            </Link>
          )}
          <Typography.Text type="secondary" style={{ fontSize: 14 }}>
            {copy.switchPrompt} <Link href={copy.switchHref} style={{ fontWeight: 600 }}>{copy.switchLabel}</Link>
          </Typography.Text>
        </Flex>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", paddingBlock: compact ? 32 : 48 }}>
          <div className="landing-hero-in" style={{ width: "100%", maxWidth: 400 }}>
            <Typography.Title level={1} style={{ margin: 0, fontSize: compact ? 28 : 32, fontWeight: 800, lineHeight: 1.2 }}>{copy.title}</Typography.Title>
            <Typography.Paragraph type="secondary" style={{ margin: "8px 0 28px", fontSize: 15 }}>{copy.subtitle}</Typography.Paragraph>

            <Button size="large" block icon={<GoogleOutlined />} disabled={submitting} onClick={onGoogle} style={{ height: 48, fontWeight: 600 }}>
              Continue with Google
            </Button>

            <Divider plain style={{ margin: "24px 0", fontSize: 12, color: token.colorTextSecondary }}>
              or with email
            </Divider>

            <Form layout="vertical" requiredMark={false} onFinish={onFinish} disabled={submitting}>
              <Form.Item label="Email" name="email" rules={[{ required: true, type: "email", message: "Enter a valid email." }]}>
                <Input autoComplete="email" size="large" prefix={<MailOutlined />} placeholder="you@example.com" />
              </Form.Item>

              <Form.Item
                label="Password"
                name="password"
                extra={mode === "register" ? "At least 6 characters." : undefined}
                rules={[{ required: true, min: 6, message: "At least 6 characters." }]}
              >
                <Input.Password autoComplete={mode === "login" ? "current-password" : "new-password"} size="large" prefix={<LockOutlined />} />
              </Form.Item>

              {error ? <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} /> : null}

              <Button type="primary" htmlType="submit" size="large" block loading={submitting} style={{ height: 48, fontWeight: 700 }}>
                {copy.submit}
              </Button>
            </Form>

            {compact && (
              <Flex gap={14} wrap justify="center" style={{ marginTop: 28 }}>
                {TRUST.map((item) => (
                  <Typography.Text key={item} type="secondary" style={{ fontSize: 12 }}>
                    <SafetyOutlined style={{ marginRight: 6, color: token.colorPrimary }} />
                    {item}
                  </Typography.Text>
                ))}
              </Flex>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
