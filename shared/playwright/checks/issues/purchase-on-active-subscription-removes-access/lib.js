// Helpers of the U51 purchase-page walks (issue reports
// docs/issues/U51-A10-purchase-on-active-subscription-removes-access.md,
// U51-A25-institutional-purchase-ip-ranges-read-array.md,
// U51-A11-institutional-purchase-adds-institution-each-time.md).
// Requiring this file runs nothing. Every helper presses what a person presses
// or types an address, on OJS (the one app with subscriptions).
const {idle, screen} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) =>
    s == null
        ? s
        : String(s)
              .replace(/[\s ]+/g, ' ')
              .trim()
              .slice(0, n);
const rel = (u) => (u == null ? u : String(u).replace(/^https?:\/\/[^/]+/, ''));
const iso = (d) => d.toISOString().slice(0, 10);
const today = () => iso(new Date());
const daysOn = (n) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + n);
    return iso(d);
};
const yearOn = () => {
    const d = new Date();
    d.setUTCFullYear(d.getUTCFullYear() + 1);
    return iso(d);
};

const pages = () => require('../../../pages/SubscriptionsPages.js');

/** A reader-side address of the journal (`user/subscriptions`), with the locale segment on main and 3.5. */
function journalUrl(app, tail) {
    return app.url(`/index.php/${app.contextPath}/en/${tail}`);
}

/** P1: Settings › Distribution › "Payments": "Enable", currency, "Manual Fee Payment", instructions, "Save". */
async function setUpPayments(page, app, {currency = 'USD', instructions = 'Pay by cheque'} = {}) {
    const {setUpPayments: set} = require('../priced-file-link-price-twice-or-missing/lib');
    return set(page, app, {currency, instructions});
}

/** P2: Settings › Distribution › "Access": the subscription choice of "Publishing Mode", "Save". */
async function requireSubscriptions(page, app) {
    const {requireSubscriptions: req} = require('../membership-address-signed-out-blank-page/lib');
    return req(page, app);
}

/** P3: "Payments" › "Subscription Types" › "Create New Subscription Type", filled and saved. */
async function createType(page, app, {name, cost, institutional = false, duration = '12', format = 'Online'}) {
    const {PaymentsPage, SUBSCRIPTIONS_TEXT: TEXT} = pages();
    const pay = new PaymentsPage(page, app.contextPath);
    await pay.gotoTab('Subscription Types');
    const win = await pay.openCreateType();
    await win.fill({name, currency: 'USD', cost, format, duration});
    await win.kindRadio(institutional ? TEXT.institutional : TEXT.individual).check();
    const r = await win.saveAccepted();
    return {save: r.status(), rows: await pay.firstCells('Subscription Types')};
}

/** Issues › "Back Issues" › the issue's "Edit" › "Access": "Subscription", "Save". */
async function restrictIssue(page, issueName) {
    const {restrictIssue: restrict} = require('../oai-jats-list-refused-for-one-subscription-article/lib');
    return restrict(page, issueName);
}

/** "My Subscriptions" (`user/subscriptions`), read: the two parts' rows and their buttons. */
async function readMySubscriptions(page, app) {
    const {MySubscriptionsPage} = pages();
    const my = new MySubscriptionsPage(page, app.contextPath);
    await my.goto();
    await idle(page).catch(() => {});
    const part = async (loc) => {
        if ((await loc.count()) === 0) return null;
        const rows = my.rows(loc);
        const out = [];
        for (let i = 0; i < (await rows.count()); i++) {
            const row = rows.nth(i);
            out.push({cells: await my.rowCells(row), buttons: (await my.rowButtons(row).allInnerTexts()).map((t) => flat(t))});
        }
        return {rows: out, purchaseNew: (await my.purchaseLink(loc).count()) > 0};
    };
    return {url: rel(page.url()), individual: await part(my.individualPart()), institutional: await part(my.institutionalPart())};
}

