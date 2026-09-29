// F-002 + F-003 E2E: AI Root Cause against the mock backend, and privacy of the outgoing payload.
const { test, expect } = require('@playwright/test');
const { harEntry, installChromeStub } = require('./chromeStub');

const SECRET = 'super-secret-token-123';

const failingPayment = () =>
  harEntry({
    status: 500,
    method: 'POST',
    url: `https://app.example/api/v1/payments/charge?token=${SECRET}`,
    requestHeaders: { authorization: `Bearer ${SECRET}`, cookie: `sid=${SECRET}` },
    requestBody: JSON.stringify({ amount: 100000, password: SECRET }),
    body: '{"message":"Downstream merchant gateway timed out"}',
  });

test.describe('F-002 AI Root Cause Inference', () => {
  test('happy path: select → Generate Diagnostic Report → summary card', async ({ page }) => {
    await installChromeStub(page, [failingPayment()]);
    await page.goto('/panel.html');

    await expect(page.getByTestId('backend-status')).toContainText('Backend connected (mock)');
    await expect(page.getByTestId('generate-button')).toBeDisabled();

    await page.getByTestId('error-row').click();
    await page.getByTestId('generate-button').click();

    await expect(page.getByTestId('ai-summary')).toContainText('Downstream merchant gateway timed out');
    await expect(page.getByTestId('ai-severity')).toHaveText('HIGH SEVERITY');
  });

  test('keyboard shortcut Ctrl+E triggers the analysis', async ({ page }) => {
    await installChromeStub(page, [failingPayment()]);
    await page.goto('/panel.html');
    await page.getByTestId('error-row').click();
    await page.keyboard.press('Control+e');
    await expect(page.getByTestId('ai-summary')).toBeVisible();
  });

  test('outgoing payload never contains credentials (F-003)', async ({ page }) => {
    await installChromeStub(page, [failingPayment()]);
    let sentBody = '';
    await page.route('**/api/summarize', async (route) => {
      sentBody = route.request().postData() || '';
      await route.continue();
    });
    await page.goto('/panel.html');
    await page.getByTestId('error-row').click();
    await page.getByTestId('generate-button').click();
    await expect(page.getByTestId('ai-summary')).toBeVisible();

    expect(sentBody).toContain('[REDACTED]');
    expect(sentBody).not.toContain(SECRET);
  });

  test('backend 422 shows a friendly error and retry works', async ({ page }) => {
    await installChromeStub(page, [failingPayment()]);
    let calls = 0;
    await page.route('**/api/summarize', async (route) => {
      calls += 1;
      if (calls === 1) {
        await route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ message: 'body/error/url must NOT have fewer than 1 characters' }) });
      } else {
        await route.continue();
      }
    });
    await page.goto('/panel.html');
    await page.getByTestId('error-row').click();
    await page.getByTestId('generate-button').click();

    await expect(page.getByTestId('ai-error')).toContainText('must NOT have fewer than 1 characters');
    await page.getByTestId('ai-retry').click();
    await expect(page.getByTestId('ai-summary')).toBeVisible();
  });

  test('unreachable backend is reported clearly', async ({ page }) => {
    await installChromeStub(page, [failingPayment()]);
    await page.route('**/localhost:3000/**', (route) => route.abort('connectionrefused'));
    await page.goto('/panel.html');

    await expect(page.getByTestId('backend-status')).toContainText('Backend offline');
    await page.getByTestId('error-row').click();
    await page.getByTestId('generate-button').click();
    await expect(page.getByTestId('ai-error')).toContainText('Backend unreachable');
  });
});
