import { MainMenuCard } from "@/components/main-menu-card";
import { PageHeading } from "@/components/page-heading";
import { RestartOnboardingCard } from "@/components/restart-onboarding-card";

export default function ProfileAppPage() {
  return (
    <div>
      <PageHeading title="App settings" subtitle="Arrange your menu and revisit the getting-started guide." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 20, alignItems: "start" }}>
        <MainMenuCard />
        <RestartOnboardingCard />
      </div>
    </div>
  );
}
