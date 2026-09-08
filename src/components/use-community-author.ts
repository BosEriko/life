"use client";

import { useAuth } from "@/components/auth-provider";
import { useUnitsContext } from "@/components/units-provider";

export function useCommunityAuthorName(): string {
  const { user } = useAuth();
  const { profile } = useUnitsContext();
  return user?.displayName?.trim() || profile.name?.trim() || "";
}
