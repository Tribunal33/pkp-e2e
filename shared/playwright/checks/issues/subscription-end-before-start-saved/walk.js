// Issue report walk: docs/issues/U51-A21-subscription-end-before-start-saved.md
// (spec U51 register A21). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// OJS only (OMP and OPS have no subscriptions):
//   step 1      sign in as the journal manager `rvaca`;
//   steps 2-3   the journal requires subscriptions; "Vol. 1 No. 2 (2014)" set
//               to "Subscription";
//   step 4      the individual type "Online Year u51w16";
//   steps 5-6   "Individual Subscriptions" › "Create New Subscription": Carlo
//               Corino, the type, "Active", start 2026-09-01, end 2026-08-31;
//               "Save" (accepted or refused, recorded) and the list;
//   steps 7-8   as `ccorino`, submission 17's page, "PDF" pressed: where it lands;
//   steps 9-10  (only when step 6 saved) the manager edits the end date to
//               2027-08-31; `ccorino` presses "PDF" again (the control);
//   steps 11-12 an institution and an institutional type, then an
//               institutional subscription with the same reversed dates.
// Step numbers are the report's. The kit builds nothing. Every screen is
// recorded with screen(); the posted dates, the window's messages, the list,
// the stored rows and the fleet's server-log errors go into the facts.
//
// Arguments (after the script):
//   (none)      the Steps.
//   neighbour   the fix check, after step 4: a subscription whose start and end
//               are the same day is saved; its "Edit", saved unchanged, is
//               saved; a start after the end on "Edit" is refused (with the fix)
//               or saved (without).
//
// Reset the fleet before each walk (the walk changes the dataset):
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset --apps ojs
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/subscription-end-before-start-saved/walk.js [neighbour]
//   (PKP_E2E_LINE=stable-3_5_0 … PROBE_RUN=r35 in front for 3.5)
// Trying the fix:
//   node bin/try-fix.js apply shared/playwright/checks/issues/subscription-end-before-start-saved/fix.diff ojs
//   … reset, walk (PROBE_RUN=fix), reset, walk neighbour … then node bin/try-fix.js revert ojs
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const MODE = process.argv[2] || 'steps';
if (!['steps', 'neighbour'].includes(MODE)) throw new Error(`unknown mode ${MODE}`);

