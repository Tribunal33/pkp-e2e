// Helpers of walk.js here (issue report
// docs/issues/U51-A30-article-without-issue-galleys-open-to-all.md). Requiring this file runs
// nothing. Every helper presses what a person presses, or types an address, on OJS (the one app
// with subscriptions); the other U51 walks' helpers are reused where they exist.
const {idle, shot} = require('../../../probe');
const N = require('../non-pdf-galley-shown-open-refused/lib');

const {T, CTX, ISSUE, sleep, flat, rel, PDF} = N;

/** Settings › Users & Roles › "Site Access Options": the "View Article Content" box ticked or unticked, "Save". */
async function setRegisteredOnly(page, app, tick) {
    const A = require('../ops-open-access-sign-in-box-not-kept/lib');
    const tab = await A.accessTab(page, app);
    const r = await A.tickAndSave(page, tab, app, tick);
    const tab2 = await A.accessTab(page, app);
    return {...r, now: await A.boxState(tab2, app)};
}

/** Settings › Distribution › "Access": "The journal will require subscriptions…", "Save". */
const requireSubscriptions = (page) => N.requireSubscriptions(page);

/** Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Access": "Subscription", "Save". */
const restrictIssue = (page) => N.restrictIssue(page);

/** Submission in Production › Publication › "Galleys" › "Add galley": "PDF", "Article Text", the file. */
const addPdfGalley = (page, app, submissionId, name) => N.addArticleGalley(page, app, submissionId, {label: 'PDF', file: PDF(name)});

/**
 * Publication › "Title & Abstract" › "Publish": "Don't Assign To An Issue", "Confirm", "Publish".
 * On 3.5 (no such choice) it records what the publish button opens instead and closes nothing.
 */
