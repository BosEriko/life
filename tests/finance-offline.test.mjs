import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { initializeApp, deleteApp } from "firebase/app";
import * as firestore from "firebase/firestore";
import * as finance from "../src/lib/finance.ts";

test("offline records self-echo and atomically update stored balances, including backdated transfers", async () => {
  const app = initializeApp({ projectId: "demo-finance-offline" }, "finance-offline-test");
  const db = firestore.initializeFirestore(app, { localCache: firestore.memoryLocalCache() });
  await firestore.disableNetwork(db);
  const output = ts.transpileModule(fs.readFileSync("src/models/users/finance.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const models = {};
  vm.runInThisContext(`(function(exports, require) { ${output}\n})`)(models, (name) => {
    if (name === "@/lib/firebase") return { getFirebaseDb: () => db };
    if (name === "@/lib/finance") return finance;
    if (name === "firebase/firestore") return firestore;
    throw new Error(`Unexpected import: ${name}`);
  });
  const accountSnapshots = [];
  const recordSnapshots = [];
  const oldSnapshots = [];
  const failures = [];
  const fail = (error) => failures.push(error);
  const off = [models.watchFinanceAccounts("user", (rows) => accountSnapshots.push(rows), fail), models.watchFinanceRecords("user", "2026-01-01", (rows) => recordSnapshots.push(rows), fail), models.watchFinanceDay("user", "2020-01-01", (rows) => oldSnapshots.push(rows), fail)];
  const waitFor = async (predicate) => {
    for (let i = 0; i < 200; i++) {
      if (failures.length) throw failures[0];
      if (predicate()) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.fail("Expected offline snapshot did not arrive");
  };
  const pending = (promise) => promise.catch(() => {});
  const currentAccounts = () => accountSnapshots.at(-1);
  const balance = (id) => currentAccounts()?.find((account) => account.id === id)?.balanceMinor;
  const account = { id: "cash", name: "Cash", color: "#326647", type: "Cash", currency: "PHP", initialMinor: 100000, balanceMinor: 100000, excludeFromStatistics: false };
  const record = { id: "expense", type: "expense", amountMinor: 1000, accountId: "cash", destinationId: null, currency: "PHP", category: "Food & drink", labels: ["Lunch"], date: "2026-10-02", occurredAt: "2026-10-02T12:00:00Z", description: "Lunch" };
  try {
    await waitFor(() => accountSnapshots.length && recordSnapshots.length && oldSnapshots.length);
    let acknowledged = false;
    pending(models.saveFinanceAccount("user", account).then(() => { acknowledged = true; }));
    pending(models.saveFinanceAccount("user", { ...account, id: "bank", initialMinor: 0, balanceMinor: 0 }));
    pending(models.saveFinanceAccount("user", { ...account, id: "usd", currency: "USD" }));
    await waitFor(() => currentAccounts()?.length === 3);
    assert.equal(acknowledged, false);
    pending(models.addFinanceRecord("user", record, currentAccounts()));
    await waitFor(() => balance("cash") === 99000 && recordSnapshots.at(-1)?.length === 1);
    pending(models.addFinanceRecord("user", { ...record, id: "income", type: "income", amountMinor: 2000 }, currentAccounts()));
    await waitFor(() => balance("cash") === 101000 && recordSnapshots.at(-1)?.length === 2);
    await assert.rejects(models.addFinanceRecord("user", { ...record, id: "invalid", type: "transfer", destinationId: "usd" }, currentAccounts()), /same currency/);
    pending(models.addFinanceRecord("user", { ...record, id: "transfer", type: "transfer", destinationId: "bank", amountMinor: 5000, date: "2020-01-01", occurredAt: "2020-01-01T12:00:00Z" }, currentAccounts()));
    await waitFor(() => balance("cash") === 96000 && balance("bank") === 5000 && oldSnapshots.at(-1)?.length === 1);
    assert.equal(recordSnapshots.at(-1).length, 2);
    assert.equal(balance("usd"), 100000);
    const all = [...recordSnapshots.at(-1), ...oldSnapshots.at(-1)];
    for (const item of currentAccounts()) assert.equal(item.balanceMinor, finance.rebuiltBalance(item, all));
    assert.equal((await firestore.getDocFromCache(firestore.doc(db, "users", "user", "financeSettings", "current"))).data().revision, 3);
    assert.equal(acknowledged, false);
    const original = currentAccounts().find((item) => item.id === "cash");
    pending(models.editFinanceAccount("user", { ...original, name: "Edited cash", color: "#123456", excludeFromStatistics: true }, original));
    await waitFor(() => currentAccounts().find((item) => item.id === "cash")?.name === "Edited cash");
    assert.equal(balance("cash"), 96000);
    assert.equal(currentAccounts().find((item) => item.id === "cash").color, "#123456");
    assert.equal(currentAccounts().find((item) => item.id === "cash").excludeFromStatistics, true);
    pending(models.deleteFinanceAccount("user", "bank"));
    await waitFor(() => !!currentAccounts().find((item) => item.id === "bank")?.deletedAt);
    assert.equal(oldSnapshots.at(-1)[0].destinationId, "bank");
    assert.equal(balance("cash"), 96000);
    assert.equal(balance("bank"), 5000);
    await assert.rejects(models.addFinanceRecord("user", { ...record, id: "deleted-transfer", type: "transfer", destinationId: "bank" }, currentAccounts()), /same currency/);
  } finally {
    off.forEach((unsubscribe) => unsubscribe());
    await firestore.terminate(db);
    await deleteApp(app);
  }
});

test("recalculation repairs all balances together and refuses stale record history", async () => {
  const app = initializeApp({ projectId: "demo-finance-recalculate" }, "finance-recalculate-test");
  const db = firestore.initializeFirestore(app, { localCache: firestore.memoryLocalCache() });
  const cash = { id: "cash", name: "Cash", color: "#326647", type: "Cash", currency: "PHP", initialMinor: 100000, balanceMinor: -1, excludeFromStatistics: false };
  const bank = { ...cash, id: "bank", initialMinor: 10000, balanceMinor: -2 };
  const records = [{ id: "transfer", type: "transfer", amountMinor: 2000, accountId: "cash", destinationId: "bank", currency: "PHP", date: "2020-01-01", occurredAt: "2020-01-01T12:00:00Z", category: "Transfer", labels: [], description: "" }];
  let revision = 1;
  let committed = [];
  const output = ts.transpileModule(fs.readFileSync("src/models/users/finance.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const models = {};
  vm.runInThisContext(`(function(exports, require) { ${output}\n})`)(models, (name) => {
    if (name === "@/lib/firebase") return { getFirebaseDb: () => db };
    if (name === "@/lib/finance") return finance;
    if (name === "firebase/firestore") return { ...firestore, runTransaction: async (_db, callback) => {
      const writes = [];
      await callback({ get: async () => ({ data: () => ({ revision, accounts: { cash, bank } }) }), update: (_ref, field, amount) => writes.push({ field, amount }) });
      committed = writes;
    } };
    throw new Error(`Unexpected import: ${name}`);
  });
  try {
    await models.recalculateFinanceAccounts("user", records, 1);
    assert.equal(committed.length, 2);
    assert.equal(committed[0].field.isEqual(new firestore.FieldPath("accounts", "cash", "balanceMinor")), true);
    assert.equal(committed[0].amount, 98000);
    assert.equal(committed[1].field.isEqual(new firestore.FieldPath("accounts", "bank", "balanceMinor")), true);
    assert.equal(committed[1].amount, 12000);
    await models.editFinanceAccount("user", { ...cash, name: "Updated", initialMinor: 110000 }, cash);
    assert.equal(committed.length, 1);
    assert.equal(committed[0].amount.initialMinor, 110000);
    assert.equal(committed[0].amount.balanceMinor, 9999);
    assert.equal(committed[0].amount.color, cash.color);
    committed = [];
    revision = 2;
    await assert.rejects(models.recalculateFinanceAccounts("user", records, 1), /Records changed/);
    assert.deepEqual(committed, []);
  } finally {
    await firestore.terminate(db);
    await deleteApp(app);
  }
});
