"use client";

import { useState } from "react";
import { Alert, App, Button, Card, Empty, Flex, Grid, Input, Pagination, Select, Spin, Tag, Typography, theme } from "antd";
import { HolderOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, WalletOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { PageHeading } from "@/components/page-heading";
import { FinanceAccountModal } from "@/components/finance-account-modal";
import { FinanceRecordModal } from "@/components/finance-record-modal";
import { useAuth } from "@/components/auth-provider";
import { useHealthData } from "@/components/health-data-provider";
import { useFinanceHistory } from "@/components/use-health-history";
import { ACCOUNT_TYPES, accountTextColor, money, sortAccounts, type FinanceAccount, type FinanceRecord } from "@/lib/finance";
import { mergeById } from "@/lib/merge-records";
import { recalculateFinanceAccounts, reorderFinanceAccounts } from "@/models/users/finance";
import { FinanceOverview } from "@/components/finance-overview";
import { EmergencyFundBanner } from "@/components/emergency-fund-banner";
import { AccountTypeIcon, CategoryIcon } from "@/components/finance-category-icon";
import { mergeSubsetOrder } from "@/lib/reorder";
import { SortableList } from "@/components/sortable-list";

export function FinanceWorkspace({ view }: { view: "dashboard" | "accounts" | "records" }) {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { user } = useAuth();
  const screens = Grid.useBreakpoint();
  const { financeAccounts: allAccounts, financeRecords: records, financeReady, financeError, cutoff } = useHealthData();
  const accounts = sortAccounts(allAccounts.filter((account) => !account.deletedAt));
  const history = useFinanceHistory(view === "records", cutoff);
  const [modal, setModal] = useState<"account" | "record" | null>(null);
  const [editingAccount, setEditingAccount] = useState<FinanceAccount | null>(null);
  const [editingRecord, setEditingRecord] = useState<FinanceRecord | null>(null);
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
    && (!query || `${account.name} ${account.provider ?? ""}`.toLowerCase().includes(query)));
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const saveOrder = (order: string[]) => {
    if (user) void reorderFinanceAccounts(user.uid, order).catch(() => message.error("Could not save the new order."));
  };
  const saveSubsetOrder = (order: string[]) => saveOrder(mergeSubsetOrder(accounts.map((account) => account.id), order));
  const handle = <span aria-hidden style={{ display: "inline-flex", opacity: 0.7 }}><HolderOutlined /></span>;
  const accountRow = (account: FinanceAccount) => (
  <Flex align="center" gap={12}>
    {handle}
    <span aria-hidden style={{ width: 36, height: 36, flexShrink: 0, borderRadius: token.borderRadius, background: account.color, color: accountTextColor(account.color), display: "inline-flex", alignItems: "center", justifyContent: "center" }}><WalletOutlined /></span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <Typography.Text strong style={{ display: "block", overflowWrap: "anywhere" }}>{account.name}</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{account.type} · {account.currency}{account.provider ? ` · ${account.provider}` : ""}{account.excludeFromStatistics ? " · Excluded from statistics" : ""}</Typography.Text>
    </div>
    <Typography.Text strong style={{ fontSize: 16, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{money(account.balanceMinor, account.currency)}</Typography.Text>
  </Flex>
  );
  const accountCardStyle = (account: FinanceAccount) => ({ minWidth: 0, position: "relative" as const, overflow: "hidden", background: account.color, borderColor: account.color, color: accountTextColor(account.color) });
  const accountCardBody = (account: FinanceAccount) => (
    <>
              <AccountTypeIcon type={account.type} style={{ position: "absolute", right: -14, bottom: -18, fontSize: 104, opacity: 0.14, pointerEvents: "none" }} />
              <div style={{ position: "relative" }}>
              <Flex gap={8} align="start" justify="space-between"><div style={{ minWidth: 0 }}><Typography.Text strong style={{ display: "block", color: "inherit", overflowWrap: "anywhere" }}>{account.name}</Typography.Text>{account.provider && <Typography.Text style={{ display: "block", color: "inherit", opacity: 0.85, fontSize: 12, overflowWrap: "anywhere" }}>{account.provider}</Typography.Text>}</div>{handle}</Flex>
              <Typography.Text style={{ color: "inherit" }}>{account.type} · {account.currency}</Typography.Text>
              <div style={{ fontSize: 26, fontWeight: 700, margin: "16px 0 0", overflowWrap: "anywhere", fontVariantNumeric: "tabular-nums" }}>{money(account.balanceMinor, account.currency)}</div>
              </div>
    </>
  );
  const filtered = allRecords.filter((record) =>
    (accountId === "all" || record.accountId === accountId || record.destinationId === accountId)
    && (recordType === "all" || record.type === recordType)
    && (!query || [record.description, record.category, ...record.labels, accountNames.get(record.accountId), accountNames.get(record.destinationId ?? "")].join(" ").toLowerCase().includes(query)),
  ).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 20)));
  const twoColumns = { display: "grid", gridTemplateColumns: screens.lg === true ? "230px minmax(0, 1fr)" : "minmax(0, 1fr)", gap: 24, alignItems: "start" } as const;

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
        <Button icon={<ReloadOutlined />} loading={recalculating} disabled={!financeReady || financeError || accounts.length === 0 || recalculating} onClick={recalculate}>Recalculate</Button>
        <Button icon={<WalletOutlined />} disabled={!financeReady || financeError} onClick={() => setModal("account")}>Add account</Button>
        <Button type="primary" icon={<PlusOutlined />} disabled={!financeReady || financeError || accounts.length === 0} onClick={() => setModal("record")}>Add record</Button>
      </>} />
      {financeError && <Alert type="error" title="Could not load your finance data. Reload to try again." style={{ marginBottom: 24 }} />}
      {!financeReady ? <Spin /> : <>
        {view !== "records" && <>
        {view === "dashboard" && <EmergencyFundBanner />}
        {view === "dashboard" && <Typography.Title level={2} style={{ fontSize: 18, marginBottom: 16 }}>Accounts</Typography.Title>}
        {view === "accounts" ? <div style={twoColumns}>
          <Card title="Filters" size="small" style={{ minWidth: 0, boxShadow: token.boxShadowTertiary }}>
            <Flex vertical gap={12}>
              <div>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Search</Typography.Text>
                <Input aria-label="Search accounts" prefix={<SearchOutlined />} placeholder="Search accounts…" value={search} onChange={(event) => setSearch(event.target.value)} allowClear />
              </div>
              <div>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Type</Typography.Text>
                <Select aria-label="Filter accounts by type" value={accountType} onChange={setAccountType} style={{ width: "100%" }} options={[{ value: "all", label: "All account types" }, ...ACCOUNT_TYPES.map((value) => ({ value, label: value }))]} />
              </div>
              <div>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Currency</Typography.Text>
                <Select aria-label="Filter accounts by currency" value={currency} onChange={setCurrency} style={{ width: "100%" }} options={[{ value: "all", label: "All currencies" }, ...[...new Set(accounts.map((account) => account.currency))].map((value) => ({ value, label: value }))]} />
              </div>
              <div>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Statistics</Typography.Text>
                <Select aria-label="Filter accounts by statistics" value={statisticsFilter} onChange={setStatisticsFilter} style={{ width: "100%" }} options={[{ value: "all", label: "All statistics settings" }, { value: "included", label: "Included in statistics" }, { value: "excluded", label: "Excluded from statistics" }]} />
              </div>
            </Flex>
          </Card>
          <div style={{ minWidth: 0 }}>
        {accounts.length === 0 ? <Card><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Add your first account to start tracking your money."><Button type="primary" icon={<PlusOutlined />} onClick={() => setModal("account")}>Create account</Button></Empty></Card> :
          <Card styles={{ body: { padding: filteredAccounts.length ? "0 20px" : 24 } }} style={{ boxShadow: token.boxShadowTertiary }}>
            {filteredAccounts.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No accounts match these filters." /> :
              <SortableList ids={filteredAccounts.map((account) => account.id)} layout="list" disabled={!financeReady || financeError} onReorder={saveSubsetOrder}
                renderOverlay={(id) => { const account = accountsById.get(id); return account ? <div style={{ padding: "16px 20px", background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG }}>{accountRow(account)}</div> : null; }}
                renderItem={(id, { ref, style, handlers, index, wasDragged }) => { const account = accountsById.get(id); if (!account) return null; return <div key={id} ref={ref} {...handlers} className="reorder-item" role="button" tabIndex={0} aria-label={`Edit ${account.name}. Press Space to pick up and reorder.`} onClick={() => { if (!wasDragged()) setEditingAccount(account); }} onKeyDown={(event) => { handlers.onKeyDown?.(event); if (event.key === "Enter") { event.preventDefault(); setEditingAccount(account); } }} style={{ ...style, padding: "16px 0", cursor: "pointer", background: token.colorBgContainer, borderTop: index ? `1px solid ${token.colorBorderSecondary}` : undefined }}>
                  {accountRow(account)}
                </div>; }} />}
          </Card>}
          </div>
        </div> : <>
        {accounts.length === 0 ? <Card><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Add your first account to start tracking your money."><Button type="primary" icon={<PlusOutlined />} onClick={() => setModal("account")}>Create account</Button></Empty></Card> :
          <div className="account-cards">
            {filteredAccounts.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No accounts match these filters." />}
            <SortableList ids={filteredAccounts.map((account) => account.id)} layout="grid" disabled={!financeReady || financeError} onReorder={saveSubsetOrder}
              renderOverlay={(id) => { const account = accountsById.get(id); return account ? <Card style={{ ...accountCardStyle(account), height: "100%" }}>{accountCardBody(account)}</Card> : null; }}
              renderItem={(id, { ref, style, handlers, wasDragged }) => { const account = accountsById.get(id); if (!account) return null; return <Card key={id} ref={ref} {...handlers} className="reorder-item" role="button" tabIndex={0} aria-label={`Edit ${account.name}. Press Space to pick up and reorder.`} onClick={() => { if (!wasDragged()) setEditingAccount(account); }} onKeyDown={(event) => { handlers.onKeyDown?.(event); if (event.key === "Enter") { event.preventDefault(); setEditingAccount(account); } }} style={{ ...accountCardStyle(account), ...style, cursor: "pointer" }}>
                {accountCardBody(account)}
              </Card>; }} />
          </div>}
        </>}
        </>}

        {view === "dashboard" && accounts.length > 0 && <FinanceOverview />}

        {view === "records" && <div style={twoColumns}>
          <Card title="Filters" size="small" style={{ minWidth: 0, boxShadow: token.boxShadowTertiary }}>
            <Flex vertical gap={12}>
              <div>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Search</Typography.Text>
                <Input aria-label="Search records" prefix={<SearchOutlined />} placeholder="Records, categories, labels…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} allowClear />
              </div>
              <div>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Account</Typography.Text>
                <Select aria-label="Filter records by account" value={accountId} onChange={(value) => { setAccountId(value); setPage(1); }} style={{ width: "100%" }} options={[{ value: "all", label: "All accounts" }, ...allAccounts.map((account) => ({ value: account.id, label: accountNames.get(account.id) }))]} />
              </div>
              <div>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Type</Typography.Text>
                <Select aria-label="Filter records by type" value={recordType} onChange={(value) => { setRecordType(value); setPage(1); }} style={{ width: "100%" }} options={[{ value: "all", label: "All record types" }, { value: "expense", label: "Expenses" }, { value: "income", label: "Income" }, { value: "transfer", label: "Transfers" }]} />
              </div>
            </Flex>
          </Card>
          <div style={{ minWidth: 0 }}>
        {!history.ready && !history.error && <Typography.Paragraph type="secondary">Loading older records…</Typography.Paragraph>}
        {history.error && <Alert type="warning" title="Older records could not be loaded." action={<Button size="small" onClick={history.refresh}>Retry</Button>} style={{ marginBottom: 16 }} />}
        <Card styles={{ body: { padding: filtered.length ? "0 20px" : 24 } }}>
          {filtered.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={allRecords.length ? "No records match these filters." : "Your records will appear here."} /> :
            filtered.slice((currentPage - 1) * 20, currentPage * 20).map((record, index) => <div key={record.id} role="button" tabIndex={0} aria-label={`Edit ${record.category} record`} onClick={() => setEditingRecord(record)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setEditingRecord(record); } }} style={{ padding: "18px 0", cursor: "pointer", borderTop: index ? `1px solid ${token.colorBorderSecondary}` : undefined }}>
              <Flex justify="space-between" align="start" gap={12} wrap>
                <div style={{ minWidth: 0, flex: "1 1 180px", overflowWrap: "anywhere" }}>
                  <Typography.Text strong><CategoryIcon category={record.type === "transfer" ? "Transfer" : record.category} style={{ marginRight: 6 }} />{record.category}</Typography.Text>
                  <div><Typography.Text type="secondary">{accountNames.get(record.accountId) ?? "Unknown account"}{record.destinationId ? ` → ${accountNames.get(record.destinationId) ?? "Unknown account"}` : ""} · {dayjs(record.occurredAt).format("MMM D, YYYY · h:mm A")}</Typography.Text></div>
                  {record.description && <Typography.Paragraph style={{ margin: "8px 0 0", whiteSpace: "pre-wrap" }}>{record.description}</Typography.Paragraph>}
                  {record.labels.length > 0 && <Flex gap={4} wrap style={{ marginTop: 8 }}>{record.labels.map((label) => <Tag key={label} style={{ maxWidth: "100%", whiteSpace: "normal", overflowWrap: "anywhere" }}>{label}</Tag>)}</Flex>}
                </div>
                <Typography.Text strong style={{ fontSize: 16, overflowWrap: "anywhere", color: record.type === "income" ? token.colorSuccess : record.type === "expense" ? token.colorError : token.colorText }}>{record.type === "income" ? "+" : record.type === "expense" ? "−" : ""}{money(record.amountMinor, record.currency)}</Typography.Text>
              </Flex>
            </div>)}
        </Card>
        {filtered.length > 0 && <Flex justify="center" style={{ marginTop: 20 }}><Pagination current={currentPage} onChange={setPage} pageSize={20} total={filtered.length} size="small" simple={screens.md !== true} showSizeChanger={false} /></Flex>}
          </div>
        </div>}
      </>}
      {modal === "account" && <FinanceAccountModal onClose={() => setModal(null)} />}
      {editingAccount && <FinanceAccountModal key={editingAccount.id} initial={editingAccount} onClose={() => setEditingAccount(null)} />}
      {modal === "record" && <FinanceRecordModal onClose={() => setModal(null)} onSaved={history.refresh} />}
      {editingRecord && <FinanceRecordModal key={editingRecord.id} initial={editingRecord} onClose={() => setEditingRecord(null)} onSaved={history.refresh} />}
    </div>
  );
}
