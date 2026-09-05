import { test, expect } from "@playwright/test";

test("login page loads and rejects bad credentials", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /Hospital Asset Management/i })).toBeVisible();
  await page.getByLabel("Email").fill("wrong@example.com");
  await page.getByLabel("Password").fill("nope");
  await page.getByRole("button", { name: /Sign in/i }).click();
  await expect(page.getByRole("alert")).toContainText(/Invalid/i);
});

test("admin can log in and see dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.SEED_ADMIN_EMAIL ?? "admin@hospital.local");
  await page.getByLabel("Password").fill(process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!Admin2026");
  await page.getByRole("button", { name: /Sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /Dashboard/i })).toBeVisible();
});
