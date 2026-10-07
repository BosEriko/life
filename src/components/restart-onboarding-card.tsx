"use client";

import { useRouter } from "next/navigation";
import { App, Button, Card, Typography } from "antd";
import { CompassOutlined } from "@ant-design/icons";
import { useAuth } from "@/components/auth-provider";
import { saveOnboarding } from "@/models/users/profile";

export function RestartOnboardingCard() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const router = useRouter();

  function restart() {
    if (!user) return;
    saveOnboarding(user.uid, {
      checklistDismissed: false,
      welcomeTourDone: false,
      introsDismissed: { journal: false, finance: false, records: false },
    }).catch(() => message.error("Could not restart the getting-started guide."));
    router.push("/?tour=welcome");
  }

  return (
    <Card
      size="small"
      title={
        <>
          <CompassOutlined style={{ marginRight: 8 }} />
          Getting started
        </>
      }
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginTop: 0, marginBottom: 16 }}>
        Bring back the tour, checklist, and tips.
      </Typography.Paragraph>
      <Button icon={<CompassOutlined />} onClick={restart}>
        Restart guide
      </Button>
    </Card>
  );
}
