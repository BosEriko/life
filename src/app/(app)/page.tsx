"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Flex, Spin } from "antd";
import { useAuth } from "@/components/auth-provider";
import { LandingPage } from "@/components/landing-page";
import { useUnitsContext } from "@/components/units-provider";
import { useNav } from "@/components/use-nav";

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { ready } = useUnitsContext();
  const { home } = useNav();

  useEffect(() => {
    if (user && ready) router.replace(home + window.location.search + window.location.hash);
  }, [user, ready, home, router]);

  if (!user) return <LandingPage />;
  return (
    <Flex justify="center" style={{ padding: 48 }}>
      <Spin />
    </Flex>
  );
}
