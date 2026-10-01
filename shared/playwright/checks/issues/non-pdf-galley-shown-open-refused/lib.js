// Helpers of walk.js here (issue report docs/issues/U51-A14-non-pdf-galley-shown-open-refused.md)
// and of ../full-issue-asks-fee-of-no-amount/walk.js (U51-A20-…). Requiring this file runs
// nothing. Every helper presses what a person presses, or reads what the screen shows.
const {idle, shot} = require('../../../probe');

const T = 30_000;
const CTX = 'publicknowledge';
const ISSUE = 'Vol. 1 No. 2 (2014)';
const ISSUE_ID = 1;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u == null ? u : String(u).replace(/^https?:\/\/[^/]+/, ''));

/** Small files for the galleys, named with the walk's tag. */
const HTML = (name, title) => ({
    name,
    mimeType: 'text/html',
    buffer: Buffer.from(`<!DOCTYPE html><html><head><title>${title}</title></head><body><h1>${title}</h1><p>u51sb4 body text.</p></body></html>\n`),
});
const PDF = (name) => ({
    name,
    mimeType: 'application/pdf',
    buffer: Buffer.from(
        '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
            '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n'
    ),
});

/** Settings › Distribution › "Access": "The journal will require subscriptions…", "Save". */
async function requireSubscriptions(page) {
    return require('../oai-jats-list-refused-for-one-subscription-article/lib').requireSubscriptions(page);
}

/** Settings › Distribution › "Payments": "Enable", a currency, "Manual Fee Payment" and its instructions, "Save". */
async function setUpPayments(page, app) {
    return require('../priced-file-link-price-twice-or-missing/lib').setUpPayments(page, app, {currency: 'USD', instructions: 'u51sb4 pay by cheque'});
}

/**
 * The "Payments" page › "Payment Types": each fee box in `fees` ({label: amount, '' empties it}),
 * the "Only Restrict Access to PDF…" box when `onlyPdf` is given, "Save". Returns what the form
 * holds afterwards and the save's answer.
 */
async function setPaymentTypes(page, app, {fees = {}, onlyPdf} = {}) {
    const {JournalPaymentsPage} = require('../../../pages/PaymentsPages.js');
    const payments = new JournalPaymentsPage(page, app.contextPath);
    await payments.goto();
    const tab = await payments.showPaymentTypes();
    for (const [label, amount] of Object.entries(fees)) await tab.type(label, String(amount));
    if (onlyPdf !== undefined) {
        if (onlyPdf) await tab.restrictOnlyPdfBox().check();
        else await tab.restrictOnlyPdfBox().uncheck();
    }
    const response = await tab.save();
    await idle(page).catch(() => {});
    const out = {save: response.status()};
    for (const label of ['Purchase Issue', 'Purchase Article', 'Association Membership']) out[label] = await tab.box(label).inputValue();
    out.onlyPdf = await tab.restrictOnlyPdfBox().isChecked();
    return out;
}

/** Issues › "Back Issues" › the issue's "Edit" › "Access": "Subscription", "Save". */
async function restrictIssue(page) {
    return require('../oai-jats-list-refused-for-one-subscription-article/lib').restrictIssue(page, ISSUE);
}

/** Issues › "Back Issues" › the issue's "Edit" › "Issue Galleys" › "Create Issue Galley": a label, a file, "Save". */
async function createIssueGalley(page, {label, file}) {
    const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
    const issues = new IssuesAdmin(page, CTX);
    await issues.goto('Back Issues');
    const win = await issues.openManagement('Back Issues', ISSUE);
    await win.openTab('Issue Galleys');
    const gw = await win.openCreateGalley();
    await gw.labelBox().fill(label);
    const up = await gw.upload(file);
    const saved = await gw.save();
    await idle(page).catch(() => {});
    const labels = (await win.galleyLabels().allInnerTexts()).map((t) => flat(t, 60));
    await shot(page, `issue-galleys-${label}`).catch(() => {});
    await win.close();
    return {upload: up.status(), save: saved.status(), galleys: labels};
}

/** A submission in Production: Publication › "Galleys" › "Add galley", label, "Article Text", the file. */
async function addArticleGalley(page, app, submissionId, {label, file}) {
    const {openGalleys} = require('../listing-offers-galley-without-file/lib');
    const galleys = await openGalleys(page, app, submissionId);
    await galleys.addGalley({label, component: 'Article Text', file, name: file.name});
    await idle(page).catch(() => {});
    return {galleys: await galleys.labels()};
}

