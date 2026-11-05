"use client";

import { useState } from "react";
import { Alert, App, Button, Card, Checkbox, Empty, Flex, Grid, Input, Pagination, Select, Spin, Tag, Typography, theme } from "antd";
import { EditOutlined, EyeInvisibleOutlined, EyeOutlined, HolderOutlined, LockOutlined, PlusOutlined, SearchOutlined, TransactionOutlined, UnlockOutlined, UserAddOutlined, WalletOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { PageHeading } from "@/components/page-heading";
import { FinanceAccountModal } from "@/components/finance-account-modal";
import { FinanceRecordModal } from "@/components/finance-record-modal";
import { useAuth } from "@/components/auth-provider";
import { useHealthData } from "@/components/health-data-provider";
import { useFinanceHistory } from "@/components/use-health-history";
import { ACCOUNT_TYPES, accountTextColor, debtStatus, isDebtAccount, money, sortAccounts, type DebtAction, type FinanceAccount, type FinanceRecord } from "@/lib/finance";
import { mergeById } from "@/lib/merge-records";
import { deleteFinanceAccount, deleteFinanceRecord, reorderFinanceAccounts, setFinanceAccountHidden, setFinanceAccountsLocked } from "@/models/users/finance";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { FinanceOverview } from "@/components/finance-overview";
import { EmergencyFundBanner } from "@/components/emergency-fund-banner";
import { AccountBadge, AccountTypeIcon, CategoryIcon } from "@/components/finance-category-icon";
import { mergeSubsetOrder } from "@/lib/reorder";

const DEBT_VERBS: Record<DebtAction, string> = { borrow: "Borrowed from", repay: "Repaid", lend: "Lent to", collect: "Collected from" };
import { SortableList } from "@/components/sortable-list";
import { Tip } from "@/components/tip";
import { EmptyState } from "@/components/empty-state";

export function FinanceWorkspace({ view }: { view: "dashboard" | "accounts" | "records" | "debts" }) {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { user } = useAuth();
  const screens = Grid.useBreakpoint();
  const { financeAccounts: allAccounts, financeAccountsLocked: locked, financeRecords: records, financeReady, financeError, cutoff } = useHealthData();
  const accounts = sortAccounts(allAccounts.filter((account) => !account.deletedAt));
  const ownAccounts = accounts.filter((account) => !isDebtAccount(account));
  const debtAccounts = accounts.filter(isDebtAccount);
  const [showHidden, setShowHidden] = useState(false);
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
  const accountNames = new Map(allAccounts.map((account) => [account.id, `${account.name}${account.deletedAt ? " (deleted)" : ""}`]));
  const allRecords = mergeById(records, history.rows);
  const query = search.trim().toLowerCase();
  const filteredAccounts = ownAccounts.filter((account) => (accountType === "all" || account.type === accountType)
    && (currency === "all" || account.currency === currency)
    && (statisticsFilter === "all" || account.excludeFromStatistics === (statisticsFilter === "excluded"))
    && (!query || `${account.name} ${account.provider ?? ""}`.toLowerCase().includes(query)));
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const saveOrder = (order: string[]) => {
    if (user) void reorderFinanceAccounts(user.uid, order).catch(() => message.error("Could not save the new order."));
  };
  const saveSubsetOrder = (order: string[]) => saveOrder(mergeSubsetOrder(accounts.map((account) => account.id), order));
  const handle = locked ? null : <span aria-hidden style={{ display: "inline-flex", opacity: 0.7 }}><HolderOutlined /></span>;
  const reorderHint = locked ? "" : " Press Space to pick up and reorder.";
  const removeAccount = (account: FinanceAccount) => {
    if (!user) return;
    void deleteFinanceAccount(user.uid, account.id).catch(() => message.error("Could not delete the account."));
    message.success("Account deleted. Existing records have been kept.");
  };
  const removeRecord = (record: FinanceRecord) => {
    if (!user) return;
    void deleteFinanceRecord(user.uid, record).catch(() => message.error("Could not delete the record."));
    message.success(navigator.onLine ? "Record deleted." : "Deleted offline. It will sync when you reconnect.");
    history.refresh();
  };
  const toggleHidden = (account: FinanceAccount) => {
    if (!user) return;
    const hidden = !account.hiddenAt;
    void setFinanceAccountHidden(user.uid, account.id, hidden).catch(() => message.error(`Could not ${hidden ? "hide" : "unhide"} ${account.name}.`));
    message.success(hidden ? `${account.name} hidden. Turn on Show hidden to see them again.` : `${account.name} is visible again.`);
  };
  const lastDebtRecord = new Map<string, string>();
  for (const record of allRecords) if (record.type === "debt" && record.destinationId && record.occurredAt > (lastDebtRecord.get(record.destinationId) ?? "")) lastDebtRecord.set(record.destinationId, record.occurredAt);
  const accountRow = (account: FinanceAccount, draggable = true) => (
  <Flex align="center" gap={12}>
    {draggable && handle}
    <AccountBadge account={account} size={36} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <Typography.Text strong style={{ display: "block", overflowWrap: "anywhere" }}>{account.name}</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{account.type} · {account.currency}{account.provider ? ` · ${account.provider}` : ""}{isDebtAccount(account) ? ` · ${debtStatus(account)}` : account.excludeFromStatistics ? " · Excluded from statistics" : ""}{isDebtAccount(account) && !draggable ? ` · ${lastDebtRecord.has(account.id) ? `Last record ${dayjs(lastDebtRecord.get(account.id)).format("MMM D, YYYY")}` : "No records yet"}` : ""}</Typography.Text>
      {account.hiddenAt && <Tag style={{ marginLeft: 8 }}>Hidden</Tag>}
    </div>
    <Typography.Text strong style={{ fontSize: 16, fontVariantNumeric: "tabular-nums", minWidth: 0, overflowWrap: "anywhere", textAlign: "right" }}>{money(account.balanceMinor, account.currency)}</Typography.Text>
    <Flex gap={2} onKeyDown={(event) => event.stopPropagation()}>
      <Button type="text" size="small" icon={<EditOutlined />} aria-label={`Edit ${account.name}`} onClick={() => setEditingAccount(account)} />
      {isDebtAccount(account) ? <Tip title={account.hiddenAt ? "Unhide" : "Hide"}><Button type="text" size="small" icon={account.hiddenAt ? <EyeOutlined /> : <EyeInvisibleOutlined />} aria-label={`${account.hiddenAt ? "Unhide" : "Hide"} ${account.name}`} onClick={() => toggleHidden(account)} /></Tip> : <ConfirmDeleteButton ariaLabel={`Delete ${account.name}`} tooltip="Delete account" hint="Tap again to delete this account. Existing records will be kept." onConfirm={() => removeAccount(account)} />}
    </Flex>
  </Flex>
  );
  const accountCardStyle = (account: FinanceAccount) => ({ minWidth: 0, position: "relative" as const, overflow: "hidden", background: account.color, borderColor: account.color, color: accountTextColor(account.color) });
  const compactCards = screens.sm === false;
  const accountCardBody = (account: FinanceAccount) => compactCards ? (
    <Flex align="center" gap={10}>
      <AccountTypeIcon type={account.type} style={{ fontSize: 16, opacity: 0.85, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        <Typography.Text strong style={{ color: "inherit" }}>{account.name}</Typography.Text>
        {account.provider && <Typography.Text style={{ color: "inherit", opacity: 0.85, fontSize: 12 }}> · {account.provider}</Typography.Text>}
      </div>
      <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{isDebtAccount(account) ? debtStatus(account) : money(account.balanceMinor, account.currency)}</span>
      {handle}
    </Flex>
  ) : (
    <>
              <AccountTypeIcon type={account.type} style={{ position: "absolute", right: -10, bottom: -13, fontSize: 78, opacity: 0.14, pointerEvents: "none" }} />
              <div style={{ position: "relative" }}>
              <Flex gap={8} align="start" justify="space-between"><div style={{ minWidth: 0 }}><Typography.Text strong style={{ display: "block", color: "inherit", overflowWrap: "anywhere" }}>{account.name}</Typography.Text>{account.provider && <Typography.Text style={{ display: "block", color: "inherit", opacity: 0.85, fontSize: 12, overflowWrap: "anywhere" }}>{account.provider}</Typography.Text>}</div>{handle}</Flex>
              <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2, margin: 0, overflowWrap: "anywhere", fontVariantNumeric: "tabular-nums" }}>{money(account.balanceMinor, account.currency)}</div>
              {isDebtAccount(account) && <Typography.Text style={{ display: "block", color: "inherit", opacity: 0.85, fontSize: 12 }}>{debtStatus(account)}</Typography.Text>}
              </div>
    </>
  );
  const hiddenCount = debtAccounts.filter((account) => account.hiddenAt).length;
  const people = debtAccounts
    .filter((account) => (showHidden || !account.hiddenAt) && (currency === "all" || account.currency === currency) && (!query || account.name.toLowerCase().includes(query)))
    .sort((a, b) => (lastDebtRecord.get(b.id) ?? "").localeCompare(lastDebtRecord.get(a.id) ?? ""));
  const accountListCard = (list: FinanceAccount[], tour: string, emptyText: string) => (
    <Card data-tour={tour} styles={{ body: { padding: list.length ? 20 : 24 } }} style={{ boxShadow: token.boxShadowTertiary }}>
            {list.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} /> :
              <Flex vertical gap={10}><SortableList ids={list.map((account) => account.id)} layout="list" disabled={!financeReady || financeError || locked} onReorder={saveSubsetOrder}
                renderOverlay={(id) => { const account = accountsById.get(id); return account ? <div style={{ padding: "14px 16px", background: `linear-gradient(${token.colorFillSecondary}, ${token.colorFillSecondary}), ${token.colorBgContainer}`, borderRadius: token.borderRadius }}>{accountRow(account)}</div> : null; }}
                renderItem={(id, { ref, style, handlers }) => { const account = accountsById.get(id); if (!account) return null; return <div key={id} ref={ref} {...handlers} className="reorder-item" aria-label={`${account.name}.${reorderHint}`} style={{ ...style, padding: "14px 16px", cursor: locked ? undefined : "grab", borderRadius: token.borderRadius, background: token.colorFillSecondary }}>
                  {accountRow(account)}
                </div>; }} /></Flex>}
          </Card>
  );
  const filtered = allRecords.filter((record) =>
    (accountId === "all" || record.accountId === accountId || record.destinationId === accountId)
    && (recordType === "all" || record.type === recordType)
    && (!query || [record.description, record.category, ...record.labels, accountNames.get(record.accountId), accountNames.get(record.destinationId ?? "")].join(" ").toLowerCase().includes(query)),
  ).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 20)));
  const twoColumns = { display: "grid", gridTemplateColumns: screens.lg === true ? "230px minmax(0, 1fr)" : "minmax(0, 1fr)", gap: 24, alignItems: "start" } as const;


  return (
    <div style={{ minWidth: 0 }}>
      <PageHeading title={view === "dashboard" ? "Finance" : view === "accounts" ? "Accounts" : view === "debts" ? "Debts" : "Records"} subtitle={view === "dashboard" ? "Your accounts, everyday spending, and money coming in." : view === "accounts" ? "Your money, organized by account." : view === "debts" ? "The people you borrow from or lend to, and where each one stands." : "Every expense, income, transfer, and debt in one place."} extra={<>
        <Button icon={view === "debts" ? <UserAddOutlined /> : <WalletOutlined />} disabled={!financeReady || financeError} onClick={() => setModal("account")}>{view === "debts" ? "Add person" : "Add account"}</Button>
        <Button type="primary" icon={<TransactionOutlined />} disabled={!financeReady || financeError || ownAccounts.length === 0} onClick={() => setModal("record")}>Add record</Button>
      </>} />
      {financeError && <Alert type="error" title="Could not load your finance data. Reload to try again." style={{ marginBottom: 24 }} />}
      {!financeReady ? <Spin /> : <>
        {view === "debts" && (debtAccounts.length === 0 ? <Card style={{ marginBottom: 24 }}><EmptyState title="No one yet" description="Add a person you borrow from or lend to, like Mom or a friend." action={<Button type="primary" icon={<UserAddOutlined />} disabled={financeError} onClick={() => setModal("account")}>Add person</Button>} /></Card> : <div style={twoColumns}>
          <Card data-tour="filters" title="Filters" size="small" style={{ minWidth: 0, boxShadow: token.boxShadowTertiary }}>
            <Flex vertical gap={12}>
              <div>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Search</Typography.Text>
                <Input aria-label="Search people" prefix={<SearchOutlined />} placeholder="Search people…" value={search} onChange={(event) => setSearch(event.target.value)} allowClear />
              </div>
              <div>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Currency</Typography.Text>
                <Select aria-label="Filter people by currency" value={currency} onChange={setCurrency} style={{ width: "100%" }} options={[{ value: "all", label: "All currencies" }, ...[...new Set(debtAccounts.map((account) => account.currency))].map((value) => ({ value, label: value }))]} />
              </div>
              <Checkbox checked={showHidden} onChange={(event) => setShowHidden(event.target.checked)}>Show hidden{hiddenCount ? ` (${hiddenCount})` : ""}</Checkbox>
            </Flex>
          </Card>
          <div style={{ minWidth: 0 }}>
            <Card data-tour="finance-accounts" styles={{ body: { padding: people.length ? 20 : 24 } }} style={{ boxShadow: token.boxShadowTertiary }}>
              {people.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={hiddenCount && !showHidden && !query && currency === "all" ? "Everyone is hidden. Turn on Show hidden to see them." : "No one matches these filters."} /> :
                <Flex vertical gap={10}>{people.map((account) => <div key={account.id} style={{ padding: "14px 16px", borderRadius: token.borderRadius, background: token.colorFillSecondary, opacity: account.hiddenAt ? 0.7 : 1 }}>{accountRow(account, false)}</div>)}</Flex>}
            </Card>
          </div>
        </div>)}
        {view !== "records" && view !== "debts" && <>
        {view === "dashboard" && <EmergencyFundBanner />}
        {view === "dashboard" && <Flex align="center" justify="space-between" gap={12} style={{ marginBottom: 16 }}>
          <Typography.Title level={2} style={{ fontSize: 18, margin: 0 }}>Accounts</Typography.Title>
          {ownAccounts.length > 1 && <Tip title={locked ? "Unlock to reorder accounts" : "Lock account order"}>
            <Button
              type="text"
              size="small"
              aria-label={locked ? "Unlock account order" : "Lock account order"}
              aria-pressed={locked}
              icon={locked ? <LockOutlined /> : <UnlockOutlined />}
              disabled={!financeReady || financeError}
              onClick={() => { if (user) void setFinanceAccountsLocked(user.uid, !locked).catch(() => message.error("Could not update the lock.")); }}
              style={{ color: locked ? token.colorPrimary : token.colorTextSecondary, marginBlock: -6 }}
            />
          </Tip>}
        </Flex>}
        {view === "accounts" ? <div style={twoColumns}>
          <Card data-tour="filters" title="Filters" size="small" style={{ minWidth: 0, boxShadow: token.boxShadowTertiary }}>
            <Flex vertical gap={12}>
              <div>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Search</Typography.Text>
                <Input aria-label="Search accounts" prefix={<SearchOutlined />} placeholder="Search accounts…" value={search} onChange={(event) => setSearch(event.target.value)} allowClear />
              </div>
              <div>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Type</Typography.Text>
                <Select aria-label="Filter accounts by type" value={accountType} onChange={setAccountType} style={{ width: "100%" }} options={[{ value: "all", label: "All account types" }, ...ACCOUNT_TYPES.filter((value) => value !== "Debt").map((value) => ({ value, label: value }))]} />
              </div>
              <div>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Currency</Typography.Text>
                <Select aria-label="Filter accounts by currency" value={currency} onChange={setCurrency} style={{ width: "100%" }} options={[{ value: "all", label: "All currencies" }, ...[...new Set(ownAccounts.map((account) => account.currency))].map((value) => ({ value, label: value }))]} />
              </div>
              <div>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Statistics</Typography.Text>
                <Select aria-label="Filter accounts by statistics" value={statisticsFilter} onChange={setStatisticsFilter} style={{ width: "100%" }} options={[{ value: "all", label: "All statistics settings" }, { value: "included", label: "Included in statistics" }, { value: "excluded", label: "Excluded from statistics" }]} />
              </div>
            </Flex>
          </Card>
          <div style={{ minWidth: 0 }}>
        {ownAccounts.length === 0 ? <Card><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Add your first account to start tracking your money."><Button type="primary" icon={<PlusOutlined />} onClick={() => setModal("account")}>Create account</Button></Empty></Card> :
          accountListCard(filteredAccounts, "finance-accounts", "No accounts match these filters.")}
          </div>
        </div> : <>
        {ownAccounts.length === 0 ? <Card><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Add your first account to start tracking your money."><Button type="primary" icon={<PlusOutlined />} onClick={() => setModal("account")}>Create account</Button></Empty></Card> :
          <div className="account-cards" data-tour="finance-accounts">
            {filteredAccounts.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No accounts match these filters." />}
            <SortableList ids={filteredAccounts.map((account) => account.id)} layout="grid" disabled={!financeReady || financeError || locked} onReorder={saveSubsetOrder}
              renderOverlay={(id) => { const account = accountsById.get(id); return account ? <Card styles={{ body: { padding: compactCards ? "10px 14px" : 16 } }} style={{ ...accountCardStyle(account), height: "100%" }}>{accountCardBody(account)}</Card> : null; }}
              renderItem={(id, { ref, style, handlers, wasDragged }) => { const account = accountsById.get(id); if (!account) return null; return <Card key={id} ref={ref} {...handlers} styles={{ body: { padding: compactCards ? "10px 14px" : 16 } }} className="reorder-item" role="button" tabIndex={0} aria-label={`Edit ${account.name}.${reorderHint}`} onClick={() => { if (!wasDragged()) setEditingAccount(account); }} onKeyDown={(event) => { handlers.onKeyDown?.(event); if (event.key === "Enter") { event.preventDefault(); setEditingAccount(account); } }} style={{ ...accountCardStyle(account), ...style, cursor: "pointer" }}>
                {accountCardBody(account)}
              </Card>; }} />
            {view === "dashboard" && <button type="button" className="add-account-tile" disabled={!financeReady || financeError} onClick={() => setModal("account")} style={{ "--tile-border": token.colorBorder, "--tile-text": token.colorTextSecondary, "--tile-accent": token.colorPrimary, borderRadius: token.borderRadiusLG } as React.CSSProperties}>
              <PlusOutlined /> Add Account
            </button>}
          </div>}
        </>}
        </>}

        {view === "dashboard" && ownAccounts.length > 0 && <FinanceOverview />}

        {view === "records" && <div style={twoColumns}>
          <Card data-tour="filters" title="Filters" size="small" style={{ minWidth: 0, boxShadow: token.boxShadowTertiary }}>
            <Flex vertical gap={12}>
              <div>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Search</Typography.Text>
                <Input aria-label="Search records" prefix={<SearchOutlined />} placeholder="Records, categories, labels…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} allowClear />
              </div>
              <div>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Account</Typography.Text>
                <Select aria-label="Filter records by account" value={accountId} onChange={(value) => { setAccountId(value); setPage(1); }} style={{ width: "100%" }} options={[{ value: "all", label: "All accounts" }, ...allAccounts.filter((account) => !isDebtAccount(account)).map((account) => ({ value: account.id, label: accountNames.get(account.id) }))]} />
              </div>
              <div>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Type</Typography.Text>
                <Select aria-label="Filter records by type" value={recordType} onChange={(value) => { setRecordType(value); setPage(1); }} style={{ width: "100%" }} options={[{ value: "all", label: "All record types" }, { value: "expense", label: "Expenses" }, { value: "income", label: "Income" }, { value: "transfer", label: "Transfers" }, { value: "debt", label: "Debts" }]} />
              </div>
            </Flex>
          </Card>
          <div style={{ minWidth: 0 }}>
        {!history.ready && !history.error && <Typography.Paragraph type="secondary">Loading older records…</Typography.Paragraph>}
        {history.error && <Alert type="warning" title="Older records could not be loaded." action={<Button size="small" onClick={history.refresh}>Retry</Button>} style={{ marginBottom: 16 }} />}
        {filtered.length === 0 ? <Card>{allRecords.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No records match these filters." /> : ownAccounts.length === 0 ? <EmptyState title="Add an account first" description="Start with your cash, bank, or e-wallet." action={<Button type="primary" icon={<WalletOutlined />} disabled={financeError} onClick={() => setModal("account")}>Add account</Button>} /> : <EmptyState title="No records yet" description="Track an expense or income to update your balance." action={<Button type="primary" icon={<TransactionOutlined />} disabled={financeError} onClick={() => setModal("record")}>Add your first record</Button>} />}</Card> :
          <Flex vertical gap={16} data-tour="finance-records">{recordDays(filtered.slice((currentPage - 1) * 20, currentPage * 20)).map(([date, dayRecords]) => <Card key={date} styles={{ body: { padding: 20 } }} style={{ boxShadow: token.boxShadowTertiary }}>
            <Flex align="baseline" justify="space-between" gap={8} wrap style={{ marginBottom: 14 }}>
              <Typography.Text style={{ fontSize: 16 }}>{dayjs(date).format("dddd, MMMM D, YYYY")}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{dayRecords.length} {dayRecords.length === 1 ? "record" : "records"}</Typography.Text>
            </Flex>
            <Flex vertical gap={10}>{dayRecords.map((record) => <div key={record.id} style={{ padding: "14px 16px", borderRadius: token.borderRadius, background: token.colorFillSecondary }}>
              <Flex justify="space-between" align="start" gap={12} wrap>
                <div style={{ minWidth: 0, flex: "1 1 180px", overflowWrap: "anywhere" }}>
                  <Typography.Text strong><CategoryIcon category={record.type === "transfer" ? "Transfer" : record.type === "debt" ? "Debt" : record.category} style={{ marginRight: 6 }} />{record.type === "debt" && record.debtAction ? `${DEBT_VERBS[record.debtAction]} ${accountNames.get(record.destinationId ?? "") ?? "Unknown account"}` : record.category}</Typography.Text>
                  <div><Typography.Text type="secondary">{accountNames.get(record.accountId) ?? "Unknown account"}{record.destinationId && record.type !== "debt" ? ` → ${accountNames.get(record.destinationId) ?? "Unknown account"}` : ""} · {dayjs(record.occurredAt).format("h:mm A")}</Typography.Text></div>
                  {record.description && <Typography.Paragraph style={{ margin: "8px 0 0", whiteSpace: "pre-wrap" }}>{record.description}</Typography.Paragraph>}
                  {record.labels.length > 0 && <Flex gap={4} wrap style={{ marginTop: 8 }}>{record.labels.map((label) => <Tag key={label} style={{ maxWidth: "100%", whiteSpace: "normal", overflowWrap: "anywhere" }}>{label}</Tag>)}</Flex>}
                </div>
                <Flex align="center" gap={8}>
                  <Typography.Text strong style={{ fontSize: 16, overflowWrap: "anywhere", color: recordSign(record) === "+" ? token.colorSuccess : recordSign(record) === "−" ? token.colorError : token.colorText }}>{recordSign(record)}{money(record.amountMinor, record.currency)}</Typography.Text>
                  <Flex gap={2}>
                    <Button type="text" size="small" icon={<EditOutlined />} aria-label={`Edit ${record.category} record`} onClick={() => setEditingRecord(record)} />
                    <ConfirmDeleteButton ariaLabel={`Delete ${record.category} record`} tooltip="Delete record" hint="Tap again to delete this record" onConfirm={() => removeRecord(record)} />
                  </Flex>
                </Flex>
              </Flex>
            </div>)}</Flex>
          </Card>)}</Flex>}
        {filtered.length > 0 && <Flex justify="center" style={{ marginTop: 20 }}><Pagination current={currentPage} onChange={setPage} pageSize={20} total={filtered.length} size="small" simple={screens.md !== true} showSizeChanger={false} /></Flex>}
          </div>
        </div>}
      </>}
      {modal === "account" && <FinanceAccountModal defaultType={view === "debts" ? "Debt" : undefined} onClose={() => setModal(null)} />}
      {editingAccount && <FinanceAccountModal key={editingAccount.id} initial={editingAccount} onClose={() => setEditingAccount(null)} />}
      {modal === "record" && <FinanceRecordModal defaultType={view === "debts" && debtAccounts.length > 0 ? "debt" : undefined} onClose={() => setModal(null)} onSaved={history.refresh} />}
      {editingRecord && <FinanceRecordModal key={editingRecord.id} initial={editingRecord} onClose={() => setEditingRecord(null)} onSaved={history.refresh} />}
    </div>
  );
}

function recordDays(records: FinanceRecord[]) {
  const days = new Map<string, FinanceRecord[]>();
  for (const record of records) days.set(record.date, [...(days.get(record.date) ?? []), record]);
  return [...days.entries()];
}

function recordSign(record: FinanceRecord) {
  if (record.type === "income" || (record.type === "debt" && (record.debtAction === "borrow" || record.debtAction === "collect"))) return "+";
  if (record.type === "expense" || record.type === "debt") return "−";
  return "";
}
