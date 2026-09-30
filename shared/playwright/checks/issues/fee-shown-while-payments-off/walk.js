// Issue report walk: docs/issues/U51-A19-fee-shown-while-payments-off.md
// (spec U51 register A19). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// OJS only (OMP and OPS have no subscriptions or reader fees):
//   the editor `dbarnes` makes `publicknowledge` require subscriptions,
//   turns payments on with "Manual Fee Payment", sets "Purchase Issue" 20 and
//   "Purchase Article" 5 on "Payment Types", turns payments off again, sets
//   "Vol. 1 No. 2 (2014)" to "Subscription" and gives it an issue galley
//   "PDF"; then a signed-out visitor reads the home page's current issue and
//   the article page of "Signalling Theory Dividends" and presses its "PDF",
//   and the reader `ccorino` (no subscription) presses the article's "PDF"
//   and the "Full Issue" "PDF" on the issue page.
//
// Arguments (after the script):
//   (none)      the Steps.
//   neighbour   the fix check: the same without step 5 (payments stay on);
//               the prices must still show, and the reader's "PDF" must lead
//               to the payment page for "Purchase Article".
//
// The kit builds nothing. Every screen is recorded with screen(); each link's
// text, class and price, each press's status, landing and heading, and the
// new lines of the fleet's server log go into the facts.
//
// Reset the fleet before each walk (the walk changes the dataset):
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset --apps ojs
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/fee-shown-while-payments-off/walk.js [neighbour]
//   (PKP_E2E_LINE=stable-3_5_0 … PROBE_RUN=r35 in front for 3.5)
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const MODE = process.argv[2] || 'steps';
if (!['steps', 'neighbour'].includes(MODE)) throw new Error(`unknown mode ${MODE}`);
const T = 30_000;
const ISSUE = 'Vol. 1 No. 2 (2014)';
const ARTICLE = 'Signalling Theory Dividends';
const SUB_MODE = 'The journal will require subscriptions to access some or all of its contents.';
const FILES = path.join(__dirname, '../../../../../apps/ojs/playwright/fixtures/files');
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

