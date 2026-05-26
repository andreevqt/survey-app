import { test, expect } from '@playwright/test';

test('admin promotes a user → user sees Admin Panel link after re-login', async ({ page, browser }) => {
  const id = Date.now();
  const email = `e2e-target-${id}@example.com`;

  // Register a regular user
  await page.goto('/register');
  await page.getByLabel('Name').fill('E2E Target');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('hunter22!');
  await page.getByRole('main').getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Sign out
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/$/);

  // Log in as admin
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@polls.local');
  await page.getByLabel('Password').fill('admin');
  await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Open admin panel
  await page.getByRole('link', { name: 'Admin Panel' }).click();
  await expect(page).toHaveURL(/\/admin\/users/);

  // Promote E2E Target — find the row with the target email and change role to ADMIN
  const targetRow = page.locator('tr', { has: page.getByText(email) });
  await targetRow.locator('select').selectOption('ADMIN');
  await expect(page.getByText(`E2E Target is now ADMIN`)).toBeVisible({ timeout: 5000 });

  // Open a fresh context, login as the promoted user, see Admin Panel link
  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  await p2.goto('/login');
  await p2.getByLabel('Email').fill(email);
  await p2.getByLabel('Password').fill('hunter22!');
  await p2.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
  await expect(p2.getByRole('link', { name: 'Admin Panel' })).toBeVisible();
  await ctx.close();
});
