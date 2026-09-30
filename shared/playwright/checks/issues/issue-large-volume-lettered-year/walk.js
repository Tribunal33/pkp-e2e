// Issue report walk: docs/issues/U50-A5-A6-issue-large-volume-lettered-year.md
// (spec U50 register A5, A6). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// signed in as the dataset's editor `dbarnes` on `publicknowledge`; the kit
// builds nothing, every issue is created on screen. Records every screen with
// screen(); after each save it reads the `issues` row the save wrote and the
// server log's new SQLSTATE lines (evidence only, not steps). OJS only (issues
// are an OJS surface). Reset the fleet before each walk: the walk adds issues.
//
//   PHASE=steps (default)  Steps 1-8: Volume 99999, then Year "20a6"
//   PHASE=neighbour        what fix.diff must leave alone, walked with the fix in
//                          and out: Volume 32767 with Year 2026 saves; Volume
//                          "abc" is refused with the Volume message; Year left
//                          empty with "Year" unticked saves
//
// Run (main, then stable-3_5_0):
//   npm run fleet-prep -- --feature issues-w20 --dataset 2 --reset
//   PROBE_FEATURE=issues-w20 PROBE_AGENT=w20 node bin/probe.js ojs shared/playwright/checks/issues/issue-large-volume-lettered-year/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w20-3_5 --dataset 2 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w20-3_5 PROBE_AGENT=w20 node bin/probe.js ojs shared/playwright/checks/issues/issue-large-volume-lettered-year/walk.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');

const T = 20_000;
const PHASE = process.env.PHASE || 'steps';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // no issues on a press or a preprint server
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const facts = {phase: PHASE, line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const issues = () => sql(app, 'SELECT issue_id, volume, number, year, show_volume, show_number, show_year, show_title FROM issues ORDER BY issue_id');
    const logFile = path.join(__dirname, '../../../../../apps/ojs/playwright/.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            const buf = fs.readFileSync(logFile).subarray(from).toString('utf8');
            return buf.split('\n').filter((l) => /SQLSTATE|ERROR/.test(l)).map((l) => l.replace(/^.*?(production\.ERROR|SQLSTATE)/, '$1').slice(0, 400));
        } catch { return [`(no log at ${logFile})`]; }
    };
    const {page, close} = await launch(app);
    let n = 0;
    async function snap(name) {
        const s = await screen(page);
        const file = `${PHASE === 'steps' ? '' : 'n-'}${String(++n).padStart(2, '0')}-${name}`;
        record(file, s);
        await shot(page, file).catch(() => {});
        return s;
    }
    const top = () => page.locator('[role="dialog"]:visible').last();
    const form = () => page.locator('form#issueForm');
    const futureRows = async () => (await page.locator('tr.gridRow').filter({visible: true}).allInnerTexts()).map((x) => x.replace(/\s+/g, ' ').trim());

    // Step 2: Issues, on the "Future Issues" tab
    async function land() {
        await page.goto(app.url(`/index.php/${app.contextPath}/manageIssues`));
        await idle(page);
        const tab = page.getByRole('tab', {name: 'Future Issues'});
        if (await tab.count()) { await tab.first().click(); await idle(page); }
        await page.getByRole('link', {name: 'Create Issue', exact: true}).first().waitFor({timeout: T});
    }
    // Steps 3-5 (6-8): "Create Issue", fill the boxes, untick "Title", "Save"
    async function create(values, name) {
        await page.getByRole('link', {name: 'Create Issue', exact: true}).first().click();
        await form().locator('input[name="volume"]').waitFor({timeout: T});
        await idle(page); await pause(300);
        await snap(`${name}-window`);
        for (const [field, value] of Object.entries(values.boxes)) {
            await form().locator(`input[name="${field}"]`).fill(value);
        }
        for (const [field, on] of Object.entries(values.ticks || {})) {
            const box = form().locator(`input[type="checkbox"][name="${field}"]`);
            if ((await box.isChecked()) !== on) await box.click();
        }
        const typed = {};
        for (const field of Object.keys(values.boxes)) typed[field] = await form().locator(`input[name="${field}"]`).inputValue();
        const from = logSize();
        const resp = page.waitForResponse((r) => /update-issue/.test(r.url()) && r.request().method() === 'POST', {timeout: 30_000}).catch(() => null);
        await form().getByRole('button', {name: 'Save', exact: true}).click();
        const r = await resp;
        await idle(page); await pause(1500); await idle(page);
        const out = {typed, status: r ? r.status() : null, request: r ? r.url().replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '') : null};
        out.windowOpen = await form().isVisible().catch(() => false);
        if (out.windowOpen) {
            await form().locator('.error, .pkp_form_error, label.error').filter({visible: true}).first().waitFor({timeout: 5000}).catch(() => {});
            out.formErrors = (await form().locator('.error, label.error, .pkp_form_error').filter({visible: true}).allInnerTexts().catch(() => [])).map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
        }
        const s = await snap(`${name}-saved`);
        out.notices = (s.notices || []).map((x) => (typeof x === 'string' ? x : x.text || JSON.stringify(x)));
        out.serverLog = logSince(from);
        if (out.windowOpen) {
            await form().getByRole('link', {name: 'Cancel', exact: true}).first().click().catch(() => {});
            await idle(page); await pause(800);
        }
        out.futureRows = await futureRows();
        await snap(`${name}-list`);
        out.issuesTable = issues();
        return out;
    }

    try {
        await signIn(page, 'dbarnes');                                   // step 1
        await idle(page);
        await land();                                                    // step 2
        fact('before', {futureRows: await futureRows(), issuesTable: issues()});
        if (PHASE === 'steps') {
            fact('steps 3-5 volume 99999', await create(
                {boxes: {volume: '99999', number: '1', year: '2026'}, ticks: {showTitle: false}}, 'step5'));
            fact('steps 6-8 year 20a6', await create(
                {boxes: {volume: '3', number: '1', year: '20a6'}, ticks: {showTitle: false}}, 'step8'));
            // control: letters in "Volume"
            fact('control volume abc', await create(
                {boxes: {volume: 'abc', number: '1', year: '2026'}, ticks: {showTitle: false}}, 'control-abc'));
        } else {
            fact('N1 volume 32767', await create(
                {boxes: {volume: '32767', number: '1', year: '2026'}, ticks: {showTitle: false}}, 'n1'));
            fact('N2 volume abc', await create(
                {boxes: {volume: 'abc', number: '2', year: '2026'}, ticks: {showTitle: false}}, 'n2'));
            fact('N3 year empty, unticked', await create(
                {boxes: {volume: '4', number: '1', year: ''}, ticks: {showTitle: false, showYear: false}}, 'n3'));
        }
    } finally {
        record(PHASE === 'steps' ? 'walk' : 'neighbour', facts);
        await close();
    }
});
