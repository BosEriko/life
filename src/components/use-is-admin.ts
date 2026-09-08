"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { isAdminEmail } from "@/lib/admin";
import { watchAdminRole } from "@/models/admin-role";

export function useIsAdmin(): boolean {
  const { user } = useAuth();
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    if (!user) return;
    return watchAdminRole(user.uid, setGranted, () => {});
  }, [user]);

  return isAdminEmail(user?.email) || granted;
}
