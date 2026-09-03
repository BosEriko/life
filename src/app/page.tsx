"use client";

import { useAuth } from "@/components/auth-provider";
import { DailyTracker } from "@/components/daily-tracker";

export default function Home() {
  const { user, signOut } = useAuth();

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-16">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            life.boseriko.com
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {user?.email}
          </p>
        </div>
        <button
          onClick={() => signOut()}
          className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
        >
          Sign out
        </button>
      </header>

      <DailyTracker />
    </div>
  );
}
