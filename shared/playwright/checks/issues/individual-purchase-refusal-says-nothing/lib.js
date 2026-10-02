// Helpers of the U51 reader-page walks (issue reports
// docs/issues/U51-A9-individual-purchase-refusal-says-nothing.md,
// U51-A23-purchase-link-on-open-journal-leads-home.md,
// U51-A24-subscription-offer-links-lead-home-payments-off.md).
// Requiring this file runs nothing. Every helper presses what a person presses
// or types an address, on OJS (the one app with subscriptions).
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) =>
    s == null
        ? s
        : String(s)
              .replace(/[\s ]+/g, ' ')
              .trim()
              .slice(0, n);
const rel = (u) => (u == null ? u : String(u).replace(/^https?:\/\/[^/]+/, ''));
const pages = () => require('../../../pages/SubscriptionsPages.js');

/** A journal address with the locale segment (`about/subscriptions`, `user/subscriptions`, `payments`). */
function journalUrl(app, tail) {
    return app.url(`/index.php/${app.contextPath}/en/${tail}`);
}

/** Settings › Distribution › "Access": the "Publishing Mode" radio `which` ('open' | 'subscription' | 'none'), "Save". */
async function chooseMode(page, app, which) {
    const {AccessSettings, SUBSCRIPTIONS_TEXT: TEXT} = pages();
    const label = {
        open: TEXT.modeOpen,
        subscription: TEXT.modeSubscription,
        none: TEXT.modeNone,
    }[which];
    const tab = new AccessSettings(page, app.contextPath);
    await tab.goto();
    await tab.modeRadio(label).check();
    const r = await tab.save();
    return {chosen: label, save: r.status()};
}

/** Settings › Distribution › "Payments": "Enable", US Dollar, "Manual Fee Payment", instructions, "Save". */
async function setUpPayments(page, app) {
    const {setUpPayments: set} = require('../priced-file-link-price-twice-or-missing/lib');
    return set(page, app, {
        currency: 'USD',
        instructions: 'Pay by cheque to the journal office.',
    });
}

/**
 * "Payments" (opened by its address, which works whatever the payment settings) ›
 * "Subscription Types" › "Create New Subscription Type", filled and saved.
 */
async function createType(page, app, {name, cost, institutional = false, membership = false}) {
    const {PaymentsPage, SUBSCRIPTIONS_TEXT: TEXT} = pages();
    const pay = new PaymentsPage(page, app.contextPath);
    await pay.gotoTab('Subscription Types');
    const win = await pay.openCreateType();
    await win.fill({
        name,
        currency: 'USD',
        cost,
        format: 'Online',
        duration: '12',
    });
    await win.kindRadio(institutional ? TEXT.institutional : TEXT.individual).check();
    if (membership) await win.membershipBox().check();
    const r = await win.saveAccepted();
    return {save: r.status(), rows: await pay.firstCells('Subscription Types')};
}

/** Settings › Website › "Appearance" › "Setup": tick "Subscription Block" under "Sidebar", "Save". */
async function placeSubscriptionBlock(page, app) {
    const B = require('../custom-block-delete-fails-postgresql/lib');
    const boxes = await B.openSidebarList(app, page, app.contextPath);
    const box = boxes.find((b) => b.label === 'Subscription Block') || boxes.find((b) => /Subscription/.test(b.label));
    if (!box) throw new Error(`no Subscription Block under "Sidebar": ${JSON.stringify(boxes.map((b) => b.label))}`);
    return {label: box.label, saved: await B.placeInSidebar(page, [box.value])};
}

/** What the page on screen is: address, heading, whether it is the journal's home page, a notice or refusal. */
async function readLanding(page) {
    const main = page.locator('.pkp_structure_main');
    return {
        url: rel(page.url()),
        title: await page.title().catch(() => null),
        heading: flat(
            await main
                .locator('h1')
                .first()
                .innerText({timeout: 2000})
                .catch(() => null),
            120
        ),
        home: (await page.locator('.page_index_journal').count()) > 0,
        formErrors: flat(
            await page
                .locator('#formErrors')
                .innerText({timeout: 1000})
                .catch(() => null),
            400
        ),
        notices: flat(
            await page
                .locator('.pkp_notification, .cmp_notification')
                .allInnerTexts()
                .then((a) => a.join(' | '))
                .catch(() => ''),
            300
        ),
        text: flat(await main.innerText().catch(() => ''), 600),
    };
}

/** Press a link and read where it led, with the navigation's answers (status per hop). */
async function follow(page, link) {
    const count = await link.count();
    if (count === 0) return {offered: false};
    const href = rel(await link.first().getAttribute('href'));
    const linkText = flat(await link.first().innerText(), 120);
    const answers = [];
    const on = (r) => {
        if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) answers.push({url: rel(r.url()), status: r.status()});
    };
    page.on('response', on);
    try {
        await Promise.all([page.waitForNavigation({waitUntil: 'domcontentloaded', timeout: T}), link.first().click()]);
        await idle(page).catch(() => {});
    } finally {
        page.off('response', on);
    }
    return {
        offered: true,
        linkText,
        href,
        answers,
        ...(await readLanding(page)),
    };
}

