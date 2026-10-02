// Helpers of the U51 locked-link walks (issue reports
// docs/issues/U51-A7-issue-contents-lock-galleys-reader-can-open.md,
// U51-A18-additional-file-no-padlock-refused.md, U51-A19-locked-link-fee-while-payments-off.md):
// walk.js here, ../additional-file-no-padlock-refused/walk.js and
// ../locked-link-fee-while-payments-off/walk.js. Requiring this file runs nothing. Every helper
// presses what a person presses, or reads what the screen shows, on OJS (the one app with
// subscriptions).
const {idle, shot} = require('../../../probe');
const N = require('../non-pdf-galley-shown-open-refused/lib');

const {T, CTX, ISSUE, sleep, flat, rel, PDF} = N;
const L_flat = (t) => flat(t, 300);

/** A small CSV for an additional file. */
const CSV = (name) => ({name, mimeType: 'text/csv', buffer: Buffer.from('site,height\nu51sb5,12\n')});

/** Settings › Distribution › "Payments": "Enable", "US Dollar", "Manual Fee Payment", its instructions, "Save". */
async function setUpPayments(page, app) {
    const {setUpPayments: set} = require('../priced-file-link-price-twice-or-missing/lib');
    return set(page, app, {currency: 'USD', instructions: 'u51sb5 pay by cheque'});
}

/** Settings › Distribution › "Payments": tick or untick "Enable", "Save". */
async function setPaymentsEnabled(page, app, enable) {
    const {changePayments} = require('../payment-link-blank-page-when-payments-off/lib');
    return changePayments(page, app, {enable});
}

/**
 * "Payments" › "Subscription Policies": the required "Subscription Manager" boxes ("Name", "Email
 * address", "Mailing Address"), the expiry radio ("Full expiry" | "Partial expiry"), "Save".
 */
async function setExpiry(page, app, label) {
    const {PaymentsPage} = require('../../../pages/SubscriptionsPages.js');
    const pay = new PaymentsPage(page, app.contextPath);
    await pay.gotoTab('Subscription Policies');
    const form = pay.policies();
    const panel = pay.panel('Subscription Policies');
    await panel.locator('[name="subscriptionName"]').fill('Subscriptions Desk u51sb5');
    await panel.locator('[name="subscriptionEmail"]').fill('desk.u51sb5@mailinator.com');
    await panel.locator('[name="subscriptionMailingAddress"]').fill('1 Harbour Road');
    await form.expiryRadio(label).check();
    const r = await form.save();
    await pay.gotoTab('Subscription Policies');
    return {save: r.status(), checked: await pay.policies().expiryRadio(label).isChecked()};
}

/** "Payments" › "Subscription Types" › "Create New Subscription Type" (individual, online). */
async function createType(page, app, {name, cost}) {
    const {createType: create} = require('../purchase-on-active-subscription-removes-access/lib');
    return create(page, app, {name, cost: String(cost), duration: '12', format: 'Online'});
}

/** "Payments" › "Individual Subscriptions" › "Create New Subscription": the user, the type, "Active", the dates, "Save". */
async function createSubscription(page, app, {username, userId, type, start, end}) {
    const {PaymentsPage} = require('../../../pages/SubscriptionsPages.js');
    const {managerRow} = require('../purchase-on-active-subscription-removes-access/lib');
    const tab = 'Individual Subscriptions';
    const pay = new PaymentsPage(page, app.contextPath);
    await pay.gotoTab(tab);
    const win = await pay.openCreateSubscription(tab);
    await win.chooseUser(username, userId);
    await win.chooseType(type);
    await win.chooseStatus('Active');
    await win.typeDate('dateStart', start);
    await win.typeDate('dateEnd', end);
    const r = await win.saveAccepted();
    return {save: r.status(), row: await managerRow(page, app, tab, username)};
}

/** Issues › "Back Issues" › the issue's "Edit" › "Issue Data": "Date Published", "Save". */
async function setIssueDate(page, date) {
    const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
    const issues = new IssuesAdmin(page, CTX);
    await issues.goto('Back Issues');
    const win = await issues.openManagement('Back Issues', ISSUE);
    const form = await win.openData();
    const before = await form.dateBox().inputValue();
    await form.typeDate(date);
    const r = await form.save();
    await idle(page).catch(() => {});
    await sleep(800);
    await issues.goto('Back Issues');
    const again = await issues.openManagement('Back Issues', ISSUE);
    const after = await (await again.openData()).dateBox().inputValue();
    await again.close().catch(() => {});
    return {before, save: r.status(), after};
}

/** A submission in Production: Publication › "Galleys" › "Add galley": label, component, the file. */
async function addGalley(page, app, submissionId, {label, component, file}) {
    const {openGalleys} = require('../listing-offers-galley-without-file/lib');
    const galleys = await openGalleys(page, app, submissionId);
    await galleys.addGalley({label, component, file, name: file.name});
    await idle(page).catch(() => {});
    return {galleys: await galleys.labels()};
}

