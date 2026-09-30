// The Steps shared by two issue report walks, both on a dataset fleet (PKP's
// default test dataset, harness.md "Dataset fleets"), OJS only (OMP and OPS
// have no subscriptions):
//   docs/issues/U51-A10-purchase-active-subscription-takes-access-away.md
//     (spec U51 register A10): ./walk.js
//   docs/issues/U51-A25-institutional-purchase-ip-ranges-array.md
//     (spec U51 register A25): ../institutional-purchase-ip-ranges-array/walk.js
//
// Parts (the walk scripts pick them):
//   setup       A10's steps 1-12: the manager `rvaca` makes `publicknowledge`
//               require subscriptions and take manual payments, sets the
//               issue "Vol. 1 No. 2 (2014)" to "Subscription", creates an
//               individual and an institutional type, the institution
//               "Harbour Library u51w3" with two IP ranges, and ccorino's
//               two active subscriptions; then ccorino opens the PDF of
//               "Signalling Theory Dividends" and "My Subscriptions".
//   setup-inst  A25's steps 1-8: the same without the issue's access, the
//               individual type and subscription and the PDF.
//   individual  steps 13-16 ("Purchase" › "Save" on the individual row).
//   institutional steps 17-20 ("Purchase" on the institutional row, "IP
//               ranges", "Continue", retyped, "Continue").
//   manager     step 21 (the manager's two lists).
//   domain-only with setup-inst: the institution gets no IP ranges and the
//               subscription the domain "example.edu"; step 19 clears "IP
//               ranges" instead of typing them again.
//   record      steps 22-24, after manager: the manager records the manual payment the
//               way the screens allow (the subscription's "Edit": "Active",
//               the dates as the window shows them, "Save"), reads the
//               "Payments" tab, then the reader's "My Subscriptions" and PDF.
//   neighbour   the fix checks, taken after setup instead of the steps:
//               "Renew" on the individual row (the payment page, the
//               subscription left as it was) and "Purchase New Subscription"
//               under the institutional table (an empty "IP ranges", typed
//               ranges accepted, a new row "Awaiting Manual Payment" beside
//               the active one).
// Where a step's control is not on the page (a fix removed it), the walk
// records its absence and opens the address the control had pointed at, as
// a person with a bookmark would.
// Step numbers are the report's. The kit builds nothing. Every screen is
// recorded with screen(); each page request's status, and the new lines of
// the fleet's server log after it, go into the facts.
const fs = require('fs');
const path = require('path');
const {launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const T = 30_000;
const TAG = 'u51w3';
const TYPE_IND = `Online Year ${TAG}`;
const TYPE_INST = `Campus Year ${TAG}`;
const INSTITUTION = `Harbour Library ${TAG}`;
const RANGES = ['192.0.2.10', '198.51.100.0/24'];
const DOMAIN = 'example.edu';
const ISSUE = 'Vol. 1 No. 2 (2014)';
const ARTICLE = 'Signalling Theory Dividends';
const READER = 'ccorino';
const SUB_MODE = 'The journal will require subscriptions to access some or all of its contents.';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const iso = (d) => d.toISOString().slice(0, 10);
const now = new Date();
const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
const nextYear = new Date(today);
nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1);

