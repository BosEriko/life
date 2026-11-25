"use client";

import { Card, Flex, Typography, theme } from "antd";
import { InfoCircleOutlined, InteractionOutlined } from "@ant-design/icons";
import { accountTextColor, debtProgress, money, type FinanceAccount, type FinanceRecord, FINANCE_STATUS_COLORS } from "@/lib/finance";
import { Tip } from "@/components/tip";

const STOPS = [FINANCE_STATUS_COLORS.low, FINANCE_STATUS_COLORS.fair, FINANCE_STATUS_COLORS.good];

function progressColor(progress: number) {
  const scaled = Math.min(1, Math.max(0, progress)) * (STOPS.length - 1);
  const index = Math.min(STOPS.length - 2, Math.floor(scaled));
  const mix = scaled - index;
  const channels = (hex: string) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  const [from, to] = [channels(STOPS[index]), channels(STOPS[index + 1])];
  return `#${from.map((value, channel) => Math.round(value + (to[channel] - value) * mix).toString(16).padStart(2, "0")).join("")}`;
}

type Side = NonNullable<ReturnType<typeof debtProgress>>["owe"];

export function DebtProgressCard({ accounts, records }: { accounts: FinanceAccount[]; records: FinanceRecord[] }) {
  const { token } = theme.useToken();
  const progress = debtProgress(accounts, records);
  if (!progress || (progress.owe.total === 0 && progress.owed.total === 0)) return null;
  const { currency } = progress;
  const color = progressColor((progress.owe.total > 0 ? progress.owe.progress : progress.owed.progress) ?? 0);
  const formula = `Only people who aren't hidden, in ${currency}${progress.otherCurrencies ? ` (${progress.otherCurrencies} in other currencies left out)` : ""}. Paid is everything you've repaid them; collected is everything they've paid you back. The rest is what's still open.`;

  return (
    <Card role="status" styles={{ body: { padding: 20 } }} style={{ marginBottom: 24, position: "relative", overflow: "hidden", background: color, borderColor: color, color: accountTextColor(color), transition: "background 300ms ease", boxShadow: token.boxShadowTertiary }}>
      <InteractionOutlined aria-hidden style={{ position: "absolute", right: -10, bottom: -13, fontSize: 96, opacity: 0.14, pointerEvents: "none" }} />
      <div style={{ position: "relative" }}>
        <Flex align="center" gap={10} wrap>
          <Typography.Text strong style={{ color: "inherit" }}><InteractionOutlined style={{ marginRight: 8 }} />Debt progress</Typography.Text>
          <Tip title={formula} placement="bottom">
            <InfoCircleOutlined aria-label={formula} style={{ opacity: 0.85, cursor: "help" }} />
          </Tip>
        </Flex>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 24, marginTop: 16 }}>
          {progress.owe.total > 0 && <Meter title="You owe" done="paid" side={progress.owe} currency={currency} />}
          {progress.owed.total > 0 && <Meter title="Owed to you" done="collected" side={progress.owed} currency={currency} />}
        </div>
      </div>
    </Card>
  );
}

function Meter({ title, done, side, currency }: { title: string; done: string; side: Side; currency: string }) {
  const percent = Math.round((side.progress ?? 0) * 100);
  return (
    <div style={{ minWidth: 0 }}>
      <Flex justify="space-between" align="baseline" gap={8} wrap>
        <span style={{ fontSize: 12, opacity: 0.9 }}>{title}</span>
        <span style={{ fontWeight: 600 }}>{side.remaining > 0 ? `${money(side.remaining, currency)} left` : "All settled"}</span>
      </Flex>
      <div role="meter" aria-label={`${title}: ${percent}% ${done}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} style={{ height: 8, borderRadius: 999, background: "rgba(0, 0, 0, 0.22)", marginTop: 8 }}>
        <div style={{ width: `${percent}%`, height: "100%", borderRadius: 999, background: "currentColor" }} />
      </div>
      <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" }}>
        {money(side.settled, currency)} of {money(side.total, currency)} {done} · {percent}%
      </div>
    </div>
  );
}
