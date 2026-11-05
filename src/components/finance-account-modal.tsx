"use client";

import { useState } from "react";
import { App, AutoComplete, Button, Checkbox, Flex, Form, Input, InputNumber, Segmented, Select } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { AppModal } from "@/components/app-modal";
import { useAuth } from "@/components/auth-provider";
import { useHealthData } from "@/components/health-data-provider";
import { ACCOUNT_TYPES, CURRENCIES, accountValidation, currencyDigits, isDebtAccount, toMinor, type FinanceAccount } from "@/lib/finance";
import { deleteFinanceAccount, editFinanceAccount, saveFinanceAccount } from "@/models/users/finance";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { AccountTypeIcon } from "@/components/finance-category-icon";


export function FinanceAccountModal({ initial = null, defaultType, onClose }: { initial?: FinanceAccount | null; defaultType?: string; onClose: () => void }) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? "#326647");
  const [type, setType] = useState(initial?.type ?? defaultType ?? "Cash");
  const [currency, setCurrency] = useState(initial?.currency ?? "PHP");
  const [amount, setAmount] = useState<number | null>(initial ? initial.initialMinor / 10 ** currencyDigits(initial.currency) : 0);
  const [owed, setOwed] = useState<"owe" | "owed">(initial && initial.initialMinor > 0 ? "owed" : "owe");
  const [excluded, setExcluded] = useState(initial?.excludeFromStatistics ?? false);
  const [provider, setProvider] = useState(initial?.provider ?? "");
  const { financeAccounts } = useHealthData();
  const debt = isDebtAccount({ type });
  const personForm = initial ? isDebtAccount(initial) : defaultType === "Debt";
  const typeOptions = initial ? ACCOUNT_TYPES.filter((value) => (value === "Debt") === isDebtAccount(initial)) : ACCOUNT_TYPES;
  const knownProviders = [...new Set(financeAccounts.map((account) => account.provider?.trim()).filter((value): value is string => !!value))];
  function remove() {
    if (!user || !initial) return;
    void deleteFinanceAccount(user.uid, initial.id).catch(() => message.error("Could not delete the account."));
    onClose();
    message.success(`${debt ? "Person" : "Account"} deleted. Existing records have been kept.`);
  }
  function save() {
    if (!user) return;
    const signed = amount === null ? null : debt ? (owed === "owe" ? -Math.abs(amount) : Math.abs(amount)) : amount;
    const initialMinor = signed === null ? NaN : toMinor(signed, currency);
    const account: FinanceAccount = { id: initial?.id ?? crypto.randomUUID(), name, color, type, currency, initialMinor, balanceMinor: initialMinor, excludeFromStatistics: debt || excluded, provider };
    const error = accountValidation(account);
    if (error) { message.error(error); return; }
    const operation = initial ? editFinanceAccount(user.uid, account, initial) : saveFinanceAccount(user.uid, account);
    void operation.catch(() => message.error(initial && initialMinor !== initial.initialMinor ? "Could not update the initial amount. Connect to the internet and try again." : "Could not save the account."));
    onClose();
    if (initial && initialMinor !== initial.initialMinor) message.info("Updating the initial amount…");
    else message.success(navigator.onLine ? `${debt ? "Person" : "Account"} ${initial ? "updated" : "added"}.` : `${debt ? "Person" : "Account"} saved offline. It will sync when you reconnect.`);
  }
  return <AppModal open title={initial ? (isDebtAccount(initial) ? "Edit person" : "Edit account") : debt ? "Add person" : "Add account"} onCancel={onClose} footer={<Flex justify="space-between" gap={12} wrap>
    {initial ? <ConfirmActionButton icon={<DeleteOutlined />} idleLabel={debt ? "Delete person" : "Delete account"} armedLabel="Confirm delete" ariaLabel={debt ? "Delete person" : "Delete account"} hint={`Tap again to delete this ${debt ? "person" : "account"}. Existing records will be kept.`} onConfirm={remove} /> : <span />}
    <Button type="primary" onClick={save}>{initial ? "Save changes" : debt ? "Add person" : "Add account"}</Button>
  </Flex>}>
    <Form layout="vertical" onFinish={save}>
      <Form.Item label={debt ? "Person or lender" : "Account name"} required><Input aria-label="Account name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder={debt ? "e.g. Mom or a friend" : undefined} autoFocus /></Form.Item>
      {!debt && <Form.Item label="Provider"><AutoComplete aria-label="Account provider" value={provider} onChange={setProvider} maxLength={120} placeholder="Optional, e.g. GCash, Metrobank, Maya" options={knownProviders.filter((value) => value.toLowerCase().includes(provider.trim().toLowerCase()) && value !== provider).map((value) => ({ value }))} /></Form.Item>}
      <Form.Item label="Hexadecimal color" required><Input aria-label="Account color" value={color} onChange={(event) => setColor(event.target.value)} maxLength={7} prefix={<span style={{ width: 16, height: 16, borderRadius: 4, background: /^#[0-9a-f]{6}$/i.test(color) ? color : "transparent" }} />} placeholder="#326647" /></Form.Item>
      {!personForm && <Form.Item label="Account type" required extra={debt ? "Use one debt account per person or lender, like Mom or a bank loan." : undefined}><Select aria-label="Account type" value={type} onChange={setType} options={typeOptions.map((value) => ({ value, label: <span><AccountTypeIcon type={value} style={{ marginRight: 8 }} />{value}</span> }))} /></Form.Item>}
      <Form.Item label="Currency" required extra={initial ? "Currency stays fixed to preserve existing records." : undefined}><Select aria-label="Account currency" showSearch disabled={!!initial} value={currency} onChange={setCurrency} options={CURRENCIES.map((value) => ({ value, label: value }))} /></Form.Item>
      <Form.Item label={debt ? "Starting balance" : "Initial amount"} required extra={initial ? "Changing the initial amount adjusts the balance and requires an internet connection." : undefined}>
        {debt ? <>
          <InputNumber aria-label="Initial amount" value={amount === null ? null : Math.abs(amount)} onChange={setAmount} min={0} precision={currencyDigits(currency)} style={{ width: "100%" }} prefix={owed === "owe" ? "−" : "+"} suffix={currency} />
          <Segmented block aria-label="Who owes whom" value={owed} onChange={setOwed} options={[{ value: "owe", label: "I owe them" }, { value: "owed", label: "They owe me" }]} style={{ marginTop: 8 }} />
        </> : <InputNumber aria-label="Initial amount" value={amount} onChange={setAmount} precision={currencyDigits(currency)} style={{ width: "100%" }} suffix={currency} />}
      </Form.Item>
      {!debt && <Form.Item><Checkbox checked={excluded} onChange={(event) => setExcluded(event.target.checked)}>Exclude from statistics</Checkbox></Form.Item>}
    </Form>
  </AppModal>;
}