async function publishWithoutIssue(page, app, submissionId) {
    const {PublicationScreen} = require(require('path').join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
    const pub = new PublicationScreen(page, app.contextPath);
    await pub.gotoWorkflow(submissionId);
    await idle(page).catch(() => {});
    if (app.line === 'stable-3_5_0') {
        // 3.5: Publication › "Title & Abstract" › "Schedule For Publication" with no issue set,
        // then Publication › "Issue" › "Assign to Issue": what each window offers.
        const out = {};
        await pub.openEntry('Title & Abstract');
        await idle(page).catch(() => {});
        const btn = pub.publishButton();
        await btn.waitFor({state: 'visible', timeout: T}).catch(() => {});
        out.button = flat(await btn.innerText().catch(() => null), 60);
        await btn.click();
        const win = page.getByRole('dialog').filter({hasText: /issue/i}).filter({hasNotText: 'Title & Abstract'}).last();
        await win.waitFor({state: 'visible', timeout: T}).catch(() => {});
        await sleep(800);
        out.window = flat(await win.innerText().catch(() => null), 600);
        out.windowButtons = (await win.getByRole('button').allInnerTexts().catch(() => [])).map((t) => flat(t, 60));
        await shot(page, 'publish-window-35').catch(() => {});
        const close = win.getByRole('button', {name: /^(Close|Cancel)$/}).first();
        if (await close.isVisible().catch(() => false)) await close.click();
        await sleep(1000);
        await pub.gotoWorkflow(submissionId);
        await idle(page).catch(() => {});
        await pub.openEntry('Issue');
        await idle(page).catch(() => {});
        await page.getByRole('button', {name: 'Assign to Issue', exact: true}).click();
        const assign = page.getByRole('dialog').filter({has: page.locator('select[name="issueId"]')}).last();
        await assign.waitFor({state: 'visible', timeout: T}).catch(() => {});
        out.assignWindow = flat(await assign.innerText().catch(() => null), 600);
        out.issueChoices = (await assign.locator('select[name="issueId"] option').allInnerTexts().catch(() => [])).map((t) => flat(t, 80));
        await shot(page, 'assign-window-35').catch(() => {});
        return out;
    }
    await pub.openEntry('Title & Abstract');
    await idle(page).catch(() => {});
    await pub.publish();
    await idle(page).catch(() => {});
    await sleep(800);
    return {status: flat(await pub.leftControls().innerText().catch(() => ''), 160)};
}

/**
 * Open an article's page by its address, read its "PDF" link (padlock class and screen-reader
 * words), press it, say where the reader landed; on the PDF viewer press its download link and
 * say whether a file came.
 */
async function pressPdf(page, app, submissionId) {
    const out = {article: submissionId};
    const r = await page.goto(app.url(`/index.php/${CTX}/article/view/${submissionId}`));
    await idle(page).catch(() => {});
    out.pageStatus = r ? r.status() : null;
    out.title = flat(await page.locator('h1.page_title, h1').first().innerText({timeout: 3000}).catch(() => null), 120);
    const link = page.locator('.pkp_structure_main a.obj_galley_link').filter({hasText: /PDF/}).first();
    if (!(await link.count())) {
        out.link = null;
        return out;
    }
    out.link = await link.evaluate((a) => ({
        text: a.innerText.replace(/\s+/g, ' ').trim(),
        padlock: a.classList.contains('restricted'),
        screenReader: (a.querySelector('.pkp_screen_reader')?.textContent || '').replace(/\s+/g, ' ').trim() || null,
        href: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, ''),
    }));
    const navs = [];
    const onResponse = (res) => {
        if (res.request().isNavigationRequest() && res.request().frame() === page.mainFrame()) navs.push(`${res.status()} ${rel(res.url())}`);
    };
    page.on('response', onResponse);
    await link.click();
    await page.waitForLoadState('load').catch(() => {});
    await idle(page).catch(() => {});
    await sleep(800);
    out.landed = await N.landed(page);
    out.navigations = navs.splice(0);
    out.login = /\/login(\?|$|\/)/.test(out.landed.url);
    out.subscriptionsPage = /\/about\/subscriptions/.test(out.landed.url);
    out.loginMessage = out.login ? flat(await page.locator('.pkp_structure_main .cmp_notification, .pkp_structure_main p').first().innerText({timeout: 2000}).catch(() => null), 300) : null;
    const dl = page.locator('a.download').first();
    if (!out.login && !out.subscriptionsPage && (await dl.count())) {
        const fileAnswer = page.waitForResponse((res) => /\/article\/download\//.test(res.url()), {timeout: T}).catch(() => null);
        const got = page.waitForEvent('download', {timeout: T}).catch(() => null);
        await dl.click();
        const [d, a] = await Promise.all([got, fileAnswer]);
        out.download = {
            href: rel(await dl.getAttribute('href').catch(() => null)),
            status: a ? a.status() : null,
            contentType: a ? a.headers()['content-type'] || null : null,
            disposition: a ? a.headers()['content-disposition'] || null : null,
            file: d ? d.suggestedFilename() : null,
        };
    }
    page.off('response', onResponse);
    return out;
}

/** One line per press, for the console. */
function line(who, r) {
    if (!r.link) return `${who.padEnd(14)} article ${r.article}: no PDF link (${r.pageStatus} "${r.title}")`;
    const where = r.login ? 'Login page' : r.subscriptionsPage ? 'Subscriptions page' : r.landed.viewer ? 'PDF viewer' : r.landed.url;
    const file = r.download ? ` · download ${r.download.status} ${r.download.contentType} ${r.download.file}` : '';
    return `${who.padEnd(14)} article ${r.article}: padlock ${r.link.padlock} -> ${where}${file}`;
}

/**
 * The neighbour's subscriber: Settings › Distribution › "Payments" set up, a subscription type,
 * and an "Active" individual subscription for `username` from today to a year on.
 */
async function subscribe(page, app, username, userId) {
    const C = require('../issue-contents-lock-galleys-reader-can-open/lib');
    const P = require('../purchase-on-active-subscription-removes-access/lib');
    const out = {};
    out.payments = await C.setUpPayments(page, app);
    out.type = await C.createType(page, app, {name: 'Online Year sxx3', cost: 40});
    out.subscription = await C.createSubscription(page, app, {username, userId, type: 'Online Year sxx3', start: P.today(), end: P.yearOn()});
    return out;
}

/**
 * Way round for an article already published with no issue: "Unpublish", then "Schedule For
 * Publication" with "Assign To Current/Back Issue" and the issue. Records each screen; never
 * throws. (The first read looks for a menu entry named "Issue", which main labels "Publication
 * Settings": its record says the entry was not found and proves nothing either way.)
 */
async function moveIntoIssue(page, app, submissionId, issueLabel) {
    const {PublicationScreen} = require(require('path').join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
    const pub = new PublicationScreen(page, app.contextPath);
    const out = {};
    await pub.gotoWorkflow(submissionId);
    await idle(page).catch(() => {});
    try {
        await pub.openEntry('Issue');
        await idle(page).catch(() => {});
        await sleep(1000);
        const dlg = page.getByRole('dialog').last();
        out.issuePage = flat(await dlg.innerText().catch(() => null), 900);
        out.issuePageButtons = (await dlg.getByRole('button').allInnerTexts().catch(() => [])).map((t) => flat(t, 60));
        await shot(page, 'wayround-issue-entry').catch(() => {});
    } catch (e) {
        out.issuePage = `(no "Issue" entry: ${flat(e.message, 120)})`;
    }
    try {
        await pub.openEntry('Title & Abstract');
        await idle(page).catch(() => {});
        await pub.unpublish().catch((e) => (out.unpublishWait = flat(e.message, 160)));
        await idle(page).catch(() => {});
        await sleep(800);
        out.afterUnpublish = flat(await pub.leftControls().innerText().catch(() => ''), 160);
        out.afterUnpublishButtons = (await pub.rightControls().getByRole('button').allInnerTexts().catch(() => [])).map((t) => flat(t, 40));
        await pub.publish({backIssueLabel: new RegExp(issueLabel.replace(/[.()]/g, '\\$&'))});
        await idle(page).catch(() => {});
        await sleep(800);
        out.afterPublish = flat(await pub.leftControls().innerText().catch(() => ''), 160);
    } catch (e) {
        out.error = flat(e.message, 300);
    }
    await shot(page, 'wayround-republished').catch(() => {});
    return out;
}

module.exports = {moveIntoIssue, T, CTX, ISSUE, sleep, flat, rel, setRegisteredOnly, requireSubscriptions, restrictIssue, addPdfGalley, publishWithoutIssue, pressPdf, line, subscribe};
