// Issue report walk: docs/issues/U51-A20-full-issue-fee-of-no-amount.md
// (spec U51 register A20). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// OJS only (OMP and OPS have no subscriptions or reader fees):
//   the editor `dbarnes` makes `publicknowledge` require subscriptions,
//   turns payments on with "Manual Fee Payment", sets "Association
//   Membership" to 10 on "Payment Types" ("Purchase Issue" and "Purchase
//   Article" empty), sets "Vol. 1 No. 2 (2014)" to "Subscription" and gives
//   it an issue galley "PDF"; then the reader `ccorino` (no subscription,
//   no membership) opens the issue, presses the "Full Issue" "PDF", presses
//   "Send notification of payment", and presses "PDF" under "Signalling
//   Theory Dividends" (the control).
//
// Arguments (after the script):
//   (none)      the Steps.
//   neighbour   the fix check: the same, with "Purchase Issue" also set to
//               20 in step 4; the "Full Issue" must still lead to the payment
//               page for a "Purchase Issue Fee" of "20.00 (USD)".
//
// The kit builds nothing. Every screen is recorded with screen(); each
// press's status, landing, heading, the payment page's table, the queued
// payment row and the new lines of the fleet's server log go into the facts.
//
// Reset the fleet before each walk (the walk changes the dataset):
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset --apps ojs
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/full-issue-fee-of-no-amount/walk.js [neighbour]
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
const CONTACT = 'rvaca@mailinator.com';
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
    const label = `a20-${MODE}`;
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

    /** Press a link that loads a page: status, landing, heading, the payment page's table, the server log. */
    async function press(name, locator) {
        const from = logSize();
        const nav = page.waitForNavigation({waitUntil: 'load', timeout: 15_000}).catch(() => null);
        await locator.click();
        const resp = await nav;
        await idle(page).catch(() => {});
        const out = {status: resp ? resp.status() : null, landed: here(), h1: await h1()};
        out.table = await page.locator('.page_payment_form table.cmp_table tr').evaluateAll((rows) => rows.map((r) => [r.querySelector('th')?.innerText.trim(), r.querySelector('td')?.innerText.trim()])).catch(() => null);
        out.paragraphs = await page.locator('.page_payment_form p, .page_message, .pkp_structure_main .page p').evaluateAll((ps) => ps.map((p) => p.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 6)).catch(() => null);
        out.buttons = await page.locator('.pkp_structure_main a.cmp_button').evaluateAll((as) => as.map((a) => a.innerText.trim())).catch(() => null);
        out.galleyViewer = await page.locator('iframe#pdfCanvasContainer, .galley_view iframe, #pdfCanvasContainer').count();
        await pause(300);
        out.log = logSince(from);
        await snap(name, {walk: out});
        fact(name, out);
        return out;
    }

    try {
        // ------------------------------------------------------------ the editor, steps 1-7
        await signIn(page, 'dbarnes', {contextPath: cp});
        fact('01-signed-in', here());
        const access = new AccessSettings(page, cp);
        // 2. subscriptions
        await access.goto();
        await access.modeRadio(SUB_MODE).check();
        fact('02-access-save', (await access.save()).status());
        await snap('access-saved');
        // 3. payments
        await access.goto();
        await page.getByRole('tab', {name: 'Payments', exact: true}).click();
        await idle(page); await pause(500);
        const pay = page.getByRole('tabpanel', {name: 'Payments', exact: true});
        await pay.locator('input[name="paymentsEnabled"]').first().check();
        await pause(300);
        await pay.locator('select[name="currency"]').first().selectOption({label: 'US Dollar'});
        await pay.locator('select[name="paymentPluginName"]').first().selectOption({label: 'Manual Fee Payment'});
        await pause(400);
        await pay.locator('textarea[name^="manualInstructions"], input[name^="manualInstructions"]').first().fill('Pay by bank transfer.');
        const rs = page.waitForResponse((x) => /\/_payments/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await pay.getByRole('button', {name: 'Save', exact: true}).first().click();
        const r3 = await rs; await idle(page); await pause(500);
        fact('03-payments-save', r3 ? r3.status() : null);
        await snap('payments-saved');
        // 4. "Payment Types": "Association Membership" 10 (the neighbour also "Purchase Issue" 20)
        const payments = new PaymentsPage(page, cp);
        await payments.gotoTab('Payment Types');
        const types = payments.panel('Payment Types');
        const labels = await types.locator('label').evaluateAll((ls) => ls.map((l) => l.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));
        fact('04-payment-types-labels', labels);
        await types.locator('input[name="membershipFee"]').fill('10');
        if (MODE === 'neighbour') await types.locator('input[name="purchaseIssueFee"]').fill('20');
        const fees = {};
        for (const f of ['purchaseIssueFee', 'purchaseArticleFee', 'membershipFee']) fees[f] = await types.locator(`input[name="${f}"]`).inputValue().catch(() => null);
        const rt = page.waitForResponse((x) => /savePaymentTypes/.test(x.url()), {timeout: T}).catch(() => null);
        await types.getByRole('button', {name: 'Save', exact: true}).click();
        const r4 = await rt; await idle(page); await pause(500);
        fact('04-payment-types-save', {status: r4 ? r4.status() : null, fees});
        await snap('payment-types-saved');
        // 5. the issue to "Subscription"
        const issues = new IssuesAdmin(page, cp);
        await issues.goto('Back Issues');
        const win = await issues.openManagement('Back Issues', ISSUE);
        const form = await win.openAccess();
        await form.locator('select#accessStatus').selectOption({label: 'Subscription'});
        const ra = page.waitForResponse((x) => /update-access|updateAccess/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        const r5 = await ra; await idle(page); await pause(500);
        fact('05-issue-access-save', r5 ? r5.status() : null);
        await snap('issue-access-subscription');
        // 6. an issue galley "PDF" (the "Access" save closes the window: open it again)
        await win.close().catch(() => {});
        await issues.goto('Back Issues');
        const win2 = await issues.openManagement('Back Issues', ISSUE);
        await win2.openTab('Issue Galleys');
        const g = await win2.openCreateGalley();
        await g.labelBox().fill('PDF');
        const up = await g.upload(path.join(FILES, 'article.pdf'));
        fact('06-issue-galley-upload', up ? up.status() : null);
        const saved = await g.save();
        fact('06-issue-galley-save', saved ? saved.status() : null);
        await snap('issue-galley-pdf');
        await win2.close().catch(() => {});
        fact('stored', {
            fees: sql(app, `SELECT setting_name || '=' || setting_value FROM journal_settings WHERE setting_name IN ('publishingMode', 'purchaseArticleFee', 'purchaseIssueFee', 'membershipFee', 'paymentsEnabled', 'paymentPluginName', 'currency') ORDER BY 1`).split('\n'),
            issue: sql(app, `SELECT issue_id, access_status FROM issues WHERE issue_id = 1`),
            issueGalleys: sql(app, `SELECT galley_id, label FROM issue_galleys ORDER BY 1`).split('\n'),
            ccorino: sql(app, `SELECT (SELECT count(*) FROM subscriptions s JOIN users u ON u.user_id = s.user_id WHERE u.username = 'ccorino') AS subscriptions, (SELECT count(*) FROM user_settings us JOIN users u ON u.user_id = us.user_id WHERE u.username = 'ccorino' AND us.setting_name = 'dateEndMembership') AS membership`),
        });
        // 7.
        await signOut(page);

        // ------------------------------------------------------------ the reader, steps 8-12
        await signIn(page, 'ccorino', {contextPath: cp});
        fact('08-signed-in', here());
        const openIssue = async () => {
            await page.goto(app.url(`${ctx}/issue/archive`));
            await idle(page);
            await page.locator('.obj_issue_summary a.title').filter({hasText: ISSUE}).first().click();
            await page.waitForLoadState('load');
            await idle(page);
        };
        // 9.
        await openIssue();
        const fullIssue = page.locator('.pkp_structure_main .galleys a.obj_galley_link');
        const full = await fullIssue.evaluateAll((as) => as.map((a) => ({text: a.innerText.replace(/\s+/g, ' ').trim(), className: a.className, href: a.getAttribute('href')})));
        const galleysHeading = flat(await page.locator('.pkp_structure_main .galleys h2, .pkp_structure_main .galleys .label').first().innerText({timeout: 2000}).catch(() => null));
        await snap('issue-page', {walk: {full, galleysHeading}});
        fact('09-issue-page', {galleysHeading, full});
        // 10.
        const queuedBefore = Number(sql(app, 'SELECT count(*) FROM queued_payments'));
        const p10 = await press('10-press-full-issue-pdf', fullIssue.filter({hasText: /PDF/}).first());
        fact('10-queued-payments', {before: queuedBefore, after: Number(sql(app, 'SELECT count(*) FROM queued_payments')), newest: sql(app, 'SELECT queued_payment_id, payment_data FROM queued_payments ORDER BY queued_payment_id DESC LIMIT 1').slice(0, 900)});
        // 11.
        const notify = page.locator('.pkp_structure_main a.cmp_button').filter({hasText: 'Send notification of payment'});
        if (await notify.count()) {
            const t0 = Date.now() - 2000;
            await press('11-press-send-notification', notify.first());
            let mail = null;
            for (let i = 0; i < 30 && !mail; i++) {
                const found = await app.mail._search({to: CONTACT}).catch(() => ({messages: []}));
                const m = (found.messages || []).find((x) => new Date(x.Created).getTime() >= t0);
                if (m) mail = m; else await pause(500);
            }
            if (mail) {
                const full2 = await app.mail.fullMessage(mail.ID);
                fact('11-mail', {to: (full2.To || []).map((x) => x.Address), from: full2.From && full2.From.Address, subject: full2.Subject, text: flat(full2.Text, 1200)});
            } else {
                fact('11-mail', null);
            }
        } else {
            fact('11-no-notification-button', p10.landed);
        }
        // 12. the control: the article's PDF in the same issue
        await openIssue();
        const articleLink = page.locator('.obj_article_summary').filter({hasText: ARTICLE}).locator('a.obj_galley_link').filter({hasText: /PDF/}).first();
        fact('12-article-link', {className: await articleLink.getAttribute('class'), href: (await articleLink.getAttribute('href') || '').replace(app.baseURL, '')});
        await press('12-press-article-pdf', articleLink);
        await signOut(page);
    } finally {
        fact('failed-requests', failed);
        fact('script-errors', scriptErrors);
        record(`${label}-facts`, facts);
        await close();
    }
});
