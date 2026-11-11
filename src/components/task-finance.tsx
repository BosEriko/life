"use client";

import { useState } from "react";
import { App, Button, Flex, Form, InputNumber, Select, Typography } from "antd";
import { TransactionOutlined } from "@ant-design/icons";
import { AppModal } from "@/components/app-modal";
import { useAuth } from "@/components/auth-provider";
import { useHealthData } from "@/components/health-data-provider";
import { accountOption } from "@/components/finance-record-modal";
import { plainText } from "@/components/rich-text";
import { currencyDigits, isDebtAccount, money, recordValidation, sortAccounts, taskRecord, taskRecordId, toMinor, type FinanceAccount } from "@/lib/finance";
import type { SubtaskChecks, Task } from "@/lib/task-schedule";
import { addFinanceRecord, deleteFinanceRecord } from "@/models/users/finance";
import { setTaskChecked } from "@/models/users/tasks";
import { todayKey } from "@/models/users/dailies";

export function ownFinanceAccounts(accounts: FinanceAccount[]) {
  return sortAccounts(accounts.filter((account) => !account.deletedAt && !isDebtAccount(account)));
}

export function useTaskRecordRemoval() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { financeRecords } = useHealthData();
  return (taskId: string, date: string) => {
    const record = financeRecords.find((item) => item.id === taskRecordId(taskId, date));
    if (!user || !record) return;
    void deleteFinanceRecord(user.uid, record).catch(() => message.error("Could not remove the linked finance record."));
    message.info(`Removed the linked ${money(record.amountMinor, record.currency)} ${record.type}.`);
  };
}

export function useTaskCompletion() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { financeRecords } = useHealthData();
  const removeRecord = useTaskRecordRemoval();
  const [pending, setPending] = useState<{ task: Task; date: string; subtasks: SubtaskChecks } | null>(null);

  const check = (task: Task, date: string, subtasks: SubtaskChecks) => {
    if (!user) return;
    if (task.finance && !financeRecords.some((record) => record.id === taskRecordId(task.id, date))) {
      setPending({ task, date, subtasks });
      return;
    }
    void setTaskChecked(user.uid, date, task.id, true, task, subtasks).catch(() => message.error("Could not update task."));
  };

  const uncheck = (task: Task, date: string, subtasks: SubtaskChecks) => {
    if (!user) return;
    void setTaskChecked(user.uid, date, task.id, false, task, subtasks).catch(() => message.error("Could not update task."));
    removeRecord(task.id, date);
  };

  const sheet = pending ? <TaskFinanceSheet key={`${pending.task.id}:${pending.date}`} {...pending} onClose={() => setPending(null)} /> : null;
  return { check, uncheck, sheet };
}

function TaskFinanceSheet({ task, date, subtasks, onClose }: { task: Task; date: string; subtasks: SubtaskChecks; onClose: () => void }) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { financeAccounts } = useHealthData();
  const finance = task.finance!;
  const accounts = ownFinanceAccounts(financeAccounts);
  const [accountId, setAccountId] = useState(accounts.some((account) => account.id === finance.accountId) ? finance.accountId : accounts[0]?.id ?? "");
  const account = accounts.find((item) => item.id === accountId);
  const savedAccount = financeAccounts.find((item) => item.id === finance.accountId);
  const [amount, setAmount] = useState<number | null>(finance.amountMinor / 10 ** currencyDigits(savedAccount?.currency ?? account?.currency ?? "PHP"));

  function complete(log: boolean) {
    if (!user) return;
    if (log) {
      if (!account) { message.error("Choose an account."); return; }
      const record = taskRecord(task, date, { ...finance, accountId, amountMinor: amount === null ? NaN : toMinor(amount, account.currency) }, accounts, todayKey(), new Date());
      const error = recordValidation(record, accounts);
      if (error) { message.error(error); return; }
      void addFinanceRecord(user.uid, record, accounts).catch(() => message.error("Could not log the finance record."));
      message.success(`Logged ${money(record.amountMinor, record.currency)} ${record.type}${navigator.onLine ? "." : " offline. It will sync when you reconnect."}`);
    }
    void setTaskChecked(user.uid, date, task.id, true, task, subtasks).catch(() => message.error("Could not update task."));
    onClose();
  }

  return <AppModal open title={<><TransactionOutlined style={{ marginRight: 8 }} />Log to Finance</>} onCancel={onClose} footer={<Flex justify="flex-end" gap={8} wrap>
    <Button onClick={() => complete(false)}>Complete without logging</Button>
    <Button type="primary" onClick={() => complete(true)}>Log and complete</Button>
  </Flex>}>
    <Typography.Paragraph type="secondary">
      {plainText(task.title)} · {finance.type === "income" ? "Income" : "Expense"} · {finance.category}
    </Typography.Paragraph>
    <Form layout="vertical" onFinish={() => complete(true)}>
      <Form.Item label="Amount" required><InputNumber aria-label="Finance amount" value={amount} onChange={setAmount} min={0} precision={currencyDigits(account?.currency ?? "PHP")} style={{ width: "100%" }} suffix={account?.currency} autoFocus /></Form.Item>
      <Form.Item label="Account" required style={{ marginBottom: 0 }}><Select aria-label="Finance account" value={accountId || undefined} onChange={setAccountId} placeholder="Choose an account" options={accounts.map((item) => ({ value: item.id, label: accountOption(item) }))} /></Form.Item>
    </Form>
  </AppModal>;
}
