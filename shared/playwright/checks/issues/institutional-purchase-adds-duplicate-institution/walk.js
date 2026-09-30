// Issue report walk: docs/issues/U51-A11-institutional-purchase-adds-duplicate-institution.md
// (spec U51 register A11). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// OJS only (OMP and OPS have no subscriptions): the manager `rvaca` makes
// `publicknowledge` require subscriptions and take manual payments, sets the
// issue "Vol. 1 No. 2 (2014)" to "Subscription", creates the institutional
// type "Campus Year u51w13" and the institution "Harbour Library u51w13" (two
// IP ranges); the reader `ccorino` buys a subscription under that name
// ("Purchase New Subscription", "Continue"); the manager makes it "Active" in
// its "Edit" window (reading the window's "Institution" list); ccorino
// presses "Purchase" beside it, replaces "Array" with the ranges and presses
// "Continue"; the manager opens "Institutions".
//
// Arguments (after the script):
//   (none)      the Steps (1-14).
//   moved       steps 1-11, then "The library's addresses change" (15-19):
//               the manager edits the first "Harbour Library u51w13" row on
//               "Institutions" to the one range "127.0.0.1" (the address the
//               browser reaches the fleet from), a visitor who is not signed
//               in opening the PDF of "Signalling Theory Dividends" before and
//               after; then the second row the same way, and the PDF again
//               (with the fix in there is no second row: recorded, skipped).
//   neighbour   the fix check: steps 1-9, then two new purchases the fix
//               must leave adding an institution: "Dock Library u51w13" with
//               "203.0.113.0/24", and "Harbour Library u51w13" with
//               "203.0.113.5" (the same name, other ranges); then the
//               manager's "Institutions" and the stored ranges.
//
// Reset the fleet before each walk (the walk changes the dataset):
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset --apps ojs
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/institutional-purchase-adds-duplicate-institution/walk.js [neighbour]
//   (PKP_E2E_LINE=stable-3_5_0 … PROBE_RUN=r35 in front for 3.5)
// The kit builds nothing. Every screen is recorded with screen(); each page
// request's status, and the new error lines of the fleet's server log after
// it, go into the facts, with the stored institutions after each purchase.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const MODE = process.argv[2] || 'steps';
if (!['steps', 'moved', 'neighbour'].includes(MODE)) throw new Error(`unknown mode ${MODE}`);

const T = 30_000;
const TAG = 'u51w13';
const TYPE = `Campus Year ${TAG}`;
const INSTITUTION = `Harbour Library ${TAG}`;
const RANGES = ['192.0.2.10', '198.51.100.0/24'];
const READER = 'ccorino';
const ISSUE = 'Vol. 1 No. 2 (2014)';
const ARTICLE = 'Signalling Theory Dividends';
const HERE = '127.0.0.1';
const SUB_MODE = 'The journal will require subscriptions to access some or all of its contents.';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const iso = (d) => d.toISOString().slice(0, 10);
const now = new Date();
const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
const yesterday = new Date(today);
yesterday.setUTCDate(yesterday.getUTCDate() - 1);
const nextYear = new Date(today);
nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1);

