import type { Metadata } from "next";
import { InviteViewer } from "@/components/invite-viewer";

const TITLE = "Shared Life Tracker data";
const DESCRIPTION =
  "Someone shared a 7-day health summary with you via Life Tracker — no sign-in needed to view it.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Life Tracker",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <InviteViewer code={code} />;
}
