import { test, expect } from '@playwright/test';

test('admin promotes a user → user sees Users tab after re-login', async ({ page, browser }) => {
  const id = Date.now();
  const email = `e2e-target-${id}@example.com`;

  // Register a regular user
  await page.goto('/register');
  await page.getByLabel('Name').fill('E2E Target');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('hunter22!');
  await page.getByRole('main').getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Regular user should NOT see a Users tab
  await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);

  // Sign out
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/$/);

  // Log in as admin
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@polls.local');
  await page.getByLabel('Password').fill('admin');
  await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Open the Users tab (renders as a NavLink labelled "Users")
  await page.getByRole('link', { name: 'Users' }).click();
  await expect(page).toHaveURL(/\/dashboard\/users/);

  // Promote E2E Target
  const targetRow = page.locator('tr', { has: page.getByText(email) });
  await targetRow.locator('select').selectOption('ADMIN');
  await expect(page.getByText('E2E Target is now ADMIN')).toBeVisible({ timeout: 5000 });

  // Fresh context: log in as the promoted user, see the Users tab now
  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  await p2.goto('/login');
  await p2.getByLabel('Email').fill(email);
  await p2.getByLabel('Password').fill('hunter22!');
  await p2.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
  await expect(p2).toHaveURL(/\/dashboard/);
  await expect(p2.getByRole('link', { name: 'Users' })).toBeVisible();
  await ctx.close();
});

test('legacy /admin/users URL redirects to /dashboard/users for admin', async ({ page }) => {
  // Log in as admin
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@polls.local');
  await page.getByLabel('Password').fill('admin');
  await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Visit the legacy URL
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/dashboard\/users/);
});
