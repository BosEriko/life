import { collection, deleteField, doc, FieldPath, increment, onSnapshot, orderBy, query, runTransaction, setDoc, updateDoc, where, writeBatch, type DocumentData, type QueryDocumentSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { labelValidation, type FinanceLabel } from "@/lib/finance-labels";
import { budgetValidation, type FinanceBudget } from "@/lib/finance-budgets";
import { categoryDeleteBlocker, categoryValidation, resetCategories, type FinanceCategory } from "@/lib/finance-categories";
import { accountValidation, balanceChanges, EMERGENCY_FUND_AVERAGE_MONTHS, EMERGENCY_FUND_MONTHS, emergencyFundAverageMonthsOrDefault, emergencyFundMonthsOrDefault, rebuiltBalance, recordValidation, type FinanceAccount, type FinanceRecord } from "@/lib/finance";

const settingsRef = (uid: string) => doc(getFirebaseDb(), "users", uid, "financeSettings", "current");

export function saveFinanceAccount(uid: string, account: FinanceAccount) {
  const error = accountValidation(account);
  if (error) return Promise.reject(new Error(error));
  return setDoc(settingsRef(uid), { accounts: { [account.id]: { ...account, name: account.name.trim(), provider: (account.provider ?? "").trim() } } }, { mergeFields: [new FieldPath("accounts", account.id)] });
}

export function editFinanceAccount(uid: string, account: FinanceAccount, original: FinanceAccount) {
  const error = accountValidation({ ...account, balanceMinor: account.initialMinor });
  if (error) return Promise.reject(new Error(error));
  if (account.currency !== original.currency) return Promise.reject(new Error("The currency of an existing account cannot be changed."));
  const fields = { name: account.name.trim(), color: account.color, type: account.type, excludeFromStatistics: account.excludeFromStatistics, provider: (account.provider ?? "").trim() };
  if (account.initialMinor !== original.initialMinor) {
    return runTransaction(getFirebaseDb(), async (transaction) => {
      const snapshot = await transaction.get(settingsRef(uid));
      const current = snapshot.data()?.accounts?.[account.id] as FinanceAccount | undefined;
      if (!current) throw new Error("Account not found.");
      const balanceMinor = current.balanceMinor + account.initialMinor - current.initialMinor;
      if (!Number.isSafeInteger(balanceMinor)) throw new Error("The balance exceeds the supported amount.");
      transaction.update(settingsRef(uid), new FieldPath("accounts", account.id), { ...current, ...fields, initialMinor: account.initialMinor, balanceMinor });
    });
  }
  return updateDoc(settingsRef(uid),
    new FieldPath("accounts", account.id, "name"), fields.name,
    new FieldPath("accounts", account.id, "color"), fields.color,
    new FieldPath("accounts", account.id, "type"), fields.type,
    new FieldPath("accounts", account.id, "excludeFromStatistics"), fields.excludeFromStatistics,
    new FieldPath("accounts", account.id, "provider"), fields.provider);
}

export function reorderFinanceAccounts(uid: string, ids: string[]) {
  if (ids.length === 0) return Promise.resolve();
  const [first, ...rest] = ids.flatMap((id, index) => [new FieldPath("accounts", id, "order"), index] as const);
  return updateDoc(settingsRef(uid), first as FieldPath, rest[0], ...rest.slice(1));
}

export function setFinanceAccountHidden(uid: string, id: string, hidden: boolean) {
  return updateDoc(settingsRef(uid), new FieldPath("accounts", id, "hiddenAt"), hidden ? new Date().toISOString() : null);
}

export function deleteFinanceAccount(uid: string, id: string) {
  return updateDoc(settingsRef(uid), new FieldPath("accounts", id, "deletedAt"), new Date().toISOString());
}

export function addFinanceRecord(uid: string, record: FinanceRecord, accounts: FinanceAccount[]) {
  const error = recordValidation(record, accounts);
  if (error) return Promise.reject(new Error(error));
  const batch = writeBatch(getFirebaseDb());
  batch.set(doc(getFirebaseDb(), "users", uid, "financeRecords", record.id), record);
  batch.update(settingsRef(uid), { revision: increment(1) });
  for (const [id, change] of balanceChanges(record)) batch.update(settingsRef(uid), new FieldPath("accounts", id, "balanceMinor"), increment(change));
  return batch.commit();
}

export function editFinanceRecord(uid: string, original: FinanceRecord, record: FinanceRecord, accounts: FinanceAccount[]) {
  const reverted = accounts.map((account) => ({ ...account, balanceMinor: account.balanceMinor - balanceChanges(original).filter(([id]) => id === account.id).reduce((sum, [, change]) => sum + change, 0) }));
  const error = recordValidation(record, reverted);
  if (error) return Promise.reject(new Error(error));
  const batch = writeBatch(getFirebaseDb());
  batch.set(doc(getFirebaseDb(), "users", uid, "financeRecords", record.id), record);
  batch.update(settingsRef(uid), { revision: increment(1) });
  const net = new Map<string, number>();
  for (const [id, change] of balanceChanges(original)) net.set(id, (net.get(id) ?? 0) - change);
  for (const [id, change] of balanceChanges(record)) net.set(id, (net.get(id) ?? 0) + change);
  for (const [id, change] of net) if (change !== 0) batch.update(settingsRef(uid), new FieldPath("accounts", id, "balanceMinor"), increment(change));
  return batch.commit();
}

export function deleteFinanceRecord(uid: string, record: FinanceRecord) {
  const batch = writeBatch(getFirebaseDb());
  batch.delete(doc(getFirebaseDb(), "users", uid, "financeRecords", record.id));
  batch.update(settingsRef(uid), { revision: increment(1) });
  for (const [id, change] of balanceChanges(record)) batch.update(settingsRef(uid), new FieldPath("accounts", id, "balanceMinor"), increment(-change));
  return batch.commit();
}

export function recalculateFinanceAccounts(uid: string, records: FinanceRecord[], revision: number) {
  return runTransaction(getFirebaseDb(), async (transaction) => {
    const snapshot = await transaction.get(settingsRef(uid));
    if ((snapshot.data()?.revision ?? 0) !== revision) throw new Error("Records changed during recalculation. Please try again.");
    const accounts = Object.values(snapshot.data()?.accounts ?? {}) as FinanceAccount[];
    for (const account of accounts) {
      const balance = rebuiltBalance(account, records);
      if (!Number.isSafeInteger(balance)) throw new Error("The balance exceeds the supported amount.");
      transaction.update(settingsRef(uid), new FieldPath("accounts", account.id, "balanceMinor"), balance);
    }
    transaction.update(settingsRef(uid), "lastRecalculatedAt", new Date().toISOString());
  });
}

export function watchFinanceAccounts(uid: string, next: (accounts: FinanceAccount[], settings: { accountsLocked: boolean; budgetsLocked: boolean; lastRecalculatedAt: string | null; emergencyFundMonths: number; emergencyFundAverageMonths: number; categories: FinanceCategory[] | null; budgets: FinanceBudget[]; labels: FinanceLabel[] }) => void, fail: (error: Error) => void) {
  return onSnapshot(settingsRef(uid), (snapshot) => next(Object.values(snapshot.data()?.accounts ?? {}), { accountsLocked: snapshot.data()?.accountsLocked === true, budgetsLocked: snapshot.data()?.budgetsLocked === true, lastRecalculatedAt: (snapshot.data()?.lastRecalculatedAt as string | undefined) ?? null, emergencyFundMonths: emergencyFundMonthsOrDefault(snapshot.data()?.emergencyFundMonths), emergencyFundAverageMonths: emergencyFundAverageMonthsOrDefault(snapshot.data()?.emergencyFundAverageMonths), categories: snapshot.data()?.categories ? Object.values(snapshot.data()!.categories as Record<string, FinanceCategory>) : null, budgets: Object.values((snapshot.data()?.budgets ?? {}) as Record<string, FinanceBudget>), labels: Object.values((snapshot.data()?.labels ?? {}) as Record<string, FinanceLabel>) }), fail);
}

const categoryMap = (categories: FinanceCategory[]) => Object.fromEntries(categories.map((category) => [category.id, category]));

export function saveFinanceCategory(uid: string, category: FinanceCategory, categories: FinanceCategory[], seeded: boolean) {
  const error = categoryValidation(category, categories);
  if (error) return Promise.reject(new Error(error));
  const clean = { ...category, name: category.name.trim(), color: category.color.toUpperCase() };
  if (!seeded) return setDoc(settingsRef(uid), { categories: categoryMap([...categories.filter((item) => item.id !== clean.id), clean]) }, { mergeFields: ["categories"] });
  return setDoc(settingsRef(uid), { categories: { [clean.id]: clean } }, { mergeFields: [new FieldPath("categories", clean.id)] });
}

export function deleteFinanceCategory(uid: string, id: string, categories: FinanceCategory[], seeded: boolean) {
  const error = categoryDeleteBlocker(id, categories);
  if (error) return Promise.reject(new Error(error));
  if (!seeded) return setDoc(settingsRef(uid), { categories: categoryMap(categories.filter((item) => item.id !== id)) }, { mergeFields: ["categories"] });
  return setDoc(settingsRef(uid), { categories: { [id]: deleteField() } }, { merge: true });
}

export function reorderFinanceCategories(uid: string, ids: string[], categories: FinanceCategory[], seeded: boolean) {
  if (ids.length === 0) return Promise.resolve();
  if (!seeded) return setDoc(settingsRef(uid), { categories: categoryMap(categories.map((category) => ids.includes(category.id) ? { ...category, order: ids.indexOf(category.id) } : category)) }, { mergeFields: ["categories"] });
  const [first, ...rest] = ids.flatMap((id, index) => [new FieldPath("categories", id, "order"), index] as const);
  return updateDoc(settingsRef(uid), first as FieldPath, rest[0], ...rest.slice(1));
}

export function saveFinanceLabel(uid: string, label: FinanceLabel, labels: FinanceLabel[]) {
  const error = labelValidation(label, labels);
  if (error) return Promise.reject(new Error(error));
  const clean = { ...label, name: label.name.trim(), color: label.color.toUpperCase() };
  return setDoc(settingsRef(uid), { labels: { [clean.id]: clean } }, { mergeFields: [new FieldPath("labels", clean.id)] });
}

export function deleteFinanceLabel(uid: string, id: string) {
  return setDoc(settingsRef(uid), { labels: { [id]: deleteField() } }, { merge: true });
}

export function reorderFinanceLabels(uid: string, ids: string[]) {
  if (ids.length === 0) return Promise.resolve();
  const [first, ...rest] = ids.flatMap((id, index) => [new FieldPath("labels", id, "order"), index] as const);
  return updateDoc(settingsRef(uid), first as FieldPath, rest[0], ...rest.slice(1));
}

export function saveFinanceBudget(uid: string, budget: FinanceBudget, accounts: FinanceAccount[]) {
  const error = budgetValidation(budget, accounts);
  if (error) return Promise.reject(new Error(error));
  const clean = { ...budget, name: budget.name.trim(), color: budget.color.toUpperCase() };
  return setDoc(settingsRef(uid), { budgets: { [clean.id]: clean } }, { mergeFields: [new FieldPath("budgets", clean.id)] });
}

export function deleteFinanceBudget(uid: string, id: string) {
  return setDoc(settingsRef(uid), { budgets: { [id]: deleteField() } }, { merge: true });
}

export function reorderFinanceBudgets(uid: string, ids: string[]) {
  if (ids.length === 0) return Promise.resolve();
  const [first, ...rest] = ids.flatMap((id, index) => [new FieldPath("budgets", id, "order"), index] as const);
  return updateDoc(settingsRef(uid), first as FieldPath, rest[0], ...rest.slice(1));
}

export function resetFinanceCategories(uid: string, categories: FinanceCategory[]) {
  return setDoc(settingsRef(uid), { categories: categoryMap(resetCategories(categories)) }, { mergeFields: ["categories"] });
}

export function setFinanceBudgetsLocked(uid: string, locked: boolean) {
  return setDoc(settingsRef(uid), { budgetsLocked: locked }, { merge: true });
}

export function setFinanceAccountsLocked(uid: string, locked: boolean) {
  return setDoc(settingsRef(uid), { accountsLocked: locked }, { merge: true });
}

export function setEmergencyFundMonths(uid: string, months: number) {
  if (!EMERGENCY_FUND_MONTHS.includes(months)) return Promise.reject(new Error("Choose a supported emergency fund goal."));
  return setDoc(settingsRef(uid), { emergencyFundMonths: months }, { merge: true });
}

export function setEmergencyFundAverageMonths(uid: string, months: number) {
  if (!EMERGENCY_FUND_AVERAGE_MONTHS.includes(months)) return Promise.reject(new Error("Choose a supported averaging period."));
  return setDoc(settingsRef(uid), { emergencyFundAverageMonths: months }, { merge: true });
}

export function mapFinanceRecord(snapshot: QueryDocumentSnapshot<DocumentData>): FinanceRecord {
  return { ...snapshot.data(), id: snapshot.id } as FinanceRecord;
}

export function watchFinanceRecords(uid: string, cutoff: string, next: (records: FinanceRecord[]) => void, fail: (error: Error) => void) {
  return onSnapshot(query(collection(getFirebaseDb(), "users", uid, "financeRecords"), where("date", ">=", cutoff), orderBy("date", "desc")), (snapshot) => next(snapshot.docs.map(mapFinanceRecord)), fail);
}

export function watchFinanceDay(uid: string, date: string, next: (records: FinanceRecord[]) => void, fail: (error: Error) => void) {
  return onSnapshot(query(collection(getFirebaseDb(), "users", uid, "financeRecords"), where("date", "==", date)), (snapshot) => next(snapshot.docs.map(mapFinanceRecord)), fail);
}
