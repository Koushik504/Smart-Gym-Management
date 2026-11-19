import { test } from "node:test";
import assert from "node:assert/strict";
import { retentionRule, progressRule, day } from "../lib/rules";
import { schemas, loginSchema } from "../lib/validation";
import { statements } from "../lib/migration-statements";
import { canAccess } from "../lib/permissions";

test("member permissions deny management and unknown roles fail closed", () => {
  for (const resource of [
    "members",
    "trainers",
    "packages",
    "subscriptions",
    "payments",
    "attendance",
    "equipment",
    "maintenance",
    "plans",
    "assignments",
    "exercises",
  ]) {
    for (const operation of ["create", "update", "delete"] as const) {
      assert.equal(
        canAccess("USER", resource, operation),
        false,
        `${operation} ${resource}`,
      );
    }
  }
  assert.equal(canAccess("USER", "workouts", "create"), true);
  assert.equal(canAccess("USER", "progress", "update"), true);
  assert.equal(canAccess("UNKNOWN", "members", "read"), false);
});
test("retention boundary: 14 days included, 15 excluded", () => {
  assert.ok(
    retentionRule(14, 3, 3).includes("Membership expires within 14 days"),
  );
  assert.deepEqual(retentionRule(15, 3, 3), []);
});
test("retention compares disjoint windows and requires a meaningful baseline", () => {
  assert.ok(
    retentionRule(null, 2, 4).includes("Attendance fell by at least 50%"),
  );
  assert.deepEqual(retentionRule(null, 1, 1), []);
  assert.ok(retentionRule(-1, 0, 4).includes("Membership expired"));
});
test("progress avoids invented results when history is insufficient", () => {
  assert.equal(progressRule(0, 0, 0, 0).volumeChange, null);
  assert.match(progressRule(2, 2, 100, 100).recommendation, /consistency/);
});
test("progress completion threshold and volume arithmetic", () => {
  assert.equal(progressRule(10, 7, 150, 100).completionRate, 70);
  assert.equal(progressRule(10, 7, 150, 100).volumeChange, 50);
  assert.match(progressRule(10, 6, 100, 100).recommendation, /conditioning/);
  assert.match(progressRule(10, 7, 100, 100).recommendation, /strength/);
});
test("UTC day is independent of the operating-system timezone", () => {
  assert.equal(
    day(new Date("2026-01-02T23:59:00Z")).toISOString(),
    "2026-01-02T00:00:00.000Z",
  );
});
test("negative prices, fractional durations and invalid calendar dates are rejected", () => {
  assert.equal(
    schemas.packages.safeParse({ name: "Basic", price: -1, durationDays: 30 })
      .success,
    false,
  );
  assert.equal(
    schemas.packages.safeParse({ name: "Basic", price: 1, durationDays: 2.5 })
      .success,
    false,
  );
  assert.equal(
    schemas.attendance.safeParse({ memberId: 1, date: "2026-02-30" }).success,
    false,
  );
});
test("member normalization preserves optional relationships and canonicalizes email", () => {
  const value = schemas.members.parse({
    name: "  Test Person ",
    email: "PERSON@example.COM",
    phone: "",
    trainerId: "",
    goal: "Strength",
  });
  assert.equal(value.email, "person@example.com");
  assert.equal(value.trainerId, null);
  assert.equal(value.phone, null);
  assert.equal(value.name, "Test Person");
});
test("workout arrays must contain real, bounded movements", () => {
  assert.equal(
    schemas.workouts.safeParse({
      memberId: 1,
      date: "2026-11-19",
      durationMinutes: 40,
      status: "COMPLETED",
      entries: [],
    }).success,
    false,
  );
});
test("duplicate exercise IDs in a plan are rejected", () => {
  assert.equal(
    schemas.plans.safeParse({
      name: "Test plan",
      goal: "Strength",
      durationWeeks: 8,
      trainerId: 1,
      exercises: [
        { exerciseId: 1, sets: 3, reps: 10 },
        { exerciseId: 1, sets: 2, reps: 5 },
      ],
    }).success,
    false,
  );
});
test("login validates email and caps bcrypt input length", () => {
  assert.equal(
    loginSchema.safeParse({ email: "bad", password: "test" }).success,
    false,
  );
  assert.equal(
    loginSchema.safeParse({ email: "a@example.com", password: "x".repeat(73) })
      .success,
    false,
  );
});
test("bcrypt byte limit rejects multibyte truncation collisions", () => {
  assert.equal(
    loginSchema.safeParse({ email: "a@example.com", password: "漢".repeat(25) })
      .success,
    false,
  );
});
test("SQL migration parser preserves procedure bodies and rejects incomplete statements", () => {
  assert.equal(
    statements(
      "DELIMITER $$\nCREATE PROCEDURE demo()\nBEGIN\nSELECT 1;\nEND$$\nDELIMITER ;\nSELECT 2;",
    ).length,
    2,
  );
  assert.throws(() => statements("SELECT 1"));
});
