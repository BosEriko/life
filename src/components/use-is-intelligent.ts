"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { watchClaudeAccess } from "@/models/claude-access";

/**
 * Whether the current user may use Claude features (nutrition autofill). Toggled
 * per user from the Admin page ("Claude autofill" column).
 */
export function useIsIntelligent(): boolean {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!user) return;
    return watchClaudeAccess(user.uid, setEnabled, () => {});
  }, [user]);

  return enabled;
}