forEachApp(async (app) => {
    if (app.name !== 'ojs') {
        console.log(`[${app.name}] no subscriptions on this app; nothing to walk`);
        return;
    }
    if (!app.dataset) throw new Error('the walk drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const {AccessSettings, PaymentsPage, MySubscriptionsPage, PurchasePage} = require('../../../pages/SubscriptionsPages.js');
    const {InstitutionsPage, InstitutionPanel} = require('../../../pages/InstitutionsPages.js');
    const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
    const cp = app.contextPath;
    const label = `a11-${MODE}`;
    const facts = {label, line: app.line || 'main', today: iso(today)};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const logFile = path.join(__dirname, '../../../../../apps/ojs/playwright/.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n')
                .filter((l) => /\[5\d\d\]|Fatal|Uncaught|PHP (Warning|Error)/.test(l)).map((l) => l.slice(0, 400)).slice(0, 8);
        } catch { return []; }
    };
    /** The journal's institutions as stored: id, name, ranges, deleted. */
    const institutions = (step) => fact(`${step}-stored-institutions`, sql(app, `SELECT i.institution_id, s.setting_value, COALESCE((SELECT string_agg(ip.ip_string, ',' ORDER BY ip.institution_ip_id) FROM institution_ip ip WHERE ip.institution_id = i.institution_id), '') FROM institutions i JOIN institution_settings s ON s.institution_id = i.institution_id AND s.setting_name = 'name' WHERE i.deleted_at IS NULL ORDER BY i.institution_id`).split('\n').filter(Boolean));
    const subscriptions = (step) => fact(`${step}-stored-subscriptions`, sql(app, `SELECT s.subscription_id, s.status, s.date_start, s.date_end, iss.institution_id FROM subscriptions s JOIN institutional_subscriptions iss ON iss.subscription_id = s.subscription_id ORDER BY s.subscription_id`).split('\n').filter(Boolean));

    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${label}-${String(++n).padStart(2, '0')}-${name}`, {...s, ...extra}); return s; };
    const here = () => page.url().replace(app.baseURL, '');
    const h1 = () => page.locator('.pkp_structure_main h1, main h1').first().innerText({timeout: 3000}).then(flat).catch(() => null);
    const mainText = () => page.locator('.pkp_structure_main').innerText().then((t) => flat(t, 600)).catch(() => '');

    /** Press a link or button that loads a page: status, landing, heading, the server log. */
    async function press(locator) {
        const from = logSize();
        const nav = page.waitForNavigation({waitUntil: 'load', timeout: T}).catch(() => null);
        await locator.click();
        const resp = await nav;
        await idle(page).catch(() => {});
        const out = {status: resp ? resp.status() : null, landed: here(), h1: await h1()};
        await pause(300);
        out.log = logSince(from);
        return out;
    }

    const my = new MySubscriptionsPage(page, cp);
    const purchase = new PurchasePage(page, cp);
    const readForm = async () => ({
        type: flat(await purchase.selectedType().innerText().catch(() => null)),
        institutionName: await purchase.institutionNameBox().inputValue().catch(() => null),
        domain: await purchase.domainBox().inputValue().catch(() => null),
        ipRanges: await purchase.ipRangesBox().inputValue().catch(() => null),
        errors: flat(await purchase.errors().innerText({timeout: 1000}).catch(() => null)),
    });
    /** "Purchase New Subscription" under "Institutional Subscriptions", typed values, "Continue". */
    async function buyNew(step, name, ranges) {
        await my.goto();
        await idle(page);
        const opened = await press(my.purchaseLink(my.institutionalPart()));
        opened.form = await readForm();
        await snap(`${step}-purchase-page`, {walk: opened});
        fact(`${step}-purchase-page`, opened);
        await purchase.institutionNameBox().fill(name);
        await purchase.ipRangesBox().fill(ranges.join('\n'));
        const out = await press(purchase.submitButton());
        out.form = await purchase.form().count() ? await readForm() : null;
        out.pageText = await mainText();
        await snap(`${step}-continue`, {walk: out});
        fact(`${step}-continue`, out);
        institutions(step);
        return out;
    }
    /** The manager's "Institutions" list, as the page shows it. */
    async function readInstitutions(step) {
        const inst = new InstitutionsPage(page, cp);
        await inst.goto();
        await idle(page);
        await pause(500);
        const names = (await inst.names.allInnerTexts()).map((t) => flat(t));
        await snap(`${step}-institutions`, {walk: {names}});
        fact(`${step}-institutions`, names);
        return names;
    }

    /** Archives › the issue › the article › "PDF": where it leads. */
    async function openPdf(step) {
        await page.goto(app.url(`/index.php/${cp}/en/issue/archive`));
        await idle(page);
        await page.locator('.obj_issue_summary a.title').filter({hasText: ISSUE}).first().click();
        await page.waitForLoadState('load'); await idle(page);
        await page.locator('.obj_article_summary .title a').filter({hasText: ARTICLE}).first().click();
        await page.waitForLoadState('load'); await idle(page);
        const link = page.locator('.pkp_structure_main a.obj_galley_link').filter({hasText: 'PDF'}).first();
        const linkClass = await link.getAttribute('class').catch(() => null);
        const out = await press(link);
        out.linkClass = linkClass;
        out.pdfViewer = await page.locator('iframe, #pdfCanvasContainer, .pdf_iframe').count();
        await snap(`${step}-pdf`, {walk: out});
        fact(`${step}-pdf`, out);
        return out;
    }
    /** "Institutions": the n-th row named INSTITUTION › "Edit", "IP ranges" replaced, "Save". */
    async function editRow(step, index, ranges) {
        const inst = new InstitutionsPage(page, cp);
        await inst.goto();
        await idle(page);
        await pause(500);
        if (await inst.row(INSTITUTION).count() <= index) {
            fact(`${step}-edit-row`, {index, absent: `no row ${index + 1} named ${INSTITUTION}`});
            return false;
        }
        const row = inst.row(INSTITUTION).nth(index);
        const id = (await row.locator('span[id^="institution-"]').getAttribute('id')).replace('institution-', '');
        await row.getByRole('button', {name: 'Edit', exact: true}).click();
        const panel = new InstitutionPanel(page, 'Edit Institution');
        await panel.expectOpen();
        const before = await panel.ipRangesBox.inputValue();
        await panel.ipRangesBox.fill(ranges.join('\n'));
        const status = (await panel.saveAccepted()).status();
        fact(`${step}-edit-row`, {index, id, before, status});
        institutions(step);
        return true;
    }

    try {
        // ------------------------------------------------------------ steps 1-7: the manager sets the journal up
        await signIn(page, 'rvaca', {contextPath: cp});                                                 // 1
        const access = new AccessSettings(page, cp);                                                     // 2
        await access.goto();
        await access.modeRadio(SUB_MODE).check();
        fact('step2-access-save', (await access.save()).status());
        await page.locator('#payments-button').click();                                                  // 3
        await idle(page); await pause(500);
        const pay = page.locator('#payments');
        await pay.locator('input[name="paymentsEnabled"]').first().check();
        await pause(300);
        await pay.locator('select[name="currency"]').first().selectOption({label: 'US Dollar'});
        await pay.locator('select[name="paymentPluginName"]').first().selectOption({label: 'Manual Fee Payment'});
        await pause(400);
        await pay.locator('textarea[name^="manualInstructions"], input[name^="manualInstructions"]').first().fill('Pay by bank transfer.');
        const rs = page.waitForResponse((x) => /\/_payments/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await pay.getByRole('button', {name: 'Save', exact: true}).first().click();
        const r = await rs; await idle(page); await pause(500);
        fact('step3-payments-save', r ? r.status() : null);

        const issues = new IssuesAdmin(page, cp);                                                        // 4
        await issues.goto('Back Issues');
        const iwin = await issues.openManagement('Back Issues', ISSUE);
        const iform = await iwin.openAccess();
        await iform.locator('select#accessStatus').selectOption({label: 'Subscription'});
        const irs = page.waitForResponse((x) => /update-access/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
        await iform.getByRole('button', {name: 'Save', exact: true}).click();
        const ir = await irs; await idle(page); await pause(500);
        fact('step4-issue-access-save', ir ? ir.status() : null);
        await iwin.close().catch(() => {});

        const payments = new PaymentsPage(page, cp);                                                     // 5
        await payments.gotoTab('Subscription Types');
        const type = await payments.openCreateType();
        await type.fill({name: TYPE, currency: 'USD', cost: '100', format: 'Online', duration: '12'});
        await type.kindRadio('Institutional (users are validated via domain or IP address)').check();
        fact('step4-type-save', (await type.saveAccepted()).status());

        const inst = new InstitutionsPage(page, cp);                                                     // 6
        await inst.openFromSideMenu().catch(async (e) => { fact('step5-side-menu', String(e).slice(0, 200)); await inst.goto(); });
        const panel = await inst.openAdd();
        await panel.nameBox('en').fill(INSTITUTION);
        await panel.ipRangesBox.fill(RANGES.join('\n'));
        fact('step5-institution-save', (await panel.saveAccepted({refetch: true})).status());
        await readInstitutions('step6');
        institutions('step6');
        await signOut(page);                                                                             // 7

        // ------------------------------------------------------------ steps 8-10: a new purchase under the institution's name
        await signIn(page, READER, {contextPath: cp});                                                    // 8
        if (MODE !== 'neighbour') {
            await buyNew('step10', INSTITUTION, RANGES);                                                 // 9-10
            subscriptions('step10');

            // -------------------------------------------------------- step 11: the manager makes it "Active"
            await signOut(page);
            await signIn(page, 'rvaca', {contextPath: cp});
            await payments.gotoTab('Institutional Subscriptions');
            fact('step11-rows', (await payments.rows('Institutional Subscriptions').allInnerTexts()).map((t) => flat(t, 300)));
            const win = await payments.openEditSubscription('Institutional Subscriptions', INSTITUTION);
            const options = (await win.institutionSelect().locator('option').allInnerTexts()).map((t) => flat(t)).filter(Boolean);
            const chosen = flat(await win.institutionSelect().locator('option:checked').innerText().catch(() => null));
            await snap('step11-edit-window', {walk: {options, chosen}});
            fact('step11-institution-list', {options, chosen});
            await win.chooseStatus('Active');
            await win.typeDate('dateStart', iso(yesterday));
            await win.typeDate('dateEnd', iso(nextYear));
            fact('step11-save', (await win.saveAccepted()).status());
            subscriptions('step11');

        }
        if (MODE === 'moved') {
            // -------------------------------------------------------- steps 15-19: the library's addresses change
            await signOut(page);
            await openPdf('step15-visitor-before');                                                      // 15
            await signIn(page, 'rvaca', {contextPath: cp});
            await editRow('step16', 0, [HERE]);                                                           // 16
            await signOut(page);
            await openPdf('step17-visitor');                                                             // 17
            await signIn(page, 'rvaca', {contextPath: cp});
            const second = await editRow('step18', 1, [HERE]);                                            // 18
            await signOut(page);
            if (second) await openPdf('step19-visitor');                                                 // 19
            await signIn(page, 'rvaca', {contextPath: cp});
            await readInstitutions('step19');
            subscriptions('step19');
        }
        if (MODE === 'steps') {
            // -------------------------------------------------------- steps 12-13: "Purchase" beside it
            await signOut(page);
            await signIn(page, READER, {contextPath: cp});                                                // 12
            await my.goto();
            await idle(page);
            const row = my.rows(my.institutionalPart()).first();
            fact('step12-row', {cells: await my.rowCells(row), buttons: (await my.rowButtons(row).allInnerTexts()).map((t) => flat(t))});
            const button = my.rowButtons(row).filter({hasText: /^\s*Purchase\s*$/});
            if (await button.count()) {
                const opened = await press(button.first());
                opened.form = await readForm();
                await snap('step12-purchase-page', {walk: opened});
                fact('step12-purchase-page', opened);
                await purchase.ipRangesBox().fill(RANGES.join('\n'));                                   // 13
                const out = await press(purchase.submitButton());
                out.form = await purchase.form().count() ? await readForm() : null;
                out.pageText = await mainText();
                await snap('step13-continue', {walk: out});
                fact('step13-continue', out);
            } else {
                fact('step12-no-purchase', 'no "Purchase" beside the subscription');
            }
            institutions('step13');
            subscriptions('step13');
        } else {
            // -------------------------------------------------------- neighbour: purchases the fix must leave adding
            await buyNew('neighbour-other-name', `Dock Library ${TAG}`, ['203.0.113.0/24']);
            await buyNew('neighbour-same-name-other-ranges', INSTITUTION, ['203.0.113.5']);
            subscriptions('neighbour');
        }

        // ------------------------------------------------------------ step 14: the manager's "Institutions"
        if (MODE !== 'moved') {
            await signOut(page);
            await signIn(page, 'rvaca', {contextPath: cp});
            await readInstitutions('step14');
        }
        await signOut(page);
    } catch (e) {
        fact('error', String(e && e.stack || e).slice(0, 1500));
        await snap('error').catch(() => {});
        throw e;
    } finally {
        record(`${label}-facts`, facts);
        await close();
    }
});
