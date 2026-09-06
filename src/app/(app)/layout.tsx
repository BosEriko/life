import { AppFooter } from "@/components/app-footer";
import { DashboardHeader } from "@/components/dashboard-header";
import { MobileNav } from "@/components/mobile-nav";
import { UnitsProvider } from "@/components/units-provider";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <UnitsProvider>
      <div
        style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}
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
        <AppFooter />
        <MobileNav />
      </div>
    </UnitsProvider>
  );
}
