import { MedicalTagsCard } from "@/components/medical-tags-card";
import { PageHeading } from "@/components/page-heading";

export default function ProfileMedicalPage() {
  return (
    <div>
      <PageHeading title="Medical information" subtitle="Allergies, conditions and medications, kept alongside your health records." />
      <div style={{ maxWidth: 720 }}>
        <MedicalTagsCard />
      </div>
    </div>
  );
}
