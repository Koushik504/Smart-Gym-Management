import "dotenv/config";
import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { db, mongo, closeDatabases } from "../../lib/db";

test("admin creates member login; member gets personal pages without management controls", async ({
  page,
  browser,
}) => {
  const suffix = randomUUID().slice(0, 8);
  const name = "Member access " + suffix;
  const email = `member-access-${suffix}@smartgym.local`;
  const password = "BrowserMember!" + suffix;
  let memberId = 0;
  let userId = 0;
  const memberContext = await browser.newContext();
  try {
    await page.goto("/login");
    await page.getByLabel("Email address").fill("admin@smartgym.local");
    await page
      .getByLabel("Password", { exact: true })
      .fill(process.env.SEED_ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Sign in to workspace" }).click();
    await expect(page).toHaveURL(/dashboard/);
    await page.goto("/members");
    await page.getByRole("button", { name: "Add member", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Full name").fill(name);
    await dialog.getByLabel("Email address").fill(email);
    await dialog
      .getByLabel("Member login password (12+ characters)")
      .fill(password);
    await dialog.getByLabel("Fitness goal").fill("Personal training progress");
    const save = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/admin/members") &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Save member" }).click();
    expect((await save).status()).toBe(201);
    await expect(dialog).toHaveCount(0);
    const member = await db.member.findUniqueOrThrow({ where: { email } });
    memberId = member.id;
    userId = member.userId!;

    const personal = await memberContext.newPage();
    await personal.goto("/login");
    await personal.getByLabel("Email address").fill(email);
    await personal.getByLabel("Password", { exact: true }).fill(password);
    await personal
      .getByRole("button", { name: "Sign in to workspace" })
      .click();
    await expect(personal).toHaveURL(/my-account/);
    await expect(
      personal.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    await expect(
      personal.getByRole("link", { name: "Members", exact: true }),
    ).toHaveCount(0);
    await expect(
      personal.getByRole("link", { name: "Trainers", exact: true }),
    ).toHaveCount(0);
    await expect(
      personal.getByRole("button", { name: "Add member", exact: true }),
    ).toHaveCount(0);
    for (const path of [
      "/members",
      "/trainers",
      "/equipment",
      "/reports",
      "/dashboard",
    ]) {
      await personal.goto(path);
      await expect(personal).toHaveURL(/my-account/);
    }
    await personal.goto("/subscriptions");
    await expect(
      personal.getByRole("heading", { name: "My memberships." }),
    ).toBeVisible();
    await expect(
      personal.getByRole("button", { name: "Add enrollment", exact: true }),
    ).toHaveCount(0);
    await personal.goto("/payments");
    await expect(
      personal.getByRole("heading", { name: "My payments." }),
    ).toBeVisible();
    await expect(
      personal.getByRole("link", { name: "New enrollment" }),
    ).toHaveCount(0);
    await expect(
      personal.getByRole("button", { name: "Mark paid" }),
    ).toHaveCount(0);
    await personal.goto("/progress");
    await expect(
      personal.getByRole("heading", { name: "My progress." }),
    ).toBeVisible();
    await personal
      .getByRole("button", { name: "Add progress entry", exact: true })
      .click();
    const measurement = personal.getByRole("dialog");
    await expect(measurement.getByLabel("Member", { exact: true })).toHaveCount(
      0,
    );
    await measurement
      .getByLabel("Body weight (kg)", { exact: true })
      .fill("72");
    await measurement.getByLabel("Waist (cm)", { exact: true }).fill("81");
    await measurement
      .getByLabel("Fitness goal", { exact: true })
      .fill("Personal strength");
    await measurement
      .getByRole("button", { name: "Save progress entry" })
      .click();
    await expect(measurement).toHaveCount(0);
    const stored = await (
      await mongo()
    )
      .collection("member_progress")
      .findOne({ memberId });
    expect(stored?.weightKg).toBe(72);
    expect(stored?.createdBy).toBe(userId);
    await personal.screenshot({
      path: "docs/screenshots/09-member-progress.png",
      fullPage: true,
    });
  } finally {
    await memberContext.close();
    const member = memberId
      ? await db.member.findUnique({ where: { id: memberId } })
      : await db.member.findUnique({ where: { email } });
    if (member) {
      await (
        await mongo()
      )
        .collection("member_progress")
        .deleteMany({ memberId: member.id });
      await db.outbox.deleteMany({ where: { memberId: member.id } });
      await db.member.delete({ where: { id: member.id } });
      if (member.userId) await db.user.delete({ where: { id: member.userId } });
    }
  }
});

test.afterAll(closeDatabases);
