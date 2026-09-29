// F-001 E2E: capture, stream, filter, Auto-Intercept, breakdown.
const { test, expect } = require('@playwright/test');
const { harEntry, installChromeStub } = require('./chromeStub');

test.describe('F-001 capture network errors', () => {
  test('shows failed requests from HAR and hides successful ones', async ({ page }) => {
    await installChromeStub(page, [
      harEntry({ status: 200, url: 'https://app.example/ok' }),
      harEntry({ status: 404, url: 'https://app.example/missing' }),
      harEntry({ status: 500, method: 'POST', url: 'https://app.example/api/transfer' }),
    ]);
    await page.goto('/panel.html');

    await expect(page.getByTestId('error-row')).toHaveCount(2);
    await expect(page.getByTestId('error-count')).toHaveText('2 Failures Detected');
    await expect(page.getByTestId('error-table')).not.toContainText('/ok');
    await expect(page.getByTestId('stat-network')).toContainText('1');
    await expect(page.getByTestId('stat-client')).toContainText('1');
  });

  test('adds new failures live, newest on top, and Clear empties the list', async ({ page }) => {
    await installChromeStub(page);
    await page.goto('/panel.html');
    await expect(page.getByTestId('empty-state')).toBeVisible();

    await page.evaluate((entry) => window.__emitRequest(entry), harEntry({ status: 0, error: 'net::ERR_NAME_NOT_RESOLVED', url: 'https://down.example/' }));
    await page.evaluate((entry) => window.__emitRequest(entry), harEntry({ status: 503, url: 'https://app.example/latest' }));

    const rows = page.getByTestId('error-row');
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toContainText('/latest');
    await expect(rows.nth(1)).toContainText('ERR_NAME_NOT_RESOLVED');

    await page.getByTestId('clear-button').click();
    await expect(page.getByTestId('empty-state')).toBeVisible();
  });

  test('Auto-Intercept OFF ignores new failures', async ({ page }) => {
    await installChromeStub(page);
    await page.goto('/panel.html');

    await page.getByTestId('toggle-intercept').click();
    await expect(page.getByTestId('paused-chip')).toBeVisible();
    await page.evaluate((entry) => window.__emitRequest(entry), harEntry({ status: 500 }));
    await expect(page.getByTestId('error-row')).toHaveCount(0);

    await page.getByTestId('toggle-intercept').click();
    await page.evaluate((entry) => window.__emitRequest(entry), harEntry({ status: 500 }));
    await expect(page.getByTestId('error-row')).toHaveCount(1);
  });

  test('regex filter narrows the stream', async ({ page }) => {
    await installChromeStub(page, [
      harEntry({ status: 500, url: 'https://app.example/api/v1/payments' }),
      harEntry({ status: 404, url: 'https://app.example/assets/logo.png' }),
    ]);
    await page.goto('/panel.html');

    await page.getByTestId('filter-input').fill('/v1/');
    await expect(page.getByTestId('error-row')).toHaveCount(1);
    await page.getByTestId('filter-input').fill('nothing-matches');
    await expect(page.getByTestId('no-match')).toBeVisible();
    await page.getByTestId('filter-input').press('Escape');
    await expect(page.getByTestId('error-row')).toHaveCount(2);
  });

  test('breakdown shows headers (credentials masked) and the lazily loaded body', async ({ page }) => {
    await installChromeStub(page, [
      harEntry({
        status: 500,
        method: 'POST',
        url: 'https://app.example/api/pay?token=secret-abc',
        requestHeaders: { authorization: 'Bearer secret-abc' },
        responseHeaders: { 'x-request-id': 'req_123' },
        body: '{"code":"PAYMENT_ADAPTER_UNREACHABLE"}',
      }),
    ]);
    await page.goto('/panel.html');
    await expect(page.getByTestId('breakdown-empty')).toBeVisible();

    await page.getByTestId('error-row').click();
    await expect(page.getByTestId('breakdown')).toContainText('req_123');
    await expect(page.getByTestId('body-preview')).toContainText('PAYMENT_ADAPTER_UNREACHABLE');
    await expect(page.getByTestId('breakdown')).toContainText('token=[REDACTED]');

    await page.getByTestId('tab-request').click();
    await expect(page.getByTestId('breakdown')).toContainText('[REDACTED]');
    await expect(page.locator('body')).not.toContainText('secret-abc');
  });

  test('Console Trap captures exceptions, shows stack trace, reinstalls after navigation, and uninstalls when off', async ({ page }) => {
    await installChromeStub(page);
    await page.goto('/panel.html');
    await page.evaluate(() => {
      window.__originalPageErrorHandler = () => {
        window.__originalPageErrorCalls = (window.__originalPageErrorCalls || 0) + 1;
        return false;
      };
      window.onerror = window.__originalPageErrorHandler;
    });

    const toggle = page.getByTestId('toggle-console-trap');
    await toggle.click();
    await expect.poll(() => page.evaluate(() => window.__devtoolsEvalCalls.filter((script) => script.includes('page.__brinspector = state')).length)).toBe(1);

    await page.evaluate(() => window.onerror(
      'TypeError: payment failed',
      'https://app.example/payment.js',
      12,
      4,
      { stack: 'TypeError: payment failed\n    at submit (https://app.example/payment.js:12:4)' },
    ));
    const exceptionRow = page.getByTestId('error-row');
    await expect(exceptionRow).toHaveCount(1);
    await expect(exceptionRow).toContainText('JS ERR');
    await expect(page.getByTestId('stat-exceptions')).toContainText('1');
    await expect(page.evaluate(() => window.__originalPageErrorCalls)).resolves.toBe(1);

    await exceptionRow.click();
    await expect(page.getByTestId('stack-trace-viewer')).toBeVisible();
    await expect(page.getByTestId('exception-message')).toContainText('payment failed');
    await expect(page.getByTestId('stack-frames')).toContainText('submit');

    await page.evaluate(() => window.__navigate('https://app.example/next'));
    await expect.poll(() => page.evaluate(() => window.__devtoolsEvalCalls.filter((script) => script.includes('page.__brinspector = state')).length)).toBe(2);

    await toggle.click();
    await expect.poll(() => page.evaluate(() => window.__brinspector)).toBeUndefined();
    await expect.poll(() => page.evaluate(() => window.onerror === window.__originalPageErrorHandler)).toBe(true);
  });

  test('Console Trap shows a message when inspected-page evaluation fails', async ({ page }) => {
    await installChromeStub(page);
    await page.goto('/panel.html');
    await page.evaluate(() => { window.__failNextDevtoolsEval = true; });

    await page.getByTestId('toggle-console-trap').click();
    await expect(page.getByTestId('console-trap-error')).toContainText('Page evaluation blocked by CSP');
  });
});
