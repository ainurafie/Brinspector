// F-006 E2E: Incident Notes + export bar. Every export must be redacted.
const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { harEntry, installChromeStub } = require('./chromeStub');

const SECRET = 'super-secret-token-123';

const failures = () => [
  harEntry({ status: 404, url: 'https://app.example/assets/logo.png' }),
  harEntry({
    status: 500,
    method: 'POST',
    url: `https://app.example/api/v1/payments/charge?token=${SECRET}`,
    requestHeaders: { authorization: `Bearer ${SECRET}` },
    requestBody: JSON.stringify({ password: SECRET }),
    body: '{"message":"Downstream merchant gateway timed out"}',
  }),
];

test.describe('F-006 incident notes & export', () => {
  test('notes counter and preset tags', async ({ page }) => {
    await installChromeStub(page, failures());
    await page.goto('/panel.html');

    await page.getByTestId('notes-input').fill('Terjadi setelah klik bayar');
    await expect(page.getByTestId('notes-count')).toHaveText('26 / 500 chars');

    const blocker = page.getByTestId('preset-tag').filter({ hasText: '#P1-Blocker' });
    await blocker.click();
    await expect(blocker).toHaveAttribute('aria-pressed', 'true');
    await blocker.click();
    await expect(blocker).toHaveAttribute('aria-pressed', 'false');
  });

  test('MD, JIRA and PDF need a selected failure', async ({ page }) => {
    await installChromeStub(page, failures());
    await page.goto('/panel.html');

    await expect(page.getByTestId('export-har')).toBeEnabled();
    await expect(page.getByTestId('export-md')).toBeDisabled();
    await expect(page.getByTestId('export-jira')).toBeDisabled();
    await expect(page.getByTestId('export-pdf')).toBeDisabled();

    await page.getByTestId('error-row').first().click();
    await expect(page.getByTestId('export-md')).toBeEnabled();
    await expect(page.getByTestId('export-jira')).toBeEnabled();
    await expect(page.getByTestId('export-pdf')).toBeEnabled();
  });

  test('PDF opens a printable redacted report from the DevTools panel', async ({ page, context }) => {
    await installChromeStub(page, failures());
    await context.addInitScript(() => {
      window.print = () => { window.__printCalled = true; };
    });
    await page.goto('/panel.html');

    await page.getByTestId('error-row').first().click();
    await page.getByTestId('generate-button').click();
    await expect(page.getByTestId('ai-summary')).toBeVisible();
    await page.getByTestId('notes-input').fill(`Klik bayar gagal, Bearer ${SECRET}`);
    await page.getByTestId('preset-tag').filter({ hasText: '#PaymentGateway' }).click();
    const [reportPage] = await Promise.all([context.waitForEvent('page'), page.getByTestId('export-pdf').click()]);
    await expect.poll(() => reportPage.evaluate(() => window.__printCalled)).toBe(true);

    const text = await reportPage.locator('main').innerText();
    expect(text).toContain('### BRINSPECTOR — POST /api/v1/payments/charge?token=[REDACTED]');
    expect(text).toContain('#PaymentGateway');
    expect(text).toContain('Klik bayar gagal');
    expect(text).toContain('AI Root Cause');
    expect(text).not.toContain(SECRET);
    await reportPage.close();
  });

  test('blocked print window displays a useful message', async ({ page }) => {
    await installChromeStub(page, failures());
    await page.goto('/panel.html');
    await page.getByTestId('error-row').first().click();
    await page.evaluate(() => { window.open = () => null; });

    await page.getByTestId('export-pdf').click();
    await expect(page.getByTestId('toast')).toHaveText('Allow pop-ups to print the report');
  });

  test('Markdown export contains notes, tags and AI result — and no secrets', async ({ page }) => {
    await installChromeStub(page, failures());
    await page.goto('/panel.html');

    await page.getByTestId('error-row').first().click();
    await page.getByTestId('generate-button').click();
    await expect(page.getByTestId('ai-summary')).toBeVisible();
    await page.getByTestId('notes-input').fill(`Klik bayar gagal, header Bearer ${SECRET}`);
    await page.getByTestId('preset-tag').filter({ hasText: '#PaymentGateway' }).click();

    const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-md').click()]);
    expect(download.suggestedFilename()).toMatch(/^brinspector-.*\.md$/);
    const text = fs.readFileSync(await download.path(), 'utf8');

    expect(text).toContain('### BRINSPECTOR — POST /api/v1/payments/charge?token=[REDACTED]');
    expect(text).toContain('#PaymentGateway');
    expect(text).toContain('Klik bayar gagal');
    expect(text).toContain('AI Root Cause');
    expect(text).not.toContain(SECRET);
    await expect(page.getByTestId('toast')).toContainText('Markdown downloaded');
  });

  test('HAR export includes every visible failure, redacted', async ({ page }) => {
    await installChromeStub(page, failures());
    await page.goto('/panel.html');

    const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-har').click()]);
    expect(download.suggestedFilename()).toMatch(/\.har$/);
    const har = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));

    expect(har.log.version).toBe('1.2');
    expect(har.log.entries).toHaveLength(2);
    expect(har.log.entries.map((e) => e.response.status).sort()).toEqual([404, 500]);
    expect(JSON.stringify(har)).not.toContain(SECRET);
  });

  test('JIRA export copies markup to the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await installChromeStub(page, failures());
    await page.goto('/panel.html');

    await page.getByTestId('error-row').first().click();
    await page.getByTestId('export-jira').click();
    await expect(page.getByTestId('toast')).toContainText('Jira markup copied');

    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toMatch(/^h3\. BRINSPECTOR — POST/);
    expect(clip).not.toContain(SECRET);
  });
});
