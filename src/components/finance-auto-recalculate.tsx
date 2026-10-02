"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { useHealthData } from "@/components/health-data-provider";
import { useFinanceHistory } from "@/components/use-health-history";
import { recalculateFinanceAccounts } from "@/models/users/finance";

const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const attempted = new Set<string>();

export function FinanceAutoRecalculate() {
  const { user } = useAuth();
  const { financeReady, financeError, financeAccounts, financeLastRecalculatedAt, cutoff } = useHealthData();
  const { forRecalculation } = useFinanceHistory(false, cutoff);
  const hasAccounts = financeAccounts.length > 0;

  useEffect(() => {
    if (!user || !financeReady || financeError || !hasAccounts || !navigator.onLine) return;
    const last = financeLastRecalculatedAt ? Date.parse(financeLastRecalculatedAt) : 0;
    if (Date.now() - last < COOLDOWN_MS || attempted.has(user.uid)) return;
    attempted.add(user.uid);
    forRecalculation()
      .then(({ records, revision }) => recalculateFinanceAccounts(user.uid, records, revision))
      .catch(() => attempted.delete(user.uid));
  }, [user, financeReady, financeError, hasAccounts, financeLastRecalculatedAt, forRecalculation]);

  return null;
}
