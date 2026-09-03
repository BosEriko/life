"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";

const PUBLIC_ROUTES = ["/login", "/register"];

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublicRoute) {
      router.replace("/login");
    }
    if (user && isPublicRoute) {
      router.replace("/");
    }
  }, [user, loading, isPublicRoute, router]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  if (!user && !isPublicRoute) return null;
  if (user && isPublicRoute) return null;

  return <>{children}</>;
}
