// Issue report docs/issues/U64-A3-counter-report-date-refusal-raw-code.md (U64 A3): the report's
// Steps to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"), as the dataset's `dbarnes`. The kit builds nothing and no SQL runs.
//
// Default mode, the Steps (OJS, OMP, OPS):
//   1. sign in as `dbarnes`
//   2. Statistics › "Counter R5"
//   3. "Edit" on "Platform Master Report (PR)": "Report Settings", its two dates and their lines
//   4. "Start Date" 2001-01, "Download": the message under "Start Date"
//   5. "Close", "Edit" on the same report again, "End Date" 2099-01, "Download": the message under "End Date"
// `neighbour` as the argument (the fix in and out; runs alone): refusals the fix must leave alone
//   N1 the window as it opens on a fresh install (its start is after its end), "Download"
//   N2 "Close", "Edit" again, "Start Date" 2026/07/01, "Download": the format message
// `reach` as the argument (OJS `main` only; runs alone): the second caller of the same value lookup
//   R1 Settings › Website › "Plugins": tick "Crossref Manager Plugin"
//   R2 DOIs › "Setup": "DOI Prefix" 10.1234, "Save"
//   R3 DOIs › "Registration": Crossref, depositor name and email, tick "Enable Cited-by",
//      "Username" left empty, "Save": the message under "Username"
// Each step records the state it finds rather than throwing, so the same script reads the fix.
//
// Reset first:  npm run fleet-prep -- --feature issues-u64i --dataset 9 --reset
// Run (main):   PROBE_FEATURE=issues-u64i PROBE_AGENT=u64i node bin/probe.js all shared/playwright/checks/issues/counter-report-date-refusal-raw-code/walk.js [neighbour|reach]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u64i-3_5 --dataset 9 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u64i-3_5 PROBE_AGENT=u64i node bin/probe.js all shared/playwright/checks/issues/counter-report-date-refusal-raw-code/walk.js
// Facts: .reports/<feature>/u64i/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('../counter-report-tsv-comma-separated/lib');
const {openCounterR5} = require('../section-editor-counter-r5-error-while-restricted/lib');

const MODE = process.argv.includes('neighbour') ? 'neighbour' : process.argv.includes('reach') ? 'reach' : 'steps';
const PR = 'Platform Master Report (PR)';

/** The two date boxes of the open window: value, the line under each, the refusal under each. */
async function readDates(dialog) {
    const out = {};
    for (const name of ['begin_date', 'end_date']) {
        const box = dialog.locator(`input[name="${name}"]`);
        out[name] = await box.evaluate((el) => {
            const flat = (t) => (t || '').replace(/\s+/g, ' ').trim();
            const field = el.closest('.pkpFormField');
            return {
                value: /** @type {HTMLInputElement} */ (el).value,
                line: field ? flat((field.querySelector('.pkpFormField__description') || {}).textContent) : null,
                errors: field ? [...field.querySelectorAll('.pkpFieldError__message')].map((m) => flat(m.textContent)) : [],
            };
        }).catch((e) => ({error: L.flat(e.message, 200)}));
    }
    return out;
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    if (MODE === 'reach' && app.name !== 'ojs') {
        console.log(`[walk] ${app.name}: reach is the OJS Crossref plugin's form; skipped`);
        return;
    }
    const ctx = app.contextPath;
    const facts = {app: app.name, mode: MODE, line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null};
    const {page, close} = await launch(app);
    const bad = [];
    page.on('response', (r) => r.status() >= 500 && bad.push(`${r.status()} ${L.rel(r.url())}`));
    page.on('pageerror', (e) => bad.push(`pageerror ${L.flat(e.message, 200)}`));
    try {
        await signIn(page, 'dbarnes'); // 1
        if (MODE === 'reach') {
            const {DoiSettings} = require('../../../pages/DoisPages.js');
            const settings = new DoiSettings(page, ctx);
            facts.r1 = await L.attempt(async () => {
                await settings.gotoPlugins('crossrefplugin');
                await settings.setPluginEnabled('crossrefplugin', true);
                return {ticked: await settings.pluginBox('crossrefplugin').isChecked()};
            });
            facts.r2 = await L.attempt(async () => {
                await settings.goto('Setup');
                await settings.prefixBox().fill('10.1234');
                return {status: (await settings.save(settings.setup)).status()};
            });
            facts.r3 = await L.attempt(async () => {
                await settings.goto('Registration');
                await settings.chooseAgency('Crossref');
                await settings.field('depositorName').waitFor({timeout: L.T});
                await settings.field('depositorName').fill('Public Knowledge Project');
                await settings.field('depositorEmail').fill('dbarnes@mailinator.com');
                await settings.registration.getByRole('checkbox', {name: /^Enable Crossref Cited-by/}).check();
                const r = await settings.pressSave(settings.registration);
                await idle(page);
                record('reach-registration-save', await screen(page));
                await shot(page, 'reach-registration-save').catch(() => {});
                return {
                    status: r.status(),
                    body: L.flat(await r.text().catch(() => null), 600),
                    errors: (await settings.registration.locator('.pkpFormField__error, [id$="-error"]').allInnerTexts().catch(() => [])).map((s) => L.flat(s, 300)).filter(Boolean),
                };
            });
            return;
        }
        // 2
        facts.opened = await L.attempt(() => openCounterR5(page, app, ctx));
        // One "Download" in the open window: the request's answer and what the two fields show.
        const download = async (dialog, tag) => {
            const got = await L.pressDownload(page, dialog, {wait: 6000});
            record(tag, await screen(page));
            await shot(page, tag).catch(() => {});
            return {request: got.request, status: got.status, file: got.file && got.file.name, windowOpen: got.windowOpen, fields: got.windowOpen ? await readDates(dialog) : null};
        };
        const type = async (dialog, name, value) => {
            await dialog.locator(`input[name="${name}"]`).fill(value);
            await dialog.locator(`input[name="${name}"]`).blur();
        };
        // 3
        const win = await L.editReport(page, PR);
        facts.window = {title: win.title, fields: await readDates(win.dialog)};
        record(`window-${MODE}`, await screen(page));
        if (MODE === 'steps') {
            // 4
            await type(win.dialog, 'begin_date', '2001-01');
            facts.step4 = await L.attempt(() => download(win.dialog, 'step4-start-too-early'));
            // 5: "Download" stays greyed while "Start Date" holds its error, so the window is opened afresh
            await L.closeWindow(page, win.dialog);
            const again = await L.editReport(page, PR);
            await type(again.dialog, 'end_date', '2099-01');
            facts.step5 = await L.attempt(() => download(again.dialog, 'step5-end-too-late'));
            await L.closeWindow(page, again.dialog);
        } else {
            // N1
            facts.n1 = await L.attempt(() => download(win.dialog, 'n1-as-opened'));
            // N2: "Download" stays greyed while "End Date" holds N1's error, so the window is opened afresh
            await L.closeWindow(page, win.dialog);
            const again = await L.editReport(page, PR);
            await type(again.dialog, 'begin_date', '2026/07/01');
            facts.n2 = await L.attempt(() => download(again.dialog, 'n2-wrong-format'));
            await L.closeWindow(page, again.dialog);
        }
        await L.closeWindow(page, win.dialog);
    } catch (e) {
        facts.error = L.flat(e.message, 400);
    } finally {
        facts.failures = bad;
        console.log(JSON.stringify(facts, null, 1));
        record('facts', facts);
        await close();
    }
});
