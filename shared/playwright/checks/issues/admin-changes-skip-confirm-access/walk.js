// U01 A13 walk (issue report docs/issues/U01-A13-admin-changes-skip-confirm-access.md).
// On PKP's default test dataset, with `[security] password_timeout = 1` written into the install's
// config (what the administrator sets in config.inc.php; every reset rewrites the config, so the
// script sets it itself and puts the file back at the end).
//   steps (default), as `admin`, one browser, two tabs:
//     1. sign in as admin
//     2. tab 1: Administration › Hosted Journals: "Confirm Access", the password, "Submit"
//     3. tab 1: "Create Journal" `sxx6 Journal` (path sxx6), "Save": the wizard opens
//     4. tab 1: Hosted Journals again: no password asked, both journals listed
//     5. tab 2: Site Settings › Site Setup › Security: no password asked
//     6. two minutes untouched (twice the window)
//     7. tab 2: "Minimum password length (characters)" 12, "Save"
//     8. tab 1: "sxx6 Journal" › "Remove" › "OK"
//     9. tab 1: "Create Journal" `sxx6 Second Journal` (path sxx6b), "Save"
//    10. "Confirm Access" (if asked): the password, "Submit"
//    11. reads: Hosted Journals' rows; Security's box
//   nb (the fix's neighbour check, run alone, fix in and out):
//     a. admin inside a confirmed window: Hosted Journals (confirm), "Create" `sxx6 Third …`
//        (sxx6c), Hosted Journals, "Remove" it, Site Settings' box 8 "Save": all go through
//     b. the gate on, the manager `rvaca`: Settings › Journal › "Masthead" "Save": "Saved"
//     c. the gate off (password_timeout = 0): admin, Hosted Journals opens with no password,
//        "Create" sxx6c, back, "Remove" it: both go through
// Every step records its result or its error and goes on.
//   Reset first: npm run fleet-prep -- --feature <feature> --dataset <n> --reset
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> [PROBE_RUN=<run>] node bin/probe.js all shared/playwright/checks/issues/admin-changes-skip-confirm-access/walk.js [nb]
// Facts: .reports/<feature>/<id>/a13-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, record, screen, serverLog} = require('../../../probe');
const L = require('./lib.js');

const mode = process.argv[2] || 'steps';
const WAIT_MS = 120_000;
const HOSTED = '/index.php/index/en/admin/contexts';
const SETTINGS = '/index.php/index/en/admin/settings';

async function step(facts, key, fn) {
    try {
        facts[key] = await fn();
    } catch (e) {
        facts[key] = {error: L.flat(String((e && e.message) || e), 400)};
    }
    console.log(`[fact] ${key}: ${JSON.stringify(facts[key]).slice(0, 1500)}`);
    return facts[key];
}

