import { FinanceCategoriesCard } from "@/components/finance-categories-card";
import { PageHeading } from "@/components/page-heading";

export default function ProfileFinancePage() {
  return (
    <div>
      <PageHeading title="Finance settings" subtitle="Organize the categories you pick when adding records." />
      <div style={{ maxWidth: 720 }}>
        <FinanceCategoriesCard />
      </div>
    </div>
  );
}
