"use client";

import { useAuth } from "@/components/auth-provider";

export default function Home() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">life.boseriko.com</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Signed in as {user?.email}
      </p>
      <button
        onClick={() => signOut()}
        className="rounded-full border border-black/[.08] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
      >
        Sign out
      </button>
    </div>
  );
}
