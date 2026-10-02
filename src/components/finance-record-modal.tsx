"use client";

import { useEffect, useRef, useState } from "react";
import { App, Button, DatePicker, Form, Input, InputNumber, Segmented, Select, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { AppModal } from "@/components/app-modal";
import { useAuth } from "@/components/auth-provider";
import { useHealthData } from "@/components/health-data-provider";
import { useFinanceDay } from "@/components/use-day-records";
import { CATEGORIES, currencyDigits, recordValidation, toMinor, type FinanceRecord } from "@/lib/finance";
import { addFinanceRecord } from "@/models/finance";

export function FinanceRecordModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { financeAccounts, financeRecords: records } = useHealthData();
  const accounts = financeAccounts.filter((account) => !account.deletedAt);
  const [type, setType] = useState<FinanceRecord["type"]>("expense");
  const [amount, setAmount] = useState<number | null>(null);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [category, setCategory] = useState<string[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [date, setDate] = useState<Dayjs | null>(null);
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const saved = useRef(false);
  const account = accounts.find((item) => item.id === accountId);
  const day = useFinanceDay((date ?? dayjs()).format("YYYY-MM-DD"), true);
  useEffect(() => {
    if (pending && day.rows.some((record) => record.id === pending) && !saved.current) {
      saved.current = true;
      onSaved();
      onClose();
    }
  }, [pending, day.rows, onSaved, onClose]);
  function save() {
    if (!user || !account || pending) return;
    const occurred = date ?? dayjs();
    const record: FinanceRecord = { id: crypto.randomUUID(), type, amountMinor: amount === null ? NaN : toMinor(amount, account.currency), accountId, destinationId: type === "transfer" ? destinationId : null, currency: account.currency, category: type === "transfer" ? "Transfer" : category[0] ?? "", labels, date: occurred.format("YYYY-MM-DD"), occurredAt: occurred.toISOString(), description: description.trim() };
    const error = recordValidation(record, accounts);
    if (error) { message.error(error); return; }
    setPending(record.id);
    void addFinanceRecord(user.uid, record, accounts).catch(() => { setPending(null); message.error("Could not save the record."); });
    message.success(navigator.onLine ? "Record added." : "Record saved offline. It will sync when you reconnect.");
  }
  const categories = [...new Set([...CATEGORIES, ...records.map((record) => record.category)])];
  const knownLabels = [...new Set(records.flatMap((record) => record.labels))];
  return <AppModal open title="Add record" onCancel={pending ? undefined : onClose} closable={!pending} mask={{ closable: !pending }} footer={<Button type="primary" disabled={!day.ready || day.error || !!pending} onClick={save}>Add record</Button>}>
    <Form layout="vertical" onFinish={save}>
      <Form.Item label="Record type"><Segmented block value={type} disabled={!!pending} onChange={setType} options={[{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }, { value: "transfer", label: "Transfer" }]} /></Form.Item>
      <Form.Item label={type === "transfer" ? "From account" : "Account"} required><Select aria-label="Record account" value={accountId} disabled={!!pending} onChange={(value) => { setAccountId(value); setDestinationId(null); }} options={accounts.map((item) => ({ value: item.id, label: `${item.name} · ${item.currency}` }))} /></Form.Item>
      {type === "transfer" && <Form.Item label="To account" required help="Only other accounts using the same currency can receive this transfer."><Select aria-label="Transfer destination" value={destinationId} disabled={!!pending} onChange={setDestinationId} options={accounts.filter((item) => item.id !== accountId && item.currency === account?.currency).map((item) => ({ value: item.id, label: item.name }))} /></Form.Item>}
      <Form.Item label="Amount" required><InputNumber aria-label="Record amount" value={amount} disabled={!!pending} onChange={setAmount} min={0} precision={currencyDigits(account?.currency ?? "PHP")} style={{ width: "100%" }} suffix={account?.currency} /></Form.Item>
      {type !== "transfer" && <Form.Item label="Category" required><Select aria-label="Record category" mode="tags" maxCount={1} value={category} disabled={!!pending} onChange={setCategory} options={categories.map((value) => ({ value, label: value }))} placeholder="Select or create a category" /></Form.Item>}
      <Form.Item label="Labels"><Select aria-label="Record labels" mode="tags" value={labels} disabled={!!pending} onChange={setLabels} options={knownLabels.map((value) => ({ value, label: value }))} placeholder="Select or create labels" /></Form.Item>
      <Form.Item label="Date and time"><DatePicker aria-label="Record date and time" showTime value={date} disabled={!!pending} onChange={setDate} style={{ width: "100%" }} placeholder="Current date and time" /><Typography.Text type="secondary">Leave blank to use the date and time when you save.</Typography.Text></Form.Item>
      <Form.Item label="Description"><Input.TextArea aria-label="Record description" value={description} disabled={!!pending} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={3} /></Form.Item>
      {day.error && <Typography.Text type="danger">Could not load this day. Close and retry.</Typography.Text>}
    </Form>
  </AppModal>;
}
