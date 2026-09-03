"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  saveDaily,
  todayKey,
  watchDailies,
  type DailyEntry,
  type DailyInput,
} from "@/lib/dailies";

const inputClass =
  "w-full rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-base outline-none focus:border-black dark:border-white/[.2] dark:focus:border-white";

function formatEntry(entry: DailyEntry): string {
  const parts: string[] = [];
  if (entry.weight != null) parts.push(`${entry.weight} kg`);
  if (entry.systolic != null && entry.diastolic != null) {
    parts.push(`${entry.systolic}/${entry.diastolic}`);
  }
  return parts.join(" · ") || "—";
}

export function DailyTracker() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [date, setDate] = useState(todayKey());
  const [weight, setWeight] = useState("");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    return watchDailies(
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

    const input: DailyInput = {};

    if (weight.trim() !== "") {
      const value = Number(weight);
      if (!Number.isFinite(value) || value <= 0) {
        setError("Enter a valid weight.");
        return;
      }
      input.weight = value;
    }

    const hasSystolic = systolic.trim() !== "";
    const hasDiastolic = diastolic.trim() !== "";
    if (hasSystolic || hasDiastolic) {
      const sys = Number(systolic);
      const dia = Number(diastolic);
      if (
        !hasSystolic ||
        !hasDiastolic ||
        !Number.isInteger(sys) ||
        !Number.isInteger(dia) ||
        sys <= 0 ||
        dia <= 0
      ) {
        setError("Enter both blood pressure numbers as whole values.");
        return;
      }
      input.systolic = sys;
      input.diastolic = dia;
    }

    if (Object.keys(input).length === 0) {
      setError("Enter at least one value.");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await saveDaily(user.uid, date, input);
      setWeight("");
      setSystolic("");
      setDiastolic("");
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
        <h2 className="text-lg font-semibold tracking-tight">Log daily</h2>

        <label className="block space-y-1.5 text-sm font-medium">
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

        <label className="block space-y-1.5 text-sm font-medium">
          <span>Weight (kg)</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="1"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            className={inputClass}
          />
        </label>

        <div className="space-y-1.5 text-sm font-medium">
          <span>Blood pressure (mmHg)</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              placeholder="Systolic"
              value={systolic}
              onChange={(event) => setSystolic(event.target.value)}
              className={inputClass}
            />
            <span className="text-zinc-400">/</span>
            <input
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              placeholder="Diastolic"
              value={diastolic}
              onChange={(event) => setDiastolic(event.target.value)}
              className={inputClass}
            />
          </div>
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
                <span className="font-medium tabular-nums">
                  {formatEntry(entry)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