forEachApp(async (app) => {
    if (app.name !== 'ojs') {
        console.log(`[${app.name}] no subscriptions or reader fees on this app; nothing to walk`);
        return;
    }
    if (!app.dataset) throw new Error('the walk drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const {AccessSettings, PaymentsPage} = require('../../../pages/SubscriptionsPages.js');
    const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
    const cp = app.contextPath;
    const ctx = app.line === 'stable-3_4_0' || app.line === 'stable-3_3_0' ? `/index.php/${cp}` : `/index.php/${cp}/en`;
    const label = `a19-${MODE}`;
    const facts = {label, line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const logFile = path.join(__dirname, '../../../../../apps/ojs/playwright/.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n')
                .filter((l) => /\[5\d\d\]|Fatal|Uncaught|PHP (Warning|Error|Notice|Deprecated)/.test(l)).map((l) => l.slice(0, 400)).slice(0, 8);
        } catch { return []; }
    };

    const {page, close} = await launch(app);
    const scriptErrors = [];
    page.on('pageerror', (e) => scriptErrors.push(String(e.message).slice(0, 300)));
    const failed = [];
    page.on('response', (r) => { if (r.status() >= 500) failed.push(`${r.status()} ${r.request().method()} ${r.url().replace(app.baseURL, '')}`); });
    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${label}-${String(++n).padStart(2, '0')}-${name}`, {...s, ...extra}); return s; };
    const here = () => page.url().replace(app.baseURL, '');
    const h1 = () => page.locator('.pkp_structure_main h1, main h1').first().innerText({timeout: 3000}).then(flat).catch(() => null);
    const galleyLinks = (scope) => scope.locator('a.obj_galley_link').evaluateAll((as) => as.map((a) => ({
        text: a.innerText.replace(/\s+/g, ' ').trim(),
        restricted: a.classList.contains('restricted'),
        screenReader: (a.querySelector('.pkp_screen_reader') || {innerText: ''}).innerText.replace(/\s+/g, ' ').trim(),
        price: (a.querySelector('.purchase_cost') || {innerText: ''}).innerText.replace(/\s+/g, ' ').trim() || null,
    })));
    const tocLinks = async () => ({
        fullIssue: await galleyLinks(page.locator('.pkp_structure_main .galleys')),
        articles: await page.locator('.pkp_structure_main .obj_article_summary').evaluateAll((els) => els.map((e) => ({
            title: (e.querySelector('.title') || {innerText: ''}).innerText.replace(/\s+/g, ' ').trim().slice(0, 60),
            links: [...e.querySelectorAll('a.obj_galley_link')].map((a) => a.innerText.replace(/\s+/g, ' ').trim()),
        }))),
    });

    /** Press a link that loads a page: status, landing, heading, the page's message, the payment table, the server log. */
    async function press(name, locator) {
        const from = logSize();
        const href = (await locator.getAttribute('href') || '');
        const first = page.waitForResponse((r) => r.url() === href, {timeout: 15_000}).catch(() => null);
        const nav = page.waitForNavigation({waitUntil: 'load', timeout: 15_000}).catch(() => null);
        await locator.click();
        const [resp, firstAnswer] = await Promise.all([nav, first]);
        await idle(page).catch(() => {});
        const out = {href: href.replace(app.baseURL, ''), status: resp ? resp.status() : null, landed: here(), h1: await h1(), title: await page.title()};
        if (firstAnswer) out.firstAnswer = {status: firstAnswer.status(), location: (firstAnswer.headers()['location'] || '').replace(app.baseURL, '') || null};
        out.message = flat(await page.locator('.pkp_structure_main .cmp_notification, .page_login .cmp_notification').first().innerText({timeout: 1500}).catch(() => null), 400) || null;
        out.table = await page.locator('.page_payment_form table.cmp_table tr').evaluateAll((rows) => rows.map((r) => [r.querySelector('th')?.innerText.trim(), r.querySelector('td')?.innerText.trim()])).catch(() => null);
        out.galleyViewer = await page.locator('#pdfCanvasContainer, .galley_view iframe').count();
        await pause(300);
        out.log = logSince(from);
        await snap(name, {walk: out});
        fact(name, out);
        return out;
    }

    try {
        // ------------------------------------------------------------ the editor, steps 1-8
        await signIn(page, 'dbarnes', {contextPath: cp});
        fact('01-signed-in', here());
        const access = new AccessSettings(page, cp);
        // 2. subscriptions
        await access.goto();
        await access.modeRadio(SUB_MODE).check();
        fact('02-access-save', (await access.save()).status());
        await snap('access-saved');
        // 3 and 5: the "Payments" tab
        const paymentsTab = async (enable, name) => {
            await access.goto();
            await page.getByRole('tab', {name: 'Payments', exact: true}).click();
            await idle(page); await pause(500);
            const pay = page.getByRole('tabpanel', {name: 'Payments', exact: true});
            const box = pay.locator('input[name="paymentsEnabled"]').first();
            if (enable) {
                await box.check();
                await pause(300);
                await pay.locator('select[name="currency"]').first().selectOption({label: 'US Dollar'});
                await pay.locator('select[name="paymentPluginName"]').first().selectOption({label: 'Manual Fee Payment'});
                await pause(400);
                await pay.locator('textarea[name^="manualInstructions"], input[name^="manualInstructions"]').first().fill('Pay by bank transfer.');
            } else {
                await box.uncheck();
                await pause(300);
            }
            const rs = page.waitForResponse((x) => /\/_payments/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await pay.getByRole('button', {name: 'Save', exact: true}).first().click();
            const r = await rs; await idle(page); await pause(500);
            fact(name, {status: r ? r.status() : null, enabled: await box.isChecked()});
            await snap(name);
        };
        await paymentsTab(true, '03-payments-on');
        // 4. "Payment Types": "Purchase Issue" 20, "Purchase Article" 5
        const payments = new PaymentsPage(page, cp);
        await payments.gotoTab('Payment Types');
        const types = payments.panel('Payment Types');
        await types.locator('input[name="purchaseIssueFee"]').fill('20');
        await types.locator('input[name="purchaseArticleFee"]').fill('5');
        const rt = page.waitForResponse((x) => /savePaymentTypes/.test(x.url()), {timeout: T}).catch(() => null);
        await types.getByRole('button', {name: 'Save', exact: true}).click();
        const r4 = await rt; await idle(page); await pause(500);
        fact('04-payment-types-save', r4 ? r4.status() : null);
        await snap('payment-types-saved');
        // 5. payments off again (the neighbour keeps them on)
        if (MODE === 'steps') {
            await paymentsTab(false, '05-payments-off');
            fact('05-side-menu-payments', await page.locator('nav a, .app__nav a').filter({hasText: /^\s*Payments\s*$/}).count());
        }
        // 6. the issue to "Subscription"
        const issues = new IssuesAdmin(page, cp);
        await issues.goto('Back Issues');
        const win = await issues.openManagement('Back Issues', ISSUE);
        const form = await win.openAccess();
        await form.locator('select#accessStatus').selectOption({label: 'Subscription'});
        const ra = page.waitForResponse((x) => /update-access|updateAccess/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        const r6 = await ra; await idle(page); await pause(500);
        fact('06-issue-access-save', r6 ? r6.status() : null);
        await snap('issue-access-subscription');
        // 7. an issue galley "PDF" (the "Access" save closes the window: open it again)
        await win.close().catch(() => {});
        await issues.goto('Back Issues');
        const win2 = await issues.openManagement('Back Issues', ISSUE);
        await win2.openTab('Issue Galleys');
        const g = await win2.openCreateGalley();
        await g.labelBox().fill('PDF');
        const up = await g.upload(path.join(FILES, 'article.pdf'));
        fact('07-issue-galley-upload', up ? up.status() : null);
        const saved = await g.save();
        fact('07-issue-galley-save', saved ? saved.status() : null);
        await snap('issue-galley-pdf');
        await win2.close().catch(() => {});
        fact('stored', {
            settings: sql(app, `SELECT setting_name || '=' || setting_value FROM journal_settings WHERE setting_name IN ('publishingMode', 'purchaseArticleFee', 'purchaseIssueFee', 'membershipFee', 'paymentsEnabled', 'paymentPluginName', 'currency') ORDER BY 1`).split('\n'),
            issue: sql(app, `SELECT issue_id, access_status FROM issues WHERE issue_id = 1`),
            issueGalleys: sql(app, `SELECT galley_id, label FROM issue_galleys ORDER BY 1`).split('\n'),
        });
        // 8.
        await signOut(page);

        // ------------------------------------------------------------ signed out, steps 9-11
        // 9. the home page: the current issue, "Vol. 1 No. 2 (2014)"
        await page.goto(app.url(`${ctx}`));
        await idle(page);
        const home = await tocLinks();
        await snap('visitor-home', {walk: home});
        fact('09-visitor-home', home);
        fact('09-visitor-home-full-issue', await galleyLinks(page.locator('.pkp_structure_main .galleys')));
        // 10. the article page
        await page.locator('.obj_article_summary .title a').filter({hasText: ARTICLE}).first().click();
        await page.waitForLoadState('load');
        await idle(page);
        const articleLinks = await galleyLinks(page.locator('.pkp_structure_main .galleys_links, .pkp_structure_main .item.galleys'));
        await snap('visitor-article', {walk: articleLinks});
        fact('10-visitor-article-links', articleLinks);
        // 11.
        await press('11-visitor-press-pdf', page.locator('.pkp_structure_main a.obj_galley_link').filter({hasText: /PDF/}).first());

        // ------------------------------------------------------------ the reader, steps 12-14
        await signIn(page, 'ccorino', {contextPath: cp});
        fact('12-signed-in', here());
        const openIssue = async () => {
            await page.goto(app.url(`${ctx}/issue/archive`));
            await idle(page);
            await page.locator('.obj_issue_summary a.title').filter({hasText: ISSUE}).first().click();
            await page.waitForLoadState('load');
            await idle(page);
        };
        // 13. the article's "PDF" on the issue page
        await openIssue();
        const issuePage = await tocLinks();
        await snap('reader-issue', {walk: issuePage});
        fact('13-reader-issue-page', issuePage);
        const queuedBefore = Number(sql(app, 'SELECT count(*) FROM queued_payments'));
        await press('13-reader-press-article-pdf', page.locator('.obj_article_summary').filter({hasText: ARTICLE}).locator('a.obj_galley_link').filter({hasText: /PDF/}).first());
        // 14. the "Full Issue" "PDF"
        await openIssue();
        await press('14-reader-press-full-issue-pdf', page.locator('.pkp_structure_main .galleys a.obj_galley_link').filter({hasText: /PDF/}).first());
        fact('queued-payments', {before: queuedBefore, after: Number(sql(app, 'SELECT count(*) FROM queued_payments'))});
        await signOut(page);
    } finally {
        fact('failed-requests', failed);
        fact('script-errors', scriptErrors);
        record(`${label}-facts`, facts);
        await close();
    }
});
