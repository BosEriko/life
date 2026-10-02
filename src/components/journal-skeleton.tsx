"use client";

import { Card, Skeleton, theme } from "antd";

export function JournalSkeleton() {
  const { token } = theme.useToken();
  const card = { boxShadow: token.boxShadowTertiary };

  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton active title={{ width: 180 }} paragraph={{ rows: 1, width: 320 }} style={{ marginBottom: 24 }} />
      <div className="journal-skeleton">
        <Card style={card}>
          <Skeleton active title={false} paragraph={{ rows: 5 }} />
        </Card>
        <Card style={card}>
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      </div>
    </div>
  );
}
