import { DeleteAccountCard } from "@/components/delete-account-card";
import { PageHeading } from "@/components/page-heading";
import { ReportCard } from "@/components/report-card";

export default function ProfileDataPage() {
  return (
    <div>
      <PageHeading title="Data & account" subtitle="Take a copy of your history, or close your account." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 20, alignItems: "start" }}>
        <ReportCard />
        <DeleteAccountCard />
      </div>
    </div>
  );
}