/** "Schedule For Publication" into the issue, "Confirm", "Publish" (3.5: Publication › "Issue" first). */
async function publishIntoIssue(page, app, submissionId) {
    const {publish} = require('../recommend-by-author-list-never-shown/lib');
    return publish(page, app, submissionId, new RegExp(ISSUE.replace(/[.()]/g, '\\$&')));
}

/** The issue's page as a reader opens it from "Archives". */
async function openIssue(page, app) {
    await page.goto(app.url(`/index.php/${CTX}/issue/archive`));
    await idle(page).catch(() => {});
    await page.getByRole('link', {name: ISSUE}).first().click();
    await page.waitForLoadState('load').catch(() => {});
    await idle(page).catch(() => {});
}

/** Every galley link on the page: label, padlock (class `restricted`), screen-reader words, address. */
async function readLinks(page) {
    return page.locator('a.obj_galley_link, a.obj_galley_link_supplementary').evaluateAll((as) =>
        as.map((a) => {
            const sr = a.querySelector('.pkp_screen_reader');
            const label = [...a.childNodes]
                .filter((n) => !(n.nodeType === 1 && n.classList.contains('pkp_screen_reader')))
                .map((n) => n.textContent)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();
            const article = a.closest('.obj_article_summary');
            return {
                where: article ? (article.querySelector('.title')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50) : 'Full Issue',
                label,
                padlock: a.classList.contains('restricted'),
                screenReader: sr ? sr.textContent.replace(/\s+/g, ' ').trim() : null,
                href: a.getAttribute('href').replace(/^https?:\/\/[^/]+/, ''),
            };
        })
    );
}

/**
 * Press one galley link (by where it sits and its label, a price after it allowed) and say where the reader landed: the
 * address, the page title, the heading, the page's message line and what a payment page lists.
 */
async function pressLink(page, where, label) {
    const links = await readLinks(page);
    const i = links.findIndex((l) => l.where.startsWith(where) && (l.label === label || l.label.startsWith(`${label} (`)));
    if (i < 0) return {offered: false, links};
    const navs = [];
    const onResponse = (r) => {
        if (r.request().isNavigationRequest() && r.request().frame() === page.mainFrame()) navs.push(`${r.status()} ${rel(r.url())}`);
    };
    page.on('response', onResponse);
    await page.locator('a.obj_galley_link, a.obj_galley_link_supplementary').nth(i).click();
    await page.waitForLoadState('load').catch(() => {});
    await idle(page).catch(() => {});
    await sleep(800);
    page.off('response', onResponse);
    return {offered: true, pressed: links[i], ...(await landed(page)), navigations: navs};
}

/** Where the reader is: address, title, heading, message, the payment table. */
async function landed(page) {
    const main = page.locator('.pkp_structure_main').first();
    const hasMain = (await main.count()) > 0;
    return {
        url: rel(page.url()),
        title: flat(await page.title().catch(() => null), 120),
        heading: hasMain ? flat(await main.locator('h1, h2').first().innerText({timeout: 3000}).catch(() => null), 120) : null,
        message: hasMain ? flat(await main.locator('.pkp_form_error, .cmp_notification, p').first().innerText({timeout: 3000}).catch(() => null), 300) : null,
        paymentTable: hasMain
            ? await main.locator('.page_payment_form table tr').evaluateAll((trs) => trs.map((tr) => tr.innerText.replace(/\s+/g, ' ').trim())).catch(() => [])
            : [],
        paymentLinks: hasMain ? (await main.locator('.page_payment_form a').allInnerTexts().catch(() => [])).map((t) => flat(t, 80)) : [],
        viewer: (await page.locator('iframe, #htmlContainer, .galley_view').count()) > 0,
        text: hasMain ? flat(await main.innerText().catch(() => ''), 500) : flat(await page.locator('body').innerText().catch(() => ''), 300),
    };
}

module.exports = {
    T, CTX, ISSUE, ISSUE_ID, sleep, flat, rel, HTML, PDF,
    requireSubscriptions, setUpPayments, setPaymentTypes, restrictIssue, createIssueGalley, addArticleGalley, publishIntoIssue,
    openIssue, readLinks, pressLink, landed,
};