async function walk(app, parts, label) {
    if (app.name !== 'ojs') {
        console.log(`[${app.name}] no subscriptions on this app; nothing to walk`);
        return;
    }
    if (!app.dataset) throw new Error('the walk drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const {AccessSettings, PaymentsPage, MySubscriptionsPage, PurchasePage} = require('../../../pages/SubscriptionsPages.js');
    const {InstitutionsPage} = require('../../../pages/InstitutionsPages.js');
    const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
    const cp = app.contextPath;
    const ctx = `/index.php/${cp}/en`;
    const facts = {label, parts, line: app.line || 'main', today: iso(today), nextYear: iso(nextYear)};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const logFile = path.join(__dirname, '../../../../../apps/ojs/playwright/.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n')
                .filter((l) => /\[5\d\d\]|Fatal|Uncaught|PHP (Warning|Error)/.test(l)).map((l) => l.slice(0, 400)).slice(0, 8);
        } catch { return []; }
    };
    const stored = (step) => fact(`${step}-stored`, sql(app, `SELECT s.subscription_id, st.institutional, s.status, s.date_start, s.date_end FROM subscriptions s JOIN subscription_types st ON st.type_id = s.type_id JOIN users u ON u.user_id = s.user_id WHERE u.username = '${READER}' ORDER BY s.subscription_id`).split('\n').filter(Boolean));
    const institutions = (step) => fact(`${step}-institutions`, sql(app, `SELECT i.institution_id, s.setting_value FROM institutions i JOIN institution_settings s ON s.institution_id = i.institution_id AND s.setting_name = 'name' WHERE i.deleted_at IS NULL ORDER BY i.institution_id`).split('\n').filter(Boolean));

    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${label}-${String(++n).padStart(2, '0')}-${name}`, {...s, ...extra}); return s; };
    const here = () => page.url().replace(app.baseURL, '');
    const h1 = () => page.locator('.pkp_structure_main h1, main h1').first().innerText({timeout: 3000}).then(flat).catch(() => null);

    /** Open an address as a person types it (a bookmark): status, landing, heading, the server log. */
    async function open(name, pathname) {
        const from = logSize();
        const resp = await page.goto(app.url(pathname)).catch((e) => ({err: e.message}));
        await idle(page).catch(() => {});
        const out = {asked: pathname, status: resp && resp.status ? resp.status() : resp, landed: here(), h1: await h1()};
        await pause(300);
        out.log = logSince(from);
        await snap(name, {walk: out});
        fact(name, out);
        return out;
    }
    /** Press a link or button that loads a page; the page's status, landing, heading and the server log. */
    async function press(name, locator) {
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
    /** "My Subscriptions": each row's cells and buttons (with their addresses). */
    async function readMine(name) {
        await my.goto();
        await idle(page);
        const read = async (part) => {
            const rows = my.rows(part);
            const out = [];
            for (let i = 0; i < await rows.count(); i++) {
                const row = rows.nth(i);
                const buttons = [];
                for (const b of await my.rowButtons(row).all()) buttons.push({text: flat(await b.innerText()), href: (await b.getAttribute('href') || '').replace(app.baseURL, '')});
                out.push({cells: await my.rowCells(row), buttons});
            }
            return out;
        };
        const out = {landed: here(), h1: await h1(), individual: await read(my.individualPart()), institutional: await read(my.institutionalPart())};
        await snap(name, {walk: out});
        fact(name, out);
        return out;
    }
    /** The article's "PDF" from Archives: where it leads. */
    async function openPdf(name) {
        await page.goto(app.url(`${ctx}/issue/archive`));
        await idle(page);
        await page.locator('.obj_issue_summary a.title').filter({hasText: ISSUE}).first().click();
        await page.waitForLoadState('load');
        await idle(page);
        await page.locator('.obj_article_summary .title a').filter({hasText: ARTICLE}).first().click();
        await page.waitForLoadState('load');
        await idle(page);
        const link = page.locator('.pkp_structure_main a.obj_galley_link').filter({hasText: 'PDF'}).first();
        const linkClass = await link.getAttribute('class').catch(() => null);
        const block = flat(await page.locator('.pkp_structure_sidebar .block_subscription').innerText({timeout: 2000}).catch(() => null));
        const out = await press(name, link);
        out.linkClass = linkClass;
        out.subscriptionBlock = block;
        out.pdfViewer = await page.locator('iframe, #pdfCanvasContainer, .pdf_iframe').count();
        await snap(name, {walk: out});
        fact(name, out);
        return out;
    }
    /** A row's button by its text, or null when the row has none. */
    function rowButton(part, text) {
        return my.rowButtons(my.rows(part).first()).filter({hasText: new RegExp(`^\\s*${text}\\s*$`)});
    }
    /** Press a row's button, or, when the row has none (a fix removed it), open the address `fallback` names. */
    async function pressOrOpen(name, part, text, fallback) {
        const button = rowButton(part, text);
        if (await button.count()) {
            const out = await press(name, button.first());
            await snap(name, {walk: out});
            fact(name, out);
            return {pressed: true, ...out};
        }
        fact(`${name}-no-button`, `no "${text}" on the row; opening ${fallback}`);
        const out = fallback ? await open(`${name}-by-address`, fallback) : null;
        return {pressed: false, ...out};
    }
    const idFrom = (rows) => {
        const href = (rows[0] && rows[0].buttons.map((b) => b.href).find((h) => /Subscription\/(individual|institutional)\/\d+/.test(h))) || '';
        const m = href.match(/\/(individual|institutional)\/(\d+)/);
        return m ? m[2] : null;
    };

    try {
        // ------------------------------------------------------------ steps 1-10: the manager sets the journal up
        const full = parts.includes('setup');
        const domainOnly = parts.includes('domain-only');
        if (full || parts.includes('setup-inst')) {
            const readerId = Number(sql(app, `SELECT user_id FROM users WHERE username = '${READER}'`));
            await signIn(page, 'rvaca', {contextPath: cp});                                             // 1
            const access = new AccessSettings(page, cp);                                                 // 2
            await access.goto();
            await access.modeRadio(SUB_MODE).check();
            fact('step2-access-save', (await access.save()).status());
            await page.locator('#payments-button').click();                                              // 3
            await idle(page); await pause(500);
            const pay = page.locator('#payments');
            await pay.locator('input[name="paymentsEnabled"]').first().check();
            await pause(300);
            await pay.locator('select[name="currency"]').first().selectOption({label: 'US Dollar'});
            await pay.locator('select[name="paymentPluginName"]').first().selectOption({label: 'Manual Fee Payment'});
            await pause(400);
            await pay.locator('textarea[name^="manualInstructions"], input[name^="manualInstructions"]').first().fill('Pay by bank transfer.');
            let rs = page.waitForResponse((x) => /\/_payments/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await pay.getByRole('button', {name: 'Save', exact: true}).first().click();
            let r = await rs; await idle(page); await pause(500);
            fact('step3-payments-save', r ? r.status() : null);
            await snap('setup-payments-saved');

            if (full) {
            const issues = new IssuesAdmin(page, cp);                                                     // 4
            await issues.goto('Back Issues');
            const win = await issues.openManagement('Back Issues', ISSUE);
            const form = await win.openAccess();
            await form.locator('select#accessStatus').selectOption({label: 'Subscription'});
            rs = page.waitForResponse((x) => /update-access/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
            await form.getByRole('button', {name: 'Save', exact: true}).click();
            r = await rs; await idle(page); await pause(500);
            fact('step4-access-save', r ? r.status() : null);
            await snap('setup-issue-access');
            await win.close().catch(() => {});
            }

            const payments = new PaymentsPage(page, cp);                                                  // 5-6
            const types = [[TYPE_IND, '10', 'Individual (users are validated via login)'], [TYPE_INST, '100', 'Institutional (users are validated via domain or IP address)']];
            for (const [name, cost, kind] of full ? types : types.slice(1)) {
                await payments.gotoTab('Subscription Types');
                const type = await payments.openCreateType();
                await type.fill({name, currency: 'USD', cost, format: 'Online', duration: '12'});
                await type.kindRadio(kind).check();
                fact(`step5-6-type-${cost}`, (await type.saveAccepted()).status());
            }
            await snap('setup-types');

            const inst = new InstitutionsPage(page, cp);                                                  // 7
            await inst.openFromSideMenu().catch(async (e) => { fact('step7-side-menu', String(e).slice(0, 200)); await inst.goto(); });
            const panel = await inst.openAdd();
            await panel.nameBox('en').fill(INSTITUTION);
            if (!domainOnly) await panel.ipRangesBox.fill(RANGES.join('\n'));
            fact('step7-institution-save', (await panel.saveAccepted({refetch: true})).status());
            await snap('setup-institution');

            for (const tab of full ? ['Individual Subscriptions', 'Institutional Subscriptions'] : ['Institutional Subscriptions']) { // 8-9
                await payments.gotoTab(tab);
                const sw = await payments.openCreateSubscription(tab);
                await sw.chooseUser(READER, readerId);
                await sw.chooseType(tab.startsWith('Ind') ? TYPE_IND : TYPE_INST);
                await sw.chooseStatus('Active');
                if (!tab.startsWith('Ind')) await sw.chooseInstitution(INSTITUTION);
                if (!tab.startsWith('Ind') && domainOnly) await sw.domainBox().fill(DOMAIN);
                await sw.typeDate('dateStart', iso(today));
                await sw.typeDate('dateEnd', iso(nextYear));
                fact(`step8-9-${tab}`, (await sw.saveAccepted()).status());
                await payments.gotoTab(tab);
                fact(`step8-9-${tab}-row`, (await payments.rows(tab).allInnerTexts()).map((t) => flat(t, 300)));
                await snap(`setup-${tab.split(' ')[0].toLowerCase()}`);
            }
            stored('setup');
            institutions('setup');
            await signOut(page);                                                                          // 10

            // ------------------------------------------------------------ steps 11-12: the reader, before
            await signIn(page, READER, {contextPath: cp});                                                 // 11
            if (full) await openPdf('step11-pdf-before');
            facts.before = await readMine('step12-my-subscriptions-before');                               // 12
        }
        const ids = {
            individual: facts.before ? idFrom(facts.before.individual) : null,
            institutional: facts.before ? idFrom(facts.before.institutional) : null,
        };
        fact('subscriptionIds', ids);

        // ------------------------------------------------------------ steps 13-16: "Purchase" on the active individual subscription
        if (parts.includes('individual')) {
            const s13 = await pressOrOpen('step13-purchase-individual', my.individualPart(), 'Purchase', ids.individual && `${ctx}/user/purchaseSubscription/individual/${ids.individual}`);
            const onForm = await purchase.form().count();
            if (onForm) {
                fact('step13-form', {legend: flat(await purchase.legend().innerText().catch(() => null)), selectedType: flat(await purchase.selectedType().innerText().catch(() => null)), button: flat(await purchase.submitButton().innerText().catch(() => null))});
                const out = await press('step14-save', purchase.submitButton());                         // 14
                out.pageText = flat(await page.locator('.pkp_structure_main').innerText().catch(() => ''), 600);
                await snap('step14-save', {walk: out});
                fact('step14-save', out);
            } else {
                fact('step13-form', {absent: true, s13});
            }
            stored('step14');
            facts.afterIndividual = await readMine('step15-my-subscriptions');                               // 15
            await openPdf('step16-pdf-after');                                                             // 16
        }

        // ------------------------------------------------------------ steps 17-20: "Purchase" on the active institutional subscription
        if (parts.includes('institutional')) {
            if (!parts.includes('individual')) await readMine('step17-my-subscriptions');
            else await my.goto();
            const s17 = await pressOrOpen('step17-purchase-institutional', my.institutionalPart(), 'Purchase', ids.institutional && `${ctx}/user/purchaseSubscription/institutional/${ids.institutional}`);
            if (await purchase.form().count()) {
                const read = async () => ({
                    institutionName: await purchase.institutionNameBox().inputValue().catch(() => null),
                    domain: await purchase.domainBox().inputValue().catch(() => null),
                    ipRanges: await purchase.ipRangesBox().inputValue().catch(() => null),
                    button: flat(await purchase.submitButton().innerText().catch(() => null)),
                    errors: flat(await purchase.errors().innerText().catch(() => null)),
                });
                fact('step17-form', await read());
                const s18 = await press('step18-continue', purchase.submitButton());                     // 18
                s18.form = await purchase.form().count() ? await read() : null;
                s18.pageText = flat(await page.locator('.pkp_structure_main').innerText().catch(() => ''), 600);
                await snap('step18-continue', {walk: s18});
                fact('step18-continue', s18);
                if (s18.form) {                                                                            // 19: refused; retype the ranges
                    await purchase.ipRangesBox().fill(domainOnly ? '' : RANGES.join('\n'));
                    const s19 = await press('step19-continue', purchase.submitButton());
                    s19.form = await purchase.form().count() ? await read() : null;
                    s19.pageText = flat(await page.locator('.pkp_structure_main').innerText().catch(() => ''), 600);
                    await snap('step19-continue', {walk: s19});
                    fact('step19-continue', s19);
                } else {
                    fact('step19-continue', 'not needed: step 18 was accepted');
                }
            } else {
                fact('step17-form', {absent: true, s17});
            }
            stored('step19');
            institutions('step19');
            facts.afterInstitutional = await readMine('step20-my-subscriptions');                           // 20
        }

        // ------------------------------------------------------------ step 21: the manager's lists
        if (parts.includes('manager')) {
            await signIn(page, 'rvaca', {contextPath: cp});                                                // 21
            const payments = new PaymentsPage(page, cp);
            for (const tab of ['Individual Subscriptions', 'Institutional Subscriptions']) {
                await payments.gotoTab(tab);
                const rows = [];
                for (const row of await payments.rows(tab).all()) rows.push(await row.locator('> td').allInnerTexts().then((c) => c.map((t) => flat(t, 120))));
                fact(`step21-${tab}`, rows);
                await snap(`step21-${tab.split(' ')[0].toLowerCase()}`);
            }
            await signOut(page);
        }

        // ------------------------------------------------------------ the manager records the manual payment
        if (parts.includes('record')) {
            await signIn(page, 'rvaca', {contextPath: cp});
            const payments = new PaymentsPage(page, cp);
            const tab = 'Individual Subscriptions';
            await payments.gotoTab(tab);
            const win = await payments.openEditSubscription(tab, READER);
            const shown = {
                status: flat(await win.statusSelect().locator('option:checked').innerText().catch(() => null)),
                start: await win.dateBox('dateStart').inputValue().catch(() => null),
                end: await win.dateBox('dateEnd').inputValue().catch(() => null),
            };
            fact('record-edit-window', shown);
            await snap('record-edit-window');
            await win.chooseStatus('Active');
            fact('record-save', (await win.saveAccepted()).status());
            await payments.gotoTab(tab);
            fact('record-row', (await payments.rows(tab).allInnerTexts()).map((t) => flat(t, 300)));
            await payments.gotoTab('Payments');
            fact('record-payments-tab', flat(await payments.panel('Payments').innerText().catch(() => null), 800));
            await snap('record-payments-tab');
            stored('record');
            fact('record-payment-records', {
                queued: sql(app, 'SELECT COUNT(*) FROM queued_payments'),
                completed: sql(app, 'SELECT COUNT(*) FROM completed_payments'),
            });
            await signIn(page, READER, {contextPath: cp});
            await readMine('record-my-subscriptions');
            await openPdf('record-pdf');
        }

        // ------------------------------------------------------------ the neighbours (fix checks)
        if (parts.includes('neighbour')) {
            const renew = await pressOrOpen('neighbour-renew-individual', my.individualPart(), 'Renew', null);
            renew.pageText = flat(await page.locator('.pkp_structure_main').innerText().catch(() => ''), 600);
            fact('neighbour-renew-individual', renew);
            stored('neighbour-renew');
            await readMine('neighbour-my-subscriptions-after-renew');
            await my.goto();
            const link = my.purchaseLink(my.institutionalPart());
            const out = await press('neighbour-purchase-new-institutional', link);
            out.form = {
                institutionName: await purchase.institutionNameBox().inputValue().catch(() => null),
                ipRanges: await purchase.ipRangesBox().inputValue().catch(() => null),
            };
            await snap('neighbour-purchase-new-institutional', {walk: out});
            fact('neighbour-purchase-new-institutional', out);
            await purchase.typeSelect().selectOption({index: 0}).catch(() => {});
            await purchase.institutionNameBox().fill(`Dock Library ${TAG}`);
            await purchase.ipRangesBox().fill(RANGES.join('\n'));
            const cont = await press('neighbour-purchase-new-continue', purchase.submitButton());
            cont.form = await purchase.form().count() ? {errors: flat(await purchase.errors().innerText().catch(() => null)), ipRanges: await purchase.ipRangesBox().inputValue().catch(() => null)} : null;
            cont.pageText = flat(await page.locator('.pkp_structure_main').innerText().catch(() => ''), 600);
            await snap('neighbour-purchase-new-continue', {walk: cont});
            fact('neighbour-purchase-new-continue', cont);
            stored('neighbour-purchase-new');
            await readMine('neighbour-my-subscriptions-after-new');
        }
    } catch (e) {
        fact('error', String(e && e.stack || e).slice(0, 1500));
        await snap('error').catch(() => {});
        throw e;
    } finally {
        record(`${label}-facts`, facts);
        await close();
    }
}

module.exports = {walk};
