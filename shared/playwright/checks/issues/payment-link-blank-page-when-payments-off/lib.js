// Helpers of walk.js (issue report docs/issues/U52-A3-A9-payment-link-blank-page-when-payments-off.md).
// Requiring this file runs nothing. Every helper presses what a person presses, or types an address.
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u == null ? u : String(u).replace(/^https?:\/\/[^/]+/, ''));

/** What the page now shows: address, title, headings, the main text. */
async function shown(page) {
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await idle(page).catch(() => {});
    return {
        url: rel(page.url()),
        title: await page.title().catch(() => null),
        h1: await page.locator('h1:visible').allInnerTexts().then((a) => a.map((x) => flat(x, 120))).catch(() => []),
        text: flat(await page.locator('main, .pkp_structure_main, body').first().innerText().catch(() => ''), 700),
        bodyLength: (await page.locator('body').innerText().catch(() => '')).trim().length,
    };
}

/** Do `act` (a typed address or a pressed link) and return the answer's status with what the page shows. */
async function navigate(page, act) {
    const answers = [];
    const on = (r) => {
        if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) answers.push({url: rel(r.url()), status: r.status()});
    };
    page.on('response', on);
    try {
        await act();
        await page.waitForLoadState('load', {timeout: T}).catch(() => {});
        await sleep(300);
    } finally {
        page.off('response', on);
    }
    return {answers, ...(await shown(page))};
}

/** An address typed into the browser. */
function typeAddress(page, app, pathAfterContext) {
    return navigate(page, () => page.goto(app.url(`/index.php/${app.contextPath}/en/${pathAfterContext}`)).catch(() => null));
}

/** The side menu's "Payments" › "Payment Types": type the "Article Processing Charge" and "Save". */
async function setApc(page, app, amount) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
    await idle(page);
    const entry = page.locator('nav, aside').getByRole('link', {name: 'Payments', exact: true}).first();
    const viaMenu = await entry.isVisible().catch(() => false);
    if (viaMenu) await entry.click();
    else await page.goto(app.url(`/index.php/${app.contextPath}/en/payments`));
    await idle(page);
    await page.locator('#subscriptionsTabs').getByRole('link', {name: 'Payment Types', exact: true}).click();
    const box = page.locator('#paymentTypesForm input[name="publicationFee"]');
    await box.waitFor({state: 'visible', timeout: T});
    const before = await box.inputValue();
    await box.fill(String(amount));
    await box.blur();
    const saved = page.waitForResponse((r) => /\/payments\/savePaymentTypes/.test(r.url()), {timeout: T}).catch(() => null);
    await page.locator('#paymentTypesForm').getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    await idle(page);
    const notice = await page.getByText('Your changes have been saved.').first().waitFor({state: 'visible', timeout: 8000}).then(() => 'Your changes have been saved.').catch(() => null);
    return {viaMenu, before, save: r ? r.status() : null, notice};
}

/**
 * A submission's workflow by its address, "Accept Submission", the "Request Payment" page's
 * choice, "Continue" to the last page, "Record Decision". Returns each page's heading and radios.
 */