const T = 30_000;
const TAG = 'u51w16';
const TYPE = `Online Year ${TAG}`;
const ITYPE = `Campus Year ${TAG}`;
const INST = `Harbour Library ${TAG}`;
const ISSUE = 'Vol. 1 No. 2 (2014)';
const SUB_MODE = 'The journal will require subscriptions to access some or all of its contents.';
const START = '2026-09-01';
const END_WRONG = '2026-08-31';
const END_RIGHT = '2027-08-31';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`[${app.name}] no subscriptions on this app; nothing to walk`); return; }
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const {PaymentsPage, AccessSettings} = require('../../../pages/SubscriptionsPages.js');
    const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
    const cp = app.contextPath;
    const ctx = `/index.php/${cp}/en`;
    const facts = {line: app.line || 'main', mode: MODE, dataset: app.dataset, saves: []};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const logFile = path.join(__dirname, '../../../../../apps/ojs/playwright/.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n')
                .filter((l) => /\[5\d\d\]|Fatal|Uncaught|PHP (Warning|Error)/.test(l)).map((l) => l.slice(0, 400)).slice(0, 8);
        } catch { return []; }
    };
    const userId = (u) => Number(sql(app, `SELECT user_id FROM users WHERE username = '${u}'`));
    const stored = () => sql(app, `SELECT u.username, t.institutional, s.status, s.date_start, s.date_end FROM subscriptions s JOIN users u ON u.user_id = s.user_id JOIN subscription_types t ON t.type_id = s.type_id ORDER BY s.subscription_id`);

    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${MODE}-${String(++n).padStart(2, '0')}-${name}`, {...s, ...extra}); return s; };
    const payments = new PaymentsPage(page, cp);

    let lastPost = null;
    page.on('request', (r) => {
        if (/subscriptions-grid\/update-subscription(\?|$)/.test(r.url()) && r.method() === 'POST') {
            const p = new URLSearchParams(r.postData() || '');
            lastPost = {dateStart: p.get('dateStart'), dateEnd: p.get('dateEnd'), userId: p.get('userId'), typeId: p.get('typeId')};
        }
    });

    /** "Save" in a subscription window, recorded: accepted (the window closes) or refused. */
    async function save(step, sw) {
        const from = logSize();
        lastPost = null;
        const response = await sw.save();
        await pause(500);
        const open = await sw.dialog.isVisible().catch(() => false);
        const text = open ? flat(await sw.dialog.innerText().catch(() => '')) : '';
        const out = {step, status: response.status(), posted: lastPost, accepted: !open,
            errors: open ? (text.match(/Errors occurred processing this form[^]*?(?=Individual Subscription|Institutional Subscription|User\b|$)/) || [''])[0].slice(0, 600) : null,
            fieldErrors: open ? (await sw.dialog.locator('.error, label.error, .pkp_form_error_list li').allInnerTexts()).map((t) => flat(t)).filter(Boolean) : [],
            notices: (await screen(page)).notices, log: logSince(from)};
        await snap(`step${step}-save`, {walk: out});
        facts.saves.push(out);
        console.log(`[${app.name}] step ${step}: ${JSON.stringify(out)}`);
        return out;
    }

    /** As the signed-in user, press "PDF" on submission 17's page: where it lands. */
    async function pressPdf(name) {
        const from = logSize();
        await page.goto(app.url(`${ctx}/article/view/17`));
        await idle(page);
        const link = page.locator('.pkp_structure_main a.obj_galley_link').filter({hasText: /PDF/}).first();
        const linkText = flat(await link.innerText());
        const nav = page.waitForNavigation({waitUntil: 'load', timeout: 15_000}).catch(() => null);
        await link.click();
        const resp = await nav;
        await idle(page).catch(() => {});
        await pause(300);
        const out = {linkText, status: resp ? resp.status() : null, landed: page.url().replace(app.baseURL, ''),
            title: await page.title(), viewer: await page.locator('iframe').count(),
            heading: flat(await page.locator('.pkp_structure_main h1, .pkp_structure_main h2').first().innerText({timeout: 1500}).catch(() => ''), 200),
            log: logSince(from)};
        await snap(name, {walk: out});
        fact(name, out);
        return out;
    }

    async function createType(name, cost, kind) {
        await payments.gotoTab('Subscription Types');
        const type = await payments.openCreateType();
        await type.fill({name, currency: 'USD', cost, format: 'Online', duration: '12'});
        await type.kindRadio(kind).check();
        return (await type.saveAccepted()).status();
    }

    try {
        await signIn(page, 'rvaca', {contextPath: cp});                                                    // 1

        if (MODE === 'steps') {
            const access = new AccessSettings(page, cp);                                                    // 2
            await access.goto();
            await access.modeRadio(SUB_MODE).check();
            fact('step2-access-save', (await access.save()).status());

            const issues = new IssuesAdmin(page, cp);                                                      // 3
            await issues.goto('Back Issues');
            const win = await issues.openManagement('Back Issues', ISSUE);
            const form = await win.openAccess();
            await form.locator('select#accessStatus').selectOption({label: 'Subscription'});
            const ra = page.waitForResponse((x) => /update-access|updateAccess/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
            await form.getByRole('button', {name: 'Save', exact: true}).click();
            const r3 = await ra; await idle(page); await pause(500);
            fact('step3-issue-access-save', r3 ? r3.status() : null);
            await win.close().catch(() => {});
        }

        fact('step4-type', await createType(TYPE, '10', 'Individual (users are validated via login)'));   // 4

        if (MODE === 'steps') {
            await payments.gotoTab('Individual Subscriptions');                                             // 5
            const sw = await payments.openCreateSubscription('Individual Subscriptions');
            await sw.chooseUser('ccorino', userId('ccorino'));
            await sw.chooseType(TYPE);
            await sw.chooseStatus('Active');
            await sw.typeDate('dateStart', START);
            await sw.typeDate('dateEnd', END_WRONG);
            const s6 = await save('6', sw);                                                                  // 6
            if (!s6.accepted) await sw.close().catch(() => {});
            await payments.gotoTab('Individual Subscriptions');
            fact('step6-list', (await payments.rows('Individual Subscriptions').allInnerTexts()).map((t) => flat(t, 300)));
            fact('step6-stored', stored());
            await snap('step6-list');

            await signOut(page);                                                                             // 7
            await signIn(page, 'ccorino', {contextPath: cp});
            await pressPdf('step8-ccorino-pdf');                                                             // 8

            if (s6.accepted) {                                                                               // 9
                await signOut(page);
                await signIn(page, 'rvaca', {contextPath: cp});
                await payments.gotoTab('Individual Subscriptions');
                const ew = await payments.openEditSubscription('Individual Subscriptions', 'Corino');
                await ew.typeDate('dateEnd', END_RIGHT);
                fact('step9-edit', (await save('9', ew)).accepted);
                fact('step9-stored', stored());
                await signOut(page);                                                                         // 10
                await signIn(page, 'ccorino', {contextPath: cp});
                await pressPdf('step10-ccorino-pdf');
            }
            await signOut(page);

            // 11-12: institutional.
            await signIn(page, 'rvaca', {contextPath: cp});                                                  // 11
            const {InstitutionsPage} = require('../../../pages/InstitutionsPages.js');
            const inst = new InstitutionsPage(page, cp);
            await inst.goto();
            const ip = await inst.openAdd();
            await ip.nameBox('en').fill(INST);
            await ip.ipRangesBox.fill('192.0.2.0/24');
            fact('step11-institution', (await ip.saveAccepted({refetch: true})).status());
            fact('step11-type', await createType(ITYPE, '100', 'Institutional (users are validated via domain or IP address)'));
            await payments.gotoTab('Institutional Subscriptions');                                          // 12
            const iw = await payments.openCreateSubscription('Institutional Subscriptions');
            await iw.chooseUser('ccorino', userId('ccorino'));
            await iw.chooseType(ITYPE);
            await iw.chooseStatus('Active');
            await iw.chooseInstitution(INST);
            await iw.typeDate('dateStart', START);
            await iw.typeDate('dateEnd', END_WRONG);
            const s12 = await save('12', iw);
            if (!s12.accepted) await iw.close().catch(() => {});
            await payments.gotoTab('Institutional Subscriptions');
            fact('step12-list', (await payments.rows('Institutional Subscriptions').allInnerTexts()).map((t) => flat(t, 300)));
            fact('step12-stored', stored());
            await snap('step12-list');
        } else {
            // n1: start and end on the same day: saved.
            await payments.gotoTab('Individual Subscriptions');
            const sw = await payments.openCreateSubscription('Individual Subscriptions');
            await sw.chooseUser('ccorino', userId('ccorino'));
            await sw.chooseType(TYPE);
            await sw.chooseStatus('Active');
            await sw.typeDate('dateStart', START);
            await sw.typeDate('dateEnd', START);
            const n1 = await save('n1', sw);
            if (!n1.accepted) await sw.close().catch(() => {});
            // n2: its "Edit", saved unchanged: saved.
            await payments.gotoTab('Individual Subscriptions');
            const ew = await payments.openEditSubscription('Individual Subscriptions', 'Corino');
            const n2 = await save('n2', ew);
            if (!n2.accepted) await ew.close().catch(() => {});
            // n3: "Edit", start moved after the end: refused with the fix.
            await payments.gotoTab('Individual Subscriptions');
            const ew2 = await payments.openEditSubscription('Individual Subscriptions', 'Corino');
            await ew2.typeDate('dateStart', '2026-09-02');
            const n3 = await save('n3', ew2);
            if (!n3.accepted) await ew2.close().catch(() => {});
            fact('neighbour', {sameDaySaved: n1.accepted, editUnchangedSaved: n2.accepted, editReversedSaved: n3.accepted, n3errors: n3.errors});
            fact('neighbour-stored', stored());
        }
    } finally {
        record('facts', facts);
        await close();
    }
});
