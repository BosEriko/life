"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Flex } from "antd";
import { useAuth } from "@/components/auth-provider";
import { BrandLoader } from "@/components/brand-loader";

const AUTH_ROUTES = ["/login", "/register"];

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isPublicRoute =
    pathname === "/" || isAuthRoute || pathname.startsWith("/s/");

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublicRoute) {
      router.replace("/login");
    }
    if (user && isAuthRoute) {
      router.replace("/");
    }
  }, [user, loading, isPublicRoute, isAuthRoute, router]);

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "100dvh" }}>
        <BrandLoader size={52} />
      </Flex>
    );
  }

  if (!user && !isPublicRoute) return null;
  if (user && isAuthRoute) return null;

  return <>{children}</>;
}
