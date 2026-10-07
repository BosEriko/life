"use client";

import { AppFooter } from "@/components/app-footer";
import { AppTourProvider } from "@/components/app-tour";
import { useAuth } from "@/components/auth-provider";
import { DashboardHeader } from "@/components/dashboard-header";
import { HealthDataProvider } from "@/components/health-data-provider";
import { MobileNav } from "@/components/mobile-nav";
import { ReportDownload } from "@/components/report-download";
import { SectionIntro } from "@/components/section-intro";
import { UnitsProvider } from "@/components/units-provider";

export default function AppLayout({ children }: LayoutProps<"/">) {
  const { user } = useAuth();

  if (!user) return <>{children}</>;

  return (
    <UnitsProvider>
      <HealthDataProvider>
        <AppTourProvider>
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
            <SectionIntro />
            <>{children}</>
          </main>
          <ReportDownload />
          <AppFooter />
          <MobileNav />
        </div>
        </AppTourProvider>
      </HealthDataProvider>
    </UnitsProvider>
  );
}
