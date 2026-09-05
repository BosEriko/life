"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "antd";
import { useAuth } from "@/components/auth-provider";
import { useSaveStatus } from "@/components/save-status";
import { listOutboxItems } from "@/lib/daily-outbox";
import { resolveConflict, syncOutbox, type DailyConflict } from "@/lib/daily-sync";
import { SyncConflictModal } from "@/components/sync-conflict-modal";

export function OfflineSync() {
  const { user } = useAuth();
  const { state: status, setState: setStatus } = useSaveStatus();
  const [conflicts, setConflicts] = useState<DailyConflict[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const refreshPending = useCallback(() => {
    setPendingCount(user ? listOutboxItems(user.uid).length : 0);
  }, [user]);

  const runSync = useCallback(async () => {
    await Promise.resolve();
    if (!user || !navigator.onLine) {
      refreshPending();
      return;
    }
    const result = await syncOutbox(user.uid);
    setConflicts(result);
    if (result.length === 0 && statusRef.current === "offline") {
      setStatus("idle");
    }
    refreshPending();
  }, [user, setStatus, refreshPending]);

  useEffect(() => {
    Promise.resolve().then(runSync);
    window.addEventListener("online", runSync);
    document.addEventListener("visibilitychange", runSync);
    return () => {
      window.removeEventListener("online", runSync);
      document.removeEventListener("visibilitychange", runSync);
    };
  }, [runSync]);

  async function handleResolve(date: string, choice: "mine" | "cloud") {
    const conflict = conflicts.find((item) => item.date === date);
    if (!user || !conflict) return;
    await resolveConflict(user.uid, date, choice, conflict.mine);
    const remaining = conflicts.filter((item) => item.date !== date);
    setConflicts(remaining);
    if (remaining.length === 0 && status === "offline") {
      setStatus("idle");
    }
    refreshPending();
  }

  return (
    <>
      {pendingCount > 0 && conflicts.length === 0 && (
        <Alert
          type="warning"
          showIcon
          closable
          message={
            pendingCount === 1
              ? "1 day saved offline — will sync when you're back online."
              : `${pendingCount} days saved offline — will sync when you're back online.`
          }
          style={{ marginBottom: 24 }}
        />
      )}
      {conflicts.length > 0 && (
        <SyncConflictModal conflicts={conflicts} onResolve={handleResolve} />
      )}
    </>
  );
}
