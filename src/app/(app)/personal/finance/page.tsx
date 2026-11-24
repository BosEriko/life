import { FinanceCategoriesCard } from "@/components/finance-categories-card";
import { FinanceLabelsCard } from "@/components/finance-labels-card";
import { WiseCard } from "@/components/wise-card";
import { PageHeading } from "@/components/page-heading";

export default function ProfileFinancePage() {
  return (
    <div>
      <PageHeading title="Finance settings" subtitle="Organize the categories and labels you pick when adding records, and connect Wise." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 20, alignItems: "start" }}>
        <FinanceCategoriesCard />
        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
          <FinanceLabelsCard />
          <WiseCard />
        </div>
      </div>
    </div>
  );
}
