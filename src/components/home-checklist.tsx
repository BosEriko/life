"use client";

import { usePathname } from "next/navigation";
import { GettingStarted } from "@/components/getting-started";
import { useNav } from "@/components/use-nav";

export function HomeChecklist() {
  const pathname = usePathname();
  const { home } = useNav();
  return pathname === home ? <GettingStarted /> : null;
}
