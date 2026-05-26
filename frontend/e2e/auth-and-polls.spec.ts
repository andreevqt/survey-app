import { test, expect } from '@playwright/test';

test('register → create poll → anon submit → see in analytics', async ({ page, browser }) => {
  const id = Date.now();
  const email = `e2e-owner-${id}@example.com`;

  // Register
  await page.goto('/register');
  await page.getByLabel('Name').fill('E2E Owner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('hunter22!');
  await page.getByRole('main').getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Create poll
  await page.getByRole('link', { name: 'Create poll' }).first().click();
  await page.getByLabel('Title').fill('E2E Poll');
  await page.getByLabel('Visibility').selectOption('PUBLIC');
  // Fill in question text
  await page.getByPlaceholder("What's your question?").fill('Pick one');
  // Fill in option placeholders
  await page.locator('input[placeholder="Option 1"]').fill('A');
  await page.locator('input[placeholder="Option 2"]').fill('B');
  await page.getByRole('button', { name: 'Create poll' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Sniff slug from dashboard row — format: /{slug} · N responses
  const rowText = await page.locator('text=/\\/[A-Za-z0-9_-]{8,}/').first().textContent();
  const slugMatch = rowText?.match(/\/([A-Za-z0-9_-]{8,})/);
  const slug = slugMatch?.[1];
  expect(slug).toBeTruthy();
  expect(slug).toMatch(/^[A-Za-z0-9_-]{8,}$/);

  // Anonymous browser — submit a response
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  await anonPage.goto(`/p/${slug}`);
  // Wait for the poll to load
  await expect(anonPage.getByRole('button', { name: 'Submit response' })).toBeVisible();
  // Select option "A" by clicking its label
  await anonPage.getByText('A', { exact: true }).first().click();
  await anonPage.getByRole('button', { name: 'Submit response' }).click();
  await expect(anonPage.getByText('Thank you!')).toBeVisible();
  await anon.close();

  // Back to owner — go to analytics
  await page.getByRole('button', { name: 'Analytics' }).first().click();
  await expect(page.getByText('Total responses')).toBeVisible();
  await expect(page.getByText('1', { exact: true })).toBeVisible();
});
