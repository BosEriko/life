import test from "node:test";
import assert from "node:assert/strict";
import { accountValidation, balanceChanges, currencyDigits, debtStatus, DEFAULT_EMERGENCY_FUND_AVERAGE_MONTHS, DEFAULT_EMERGENCY_FUND_MONTHS, emergencyFundAverageMonthsOrDefault, emergencyFundMonthsOrDefault, financeStatistics, rebuiltBalance, recordValidation, toMinor } from "../src/lib/finance.ts";

const cash = { id: "cash", name: "Cash", color: "#326647", type: "Cash", currency: "PHP", initialMinor: 100000, balanceMinor: 100000, excludeFromStatistics: false };
const bank = { ...cash, id: "bank", type: "Bank account", initialMinor: 200000, balanceMinor: 200000 };
const dollar = { ...cash, id: "usd", currency: "USD" };
const accounts = [cash, bank, dollar];
const expense = { id: "expense", type: "expense", amountMinor: 1234, accountId: "cash", destinationId: null, currency: "PHP", category: "Food & drink", labels: ["Lunch"], date: "2026-10-02", occurredAt: "2026-10-02T12:00:00Z", description: "Lunch" };
const income = { ...expense, id: "income", type: "income", amountMinor: 50000 };
const transfer = { ...expense, id: "transfer", type: "transfer", amountMinor: 20000, destinationId: "bank", category: "Transfer" };

test("account validation accepts negative initial balances and rejects invalid fields", () => {
  assert.equal(accountValidation(cash), null);
  assert.equal(accountValidation({ ...cash, initialMinor: -5000, balanceMinor: -5000 }), null);
  for (const patch of [{ name: " " }, { color: "green" }, { color: "#xyz123" }, { type: "invalid" }, { currency: "invalid" }, { initialMinor: NaN }, { initialMinor: 1.5 }, { balanceMinor: 5 }]) assert.notEqual(accountValidation({ ...cash, ...patch }), null);
});

test("money uses currency minor units without accumulating decimal errors", () => {
  assert.equal(currencyDigits("PHP"), 2);
  assert.equal(currencyDigits("JPY"), 0);
  assert.equal(toMinor(12.34, "PHP"), 1234);
  assert.equal(toMinor(100, "JPY"), 100);
  assert.equal(toMinor(0.1, "PHP") + toMinor(0.2, "PHP"), toMinor(0.3, "PHP"));
});

test("records require positive amounts, valid accounts and real dates", () => {
  for (const record of [expense, income, transfer]) assert.equal(recordValidation(record, accounts), null);
  for (const patch of [{ amountMinor: 0 }, { amountMinor: -1 }, { amountMinor: Infinity }, { amountMinor: 1.1 }, { accountId: "missing" }, { currency: "USD" }, { type: "invalid" }, { category: " " }, { date: "2026-02-30" }, { occurredAt: "invalid" }, { labels: [" "] }]) assert.notEqual(recordValidation({ ...expense, ...patch }, accounts), null);
});

test("transfers reject the same account, missing destination and different currencies", () => {
  for (const destinationId of ["cash", "usd", "missing", null]) assert.match(recordValidation({ ...transfer, destinationId }, accounts), /same currency/);
  assert.deepEqual(balanceChanges(transfer), [["cash", -20000], ["bank", 20000]]);
});

test("recalculation rebuilds from the initial amount and all incoming and outgoing records", () => {
  const records = [expense, income, transfer, { ...income, accountId: "usd", currency: "USD" }];
  assert.equal(rebuiltBalance({ ...cash, balanceMinor: 0 }, records), 128766);
  assert.equal(rebuiltBalance({ ...bank, balanceMinor: 1 }, records), 220000);
  assert.equal(rebuiltBalance(cash, []), cash.initialMinor);
  assert.equal(balanceChanges(transfer).reduce((sum, [, change]) => sum + change, 0), 0);
});

test("statistics omit transfers and excluded accounts, and separate currencies", () => {
  const records = [expense, income, transfer, { ...income, accountId: "bank" }, { ...income, accountId: "usd", currency: "USD" }];
  assert.deepEqual(financeStatistics(records, [cash, { ...bank, excludeFromStatistics: true }, dollar]), { PHP: { income: 50000, expense: 1234 }, USD: { income: 50000, expense: 0 } });
});

const mom = { ...cash, id: "mom", name: "Mom", type: "Debt", initialMinor: 0, balanceMinor: 0, excludeFromStatistics: true };
const debt = { ...expense, id: "debt", type: "debt", amountMinor: 500000, destinationId: "mom", category: "Debt", debtAction: "borrow" };

