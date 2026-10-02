"use client";

import { useState } from "react";
import { App, Button, Checkbox, Flex, Form, Input, InputNumber, Select } from "antd";
import { BankOutlined, CreditCardOutlined, DeleteOutlined, DollarOutlined, EllipsisOutlined, FundOutlined, SafetyOutlined, WalletOutlined } from "@ant-design/icons";
import { AppModal } from "@/components/app-modal";
import { useAuth } from "@/components/auth-provider";
import { ACCOUNT_TYPES, CURRENCIES, accountValidation, currencyDigits, toMinor, type FinanceAccount } from "@/lib/finance";
import { deleteFinanceAccount, editFinanceAccount, saveFinanceAccount } from "@/models/finance";
import { ConfirmActionButton } from "@/components/confirm-action-button";

const TYPE_ICONS = [WalletOutlined, BankOutlined, SafetyOutlined, CreditCardOutlined, FundOutlined, DollarOutlined, EllipsisOutlined];

export function FinanceAccountModal({ initial = null, onClose }: { initial?: FinanceAccount | null; onClose: () => void }) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? "#326647");
  const [type, setType] = useState(initial?.type ?? "Cash");
  const [currency, setCurrency] = useState(initial?.currency ?? "PHP");
  const [amount, setAmount] = useState<number | null>(initial ? initial.initialMinor / 10 ** currencyDigits(initial.currency) : 0);
  const [excluded, setExcluded] = useState(initial?.excludeFromStatistics ?? false);
  function remove() {
    if (!user || !initial) return;
    void deleteFinanceAccount(user.uid, initial.id).catch(() => message.error("Could not delete the account."));
    onClose();
    message.success("Account deleted. Existing records have been kept.");
  }
  function save() {
    if (!user) return;
    const initialMinor = amount === null ? NaN : toMinor(amount, currency);
    const account: FinanceAccount = { id: initial?.id ?? crypto.randomUUID(), name, color, type, currency, initialMinor, balanceMinor: initialMinor, excludeFromStatistics: excluded };
    const error = accountValidation(account);
    if (error) { message.error(error); return; }
    const operation = initial ? editFinanceAccount(user.uid, account, initial) : saveFinanceAccount(user.uid, account);
    void operation.catch(() => message.error(initial && initialMinor !== initial.initialMinor ? "Could not update the initial amount. Connect to the internet and try again." : "Could not save the account."));
    onClose();
    if (initial && initialMinor !== initial.initialMinor) message.info("Updating the initial amount…");
    else message.success(navigator.onLine ? (initial ? "Account updated." : "Account added.") : "Account saved offline. It will sync when you reconnect.");
  }
  return <AppModal open title={initial ? "Edit account" : "Add account"} onCancel={onClose} footer={<Flex justify="space-between" gap={12} wrap>
    {initial ? <ConfirmActionButton icon={<DeleteOutlined />} idleLabel="Delete account" armedLabel="Confirm delete" ariaLabel="Delete account" hint="Tap again to delete this account. Existing records will be kept." onConfirm={remove} /> : <span />}
    <Button type="primary" onClick={save}>{initial ? "Save changes" : "Add account"}</Button>
  </Flex>}>
    <Form layout="vertical" onFinish={save}>
      <Form.Item label="Account name" required><Input aria-label="Account name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoFocus /></Form.Item>
      <Form.Item label="Hexadecimal color" required><Input aria-label="Account color" value={color} onChange={(event) => setColor(event.target.value)} maxLength={7} prefix={<span style={{ width: 16, height: 16, borderRadius: 4, background: /^#[0-9a-f]{6}$/i.test(color) ? color : "transparent" }} />} placeholder="#326647" /></Form.Item>
      <Form.Item label="Account type" required><Select aria-label="Account type" value={type} onChange={setType} options={ACCOUNT_TYPES.map((value, index) => { const Icon = TYPE_ICONS[index]; return { value, label: <span><Icon style={{ marginRight: 8 }} />{value}</span> }; })} /></Form.Item>
      <Form.Item label="Currency" required extra={initial ? "Currency stays fixed to preserve existing records." : undefined}><Select aria-label="Account currency" showSearch disabled={!!initial} value={currency} onChange={setCurrency} options={CURRENCIES.map((value) => ({ value, label: value }))} /></Form.Item>
      <Form.Item label="Initial amount" required extra={initial ? "Changing the initial amount adjusts the balance and requires an internet connection." : undefined}><InputNumber aria-label="Initial amount" value={amount} onChange={setAmount} precision={currencyDigits(currency)} style={{ width: "100%" }} suffix={currency} /></Form.Item>
      <Form.Item><Checkbox checked={excluded} onChange={(event) => setExcluded(event.target.checked)}>Exclude from statistics</Checkbox></Form.Item>
    </Form>
  </AppModal>;
}