/** Press a button ("Purchase", "Renew") on a "My Subscriptions" row of a part ('individual' | 'institutional'). */
async function pressRowButton(page, app, kind, label) {
    const {MySubscriptionsPage} = pages();
    const my = new MySubscriptionsPage(page, app.contextPath);
    await my.goto();
    const part = kind === 'institutional' ? my.institutionalPart() : my.individualPart();
    const button = my.rowButtons(my.rows(part).first()).filter({hasText: new RegExp(`^\\s*${label}\\s*$`)});
    if ((await button.count()) === 0) return {pressed: false, buttons: (await my.rowButtons(my.rows(part).first()).allInnerTexts()).map((t) => flat(t))};
    const href = await button.first().getAttribute('href');
    await Promise.all([page.waitForNavigation({waitUntil: 'domcontentloaded', timeout: T}), button.first().click()]);
    await idle(page).catch(() => {});
    return {pressed: true, href: rel(href), url: rel(page.url())};
}

/** "My Subscriptions" › a part's "Purchase New Subscription". */
async function pressPurchaseNew(page, app, kind) {
    const {MySubscriptionsPage} = pages();
    const my = new MySubscriptionsPage(page, app.contextPath);
    await my.goto();
    const part = kind === 'institutional' ? my.institutionalPart() : my.individualPart();
    await Promise.all([page.waitForNavigation({waitUntil: 'domcontentloaded', timeout: T}), my.purchaseLink(part).click()]);
    await idle(page).catch(() => {});
    return {url: rel(page.url())};
}

/** The purchase page as it arrived: heading, chosen type, the boxes' values, refusals. */
async function readPurchasePage(page, app) {
    const {PurchasePage} = pages();
    const p = new PurchasePage(page, app.contextPath);
    const has = async (loc) => (await loc.count()) > 0;
    return {
        url: rel(page.url()),
        title: await page.title().catch(() => null),
        heading: flat(
            await page
                .locator('.pkp_structure_main h1')
                .first()
                .innerText()
                .catch(() => null),
            120,
        ),
        form: await has(p.form()),
        typeOptions: (await has(p.typeSelect())) ? await p.typeOptions() : null,
        type: (await has(p.typeSelect()))
            ? flat(
                  await p
                      .selectedType()
                      .innerText()
                      .catch(() => null),
                  120,
              )
            : null,
        membership: (await has(p.membershipBox())) ? await p.membershipBox().inputValue() : null,
        institutionName: (await has(p.institutionNameBox())) ? await p.institutionNameBox().inputValue() : null,
        mailingAddress: (await has(p.mailingAddressBox())) ? await p.mailingAddressBox().inputValue() : null,
        domain: (await has(p.domainBox())) ? await p.domainBox().inputValue() : null,
        ipRanges: (await has(p.ipRangesBox())) ? await p.ipRangesBox().inputValue() : null,
        errors: flat(
            await p
                .errors()
                .innerText()
                .catch(() => null),
            400,
        ),
        submit: (await has(p.submitButton())) ? flat(await p.submitButton().innerText()) : null,
    };
}

/** Fill the boxes given on the purchase page (`type` by its option text's start). */
async function fillPurchasePage(page, app, {type, membership, institutionName, domain, ipRanges} = {}) {
    const {PurchasePage} = pages();
    const p = new PurchasePage(page, app.contextPath);
    if (type !== undefined) {
        const label = (await p.typeOptions()).find((o) => o.startsWith(type));
        if (!label) throw new Error(`no type option for ${type}: ${JSON.stringify(await p.typeOptions())}`);
        await p.typeSelect().selectOption({label});
    }
    if (membership !== undefined) await p.membershipBox().fill(membership);
    if (institutionName !== undefined) await p.institutionNameBox().fill(institutionName);
    if (domain !== undefined) await p.domainBox().fill(domain);
    if (ipRanges !== undefined) await p.ipRangesBox().fill(ipRanges);
}

/** Press "Save" / "Continue" and read where it led: the payment page or the form again. */
async function submitPurchasePage(page, app) {
    const {PurchasePage} = pages();
    const p = new PurchasePage(page, app.contextPath);
    const answers = [];
    const on = (r) => {
        if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) answers.push({url: rel(r.url()), status: r.status()});
    };
    page.on('response', on);
    try {
        await p.submit();
        await idle(page).catch(() => {});
    } finally {
        page.off('response', on);
    }
    return {answers, ...(await readLanding(page))};
}