/** An article's own page, reached as a reader does: "Archives", the issue, the title. */
async function openArticle(page, app, title) {
    await N.openIssue(page, app);
    await page.locator('.obj_article_summary .title a').filter({hasText: title}).first().click();
    await page.waitForLoadState('load').catch(() => {});
    await idle(page).catch(() => {});
}

/**
 * Every galley link on the page: where it sits, label, padlock class, the icon the reader sees
 * (the `::before` glyph of a main link, the `::after` glyph of an additional file's link), the
 * screen-reader words, the price and the address.
 */
async function readLinks(page) {
    return page.locator('a.obj_galley_link, a.obj_galley_link_supplementary').evaluateAll((as) =>
        as.map((a) => {
            const glyph = (pseudo) => {
                const c = getComputedStyle(a, pseudo).content;
                if (!c || c === 'none' || c === 'normal') return '';
                const ch = c.replace(/^["']|["']$/g, '');
                return [...ch].map((x) => 'U+' + x.codePointAt(0).toString(16).toUpperCase()).join(' ');
            };
            const sr = a.querySelector('.pkp_screen_reader');
            const cost = a.querySelector('.purchase_cost');
            const label = [...a.childNodes]
                .filter((n) => !(n.nodeType === 1 && (n.classList.contains('pkp_screen_reader') || n.classList.contains('purchase_cost'))))
                .map((n) => n.textContent)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();
            const article = a.closest('.obj_article_summary');
            const supplementary = a.classList.contains('obj_galley_link_supplementary');
            return {
                where: article
                    ? (article.querySelector('.title')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50)
                    : a.closest('.issue_toc, .obj_issue_toc') && !a.closest('.obj_article_summary')
                      ? 'Full Issue'
                      : supplementary
                        ? 'Additional Files'
                        : 'article page',
                label,
                text: a.innerText.replace(/\s+/g, ' ').trim(),
                padlockClass: a.classList.contains('restricted'),
                icon: supplementary ? glyph('::after') : glyph('::before'),
                screenReader: sr ? sr.textContent.replace(/\s+/g, ' ').trim() : null,
                price: cost ? cost.textContent.replace(/\s+/g, ' ').trim() : null,
                href: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, ''),
            };
        })
    );
}

/** The lock and file glyphs of the default theme's icon font, as readLinks() gives them. */
const GLYPHS = {'U+F023': 'padlock', 'U+F0F6': 'file (text)', 'U+F1C1': 'file (PDF)'};
const named = (links) => links.map((l) => ({...l, iconName: GLYPHS[l.icon] || l.icon}));

/**
 * Press one link (by where it sits and its label) and say where the reader landed. A galley that
 * downloads instead of opening a page is reported as `download`.
 */
async function press(page, where, label) {
    const links = await readLinks(page);
    const i = links.findIndex((l) => l.where.includes(where) && l.label === label);
    if (i < 0) return {offered: false, links: links.map((l) => `${l.where} | ${l.text}`)};
    const navs = [];
    const onResponse = (r) => {
        if (r.request().isNavigationRequest() && r.request().frame() === page.mainFrame()) navs.push(`${r.status()} ${rel(r.url())}`);
    };
    page.on('response', onResponse);
    const dl = page.waitForEvent('download', {timeout: 8000}).catch(() => null);
    await page.locator('a.obj_galley_link, a.obj_galley_link_supplementary').nth(i).click();
    await page.waitForLoadState('load').catch(() => {});
    await idle(page).catch(() => {});
    await sleep(800);
    page.off('response', onResponse);
    const d = await Promise.race([dl, sleep(200).then(() => null)]);
    const out = {offered: true, pressed: named([links[i]])[0], ...(await N.landed(page)), navigations: navs};
    out.notice = L_flat(await page.locator('.pkp_structure_main .cmp_notification').first().innerText({timeout: 1000}).catch(() => null));
    if (d) out.download = d.suggestedFilename();
    return out;
}

/** Shot of the page, never failing the walk. */
const snap = (page, name) => shot(page, name).catch(() => {});

module.exports = {
    T, CTX, ISSUE, sleep, flat, rel, PDF, CSV, GLYPHS, named,
    requireSubscriptions: N.requireSubscriptions,
    restrictIssue: N.restrictIssue,
    createIssueGalley: N.createIssueGalley,
    publishIntoIssue: N.publishIntoIssue,
    setPaymentTypes: N.setPaymentTypes,
    openIssue: N.openIssue,
    landed: N.landed,
    setUpPayments, setPaymentsEnabled, setExpiry, createType, createSubscription, setIssueDate, addGalley, openArticle,
    readLinks, press, snap,
};
