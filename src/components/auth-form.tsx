"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/components/auth-provider";

type AuthFormProps = {
  mode: "login" | "register";
};

const COPY = {
  login: {
    heading: "Sign in",
    submit: "Sign in",
    switchPrompt: "Need an account?",
    switchHref: "/register",
    switchLabel: "Register",
  },
  register: {
    heading: "Create account",
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const copy = COPY[mode];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        await register(email, password);
      }
    } catch (err) {
      setError(messageForError(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-6 rounded-2xl border border-black/[.08] p-8 dark:border-white/[.145]"
      >
        <h1 className="text-2xl font-semibold tracking-tight">{copy.heading}</h1>

        <div className="space-y-4">
          <label className="block space-y-1.5 text-sm font-medium">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-base outline-none focus:border-black dark:border-white/[.2] dark:focus:border-white"
            />
          </label>

          <label className="block space-y-1.5 text-sm font-medium">
            <span>Password</span>
            <input
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-base outline-none focus:border-black dark:border-white/[.2] dark:focus:border-white"
            />
          </label>
        </div>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Please wait…" : copy.submit}
        </button>

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {copy.switchPrompt}{" "}
          <Link
            href={copy.switchHref}
            className="font-medium text-foreground underline"
          >
            {copy.switchLabel}
          </Link>
        </p>
      </form>
    </div>
  );
}