/** What a page shows: address, heading, and, on a payment page, the item and fee; on a purchase page, its refusals. */
async function readLanding(page) {
    const main = page.locator('.pkp_structure_main');
    const table = main.locator('.page_payment_form table tr');
    const rows = (await table.count()) ? await table.evaluateAll((trs) => trs.map((tr) => (tr.textContent || '').replace(/\s+/g, ' ').trim())) : [];
    return {
        url: rel(page.url()),
        heading: flat(
            await main
                .locator('h1')
                .first()
                .innerText()
                .catch(() => null),
            120,
        ),
        paymentRows: rows,
        errors: flat(
            await page
                .locator('#formErrors')
                .innerText()
                .catch(() => null),
            400,
        ),
        text: flat(await main.innerText().catch(() => ''), 500),
    };
}

/** The manager's "Payments" tab row read as its cells ('Individual Subscriptions' | 'Institutional Subscriptions'). */
async function managerRow(page, app, tab, text) {
    const {PaymentsPage} = pages();
    const pay = new PaymentsPage(page, app.contextPath);
    await pay.gotoTab(tab);
    const rows = pay.row(tab, text);
    const n = await rows.count();
    const out = [];
    for (let i = 0; i < n; i++) {
        out.push(
            await rows
                .nth(i)
                .locator('> td')
                .evaluateAll((cells) =>
                    cells.map((td) => {
                        const c = td.cloneNode(true);
                        c.querySelectorAll('a.show_extras, a.hide_extras').forEach((a) => a.remove());
                        return (c.textContent || '').replace(/[\s ]+/g, ' ').trim();
                    }),
                ),
        );
    }
    return out;
}

/** The manager's "Edit Subscription" on a row: "Status" "Active", "End date" a year on, "Save". */
async function activate(page, app, tab, text, {start, end = yearOn()} = {}) {
    const {PaymentsPage} = pages();
    const pay = new PaymentsPage(page, app.contextPath);
    await pay.gotoTab(tab);
    const win = await pay.openEditSubscription(tab, text);
    const before = {
        status: flat(await win.statusSelect().locator('option:checked').innerText()),
        start: await win.dateBox('dateStart').inputValue(),
        end: await win.dateBox('dateEnd').inputValue(),
    };
    await win.chooseStatus('Active');
    if (start) await win.typeDate('dateStart', start);
    await win.typeDate('dateEnd', end);
    const r = await win.saveAccepted();
    return {before, save: r.status(), after: await managerRow(page, app, tab, text)};
}

/** Settings › "Institutions": the list's names. */
async function institutionNames(page, app) {
    const {InstitutionsPage} = pages();
    const list = new InstitutionsPage(page, app.contextPath);
    await list.goto();
    await idle(page).catch(() => {});
    await sleep(500);
    return (await list.names().allInnerTexts()).map((t) => flat(t, 120));
}

/** Open an article's page by its id and press a galley link ("PDF"): where it leads. */
async function pressGalley(page, app, submissionId, label = 'PDF') {
    const {galleyLink} = pages();
    await page.goto(journalUrl(app, `article/view/${submissionId}`));
    await idle(page).catch(() => {});
    const link = galleyLink(page.locator('.pkp_structure_main'), label).first();
    const linkText = flat(await link.innerText().catch(() => null), 120);
    const restricted = /(^|\s)restricted(\s|$)/.test((await link.getAttribute('class').catch(() => '')) || '');
    await Promise.all([page.waitForNavigation({waitUntil: 'domcontentloaded', timeout: T}).catch(() => null), link.click()]);
    await idle(page).catch(() => {});
    return {
        linkText,
        restricted,
        landed: rel(page.url()),
        heading: flat(
            await page
                .locator('.pkp_structure_main h1, h1')
                .first()
                .innerText()
                .catch(() => null),
            120,
        ),
        pdfViewer: (await page.locator('iframe#pdfCanvasContainer, iframe[src*="pdfJsViewer"], #pdfCanvasContainer').count()) > 0,
    };
}

module.exports = {
    T,
    sleep,
    flat,
    rel,
    today,
    yearOn,
    daysOn,
    journalUrl,
    setUpPayments,
    requireSubscriptions,
    createType,
    restrictIssue,
    readMySubscriptions,
    pressRowButton,
    pressPurchaseNew,
    readPurchasePage,
    fillPurchasePage,
    submitPurchasePage,
    readLanding,
    managerRow,
    activate,
    institutionNames,
    pressGalley,
    screen,
};
