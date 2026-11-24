"use client";

import { useEffect, useState } from "react";
import { App, AutoComplete, Button, Checkbox, Flex, Form, Input, InputNumber, Segmented, Select, ColorPicker } from "antd";
import { DeleteOutlined, EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";
import { AppModal } from "@/components/app-modal";
import { useAuth } from "@/components/auth-provider";
import { useHealthData } from "@/components/health-data-provider";
import { ACCOUNT_TYPES, CURRENCIES, accountValidation, currencyDigits, isDebtAccount, money, toMinor, type FinanceAccount } from "@/lib/finance";
import { getWiseStatus, linkWiseAccount, type WiseStatus } from "@/models/wise";
import { deleteFinanceAccount, editFinanceAccount, saveFinanceAccount, setFinanceAccountHidden } from "@/models/users/finance";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { LABEL_COLORS } from "@/lib/finance-labels";
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
  const typeOptions = ACCOUNT_TYPES.filter((value) => value !== "Debt" && (value !== "Wise" || type === "Wise"));
  const linkedBefore = initial?.source === "wise";
  const [wiseStatus, setWiseStatus] = useState<WiseStatus | null>(null);
  const [wiseOn, setWiseOn] = useState(linkedBefore);
  const [wiseCurrency, setWiseCurrency] = useState<string | null>(linkedBefore ? initial!.currency : null);
  useEffect(() => {
    if (!user || personForm) return;
    let active = true;
    getWiseStatus(user, true).then((next) => { if (active) setWiseStatus(next); }).catch(() => {});
    return () => { active = false; };
  }, [user, personForm]);
  const wiseLinks = wiseStatus?.connected ? wiseStatus.links : {};
  const wiseBalances = wiseStatus?.connected ? wiseStatus.balances ?? [] : [];
  const wiseAvailable = wiseStatus?.connected === true || linkedBefore;
  const syncing = wiseOn && wiseAvailable;
  const knownProviders = [...new Set(financeAccounts.map((account) => account.provider?.trim()).filter((value): value is string => !!value))];
  function toggleHidden() {
    if (!user || !initial) return;
    const hidden = !initial.hiddenAt;
    void setFinanceAccountHidden(user.uid, initial.id, hidden).catch(() => message.error(`Could not ${hidden ? "hide" : "unhide"} ${initial.name}.`));
    onClose();
    message.success(hidden ? `${initial.name} hidden. Turn on Show hidden to see them again.` : `${initial.name} is visible again.`);
  }
  function remove() {
    if (!user || !initial) return;
    void deleteFinanceAccount(user.uid, initial.id).catch(() => message.error("Could not delete the account."));
    onClose();
    message.success(`${debt ? "Person" : "Account"} deleted. Existing records have been kept.`);
  }
  function save() {
    if (!user) return;
    if (syncing && !wiseCurrency) { message.error("Choose which Wise balance to sync."); return; }
    const signed = amount === null ? null : debt ? (owed === "owe" ? -Math.abs(amount) : Math.abs(amount)) : amount;
    const accountCurrency = syncing ? wiseCurrency! : currency;
    const initialMinor = syncing ? initial?.initialMinor ?? 0 : signed === null ? NaN : toMinor(signed, accountCurrency);
    const accountType = syncing ? "Wise" : type;
    const account: FinanceAccount = { id: initial?.id ?? crypto.randomUUID(), name, color, type: accountType, currency: accountCurrency, initialMinor, balanceMinor: initialMinor, excludeFromStatistics: debt || excluded, provider };
    const error = accountValidation(account);
    if (error) { message.error(error); return; }
    const linkTo = syncing ? wiseCurrency : null;
    const relink = linkTo !== (linkedBefore ? initial!.currency : null);
    const operation = (initial ? editFinanceAccount(user.uid, account, initial) : saveFinanceAccount(user.uid, account))
      .then(() => relink ? linkWiseAccount(user, account.id, linkTo).catch((linkError: Error) => message.error(linkError.message)) : undefined);
    void operation.catch(() => message.error(initial && initialMinor !== initial.initialMinor ? "Could not update the initial amount. Connect to the internet and try again." : "Could not save the account."));
    if (relink && linkTo) message.loading({ key: "wise-link", content: "Linking to Wise and importing your activity…", duration: 3 });
    onClose();
    if (initial && initialMinor !== initial.initialMinor) message.info("Updating the initial amount…");
    else message.success(navigator.onLine ? `${debt ? "Person" : "Account"} ${initial ? "updated" : "added"}.` : `${debt ? "Person" : "Account"} saved offline. It will sync when you reconnect.`);
  }
  return <AppModal open title={initial ? (isDebtAccount(initial) ? "Edit person" : "Edit account") : debt ? "Add person" : "Add account"} onCancel={onClose} footer={<Flex justify="space-between" gap={12} wrap>
    {initial && personForm ? <Button icon={initial.hiddenAt ? <EyeOutlined /> : <EyeInvisibleOutlined />} onClick={toggleHidden}>{initial.hiddenAt ? "Unhide" : "Hide"}</Button> : initial ? <ConfirmActionButton icon={<DeleteOutlined />} idleLabel={debt ? "Delete person" : "Delete account"} armedLabel="Confirm delete" ariaLabel={debt ? "Delete person" : "Delete account"} hint={`Tap again to delete this ${debt ? "person" : "account"}. Existing records will be kept.`} onConfirm={remove} /> : <span />}
    <Button type="primary" onClick={save}>{initial ? "Save changes" : debt ? "Add person" : "Add account"}</Button>
  </Flex>}>
    <Form layout="vertical" onFinish={save}>
      <Form.Item label={debt ? "Person or lender" : "Account name"} required><Input aria-label="Account name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder={debt ? "e.g. Mom or a friend" : undefined} autoFocus /></Form.Item>
      {!debt && <Form.Item label="Provider"><AutoComplete aria-label="Account provider" value={provider} onChange={setProvider} maxLength={120} placeholder="Optional, e.g. GCash, Metrobank, Maya" options={knownProviders.filter((value) => value.toLowerCase().includes(provider.trim().toLowerCase()) && value !== provider).map((value) => ({ value }))} /></Form.Item>}
      <Form.Item label="Color" required><Input aria-label="Account color" value={color} onChange={(event) => setColor(event.target.value)} maxLength={7} prefix={<ColorPicker size="small" aria-label="Pick account color" value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#326647"} disabledAlpha presets={[{ label: "Colors", colors: ["#326647", ...LABEL_COLORS] }]} onChangeComplete={(value) => setColor(value.toHexString().toUpperCase())} />} placeholder="#326647" /></Form.Item>
      {!personForm && <Form.Item label="Sync with"><Select aria-label="Sync with" value={wiseOn ? "wise" : "none"} onChange={(value) => { const on = value === "wise"; setWiseOn(on); if (!on && type === "Wise") setType("Bank account"); }}
        options={[{ value: "none", label: "None" }, { value: "wise", disabled: !wiseAvailable, label: wiseAvailable ? "Wise" : "Wise · connect it in Profile › Finance first" }]} /></Form.Item>}
      {!personForm && syncing && <Form.Item label="Wise balance" required>
        <Select aria-label="Wise balance" placeholder={wiseStatus === null ? "Loading your Wise balances…" : "Choose a Wise balance"} loading={wiseStatus === null} value={wiseCurrency ?? undefined} onChange={setWiseCurrency}
          optionLabelProp="title"
          options={(wiseBalances.length ? wiseBalances : wiseCurrency ? [{ currency: wiseCurrency, amountMinor: null }] : []).map((balance) => {
            const owner = wiseLinks[balance.currency] && wiseLinks[balance.currency] !== initial?.id ? financeAccounts.find((account) => account.id === wiseLinks[balance.currency] && !account.deletedAt) : undefined;
            const wrongCurrency = !!initial && initial.currency !== balance.currency;
            const amount = balance.amountMinor !== null ? money(balance.amountMinor, balance.currency) : null;
            const note = owner ? `Linked to ${owner.name}` : wrongCurrency ? `This account is in ${initial!.currency}` : null;
            return {
              value: balance.currency,
              disabled: !!owner || wrongCurrency,
              title: `${balance.currency} balance${amount ? ` · ${amount}` : ""}`,
              label: <div style={{ padding: "2px 0", lineHeight: 1.4 }}>
                <Flex justify="space-between" gap={12}><span>{balance.currency} balance</span>{amount && <span style={{ fontVariantNumeric: "tabular-nums" }}>{amount}</span>}</Flex>
                {note && <div style={{ fontSize: 12 }}>{note}</div>}
              </div>,
            };
          })} />
      </Form.Item>}
      {!personForm && !syncing && <Form.Item label="Account type" required><Select aria-label="Account type" value={type} onChange={setType} options={typeOptions.map((value) => ({ value, label: <span><AccountTypeIcon type={value} style={{ marginRight: 8 }} />{value}</span> }))} /></Form.Item>}
      {!syncing && <Form.Item label="Currency" required extra={initial ? "Currency stays fixed to preserve existing records." : undefined}><Select aria-label="Account currency" showSearch disabled={!!initial} value={currency} onChange={setCurrency} options={CURRENCIES.map((value) => ({ value, label: value }))} /></Form.Item>}
      {!syncing && <Form.Item label={debt ? "Starting balance" : "Initial amount"} required extra={initial ? "Changing the initial amount adjusts the balance and requires an internet connection." : undefined}>
        {debt ? <>
          <InputNumber aria-label="Initial amount" value={amount === null ? null : Math.abs(amount)} onChange={setAmount} min={0} precision={currencyDigits(currency)} style={{ width: "100%" }} prefix={owed === "owe" ? "−" : "+"} suffix={currency} />
          <Segmented block aria-label="Who owes whom" value={owed} onChange={setOwed} options={[{ value: "owe", label: "I owe them" }, { value: "owed", label: "They owe me" }]} style={{ marginTop: 8 }} />
        </> : <InputNumber aria-label="Initial amount" value={amount} onChange={setAmount} precision={currencyDigits(currency)} style={{ width: "100%" }} suffix={currency} />}
      </Form.Item>}
      {!debt && <Form.Item><Checkbox checked={excluded} onChange={(event) => setExcluded(event.target.checked)}>Exclude from statistics</Checkbox></Form.Item>}
    </Form>
  </AppModal>;
}
