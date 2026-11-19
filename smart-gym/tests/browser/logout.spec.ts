import "dotenv/config";
import { test, expect } from "@playwright/test";

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 1366, height: 640 },
  { width: 390, height: 640 },
]) {
  test(`member can reach logout at ${viewport.width}x${viewport.height} and session is invalidated`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/login");
    await page.getByLabel("Email address").fill("member@smartgym.local");
    await page
      .getByLabel("Password", { exact: true })
      .fill(process.env.SEED_MEMBER_PASSWORD || "LocalMember!2026");
    await page.getByRole("button", { name: "Sign in to workspace" }).click();
    await expect(page).toHaveURL(/my-account/);
    const cookie = (await context.cookies()).find(
      (entry) => entry.name === "smart_gym_session",
    )!;
    expect(cookie).toBeTruthy();
    if (viewport.width <= 700)
      await page.getByRole("button", { name: "Open navigation" }).click();
    const logout = page.getByRole("button", { name: "Sign out", exact: true });
      await expect(logout).toBeInViewport({ ratio: 1 });
    await page.screenshot({
      path: `docs/screenshots/logout-${viewport.width}x${viewport.height}.png`,
      fullPage: false,
    });
    const response = page.waitForResponse(
      (result) =>
        result.url().endsWith("/api/auth/logout") &&
        result.request().method() === "POST",
    );
    await logout.click();
    expect((await response).status()).toBe(200);
    await expect(page).toHaveURL(/login/);
    expect(
      (await context.cookies()).some(
        (entry) => entry.name === "smart_gym_session",
      ),
    ).toBe(false);
    expect((await page.request.get("/api/auth/me")).status()).toBe(401);
    const origin = process.env.APP_ORIGIN || "http://127.0.0.1:3100";
    const revoked = await fetch(origin + "/api/auth/me", {
      headers: { Cookie: `${cookie.name}=${cookie.value}` },
    });
    expect(revoked.status).toBe(401);
    await page.goto("/my-account");
    await expect(page).toHaveURL(/login/);
  });
}
