"use client";

import { useState } from "react";
import { Alert, App, Button, Card, Empty, Flex, Grid, Input, Pagination, Select, Spin, Tag, Typography, theme } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, SwapOutlined, WalletOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { PageHeading } from "@/components/page-heading";
import { FinanceAccountModal } from "@/components/finance-account-modal";
import { FinanceRecordModal } from "@/components/finance-record-modal";
import { useAuth } from "@/components/auth-provider";
import { useHealthData } from "@/components/health-data-provider";
import { useFinanceHistory } from "@/components/use-health-history";
import { ACCOUNT_TYPES, accountTextColor, financeStatistics, money, type FinanceAccount } from "@/lib/finance";
import { mergeById } from "@/lib/merge-records";
import { recalculateFinanceAccounts } from "@/models/finance";

export function FinanceWorkspace({ view }: { view: "dashboard" | "accounts" | "records" }) {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { user } = useAuth();
  const screens = Grid.useBreakpoint();
  const { financeAccounts: allAccounts, financeRecords: records, financeReady, financeError, cutoff } = useHealthData();
  const accounts = allAccounts.filter((account) => !account.deletedAt);
  const history = useFinanceHistory(view === "records", cutoff);
  const [modal, setModal] = useState<"account" | "record" | null>(null);
  const [editingAccount, setEditingAccount] = useState<FinanceAccount | null>(null);
  const [accountId, setAccountId] = useState("all");
  const [recordType, setRecordType] = useState("all");
  const [search, setSearch] = useState("");
  const [accountType, setAccountType] = useState("all");
  const [currency, setCurrency] = useState("all");
  const [statisticsFilter, setStatisticsFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [recalculating, setRecalculating] = useState(false);
  const accountNames = new Map(allAccounts.map((account) => [account.id, `${account.name}${account.deletedAt ? " (deleted)" : ""}`]));
  const allRecords = mergeById(records, history.rows);
  const query = search.trim().toLowerCase();
  const filteredAccounts = accounts.filter((account) => (accountType === "all" || account.type === accountType)
    && (currency === "all" || account.currency === currency)
    && (statisticsFilter === "all" || account.excludeFromStatistics === (statisticsFilter === "excluded"))
    && (!query || account.name.toLowerCase().includes(query)));
  const filtered = allRecords.filter((record) =>
    (accountId === "all" || record.accountId === accountId || record.destinationId === accountId)
    && (recordType === "all" || record.type === recordType)
    && (!query || [record.description, record.category, ...record.labels, accountNames.get(record.accountId), accountNames.get(record.destinationId ?? "")].join(" ").toLowerCase().includes(query)),
  ).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 20)));
  const month = dayjs().format("YYYY-MM");
  const statistics = financeStatistics(records.filter((record) => record.date.startsWith(month)), accounts);

  function recalculate() {
    if (!user || recalculating) return;
    setRecalculating(true);
    void history.forRecalculation()
      .then(({ records: fullHistory, revision }) => recalculateFinanceAccounts(user.uid, fullHistory, revision))
      .then(() => message.success("Account balances recalculated."))
      .catch((error: unknown) => message.error(error instanceof Error && error.message.startsWith("Records changed") ? error.message : "Could not recalculate. Connect to the internet, let your records sync, and try again."))
      .finally(() => setRecalculating(false));
  }

  return (
    <div style={{ minWidth: 0, paddingRight: screens.md === true ? 56 : 0 }}>
      <PageHeading title={view === "dashboard" ? "Finance" : view === "accounts" ? "Accounts" : "Records"} subtitle={view === "dashboard" ? "Your accounts, everyday spending, and money coming in." : view === "accounts" ? "Your money, organized by account." : "Every expense, income, and transfer in one place."} extra={<>
        {view !== "records" && <Button icon={<ReloadOutlined />} loading={recalculating} disabled={!financeReady || financeError || accounts.length === 0 || recalculating} onClick={recalculate}>Recalculate</Button>}
        <Button icon={<WalletOutlined />} disabled={!financeReady || financeError} onClick={() => setModal("account")}>Add account</Button>
        <Button type="primary" icon={<PlusOutlined />} disabled={!financeReady || financeError || accounts.length === 0} onClick={() => setModal("record")}>Add record</Button>
      </>} />
      {financeError && <Alert type="error" title="Could not load your finance data. Reload to try again." style={{ marginBottom: 24 }} />}
      {!financeReady ? <Spin /> : <>
        {view !== "records" && <>
        {view === "dashboard" ? <Typography.Title level={2} style={{ fontSize: 18, marginBottom: 16 }}>Accounts</Typography.Title> : <Flex gap={12} wrap style={{ marginBottom: 20 }}>
          <Input aria-label="Search accounts" prefix={<SearchOutlined />} placeholder="Search accounts…" value={search} onChange={(event) => setSearch(event.target.value)} allowClear style={{ flex: "1 1 200px", minWidth: 0 }} />
          <Select aria-label="Filter accounts by type" value={accountType} onChange={setAccountType} style={{ width: 170, maxWidth: "100%" }} options={[{ value: "all", label: "All account types" }, ...ACCOUNT_TYPES.map((value) => ({ value, label: value }))]} />
          <Select aria-label="Filter accounts by currency" value={currency} onChange={setCurrency} style={{ width: 150, maxWidth: "100%" }} options={[{ value: "all", label: "All currencies" }, ...[...new Set(accounts.map((account) => account.currency))].map((value) => ({ value, label: value }))]} />
          <Select aria-label="Filter accounts by statistics" value={statisticsFilter} onChange={setStatisticsFilter} style={{ width: 190, maxWidth: "100%" }} options={[{ value: "all", label: "All statistics settings" }, { value: "included", label: "Included in statistics" }, { value: "excluded", label: "Excluded from statistics" }]} />
        </Flex>}
        {accounts.length === 0 ? <Card><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Add your first account to start tracking your money."><Button type="primary" icon={<PlusOutlined />} onClick={() => setModal("account")}>Create account</Button></Empty></Card> :
          <div style={{ display: "grid", gridTemplateColumns: view === "accounts" ? "1fr" : "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 16 }}>
            {filteredAccounts.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No accounts match these filters." />}
            {filteredAccounts.map((account) => <Card key={account.id} role="button" tabIndex={0} aria-label={`Edit ${account.name}`} onClick={() => setEditingAccount(account)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setEditingAccount(account); } }} style={{ minWidth: 0, cursor: "pointer", background: account.color, borderColor: account.color, color: accountTextColor(account.color) }}>
              <Flex gap={8} align="start" justify="space-between"><Typography.Text strong style={{ color: "inherit", overflowWrap: "anywhere" }}>{account.name}</Typography.Text><WalletOutlined style={{ fontSize: 20 }} /></Flex>
              <Typography.Text style={{ color: "inherit" }}>{account.type} · {account.currency}</Typography.Text>
              <div style={{ fontSize: 26, fontWeight: 700, margin: "16px 0 0", overflowWrap: "anywhere", fontVariantNumeric: "tabular-nums" }}>{money(account.balanceMinor, account.currency)}</div>
            </Card>)}
          </div>}
        {accounts.length > 0 && <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 12 }}>Balances update with every record. Recalculate checks the full history and requires an internet connection.</Typography.Paragraph>}
        </>}

        {view === "dashboard" && <>
        <Flex justify="space-between" align="baseline" wrap gap={8} style={{ marginTop: 32, marginBottom: 16 }}>
          <Typography.Title level={2} style={{ fontSize: 18, margin: 0 }}>This month</Typography.Title>
          <Typography.Text type="secondary">{dayjs().format("MMMM YYYY")} · Transfers excluded</Typography.Text>
        </Flex>
        {Object.keys(statistics).length === 0 ? <Typography.Paragraph type="secondary">No income or expenses for included accounts this month.</Typography.Paragraph> :
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 16 }}>
            {Object.entries(statistics).map(([currency, totals]) => <Card key={currency} size="small">
              <Typography.Text strong>{currency}</Typography.Text>
              <Flex gap={24} wrap style={{ marginTop: 12 }}>
                <div><Typography.Text type="secondary"><ArrowDownOutlined /> Income</Typography.Text><div style={{ fontWeight: 700, fontSize: 20, color: token.colorSuccess }}>{money(totals.income, currency)}</div></div>
                <div><Typography.Text type="secondary"><ArrowUpOutlined /> Expenses</Typography.Text><div style={{ fontWeight: 700, fontSize: 20, color: token.colorError }}>{money(totals.expense, currency)}</div></div>
              </Flex>
            </Card>)}
          </div>}
        </>}

        {view === "records" && <>
        <Flex gap={12} wrap style={{ marginBottom: 16 }}>
          <Select aria-label="Filter records by account" value={accountId} onChange={(value) => { setAccountId(value); setPage(1); }} style={{ width: 220, maxWidth: "100%" }} options={[{ value: "all", label: "All accounts" }, ...allAccounts.map((account) => ({ value: account.id, label: accountNames.get(account.id) }))]} />
          <Select aria-label="Filter records by type" value={recordType} onChange={(value) => { setRecordType(value); setPage(1); }} style={{ width: 160, maxWidth: "100%" }} options={[{ value: "all", label: "All record types" }, { value: "expense", label: "Expenses" }, { value: "income", label: "Income" }, { value: "transfer", label: "Transfers" }]} />
          <Input aria-label="Search records" prefix={<SearchOutlined />} placeholder="Search records, categories, labels…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} allowClear style={{ flex: "1 1 220px", minWidth: 0 }} />
        </Flex>
        {!history.ready && !history.error && <Typography.Paragraph type="secondary">Loading older records…</Typography.Paragraph>}
        {history.error && <Alert type="warning" title="Older records could not be loaded." action={<Button size="small" onClick={history.refresh}>Retry</Button>} style={{ marginBottom: 16 }} />}
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>Offline, only records previously saved on this device are available.</Typography.Paragraph>
        <Card styles={{ body: { padding: filtered.length ? "0 20px" : 24 } }}>
          {filtered.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={allRecords.length ? "No records match these filters." : "Your records will appear here."} /> :
            filtered.slice((currentPage - 1) * 20, currentPage * 20).map((record, index) => <div key={record.id} style={{ padding: "18px 0", borderTop: index ? `1px solid ${token.colorBorderSecondary}` : undefined }}>
              <Flex justify="space-between" align="start" gap={12} wrap>
                <div style={{ minWidth: 0, flex: "1 1 180px", overflowWrap: "anywhere" }}>
                  <Typography.Text strong>{record.type === "transfer" ? <SwapOutlined /> : record.type === "income" ? <ArrowDownOutlined /> : <ArrowUpOutlined />} {record.category}</Typography.Text>
                  <div><Typography.Text type="secondary">{accountNames.get(record.accountId) ?? "Unknown account"}{record.destinationId ? ` → ${accountNames.get(record.destinationId) ?? "Unknown account"}` : ""} · {dayjs(record.occurredAt).format("MMM D, YYYY · h:mm A")}</Typography.Text></div>
                  {record.description && <Typography.Paragraph style={{ margin: "8px 0 0", whiteSpace: "pre-wrap" }}>{record.description}</Typography.Paragraph>}
                  {record.labels.length > 0 && <Flex gap={4} wrap style={{ marginTop: 8 }}>{record.labels.map((label) => <Tag key={label} style={{ maxWidth: "100%", whiteSpace: "normal", overflowWrap: "anywhere" }}>{label}</Tag>)}</Flex>}
                </div>
                <Typography.Text strong style={{ fontSize: 16, overflowWrap: "anywhere", color: record.type === "income" ? token.colorSuccess : record.type === "expense" ? token.colorError : token.colorText }}>{record.type === "income" ? "+" : record.type === "expense" ? "−" : ""}{money(record.amountMinor, record.currency)}</Typography.Text>
              </Flex>
            </div>)}
        </Card>
        {filtered.length > 0 && <Flex justify="center" style={{ marginTop: 20 }}><Pagination current={currentPage} onChange={setPage} pageSize={20} total={filtered.length} size="small" simple={screens.md !== true} showSizeChanger={false} /></Flex>}
        </>}
      </>}
      {modal === "account" && <FinanceAccountModal onClose={() => setModal(null)} />}
      {editingAccount && <FinanceAccountModal key={editingAccount.id} initial={editingAccount} onClose={() => setEditingAccount(null)} />}
      {modal === "record" && <FinanceRecordModal onClose={() => setModal(null)} onSaved={history.refresh} />}
    </div>
  );
}
