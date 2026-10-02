"use client";

import { useEffect, useRef, useState } from "react";
import { App, Button, DatePicker, Flex, Form, Input, InputNumber, Segmented, Select, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { AppModal } from "@/components/app-modal";
import { useAuth } from "@/components/auth-provider";
import { useHealthData } from "@/components/health-data-provider";
import { useFinanceDay } from "@/components/use-day-records";
import { CATEGORIES, currencyDigits, recordValidation, toMinor, type FinanceRecord, sortAccounts, type FinanceAccount } from "@/lib/finance";
import { addFinanceRecord, deleteFinanceRecord, editFinanceRecord } from "@/models/users/finance";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { AccountBadge, CategoryIcon } from "@/components/finance-category-icon";
import { ArrowRightOutlined } from "@ant-design/icons";

function accountOption(account: FinanceAccount) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <AccountBadge account={account} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{account.name}{account.provider ? ` · ${account.provider}` : ""}</span>
    </span>
  );
}

export function FinanceRecordModal({ initial, onClose, onSaved }: { initial?: FinanceRecord; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { financeAccounts, financeRecords: records } = useHealthData();
  const accounts = sortAccounts(financeAccounts.filter((account) => !account.deletedAt));
  const [type, setType] = useState<FinanceRecord["type"]>(initial?.type ?? "expense");
  const [amount, setAmount] = useState<number | null>(initial ? initial.amountMinor / 10 ** currencyDigits(initial.currency) : null);
  const [accountId, setAccountId] = useState(initial?.accountId ?? accounts[0]?.id ?? "");
  const [destinationId, setDestinationId] = useState<string | null>(initial?.destinationId ?? null);
  const [category, setCategory] = useState<string[]>(initial && initial.type !== "transfer" ? [initial.category] : []);
  const [labels, setLabels] = useState<string[]>(initial?.labels ?? []);
  const [date, setDate] = useState<Dayjs | null>(initial ? dayjs(initial.occurredAt) : null);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [pending, setPending] = useState<string | null>(null);
  const [pendingOccurredAt, setPendingOccurredAt] = useState<string | null>(null);
  const saved = useRef(false);
  const account = accounts.find((item) => item.id === accountId);
  const day = useFinanceDay((date ?? dayjs()).format("YYYY-MM-DD"), true);
  useEffect(() => {
    if (pending && day.rows.some((record) => record.id === pending && (!pendingOccurredAt || record.occurredAt === pendingOccurredAt)) && !saved.current) {
      saved.current = true;
      onSaved();
      onClose();
    }
  }, [pending, pendingOccurredAt, day.rows, onSaved, onClose]);
  function save() {
    if (!user || !account || pending) return;
    const occurred = date ?? dayjs();
    const record: FinanceRecord = { id: initial?.id ?? crypto.randomUUID(), type, amountMinor: amount === null ? NaN : toMinor(amount, account.currency), accountId, destinationId: type === "transfer" ? destinationId : null, currency: account.currency, category: type === "transfer" ? "Transfer" : category[0] ?? "", labels, date: occurred.format("YYYY-MM-DD"), occurredAt: occurred.toISOString(), description: description.trim() };
    if (initial) {
      setPending(record.id);
      setPendingOccurredAt(record.occurredAt);
      void editFinanceRecord(user.uid, initial, record, accounts).catch((error: unknown) => { setPending(null); message.error(error instanceof Error ? error.message : "Could not save the record."); });
      message.success(navigator.onLine ? "Record updated." : "Record saved offline. It will sync when you reconnect.");
      return;
    }
    const error = recordValidation(record, accounts);
    if (error) { message.error(error); return; }
    setPending(record.id);
    void addFinanceRecord(user.uid, record, accounts).catch(() => { setPending(null); message.error("Could not save the record."); });
    message.success(navigator.onLine ? "Record added." : "Record saved offline. It will sync when you reconnect.");
  }
  function remove() {
    if (!user || !initial || pending) return;
    void deleteFinanceRecord(user.uid, initial).catch(() => message.error("Could not delete the record."));
    message.success(navigator.onLine ? "Record deleted." : "Deleted offline. It will sync when you reconnect.");
    saved.current = true;
    onSaved();
    onClose();
  }
  const categories = [...new Set([...CATEGORIES, ...records.map((record) => record.category)])];
  const knownLabels = [...new Set(records.flatMap((record) => record.labels))];
  return <AppModal open title={initial ? "Edit record" : "Add record"} onCancel={pending ? undefined : onClose} closable={!pending} mask={{ closable: !pending }} footer={<Flex justify={initial ? "space-between" : "flex-end"} align="center">
    {initial && <ConfirmDeleteButton ariaLabel="Delete record" tooltip="Delete record" hint="Tap again to delete this record" onConfirm={remove} />}
    <Button type="primary" disabled={!day.ready || day.error || !!pending} onClick={save}>{initial ? "Save changes" : "Add record"}</Button>
  </Flex>}>
    <Form layout="vertical" onFinish={save}>
      <Form.Item label="Record type"><Segmented block value={type} disabled={!!pending} onChange={setType} options={[{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }, { value: "transfer", label: "Transfer" }]} /></Form.Item>
      {type === "transfer" ? <>
        <Flex align="flex-end" gap={8}>
          <Form.Item label="From account" required style={{ flex: 1, minWidth: 0, marginBottom: 8 }}><Select style={{ width: "100%" }} aria-label="Record account" value={accountId} disabled={!!pending} onChange={(value) => { setAccountId(value); setDestinationId(null); }} options={accounts.map((item) => ({ value: item.id, label: accountOption(item) }))} /></Form.Item>
          <ArrowRightOutlined aria-hidden style={{ fontSize: 16, opacity: 0.6, paddingBottom: 20 }} />
          <Form.Item label="To account" required style={{ flex: 1, minWidth: 0, marginBottom: 8 }}><Select style={{ width: "100%" }} aria-label="Transfer destination" value={destinationId} disabled={!!pending} onChange={setDestinationId} options={accounts.filter((item) => item.id !== accountId && item.currency === account?.currency).map((item) => ({ value: item.id, label: accountOption(item) }))} /></Form.Item>
        </Flex>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 24 }}>Only other accounts using the same currency can receive this transfer.</Typography.Paragraph>
      </> : <Form.Item label="Account" required><Select aria-label="Record account" value={accountId} disabled={!!pending} onChange={(value) => { setAccountId(value); setDestinationId(null); }} options={accounts.map((item) => ({ value: item.id, label: accountOption(item) }))} /></Form.Item>}
      <Form.Item label="Amount" required><InputNumber aria-label="Record amount" value={amount} disabled={!!pending} onChange={setAmount} min={0} precision={currencyDigits(account?.currency ?? "PHP")} style={{ width: "100%" }} suffix={account?.currency} /></Form.Item>
      {type !== "transfer" && <Form.Item label="Category" required><Select aria-label="Record category" mode="tags" maxCount={1} value={category} disabled={!!pending} onChange={setCategory} options={categories.map((value) => ({ value, label: <span><CategoryIcon category={value} style={{ marginRight: 8 }} />{value}</span> }))} placeholder="Select or create a category" /></Form.Item>}
      <Form.Item label="Labels"><Select aria-label="Record labels" mode="tags" value={labels} disabled={!!pending} onChange={setLabels} options={knownLabels.map((value) => ({ value, label: value }))} placeholder="Select or create labels" /></Form.Item>
      <Form.Item label="Date and time"><DatePicker aria-label="Record date and time" showTime value={date} disabled={!!pending} onChange={setDate} style={{ width: "100%" }} placeholder="Current date and time" /><Typography.Text type="secondary">Leave blank to use the date and time when you save.</Typography.Text></Form.Item>
      <Form.Item label="Description"><Input.TextArea aria-label="Record description" value={description} disabled={!!pending} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={3} /></Form.Item>
      {day.error && <Typography.Text type="danger">Could not load this day. Close and retry.</Typography.Text>}
    </Form>
  </AppModal>;
}
