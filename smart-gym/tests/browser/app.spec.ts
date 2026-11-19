import "dotenv/config";
import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { db, closeDatabases } from "../../lib/db";
async function cleanFixture() {
  const fixture = await db.member.findUnique({
    where: { email: "browser-check@smartgym.local" },
  });
  if (fixture && fixture.name === "Browser verification member") {
    await db.outbox.deleteMany({ where: { memberId: fixture.id } });
    await db.member.delete({ where: { id: fixture.id } });
  }
}
test.beforeAll(cleanFixture);
test.afterAll(async () => {
  await cleanFixture();
  await closeDatabases();
});
test("admin operational pages, real form persistence and responsive layout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await mkdir("docs/screenshots", { recursive: true });
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/login/);
  await page.screenshot({
    path: "docs/screenshots/01-login-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Email address").fill("admin@smartgym.local");
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.SEED_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByRole("heading", { name: "Overview." })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Revenue overview" }),
  ).toBeVisible();
  await expect(page.getByText("Loading your workspace…")).toHaveCount(0);
  await page.screenshot({
    path: "docs/screenshots/02-dashboard-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Members", exact: true }).click();
  await page.getByRole("button", { name: "Add member", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Full name").fill("Browser verification member");
  await dialog.getByLabel("Email address").fill("browser-check@smartgym.local");
  await dialog.getByLabel("Fitness goal").fill("Build consistency");
  await dialog.getByRole("button", { name: "Save member" }).click();
  await expect(dialog).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Search records" })
    .fill("Browser verification member");
  await expect(
    page.getByText("Browser verification member", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit Browser verification member" })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Fitness goal")
    .fill("Strength and consistency");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("textbox", { name: "Search records" }).fill("");
  await expect(page.getByText("Ananya Rao", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/03-members-desktop.png",
    fullPage: true,
  });
  for (const [url, heading] of [
    ["/trainers", "Trainers."],
    ["/subscriptions", "Memberships."],
    ["/payments", "Payments."],
    ["/attendance", "Attendance."],
    ["/plans", "Workout plans."],
    ["/assignments", "Workout assignments."],
    ["/exercises", "Exercise catalog."],
    ["/workouts", "Workout studio."],
    ["/progress", "Member progress."],
    ["/equipment", "Equipment."],
    ["/maintenance", "Maintenance history."],
    ["/packages", "Membership packages."],
    ["/reports", "Analytics & insights."],
  ]) {
    await page.goto(url);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Loading your workspace…")).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  }
  await expect(
    page.getByRole("heading", { name: "Progress worth noticing" }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/04-analytics-desktop.png",
    fullPage: true,
  });
  await page.goto("/workouts");
  await expect(
    page.getByText("Synthetic demonstration session").first(),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/05-workouts-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Overview." })).toBeVisible();
  await expect(page.getByText("Loading your workspace…")).toHaveCount(0);
  await page.screenshot({
    path: "docs/screenshots/06-dashboard-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Members", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Members." })).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/07-members-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("textbox", { name: "Search records" })
    .fill("Browser verification member");
  await expect(
    page.getByText("Browser verification member", { exact: true }),
  ).toBeVisible();
  const response = await page.request.get(
    "/api/members?q=Browser%20verification%20member",
  );
  const rows = await response.json();
  expect(rows).toHaveLength(1);
  // Clean up this run's synthetic browser fixture only, using its returned primary key.
  const id = rows[0].id;
  await db.outbox.deleteMany({ where: { memberId: id } });
  await db.member.delete({ where: { id } });
  expect(errors).toEqual([]);
});
test("trainer sees assigned members and cannot enter admin pages", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("aarav@smartgym.local");
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.SEED_TRAINER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(
    page.getByRole("link", { name: "Payments", exact: true }),
  ).toHaveCount(0);
  await page.goto("/payments");
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/members");
  await expect(page.getByRole("heading", { name: "Members." })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add member", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "docs/screenshots/08-trainer-members.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/login/);
});
