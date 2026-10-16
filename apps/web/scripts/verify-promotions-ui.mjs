import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const fixturePath = process.env.PROMOTION_QA_FIXTURE;
assert(
    fixturePath?.startsWith('/private/tmp/marketplace-promotion-qa-'),
    'Use the isolated promotion QA fixture',
);
const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
const baseURL = process.env.PROMOTION_QA_WEB_URL ?? 'http://localhost:3003';
const output = dirname(fixturePath);
const browser = await chromium.launch({
    headless: true,
    ...(process.env.PROMOTION_QA_BROWSER_CHANNEL
        ? { channel: process.env.PROMOTION_QA_BROWSER_CHANNEL }
        : {}),
});
const contexts = [];
const pageErrors = [];

async function account(identifier, password) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    contexts.push(context);
    const response = await context.request.post(`${baseURL}/api/auth/login`, {
        data: { identifier, password },
    });
    assert(response.ok(), `Login failed: ${await response.text()}`);
    const page = await context.newPage();
    page.on('pageerror', error => pageErrors.push(error.message));
    return page;
}
async function workspace(page, role) {
    const loaded = page.waitForResponse(
        response =>
            response.url().endsWith('/promotions') &&
            response.url().includes('/api/') &&
            response.request().method() === 'GET',
    );
    await page.goto(`${baseURL}/dashboard/${role}/promotions`);
    await expect(page.getByRole('heading', { name: 'Promotions', exact: true })).toBeVisible();
    await expect(page.getByText('Loading promotions', { exact: true })).toHaveCount(0);
    const response = await loaded;
    assert(response.ok(), `Workspace failed: ${await response.text()}`);
}
async function refresh(page) {
    const loaded = page.waitForResponse(
        response =>
            response.url().includes('/api/') &&
            response.url().endsWith('/promotions') &&
            response.request().method() === 'GET',
    );
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    assert((await loaded).ok());
}
async function screenshot(page, name) {
    await page.screenshot({ path: join(output, `${name}.png`), fullPage: true });
    const dimensions = await page.evaluate(() => ({
        width: innerWidth,
        content: document.documentElement.scrollWidth,
    }));
    assert(dimensions.content <= dimensions.width + 1, `${name}: page has horizontal overflow`);
}
function localDate(value) {
    return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

try {
    const vendor = await account(fixture.identifier, fixture.password);
    await workspace(vendor, 'vendor');
    await screenshot(vendor, 'vendor-promotions-desktop');
    await vendor.getByRole('button', { name: 'Request promotion', exact: true }).click();
    const brief = vendor.getByRole('dialog', { name: 'Request promotion', exact: true });
    await expect(brief).toBeVisible();
    await brief.getByLabel('Published listing', { exact: true }).selectOption(fixture.firstProductId);
    await brief.getByLabel('Placement', { exact: true }).selectOption('BOTH');
    await brief.getByLabel('Starts', { exact: true }).fill(localDate(new Date(Date.now() + 35 * 86400000)));
    await brief.getByLabel('Number of days', { exact: true }).fill('3');
    await expect(brief.getByRole('button', { name: 'Submit request', exact: true })).toBeEnabled();
    await screenshot(vendor, 'vendor-promotion-request-desktop');
    const created = vendor.waitForResponse(
        response =>
            response.url().endsWith('/api/vendor/promotions') &&
            response.request().method() === 'POST' &&
            response.request().postDataJSON().action === 'REQUEST',
    );
    await brief.getByRole('button', { name: 'Submit request', exact: true }).click();
    const request = await (await created).json();
    assert(request.id && request.code, JSON.stringify(request));
    await expect(brief).toHaveCount(0);
    await vendor.getByPlaceholder('Listing, vendor, or payment reference').fill(request.code);
    await expect(
        vendor.getByRole('table').getByText('Awaiting space approval', { exact: true }),
    ).toBeVisible();

    const admin = await account(
        process.env.SUPERADMIN_USERNAME ?? 'superadmin',
        process.env.SUPERADMIN_PASSWORD ?? 'superadmin',
    );
    await workspace(admin, 'super-admin');
    await screenshot(admin, 'admin-promotions-desktop');
    await admin.getByRole('tab', { name: 'Prices', exact: true }).click();
    await expect(admin.getByRole('heading', { name: 'Promotion prices', exact: true })).toBeVisible();
    await admin.getByRole('button', { name: 'Add rate', exact: true }).click();
    const rate = admin.getByRole('dialog', { name: 'Add daily rate', exact: true });
    await rate.getByLabel('Scope', { exact: true }).selectOption('VENDOR_CATEGORY');
    await expect(rate.getByLabel('Vendor', { exact: true })).toBeVisible();
    await expect(rate.getByLabel('Category', { exact: true })).toBeVisible();
    await rate.getByRole('button', { name: 'Close', exact: true }).click();
    await admin.getByRole('tab', { name: 'Campaigns', exact: true }).click();
    await expect(admin.getByText(fixture.campaignTitle, { exact: true })).toBeVisible();
    await admin.getByRole('button', { name: `Edit ${fixture.campaignTitle}`, exact: true }).click();
    const campaign = admin.getByRole('dialog', { name: `Edit ${fixture.campaignTitle}`, exact: true });
    await expect(campaign.getByLabel('Campaign name', { exact: true })).toHaveValue(fixture.campaignTitle);
    await expect(campaign.getByLabel('Description', { exact: true })).toHaveValue(
        'Campaign edit integration check',
    );
    await campaign.getByLabel('Description', { exact: true }).fill('Campaign edit browser check');
    const campaignSaved = admin.waitForResponse(
        response =>
            response.url().endsWith('/api/admin/promotions') &&
            response.request().method() === 'POST' &&
            response.request().postDataJSON().action === 'CAMPAIGN_UPDATE',
    );
    await campaign.getByRole('button', { name: 'Save changes', exact: true }).click();
    assert((await campaignSaved).ok());
    await expect(campaign).toHaveCount(0);
    await expect(admin.getByText('Campaign changes saved.', { exact: true })).toBeVisible();
    await admin.getByRole('tab', { name: 'Payment and slots', exact: true }).click();
    await expect(admin.getByLabel('Marketplace payment instructions', { exact: true })).toHaveValue(
        'QA only: bank payment instructions',
    );
    await admin.getByRole('tab', { name: 'Requests', exact: true }).click();
    await admin.getByPlaceholder('Listing, vendor, or payment reference').fill(request.code);
    await admin.getByRole('button', { name: 'Review', exact: true }).click();
    const detail = admin.getByRole('dialog', { name: request.code, exact: true });
    await expect(detail.getByRole('button', { name: 'Verify payment received', exact: true })).toHaveCount(0);
    await detail.getByRole('button', { name: 'Approve space and request payment', exact: true }).click();
    await expect(detail.getByText('Payment due', { exact: true })).toBeVisible();
    await detail.getByRole('button', { name: 'Close', exact: true }).click();

    await refresh(vendor);
    await vendor.getByRole('button', { name: 'Payment', exact: true }).click();
    const payment = vendor.getByRole('dialog', { name: request.code, exact: true });
    await payment.getByRole('button', { name: 'Card', exact: true }).click();
    await expect(payment.getByText('Card payments are not configured by the marketplace.', { exact: true })).toBeVisible();
    await expect(payment.getByRole('button', { name: /Pay .* by card/ })).toBeDisabled();
    await vendor.setViewportSize({ width: 390, height: 844 });
    await screenshot(vendor, 'vendor-card-payment-mobile');
    await vendor.setViewportSize({ width: 1440, height: 1000 });
    await payment.getByRole('button', { name: 'Bank / wallet', exact: true }).click();
    await expect(payment.getByText('QA only: bank payment instructions', { exact: true })).toBeVisible();
    const paymentReference = `BROWSER-${Date.now()}`;
    await payment
        .getByLabel('Payment reference / receipt number', { exact: true })
        .fill(paymentReference);
    await payment.getByRole('button', { name: 'Submit payment for verification', exact: true }).click();
    await expect(payment.getByText('Payment under review', { exact: true })).toBeVisible();
    await payment.getByRole('button', { name: 'Close', exact: true }).click();
    await refresh(admin);
    await admin.getByRole('button', { name: 'Review', exact: true }).click();
    await detail.getByRole('button', { name: 'Verify payment received', exact: true }).click();
    await expect(detail.getByRole('button', { name: 'Activate promotion', exact: true })).toBeVisible();
    await detail.getByRole('button', { name: 'Activate promotion', exact: true }).click();
    await expect(detail.getByText('Scheduled', { exact: true })).toBeVisible();
    await detail.getByRole('button', { name: 'Close', exact: true }).click();

    await admin.getByRole('tab', { name: 'Payments', exact: true }).click();
    const tracker = admin.getByRole('region', { name: 'Promotion payment tracking', exact: true });
    await tracker.getByRole('textbox', { name: 'Search promotion payments', exact: true }).fill(paymentReference);
    await expect(tracker.getByRole('cell', { name: paymentReference })).toBeVisible();
    await expect(tracker.getByRole('cell', { name: 'VERIFIED', exact: true })).toBeVisible();
    await screenshot(admin, 'admin-promotion-payments-desktop');
    await admin.setViewportSize({ width: 390, height: 844 });
    await screenshot(admin, 'admin-promotion-payments-mobile');
    await admin.setViewportSize({ width: 1440, height: 1000 });
    await admin.goto(`${baseURL}/dashboard/super-admin/commission`);
    await expect(admin.getByRole('heading', { name: 'Commission, fees and payouts', exact: true })).toBeVisible();
    await admin.getByRole('button', { name: 'Promotion money', exact: true }).click();
    await expect(tracker.getByRole('heading', { name: 'Promotion payments', exact: true })).toBeVisible();
    await screenshot(admin, 'commission-promotion-money-desktop');
    await admin.setViewportSize({ width: 390, height: 844 });
    await screenshot(admin, 'commission-promotion-money-mobile');
    await admin.setViewportSize({ width: 1440, height: 1000 });
    await admin.goto(`${baseURL}/dashboard/super-admin`);
    await expect(admin.getByText('Total marketplace earnings', { exact: true })).toBeVisible();
    await expect(admin.getByText('Promotion money', { exact: true }).first()).toBeVisible();
    await admin.getByRole('button', { name: 'Marketplace earnings', exact: true }).click();
    await screenshot(admin, 'platform-marketplace-earnings-desktop');
    await admin.getByRole('button', { name: 'Promotion money', exact: true }).click();
    await expect(tracker.getByRole('heading', { name: 'Promotion payments', exact: true })).toBeVisible();
    await admin.setViewportSize({ width: 390, height: 844 });
    await screenshot(admin, 'platform-promotion-money-mobile');
    await admin.setViewportSize({ width: 1440, height: 1000 });
    await workspace(admin, 'super-admin');

    await vendor.setViewportSize({ width: 390, height: 844 });
    await screenshot(vendor, 'vendor-promotions-mobile');
    await vendor.getByRole('button', { name: 'Request promotion', exact: true }).click();
    await expect(brief).toBeVisible();
    await screenshot(vendor, 'vendor-promotion-request-mobile');
    await brief.getByLabel('Promotion target', { exact: true }).selectOption('VENDOR_CATEGORY');
    await expect(brief.getByLabel('Category', { exact: true })).toBeVisible();
    await brief.getByRole('button', { name: 'Close', exact: true }).click();
    await admin.setViewportSize({ width: 390, height: 844 });
    await screenshot(admin, 'admin-promotions-mobile');
    await admin.getByRole('tab', { name: 'Prices', exact: true }).click();
    await admin.getByRole('button', { name: 'Add rate', exact: true }).click();
    await screenshot(admin, 'admin-promotion-rate-mobile');
    await admin.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    const storefrontContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    contexts.push(storefrontContext);
    const storefront = await storefrontContext.newPage();
    storefront.on('pageerror', error => pageErrors.push(error.message));
    await storefront.goto(baseURL);
    const browseAll = storefront.getByRole('button', { name: 'Browse all Pakistan', exact: true });
    await expect(browseAll).toBeVisible();
    await browseAll.click();
    await expect(browseAll).toHaveCount(0);
    const featured = storefront.getByRole('region', { name: 'Sponsored listings', exact: true });
    await expect(featured).toBeVisible();
    await featured.screenshot({ path: join(output, 'sponsored-homepage.png') });
    await storefront.goto(
        `${baseURL}/shop?category=${encodeURIComponent(fixture.firstCategoryCode)}&sort=PRICE_ASC`,
    );
    const results = storefront.getByRole('region', { name: 'Catalog results', exact: true });
    await expect(results.locator('article').first().getByText('Sponsored', { exact: true })).toBeVisible();
    await results.screenshot({ path: join(output, 'sponsored-category.png') });
    assert.deepEqual(pageErrors, [], 'No browser runtime errors expected');
    console.log(
        `PASS: campaign editing, vendor/admin promotion workflow, scoped rate controls, storefront placement, and desktop/mobile layout. Screenshots: ${output}`,
    );
} catch (error) {
    for (let index = 0; index < contexts.length; index++) {
        const page = contexts[index].pages()[0];
        if (page)
            await page
                .screenshot({ path: join(output, `failure-${index}.png`), fullPage: true })
                .catch(() => {});
    }
    throw error;
} finally {
    await browser.close();
}
