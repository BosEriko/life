"use client";

import Link from "next/link";
import { useState } from "react";
import { FirebaseError } from "firebase/app";
import { Alert, Button, Card, Flex, Form, Input, Typography } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { useAuth } from "@/components/auth-provider";

type AuthFormProps = {
  mode: "login" | "register";
};

type FormValues = {
  email: string;
  password: string;
};

const COPY = {
  login: {
    tagline: "Your private daily sanctuary for health & well-being.",
    submit: "Sign in",
    switchPrompt: "Need an account?",
    switchHref: "/register",
    switchLabel: "Register",
  },
  register: {
    tagline: "Begin tracking your personal wellness journey.",
    submit: "Register",
    switchPrompt: "Already have an account?",
    switchHref: "/login",
    switchLabel: "Sign in",
  },
} as const;

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
      default:
        return "Something went wrong. Please try again.";
    }
  }
  return "Something went wrong. Please try again.";
}

export function AuthForm({ mode }: AuthFormProps) {
  const { signIn, register } = useAuth();
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

  return (
    <Flex
      align="center"
      justify="center"
      style={{ minHeight: "100dvh", padding: 24 }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <Card>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Life Tracker
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {copy.tagline}
            </Typography.Text>
          </div>

          <Form
            layout="vertical"
            requiredMark={false}
            onFinish={onFinish}
            disabled={submitting}
          >
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, type: "email", message: "Enter a valid email." },
              ]}
            >
              <Input
                autoComplete="email"
                size="large"
                prefix={<MailOutlined />}
              />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[
                { required: true, min: 6, message: "At least 6 characters." },
              ]}
            >
              <Input.Password
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                size="large"
                prefix={<LockOutlined />}
              />
            </Form.Item>

            {error ? (
              <Alert
                type="error"
                message={error}
                showIcon
                style={{ marginBottom: 16 }}
              />
            ) : null}

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={submitting}
            >
              {copy.submit}
            </Button>
          </Form>

          <Typography.Paragraph
            style={{ textAlign: "center", marginTop: 16, marginBottom: 0 }}
          >
            {copy.switchPrompt} <Link href={copy.switchHref}>{copy.switchLabel}</Link>
          </Typography.Paragraph>
        </Card>
      </div>
    </Flex>
  );
}