/** Open an Administration address; answer "Confirm Access" when it asks. */
async function openConfirming(page, app, address) {
    const r = await L.openAdmin(page, app, address);
    if (r.confirmAccess) r.answered = await L.answerConfirmAccess(page);
    return r;
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const facts = {app: app.name, line: app.line || 'main', mode};
    const log = serverLog(app);
    const from = log.mark();
    const cfg = L.setPasswordTimeout(app, 1);
    facts.config = {password_timeout: {before: cfg.before, now: 1}};
    const {page, close} = await launch(app);
    const pageErrors = [];
    try {
        if (mode === 'steps') {
            await step(facts, '1 sign in as admin', async () => {
                await signIn(page, 'admin');
                return {landed: L.path(page)};
            });
            await step(facts, '2 tab 1 Hosted Journals, Confirm Access', () => openConfirming(page, app, HOSTED));
            const first = L.scratch(app, 'first');
            await step(facts, '3 tab 1 Create first', () => L.createOnOpenPage(page, app, first));
            await step(facts, '4 tab 1 Hosted Journals again', async () => {
                const r = await L.openAdmin(page, app, HOSTED);
                return {...r, paths: r.confirmAccess ? null : await L.hostedPaths(page, app)};
            });
            const tab2 = await page.context().newPage();
            tab2.on('pageerror', (e) => pageErrors.push(L.flat(String(e), 300)));
            await step(facts, '5 tab 2 Site Settings Security', async () => {
                const r = await L.openAdmin(tab2, app, SETTINGS);
                return {...r, box: r.confirmAccess ? null : await L.readMinLength(tab2)};
            });
            const t0 = Date.now();
            await L.sleep(WAIT_MS);
            facts['6 waited ms'] = Date.now() - t0;
            await step(facts, '7 tab 2 Save minimum length 12', async () => {
                const r = await L.saveMinLength(tab2, 12);
                record('a13-7-security', await screen(tab2));
                return {...r, landed: L.path(tab2)};
            });
            await step(facts, '8 tab 1 Remove first', async () => {
                await page.bringToFront();
                const r = await L.removeOnOpenPage(page, app, first.path);
                record('a13-8-hosted', await screen(page));
                return r;
            });
            await step(facts, '9 tab 1 Create second', async () => {
                const r = await L.createOnOpenPage(page, app, L.scratch(app, 'second'));
                record('a13-9-after-create', await screen(page));
                return r;
            });
            await step(facts, '10 Confirm Access if asked', async () => {
                const shown = await L.confirmAccessShown(page);
                return shown ? {shown, answered: await L.answerConfirmAccess(page)} : {shown: null, landed: L.path(page)};
            });
            await step(facts, '11 read Hosted Journals', async () => {
                const r = await openConfirming(page, app, HOSTED);
                return {...r, paths: await L.hostedPaths(page, app)};
            });
            await step(facts, '11 read Security box', async () => {
                const r = await openConfirming(page, app, SETTINGS);
                return {...r, box: await L.readMinLength(page)};
            });
            await tab2.close().catch(() => {});
        } else if (mode === 'nb') {
            const third = L.scratch(app, 'third');
            await signIn(page, 'admin');
            await step(facts, 'a Hosted Journals, Confirm Access', () => openConfirming(page, app, HOSTED));
            await step(facts, 'a Create third in the window', () => L.createOnOpenPage(page, app, third));
            await step(facts, 'a Hosted Journals again', async () => {
                const r = await L.openAdmin(page, app, HOSTED);
                return {...r, paths: r.confirmAccess ? null : await L.hostedPaths(page, app)};
            });
            await step(facts, 'a Remove third in the window', () => L.removeOnOpenPage(page, app, third.path));
            await step(facts, 'a Site Settings Save 8 in the window', async () => {
                const r = await L.openAdmin(page, app, SETTINGS);
                return {...r, save: r.confirmAccess ? null : await L.saveMinLength(page, 8)};
            });
            await step(facts, 'b manager rvaca Masthead Save', async () => {
                await signIn(page, 'rvaca', {contextPath: app.contextPath});
                await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/context`));
                const name = page.locator('[id="masthead-name-control-en"]');
                await name.waitFor({timeout: L.T});
                const form = name.locator('xpath=ancestor::form[1]');
                const answered = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() === 'POST', {timeout: L.T});
                await form.getByRole('button', {name: 'Save', exact: true}).click();
                const r = await answered;
                await page.waitForTimeout(800);
                return {
                    status: r.status(),
                    landed: L.path(page),
                    formStatus: L.flat(await form.locator('.pkpFormPage__status').allInnerTexts().then((a) => a.join(' | ')), 200),
                };
            });
            L.setPasswordTimeout(app, 0);
            facts.config.password_timeout.c = 0;
            await step(facts, 'c gate off: admin Hosted Journals', async () => {
                await signIn(page, 'admin');
                return L.openAdmin(page, app, HOSTED);
            });
            await step(facts, 'c gate off: Create third', () => L.createOnOpenPage(page, app, third));
            await step(facts, 'c gate off: Remove third', async () => {
                const r = await L.openAdmin(page, app, HOSTED);
                return {...r, remove: await L.removeOnOpenPage(page, app, third.path)};
            });
        } else {
            throw new Error(`unknown mode ${mode}`);
        }
    } finally {
        facts.pageErrorsTab2 = pageErrors;
        facts.serverLog = log.since(from).map((l) => L.flat(l, 400)).slice(0, 12);
        record(`a13-${mode}`, facts);
        cfg.restore();
        await close();
    }
});
