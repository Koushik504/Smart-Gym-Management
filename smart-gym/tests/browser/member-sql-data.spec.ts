import "dotenv/config";
import { test, expect } from "@playwright/test";
import { db, mongo, closeDatabases } from "../../lib/db";

test("member account renders existing SQL payments, membership, trainer, attendance and plans", async ({
  page,
}) => {
  const account = await db.user.findUniqueOrThrow({
    where: { email: "member@smartgym.local" },
    include: {
      member: {
        include: {
          trainer: { include: { user: { select: { name: true } } } },
          subscriptions: { include: { payment: true, package: true } },
          attendance: true,
          assignments: { include: { plan: true } },
        },
      },
    },
  });
  const member = account.member!;
  expect(member).toBeTruthy();
  expect(member.subscriptions.length).toBeGreaterThan(0);
  expect(member.attendance.length).toBeGreaterThan(0);
  expect(member.assignments.length).toBeGreaterThan(0);
  expect(member.trainer).toBeTruthy();

  await page.goto("/login");
  await page.getByLabel("Email address").fill(account.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.SEED_MEMBER_PASSWORD || "LocalMember!2026");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page).toHaveURL(/my-account/);
  await expect(
    page.getByRole("heading", { name: member.name, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(member.trainer!.user.name, { exact: true }),
  ).toBeVisible();
  const profileResponse = await page.request.get(`/api/members/${member.id}`);
  expect(profileResponse.status()).toBe(200);
  expect(profileResponse.headers()["cache-control"]).toContain("no-store");
  const profile = await profileResponse.json();
  expect(profile.id).toBe(member.id);
  expect(
    profile.subscriptions.map((row: { id: number }) => row.id).sort(),
  ).toEqual(member.subscriptions.map((row) => row.id).sort());

  const sqlPayments = await db.payment.findMany({
    where: { subscription: { memberId: member.id } },
    include: { subscription: { include: { package: true } } },
  });
  const paymentsResponse = await page.request.get("/api/payments");
  expect(paymentsResponse.status()).toBe(200);
  const payments = await paymentsResponse.json();
  expect(payments.length).toBe(sqlPayments.length);
  for (const row of sqlPayments) {
    const returned = payments.find(
      (entry: { id: number }) => entry.id === row.id,
    );
    expect(returned.subscription.memberId).toBe(member.id);
    expect(Number(returned.amount)).toBe(Number(row.amount));
    expect(returned.status).toBe(row.status);
    expect(returned.subscription.package.name).toBe(
      row.subscription.package.name,
    );
  }
  await page.goto("/payments");
  await expect(
    page.getByRole("heading", { name: "My payments." }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", {
      name: sqlPayments[0].subscription.package.name,
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: sqlPayments[0].method, exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark paid" })).toHaveCount(0);
  await page.screenshot({
    path: "docs/screenshots/10-member-sql-payments.png",
    fullPage: true,
  });

  const attendance = await (await page.request.get("/api/attendance")).json();
  expect(attendance.length).toBe(member.attendance.length);
  expect(
    attendance.every((row: { memberId: number }) => row.memberId === member.id),
  ).toBe(true);
  const plans = await (await page.request.get("/api/plans")).json();
  expect(plans.map((row: { id: number }) => row.id).sort()).toEqual(
    member.assignments.map((row) => row.planId).sort(),
  );
  await page.goto("/my-account");
  await expect(
    page.getByRole("heading", { name: member.name, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(member.trainer!.user.name, { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/11-member-sql-profile.png",
    fullPage: true,
  });

  const database = await mongo();
  for (const [path, collection] of [
    ["workouts", "workout_logs"],
    ["progress", "member_progress"],
  ]) {
    const records = await (await page.request.get("/api/" + path)).json();
    expect(records.length).toBe(
      await database
        .collection(collection)
        .countDocuments({ memberId: member.id }),
    );
    expect(records.length).toBeGreaterThan(0);
  }
  // The account is not granted access to any other member's SQL history.
  const other = await db.member.findFirstOrThrow({
    where: { id: { not: member.id }, active: true },
  });
  expect((await page.request.get(`/api/members/${other.id}`)).status()).toBe(
    403,
  );
  expect(
    (await page.request.get(`/api/payments?memberId=${other.id}`)).status(),
  ).toBe(403);
  await page.getByRole("button", { name: "Sign out" }).click();
});

test.afterAll(closeDatabases);
