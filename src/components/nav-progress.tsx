"use client";

import { usePathname } from "next/navigation";
import { theme } from "antd";
import { useAuth } from "@/components/auth-provider";

export function NavProgress() {
  const pathname = usePathname();
  const { loading } = useAuth();
  const { token } = theme.useToken();

  if (loading) {
    return (
      <div
        aria-hidden
        className="nav-progress nav-progress-indeterminate"
        style={{ background: token.colorPrimary }}
      />
    );
  }

  return (
    <div
      key={pathname}
      aria-hidden
      className="nav-progress nav-progress-flash"
      style={{ background: token.colorPrimary }}
    />
  );
}
