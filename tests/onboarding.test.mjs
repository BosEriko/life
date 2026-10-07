import test from "node:test";
import assert from "node:assert/strict";
import { EMPTY_ONBOARDING, isNewcomer, onboardingSteps, readOnboarding, sectionHasData } from "../src/lib/onboarding.ts";

const range = { min: null, max: null };
const empty = {
  dailies: [],
  waterLogs: [],
  habits: [],
  bpReadings: [],
  intake: [],
  ideals: { weight: range, systolic: range, diastolic: range, water: range, calories: range, sodium: range, eatingWindow: { start: null, end: null } },
  todos: [],
  tasks: [],
  financeAccounts: [],
  financeRecords: [],
};
const noProfile = { birthday: null, heightFeet: null };
const done = (data, profile = noProfile) => Object.fromEntries(onboardingSteps(data, profile).map((step) => [step.id, step.done]));

test("a brand-new account has every step undone and counts as a newcomer", () => {
  const steps = onboardingSteps(empty, noProfile);
  assert.equal(steps.length, 9);
  assert.ok(steps.every((step) => !step.done));
  assert.equal(isNewcomer(steps), true);
});

test("each step ticks itself from the matching data", () => {
  assert.equal(done({ ...empty, dailies: [{ weight: null }] }).weight, false);
  assert.equal(done({ ...empty, dailies: [{ weight: 70 }] }).weight, true);
  assert.equal(done({ ...empty, waterLogs: [{}] }).water, true);
  assert.equal(done({ ...empty, habits: [{ bath: null, brushTeeth: null, steps: null }] }).habit, false);
  assert.equal(done({ ...empty, habits: [{ bath: null, brushTeeth: true, steps: null }] }).habit, true);
  assert.equal(done({ ...empty, ideals: { ...empty.ideals, weight: { min: 60, max: null } } }).ideals, true);
  assert.equal(done({ ...empty, ideals: { ...empty.ideals, eatingWindow: { start: "08:00", end: null } } }).ideals, true);
  assert.equal(done({ ...empty, todos: [{}] }).todo, true);
  assert.equal(done({ ...empty, tasks: [{}] }).routine, true);
  assert.equal(done({ ...empty, financeRecords: [{}] }).record, true);
  assert.equal(done(empty, { birthday: "1990-01-01", heightFeet: null }).profile, false);
  assert.equal(done(empty, { birthday: "1990-01-01", heightFeet: 5 }).profile, true);
});

test("deleted finance accounts do not count as having an account", () => {
  assert.equal(done({ ...empty, financeAccounts: [{ deletedAt: "2026-10-01T00:00:00Z" }] }).account, false);
  assert.equal(done({ ...empty, financeAccounts: [{ deletedAt: "2026-10-01T00:00:00Z" }, {}] }).account, true);
});

test("someone with two or more steps done is no longer a newcomer", () => {
  assert.equal(isNewcomer(onboardingSteps({ ...empty, todos: [{}] }, noProfile)), true);
  assert.equal(isNewcomer(onboardingSteps({ ...empty, todos: [{}], waterLogs: [{}] }, noProfile)), false);
});

test("section banners hide once the section is already in use", () => {
  assert.equal(sectionHasData("finance", empty), false);
  assert.equal(sectionHasData("finance", { ...empty, financeAccounts: [{ deletedAt: "x" }] }), false);
  assert.equal(sectionHasData("finance", { ...empty, financeAccounts: [{}] }), true);
  assert.equal(sectionHasData("journal", { ...empty, tasks: [{}] }), true);
  assert.equal(sectionHasData("records", empty), false);
  assert.equal(sectionHasData("records", { ...empty, bpReadings: [{}] }), true);
});

test("onboarding flags default to off for missing or malformed profile data", () => {
  assert.deepEqual(readOnboarding(undefined), EMPTY_ONBOARDING);
  assert.deepEqual(readOnboarding("yes"), EMPTY_ONBOARDING);
  assert.deepEqual(readOnboarding({ checklistDismissed: "true", introsDismissed: null }), EMPTY_ONBOARDING);
  assert.deepEqual(readOnboarding({ welcomeTourDone: true, introsDismissed: { finance: true, other: true } }), {
    checklistDismissed: false,
    welcomeTourDone: true,
    introsDismissed: { journal: false, finance: true, records: false },
  });
});
