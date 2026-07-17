// E2E test untuk sembilan-router — web only, no DB injection
const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'http://localhost:20128';
const USER = process.env.TEST_USER || 'admin';
const PASS = process.env.TEST_PASS || '123456';

test.describe('sembilan-router e2e', () => {
  test('health endpoint', async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('login page renders', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.locator('form')).toBeVisible();
    // username + password field
    await expect(page.locator('input[name="username"], input[type="text"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('login with valid credentials', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    const userField = page.locator('input[name="username"], input[type="text"]').first();
    await userField.fill(USER);
    await page.locator('input[type="password"]').fill(PASS);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('dashboard requires auth (redirect to login)', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForURL('**/login**', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('v1 chat without API key → 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/v1/chat`, {
      data: { messages: [{ role: 'user', content: 'hi' }] },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(401);
  });

  test('settings API without auth → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/settings`);
    expect(res.status()).toBe(401);
  });

  test('authenticated: API keys page accessible', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.locator('input[name="username"], input[type="text"]').first().fill(USER);
    await page.locator('input[type="password"]').fill(PASS);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    await page.goto(`${BASE}/dashboard/keys`);
    await expect(page.locator('body')).toBeVisible();
  });

  test('authenticated: settings page loads', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.locator('input[name="username"], input[type="text"]').first().fill(USER);
    await page.locator('input[type="password"]').fill(PASS);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    await page.goto(`${BASE}/dashboard/settings`);
    await expect(page.locator('body')).toBeVisible();
  });

  test('authenticated: providers page loads', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.locator('input[name="username"], input[type="text"]').first().fill(USER);
    await page.locator('input[type="password"]').fill(PASS);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    await page.goto(`${BASE}/dashboard/providers`);
    await expect(page.locator('body')).toBeVisible();
  });

  test('XSS in login username field', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.locator('input[name="username"], input[type="text"]').first().fill('<script>alert(1)</script>');
    await page.locator('input[type="password"]').fill('x');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1000);
    const content = await page.content();
    expect(content).not.toContain('<script>alert(1)</script>');
  });
});
