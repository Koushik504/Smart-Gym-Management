import "dotenv/config";
import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { db, closeDatabases } from "../../lib/db";

test("open pages requery MySQL and admin saves update SQL and other tabs", async ({
  page,
  context,
}) => {
  test.setTimeout(180_000);
  const suffix = randomUUID().slice(0, 8),
    prefix = "Live verification " + suffix;
  let memberId = 0;
  try {
    await page.goto("/login");
    await page.getByLabel("Email address").fill("admin@smartgym.local");
    await page
      .getByLabel("Password", { exact: true })
      .fill(process.env.SEED_ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Sign in to workspace" }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 60_000 });
    await page.goto("/members");
    await page.getByRole("textbox", { name: "Search records" }).fill(prefix);
    await expect(
      page.getByText("No records yet", { exact: true }),
    ).toBeVisible();

    // This bypasses Next.js entirely: the open page must discover a new SQL row.
    const member = await db.member.create({
      data: {
        name: prefix,
        email: `live-${suffix}@smartgym.local`,
        goal: "External SQL insert",
      },
    });
    memberId = member.id;
    await expect(page.getByText(prefix, { exact: true })).toBeVisible({
      timeout: 22000,
    });

    await db.member.update({
      where: { id: memberId },
      data: { name: prefix + " SQL update" },
    });
    const focused = page.waitForResponse(
      (r) =>
        r.url().includes("/api/members?") && r.request().method() === "GET",
    );
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    const response = await focused;
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["cache-control"]).toContain("private");
    await expect(
      page.getByText(prefix + " SQL update", { exact: true }),
    ).toBeVisible();

    // The profile is a separate open tab; successful admin writes must refresh it.
    const profile = await context.newPage();
    await profile.goto("/members/" + memberId);
    await expect(
      profile.getByRole("heading", {
        name: prefix + " SQL update",
        exact: true,
      }),
    ).toBeVisible();
    await page.bringToFront();
    await page
      .getByRole("button", { name: "Edit " + prefix + " SQL update" })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Full name").fill(prefix + " Admin update");
    await dialog
      .getByLabel("Fitness goal")
      .fill("Saved directly through the admin API");
    const profileRefresh = profile.waitForResponse(
      (r) => r.url().includes("/api/members/" + memberId),
      { timeout: 10000 },
    );
    await dialog.getByRole("button", { name: "Save changes" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByText(prefix + " Admin update", { exact: true }),
    ).toBeVisible();
    const stored = await db.member.findUniqueOrThrow({
      where: { id: memberId },
    });
    expect(stored.name).toBe(prefix + " Admin update");
    expect(stored.goal).toBe("Saved directly through the admin API");
    await profileRefresh;
    await expect(
      profile.getByRole("heading", {
        name: prefix + " Admin update",
        exact: true,
      }),
    ).toBeVisible();

    await db.member.update({
      where: { id: memberId },
      data: { name: prefix + " Manual refresh" },
    });
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(
      page.getByText(prefix + " Manual refresh", { exact: true }),
    ).toBeVisible();
    await profile.close();
  } finally {
    if (memberId) {
      await db.outbox.deleteMany({ where: { memberId } });
      await db.member.delete({ where: { id: memberId } });
    }
  }
});
test.afterAll(closeDatabases);
