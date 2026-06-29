import { expect, test } from "@playwright/test";

const credentials = {
  company: {
    email: process.env.FALAJ_E2E_COMPANY_EMAIL,
    password: process.env.FALAJ_E2E_COMPANY_PASSWORD,
  },
  driver: {
    identifier: process.env.FALAJ_E2E_DRIVER_IDENTIFIER || process.env.FALAJ_E2E_DRIVER_EMAIL,
    password: process.env.FALAJ_E2E_DRIVER_PASSWORD,
  },
  admin: {
    email: process.env.FALAJ_E2E_ADMIN_EMAIL,
    password: process.env.FALAJ_E2E_ADMIN_PASSWORD,
  },
};

test.describe("set-password recovery boundaries", () => {
  test("driver set-password rejects a missing recovery token", async ({ page }) => {
    await page.goto("/driver/set-password");

    await expect(page.locator(".auth-alert.error")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test("company set-password rejects a missing recovery token", async ({ page }) => {
    await page.goto("/company/set-password");

    await expect(page.locator(".auth-alert.error")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test("driver set-password rejects unsupported hash auth type", async ({ page }) => {
    await page.goto("/driver/set-password#access_token=fake-access&refresh_token=fake-refresh&type=signup");

    await expect(page.locator(".auth-alert.error")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test("company set-password rejects unsupported hash auth type", async ({ page }) => {
    await page.goto("/company/set-password#access_token=fake-access&refresh_token=fake-refresh&type=signup");

    await expect(page.locator(".auth-alert.error")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });
});

test.describe("role-specific login boundaries", () => {
  test("company account cannot reach admin routes", async ({ page }) => {
    test.skip(!credentials.company.email || !credentials.company.password, "Set FALAJ_E2E_COMPANY_EMAIL/PASSWORD to run this boundary test.");

    await loginWithEmail(page, "/company/login", credentials.company.email, credentials.company.password);
    await page.goto("/admin");

    await expect(page).not.toHaveURL(/\/admin$/);
    await expect(page.locator("main")).toContainText(/غير|not|unauthorized|مصرح/i);
  });

  test("driver account cannot reach company or admin routes", async ({ page }) => {
    test.skip(!credentials.driver.identifier || !credentials.driver.password, "Set FALAJ_E2E_DRIVER_IDENTIFIER/PASSWORD to run this boundary test.");

    await loginWithIdentifier(page, "/driver/login", credentials.driver.identifier, credentials.driver.password);
    await page.goto("/company");

    await expect(page).not.toHaveURL(/\/company$/);
    await expect(page.locator("main")).toContainText(/غير|not|unauthorized|مصرح|login/i);

    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin$/);
  });

  test("non-admin sessions cannot use admin login as a shortcut", async ({ page }) => {
    test.skip(!credentials.company.email || !credentials.company.password, "Set FALAJ_E2E_COMPANY_EMAIL/PASSWORD to run this boundary test.");

    await loginWithEmail(page, "/company/login", credentials.company.email, credentials.company.password);
    await page.goto("/admin/login");

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});

test.describe("admin login smoke", () => {
  test("admin credentials reach admin when explicitly provided", async ({ page }) => {
    test.skip(!credentials.admin.email || !credentials.admin.password, "Set FALAJ_E2E_ADMIN_EMAIL/PASSWORD to run this smoke test.");

    await loginWithEmail(page, "/admin/login", credentials.admin.email, credentials.admin.password);

    await expect(page).toHaveURL(/\/admin/);
  });
});

async function loginWithEmail(page, path, email, password) {
  await page.goto(path);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState("networkidle");
}

async function loginWithIdentifier(page, path, identifier, password) {
  await page.goto(path);
  await page.locator('input[autocomplete="username"]').fill(identifier);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState("networkidle");
}
