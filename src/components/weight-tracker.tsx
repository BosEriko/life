"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  saveWeight,
  todayKey,
  watchWeights,
  type WeightEntry,
} from "@/lib/weights";

const inputClass =
  "w-full rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-base outline-none focus:border-black dark:border-white/[.2] dark:focus:border-white";

export function WeightTracker() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [date, setDate] = useState(todayKey());
  const [kg, setKg] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    return watchWeights(
      user.uid,
      (next) => {
        setEntries(next);
        setLoaded(true);
      },
      () => {
        setError("Could not load your entries.");
        setLoaded(true);
      },
    );
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    const value = Number(kg);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a valid weight.");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await saveWeight(user.uid, date, value);
      setKg("");
    } catch {
      setError("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-black/[.08] p-6 dark:border-white/[.145]"
      >
        <h2 className="text-lg font-semibold tracking-tight">Log weight</h2>

        <div className="flex gap-3">
          <label className="flex-1 space-y-1.5 text-sm font-medium">
            <span>Date</span>
            <input
              type="date"
              required
              max={todayKey()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="w-32 space-y-1.5 text-sm font-medium">
            <span>Weight (kg)</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="1"
              required
              value={kg}
              onChange={(event) => setKg(event.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">Recent</h2>
        {!loaded ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-zinc-500">No entries yet.</p>
        ) : (
          <ul className="divide-y divide-black/[.06] rounded-2xl border border-black/[.08] dark:divide-white/[.08] dark:border-white/[.145]">
            {entries.map((entry) => (
              <li
                key={entry.date}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span className="text-zinc-600 dark:text-zinc-400">
                  {entry.date}
                </span>
                <span className="font-medium tabular-nums">{entry.kg} kg</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
