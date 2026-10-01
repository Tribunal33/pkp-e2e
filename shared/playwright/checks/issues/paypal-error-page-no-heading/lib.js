// Helpers for the U52 A10 walks (paypal-error-page-no-heading): each one is a
// sequence of screen actions a person takes on PKP's default test dataset,
// OJS and OMP. Requiring this file runs nothing. The OJS fee request and the
// author's task reuse the U52 A2 helpers (fee-task-stays-after-fee-recorded/lib.js).
const {signIn, screen, record, shot, idle} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * As rvaca: Settings › Distribution › "Payments": "Enable", USD and `method`
 * ('paypal': "Paypal Fee Payment" with "Account Name" test; 'manual':
 * "Manual Fee Payment" with instructions), "Save".
 */
async function setPaymentMethod(page, app, method, label) {
    const {PaymentSettingsTab} = require('../../../pages/PaymentsPages.js');
    await signIn(page, 'rvaca');
    const settings = new PaymentSettingsTab(page, app.contextPath);
    await settings.goto();
    await settings.enableBox().check();
    await settings.currencySelect().selectOption('USD');
    if (method === 'paypal') {
        await settings.pluginSelect().selectOption('PaypalPayment');
        await settings.accountNameBox().waitFor({timeout: T});
        await settings.accountNameBox().fill('test');
    } else {
        await settings.pluginSelect().selectOption('ManualPayment');
        await settings.instructionsBox().waitFor({timeout: T});
        await settings.instructionsBox().fill('Pay by bank transfer.');
    }
    await settings.save();
    if (label) await shot(page, label);
    return {method, saved: await settings.savedStatus().isVisible().catch(() => false)};
}

/** As rvaca: "Payments" › "Payment Types" › "Article Processing Charge" 50 › "Save" (OJS). */
async function setApc(page, app) {
    const {JournalPaymentsPage} = require('../../../pages/PaymentsPages.js');
    await signIn(page, 'rvaca');
    const pp = new JournalPaymentsPage(page, app.contextPath);
    await pp.goto();
    const types = await pp.showPaymentTypes();
    await types.type('Article Processing Charge', '50');
    await types.form().getByRole('button', {name: 'Save', exact: true}).click();
    await types.savedNotice().first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
}

/**
 * As dbarnes (OMP): submission `sid`'s "Publication Formats" (version
 * `publicationId`) › `format`'s `fileName` terms link › "Direct Sales" at
 * `price` › "Save".
 */
async function sellFile(page, app, {sid, publicationId, format, fileName, price}) {
    const {PublicationFormatsPage, SALES} = require('../../../../../apps/omp/playwright/pages/PublicationFormatPages.js');
    await signIn(page, 'dbarnes');
    const pf = new PublicationFormatsPage(page, app.contextPath, {appContext: app.appContext});
    if (app.line === 'stable-3_5_0') {
        // 3.5's side menu has no version level: its entry's address is publication_publicationFormats.
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${sid}&workflowMenuKey=publication_publicationFormats`));
        await pf.fileRow(format, fileName).waitFor({timeout: T});
    } else {
        await pf.gotoEditorial(sid, publicationId);
    }
    const terms = await pf.openTerms(format, fileName);
    await terms.choose(SALES.directSales);
    await terms.typePrice(price);
    await terms.save();
    const link = pf.rowLink(pf.fileRow(format, fileName), 'Direct Sales');
    await link.waitFor({timeout: T});
    return {termsLink: flat(await link.innerText())};
}

/** What a message page shows: the address's answer, heading, breadcrumb, tab title, sentence. */
async function readMessagePage(page, response, label) {
    await idle(page);
    const s = await screen(page);
    record(label, s);
    await shot(page, label);
    const h1 = page.locator('.page_message h1, main h1').first();
    return {
        address: response ? response.url().replace(/^https?:\/\/[^/]+/, '') : page.url().replace(/^https?:\/\/[^/]+/, ''),
        status: response ? response.status() : null,
        headingCount: await page.locator('main h1').count(),
        heading: (await h1.count()) ? flat(await h1.innerText()) : null,
        breadcrumb: flat(await page.locator('.cmp_breadcrumbs').first().innerText().catch(() => null)),
        breadcrumbCurrent: flat(await page.locator('.cmp_breadcrumbs li.current').first().innerText().catch(() => null)),
        tabTitle: await page.title(),
        text: flat(s.text && s.text.main, 500),
    };
}

/** As `user` (OMP): the book page of `sid`, its "Purchase …" link pressed; the page it opens. */
async function purchase(page, app, user, sid, label) {
    await signIn(page, user);
    await page.goto(app.url(`/index.php/${app.contextPath}/en/catalog/book/${sid}`));
    await idle(page);
    const link = page.getByRole('link', {name: /Purchase /});
    const out = {purchaseLinks: await link.allInnerTexts().then((a) => a.map((t) => flat(t)))};
    await shot(page, `${label}-book`);
    if (!out.purchaseLinks.length) return out;
    const answer = page.waitForResponse((r) => /\/catalog\/view\//.test(r.url()) && r.request().resourceType() === 'document', {timeout: T});
    await link.first().click();
    const r = await answer;
    await page.waitForLoadState('load').catch(() => {});
    return {...out, opened: await readMessagePage(page, r, label)};
}

/** As `user` (OJS): the Tasks panel's fee task for `title` pressed; the page it opens. */
async function pressFeeTask(page, app, user, title, label) {
    const A2 = require('../fee-task-stays-after-fee-recorded/lib.js');
    const out = await A2.feeTask(page, app, user, title, label);
    if (!out.opened) return out;
    const read = await readMessagePage(page, null, `${label}-read`);
    return {...out, opened: {...read, address: out.opened.address, status: out.opened.status}};
}

module.exports = {T, flat, setPaymentMethod, setApc, sellFile, readMessagePage, purchase, pressFeeTask};
