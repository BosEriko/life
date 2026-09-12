import { InviteViewer } from "@/components/invite-viewer";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <InviteViewer code={code} />;
}