/** "Subscriptions" (`about/subscriptions`) opened by its address: where it lands and what it offers. */
async function openSubscriptionsPage(page, app) {
    const {SubscriptionsReader} = pages();
    await page.goto(journalUrl(app, 'about/subscriptions'));
    await idle(page).catch(() => {});
    const r = new SubscriptionsReader(page, app.contextPath);
    const landing = await readLanding(page);
    if (landing.home) return {...landing, open: false};
    return {
        ...landing,
        open: true,
        individualTypes: await r
            .typeNames('Individual Subscriptions')
            .allInnerTexts()
            .catch(() => []),
        institutionalTypes: await r
            .typeNames('Institutional Subscriptions')
            .allInnerTexts()
            .catch(() => []),
        purchaseLinks: await r.purchaseLinks().count(),
    };
}

/** On "Subscriptions", press the n-th "Purchase New Subscription" (0: under Individual, 1: under Institutional). */
async function pressSubscriptionsPurchase(page, app, n) {
    const {SubscriptionsReader} = pages();
    const r = new SubscriptionsReader(page, app.contextPath);
    return follow(page, r.purchaseLinks().nth(n));
}

/** "My Subscriptions" (`user/subscriptions`) by its address: what each part offers under it. */
async function openMySubscriptions(page, app) {
    const {MySubscriptionsPage} = pages();
    const my = new MySubscriptionsPage(page, app.contextPath);
    await page.goto(journalUrl(app, 'user/subscriptions'));
    await idle(page).catch(() => {});
    const landing = await readLanding(page);
    const part = async (loc) => {
        if ((await loc.count()) === 0) return null;
        return {
            text: flat(await loc.innerText(), 400),
            links: (await loc.getByRole('link').allInnerTexts()).map((t) => flat(t, 80)),
        };
    };
    return {
        ...landing,
        individual: await part(my.individualPart()),
        institutional: await part(my.institutionalPart()),
    };
}

/** A link by its exact name inside a part of "My Subscriptions" ('individual' | 'institutional'). */
function myPartLink(page, app, kind, name) {
    const {MySubscriptionsPage} = pages();
    const my = new MySubscriptionsPage(page, app.contextPath);
    const part = kind === 'institutional' ? my.institutionalPart() : my.individualPart();
    return part.getByRole('link', {name, exact: true});
}

/** The purchase page as it is: its form, the boxes, the refusals shown. */
async function readPurchasePage(page, app) {
    const {PurchasePage} = pages();
    const p = new PurchasePage(page, app.contextPath);
    const has = async (loc) => (await loc.count()) > 0;
    return {
        ...(await readLanding(page)),
        form: await has(p.form()),
        typeOptions: (await has(p.typeSelect())) ? await p.typeOptions() : null,
        type: (await has(p.typeSelect()))
            ? flat(
                  await p
                      .selectedType()
                      .innerText()
                      .catch(() => null),
                  120
              )
            : null,
        membership: (await has(p.membershipBox())) ? await p.membershipBox().inputValue() : null,
        invalidFields: await page.locator('form#subscriptionForm .error, form#subscriptionForm [aria-invalid="true"]').count(),
    };
}

/** On the purchase page: choose the type whose option starts with `type`, type `membership`, press "Save". */
async function submitIndividualPurchase(page, app, {type, membership}) {
    const {PurchasePage} = pages();
    const p = new PurchasePage(page, app.contextPath);
    const label = (await p.typeOptions()).find((o) => o.startsWith(type));
    if (!label) throw new Error(`no type option for ${type}: ${JSON.stringify(await p.typeOptions())}`);
    await p.typeSelect().selectOption({label});
    await p.membershipBox().fill(membership);
    const answers = [];
    const on = (r) => {
        if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) answers.push({url: rel(r.url()), status: r.status()});
    };
    page.on('response', on);
    try {
        await Promise.all([page.waitForNavigation({waitUntil: 'domcontentloaded', timeout: T}), p.submitButton().click()]);
        await idle(page).catch(() => {});
    } finally {
        page.off('response', on);
    }
    const paymentRows = await page
        .locator('.page_payment_form table tr')
        .evaluateAll((trs) => trs.map((tr) => (tr.textContent || '').replace(/\s+/g, ' ').trim()))
        .catch(() => []);
    return {
        chose: label,
        answers,
        paymentRows,
        ...(await readPurchasePage(page, app)),
    };
}

/** On "Purchase Institutional Subscription": press "Continue" with the boxes as they are; read the refusals shown. */
async function submitInstitutionalAsIs(page, app) {
    const {PurchasePage} = pages();
    const p = new PurchasePage(page, app.contextPath);
    await p.submit();
    await idle(page).catch(() => {});
    return readPurchasePage(page, app);
}

/** The "Subscription" block in the sidebar of the page on screen: its lines and links. */
async function readBlock(page) {
    const {SubscriptionBlock} = pages();
    const block = new SubscriptionBlock(page);
    if ((await block.root().count()) === 0) return null;
    return {
        lines: await block.lines().evaluateAll((ps) => ps.map((p) => (p.innerText || '').replace(/\s+/g, ' ').trim())),
        links: (await block.root().getByRole('link').allInnerTexts()).map((t) => flat(t, 80)),
    };
}

/** The block's link by its exact name. */
function blockLink(page, name) {
    const {SubscriptionBlock} = pages();
    return new SubscriptionBlock(page).link(name);
}

module.exports = {
    T,
    flat,
    rel,
    journalUrl,
    chooseMode,
    setUpPayments,
    createType,
    placeSubscriptionBlock,
    readLanding,
    follow,
    openSubscriptionsPage,
    pressSubscriptionsPurchase,
    openMySubscriptions,
    myPartLink,
    readPurchasePage,
    submitIndividualPurchase,
    submitInstitutionalAsIs,
    readBlock,
    blockLink,
};