async function acceptRequestingFee(page, app, submissionId, choice) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${submissionId}`));
    await idle(page);
    const btn = page.getByRole('button', {name: 'Accept Submission', exact: true}).first();
    await btn.waitFor({state: 'visible', timeout: T});
    await btn.click();
    await page.waitForURL(/\/decision\//, {timeout: T});
    const read = async () => {
        await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: T}).catch(() => {});
        await idle(page);
        await sleep(600);
        return page.evaluate(() => {
            const vis = (e) => e.getClientRects().length > 0;
            const labelOf = (i) => ((i.id && document.querySelector(`label[for="${i.id}"]`)) || i.closest('label') || {innerText: ''}).innerText.replace(/\s+/g, ' ').trim();
            return {
                headings: [...document.querySelectorAll('main h1, main h2')].filter(vis).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).slice(0, 6),
                radios: [...document.querySelectorAll('main input[type=radio]')].filter(vis).map((i) => ({label: labelOf(i), checked: i.checked})),
            };
        });
    };
    const pages = [await read()];
    const radio = page.getByRole('radio', {name: choice, exact: true}).first();
    await radio.check({force: true});
    pages[0].chosen = (await read()).radios;
    const rec = page.getByRole('button', {name: 'Record Decision', exact: true});
    for (let i = 0; i < 8 && !(await rec.isVisible().catch(() => false)); i++) {
        await page.getByRole('button', {name: 'Continue', exact: true}).first().click();
        pages.push(await read());
    }
    const done = page.waitForResponse((r) => /\/submissions\/\d+\/decisions/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await rec.click();
    const r = await done;
    await page.locator('[role="dialog"]:visible').first().waitFor({timeout: T}).catch(() => {});
    const dialog = flat(await page.locator('[role="dialog"]:visible').first().innerText().catch(() => null), 300);
    return {pages, decision: r ? r.status() : null, dialog};
}

/**
 * The payer's dashboard › "Tasks": the rows, and the publication-fee row's link pressed.
 * When the panel shows no such row, `emailLink` (the address in the "Payment Request
 * Notification" email) is typed instead, and `via` says so.
 */
async function pressFeeTask(page, app, {emailLink} = {}) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/mySubmissions`));
    await idle(page);
    const bell = page.getByRole('button', {name: /^Tasks/}).first();
    let rows = [];
    let link = null;
    if (await bell.isVisible().catch(() => false)) {
        await bell.click();
        await idle(page);
        await sleep(800);
        const win = page.locator('[role="dialog"]:visible').last();
        await win.locator('tr.gridRow').first().waitFor({state: 'visible', timeout: 10_000}).catch(() => {});
        rows = await win.locator('tr.gridRow').allInnerTexts().then((a) => a.map((x) => flat(x, 300))).catch(() => []);
        const row = win.locator('tr.gridRow').filter({hasText: /publication fee/i}).first();
        if (await row.count()) link = row.locator('a').first();
    }
    if (link) {
        const href = rel(await link.getAttribute('href').catch(() => null));
        return {via: 'task', rows, href, ...(await navigate(page, () => link.click()))};
    }
    if (!emailLink) return {via: null, rows};
    return {via: 'email link', rows, href: rel(emailLink), ...(await navigate(page, () => page.goto(emailLink).catch(() => null)))};
}

/** The newest email to `to` with `subject`: its words and its links (null when none). */
async function mailFacts(app, to, subject) {
    const found = await app.mail._search({to, subject}).catch(() => ({messages: []}));
    const m = (found.messages || [])[0];
    if (!m) return null;
    const full = await app.mail.fullMessage(m.ID).catch(() => null);
    const links = full ? [...(full.HTML || '').matchAll(/<a\b[^>]*href=(["'])([^"']+)\1/gi)].map((x) => x[2].replace(/&amp;/g, '&')) : [];
    return {subject: m.Subject, to: (m.To || []).map((x) => x.Address), text: full && flat(full.Text, 500), links};
}

/** How many emails `to` holds with `subject`. */
async function mailCount(app, to, subject) {
    const found = await app.mail._search({to, subject}).catch(() => ({messages: []}));
    return (found.messages || []).length;
}

/** Settings › Distribution › "Payments": set "Enable" and the instructions as given, "Save" (twice when both change: the instructions box shows only while "Enable" is ticked). */
async function changePayments(page, app, {enable, instructions}) {
    const {PaymentSettingsTab} = require('../../../pages/PaymentsPages.js');
    const tab = new PaymentSettingsTab(page, app.contextPath);
    const out = {saves: []};
    const save = async () => {
        const response = await tab.save();
        out.saves.push({status: response.status(), shown: flat(await tab.savedStatus().innerText().catch(() => null), 60)});
    };
    await tab.goto();
    if (instructions !== undefined) {
        if (!(await tab.enableBox().isChecked())) await tab.enableBox().check();
        await tab.instructionsBox().waitFor({state: 'visible', timeout: T});
        await tab.instructionsBox().fill(instructions);
        await save();
    }
    if (enable !== undefined && (await tab.enableBox().isChecked()) !== enable) {
        await tab.enableBox().setChecked(enable);
        await save();
    }
    await tab.reload();
    out.afterReload = {
        enabled: await tab.enableBox().isChecked(),
        instructions: await tab.instructionsBox().inputValue({timeout: 2000}).catch(() => '(not shown)'),
    };
    return out;
}

module.exports = {T, sleep, flat, rel, shown, navigate, typeAddress, setApc, acceptRequestingFee, pressFeeTask, mailFacts, mailCount, changePayments};