test("debt records move money between your account and the debt account", () => {
  assert.deepEqual(balanceChanges(debt), [["cash", 500000], ["mom", -500000]]);
  assert.deepEqual(balanceChanges({ ...debt, debtAction: "repay" }), [["cash", -500000], ["mom", 500000]]);
  assert.deepEqual(balanceChanges({ ...debt, debtAction: "lend" }), [["cash", -500000], ["mom", 500000]]);
  assert.deepEqual(balanceChanges({ ...debt, debtAction: "collect" }), [["cash", 500000], ["mom", -500000]]);
  const borrowed = rebuiltBalance(mom, [debt, { ...debt, id: "repay", debtAction: "repay", amountMinor: 200000 }]);
  assert.equal(borrowed, -300000);
  assert.equal(rebuiltBalance(cash, [debt, { ...debt, id: "repay", debtAction: "repay", amountMinor: 200000 }]), cash.initialMinor + 300000);
});

test("debt records require a debt account, one of your own accounts and a valid action", () => {
  const withMom = [...accounts, mom, { ...mom, id: "uncle", currency: "USD" }];
  for (const debtAction of ["borrow", "repay", "lend", "collect"]) assert.equal(recordValidation({ ...debt, debtAction }, withMom), null);
  assert.match(recordValidation({ ...debt, debtAction: undefined }, withMom), /borrow, repay, lend or collect/);
  assert.match(recordValidation({ ...debt, debtAction: "steal" }, withMom), /borrow, repay, lend or collect/);
  assert.match(recordValidation({ ...debt, destinationId: "bank" }, withMom), /debt account/);
  assert.match(recordValidation({ ...debt, destinationId: null }, withMom), /debt account/);
  assert.match(recordValidation({ ...debt, destinationId: "uncle" }, withMom), /same currency/);
  assert.match(recordValidation({ ...debt, accountId: "mom", destinationId: "mom" }, withMom), /your own accounts/);
  assert.match(recordValidation({ ...debt, destinationId: "mom" }, [...accounts, { ...mom, deletedAt: "2026-01-01" }]), /debt account/);
  assert.match(recordValidation({ ...expense, accountId: "mom" }, withMom), /only be used in debt records/);
  assert.match(recordValidation({ ...transfer, destinationId: "mom" }, withMom), /only be used in debt records/);
});

test("debt accounts stay out of statistics and describe who owes whom", () => {
  assert.equal(accountValidation(mom), null);
  assert.match(accountValidation({ ...mom, excludeFromStatistics: false }), /always excluded/);
  assert.deepEqual(financeStatistics([expense, debt, { ...debt, id: "lend", debtAction: "lend" }], [cash, mom]), { PHP: { income: 0, expense: 1234 } });
  assert.equal(debtStatus({ ...mom, balanceMinor: -300000 }), `You owe ${new Intl.NumberFormat(undefined, { style: "currency", currency: "PHP" }).format(3000)}`);
  assert.equal(debtStatus({ ...mom, balanceMinor: 150000 }), `Owes you ${new Intl.NumberFormat(undefined, { style: "currency", currency: "PHP" }).format(1500)}`);
  assert.equal(debtStatus(mom), "Settled");
});

test("emergency fund goal falls back to six months for missing or unsupported values", () => {
  assert.equal(DEFAULT_EMERGENCY_FUND_MONTHS, 6);
  assert.equal(emergencyFundMonthsOrDefault(undefined), 6);
  assert.equal(emergencyFundMonthsOrDefault(12), 12);
  assert.equal(emergencyFundMonthsOrDefault(24), 24);
  assert.equal(emergencyFundMonthsOrDefault(0), 6);
  assert.equal(emergencyFundMonthsOrDefault(13), 6);
  assert.equal(emergencyFundMonthsOrDefault(6.5), 6);
  assert.equal(emergencyFundMonthsOrDefault("12"), 6);
  assert.equal(DEFAULT_EMERGENCY_FUND_AVERAGE_MONTHS, 12);
  assert.equal(emergencyFundAverageMonthsOrDefault(undefined), 12);
  assert.equal(emergencyFundAverageMonthsOrDefault(3), 3);
  assert.equal(emergencyFundAverageMonthsOrDefault(1), 1);
  assert.equal(emergencyFundAverageMonthsOrDefault(18), 12);
  assert.equal(emergencyFundAverageMonthsOrDefault(0), 12);
  assert.equal(emergencyFundAverageMonthsOrDefault("6"), 12);
});
