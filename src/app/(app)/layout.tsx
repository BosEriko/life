"use client";

import { AppFooter } from "@/components/app-footer";
import { useAuth } from "@/components/auth-provider";
import { DashboardHeader } from "@/components/dashboard-header";
import { HealthDataProvider } from "@/components/health-data-provider";
import { MobileNav } from "@/components/mobile-nav";
import { ReportDownload } from "@/components/report-download";
import { UnitsProvider } from "@/components/units-provider";

export default function AppLayout({ children }: LayoutProps<"/">) {
  const { user } = useAuth();

  if (!user) return <>{children}</>;

  return (
    <UnitsProvider>
      <HealthDataProvider>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: "100dvh",
          }}
        >
          <DashboardHeader />
          <main
            className="app-shell"
            style={{
              flex: 1,
              width: "100%",
              maxWidth: 1200,
              margin: "0 auto",
              padding: "32px 20px 56px",
            }}
          >
            {children}
          </main>
          <ReportDownload />
          <AppFooter />
          <MobileNav />
        </div>
      </HealthDataProvider>
    </UnitsProvider>
  );
}
