// F-004 E2E: Console Trap toggle → JS ERR row → stack trace breakdown.
const { test, expect } = require('@playwright/test');
const { installChromeStub } = require('./chromeStub');

test.describe('F-004 console exceptions', () => {
  test('toggling Console Trap surfaces a JS ERR row with stack frames in the breakdown', async ({ page }) => {
    await installChromeStub(page);
    await page.goto('/panel.html');
    await expect(page.getByTestId('empty-state')).toBeVisible();

    const toggle = page.getByTestId('toggle-console-trap');
    await toggle.click();
    await expect.poll(() => page.evaluate(() => window.__brinspector?.installed)).toBe(true);

    await page.evaluate(() => window.__emitConsoleError({
      message: 'TypeError: cannot read balance of undefined',
      stack: 'TypeError: cannot read balance of undefined\n'
        + '    at getBalance (https://app.example/account.js:42:9)\n'
        + '    at submit (https://app.example/payment.js:12:4)',
      source: 'https://app.example/account.js',
    }));

    const exceptionRow = page.getByTestId('error-row');
    await expect(exceptionRow).toHaveCount(1);
    await expect(exceptionRow).toContainText('JS ERR');
    await expect(page.getByTestId('stat-exceptions')).toContainText('1');

    await exceptionRow.click();
    await expect(page.getByTestId('stack-trace-viewer')).toBeVisible();
    await expect(page.getByTestId('exception-message')).toContainText('cannot read balance of undefined');
    const frames = page.getByTestId('stack-frames');
    await expect(frames).toContainText('getBalance');
    await expect(frames).toContainText('submit');
  });

  test('Console Trap OFF never surfaces a JS ERR row', async ({ page }) => {
    await installChromeStub(page);
    await page.goto('/panel.html');

    await page.evaluate(() => window.__emitConsoleError({
      message: 'ReferenceError: foo is not defined',
      stack: 'ReferenceError: foo is not defined\n    at bar (https://app.example/app.js:3:1)',
      source: 'https://app.example/app.js',
    }));

    await expect(page.getByTestId('empty-state')).toBeVisible();
    await expect(page.getByTestId('error-row')).toHaveCount(0);
  });
});
