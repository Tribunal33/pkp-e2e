// Issue report walk: docs/issues/U44-OJS3-issue-publisher-id-not-kept.md
// (spec U44 register OJS3). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// signed in as the dataset's editor `dbarnes` on `publicknowledge`; the kit
// builds nothing, every change is made on screen. Records every screen with
// screen(); after each save it reads issue_settings for the stored value
// (evidence only, not a step). OJS only (issues are an OJS surface). Reset the
// fleet before each walk: the walk changes a setting and the issues.
//
//   PHASE=steps (default)  Steps 1-7, then the control (12345 refused)
//   PHASE=neighbour        what fix.diff must do and leave alone, walked with the
//                          fix in and out: N1 the same Publisher ID typed on the
//                          other issue (refused as a duplicate once values are
//                          kept); N2 the issue's "Issue Data" tab saved after its
//                          Publisher ID is stored leaves the Publisher ID in place
//
// Run (main, then stable-3_5_0):
//   npm run fleet-prep -- --feature issues-r8 --dataset 1 --reset
//   PROBE_FEATURE=issues-r8 PROBE_AGENT=r8 node bin/probe.js ojs shared/playwright/checks/issues/issue-publisher-id-not-kept/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-r8-3_5 --dataset 1 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r8-3_5 PROBE_AGENT=r8 node bin/probe.js ojs shared/playwright/checks/issues/issue-publisher-id-not-kept/walk.js
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');

const T = 20_000;
const PHASE = process.env.PHASE || 'steps';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const PID = 'u44r8-issue';
const FUTURE = {tab: 'Future Issues', title: 'Vol. 2 No. 1 (2015)', id: 2};
const BACK = {tab: 'Back Issues', title: 'Vol. 1 No. 2 (2014)', id: 1};

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // no issues on a press or a preprint server
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const facts = {phase: PHASE, line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const stored = (issueId) => sql(app, `SELECT setting_value FROM issue_settings WHERE issue_id = ${issueId} AND setting_name = 'pub-id::publisher-id'`) || null;
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
    const form = () => page.locator('form#publicIdentifiersForm');

    // Steps 2-3: Settings › Workflow › Submission › Metadata › Publisher ID › "Enable for Issues"
    async function enableIssueIds() {
        await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/workflow`));
        await idle(page);
        await page.locator('#metadata-button').click();
        await idle(page);
        const group = page.getByRole('group', {name: 'Publisher ID'});
        await group.waitFor({timeout: T});
        const box = group.getByRole('checkbox', {name: 'Enable for Issues', exact: true});
        const before = await box.isChecked();
        if (!before) await box.click();
        const f = page.locator('form').filter({has: group});
        await f.getByRole('button', {name: 'Save', exact: true}).click();
        const saved = await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: T}).then(() => true).catch(() => false);
        await idle(page);
        await snap('settings-metadata-saved');
        return {before, saved, groupText: (await group.innerText()).replace(/\s+/g, ' ').trim()};
    }
    // Steps 4-5 (and 7): Issues › <tab> › the issue's arrow › "Edit" › <window tab>
    async function openIssueTab(issue, windowTab) {
        await page.goto(app.url(`/index.php/${app.contextPath}/manageIssues`));
        await idle(page);
        const tab = page.getByRole('tab', {name: issue.tab});
        if (await tab.count()) { await tab.first().click(); await idle(page); }
        const row = page.locator('tr.gridRow').filter({hasText: issue.title}).filter({visible: true}).first();
        await row.waitFor({timeout: T});
        await row.locator('a.show_extras').click();
        await pause(300);
        await page.getByRole('link', {name: 'Edit', exact: true}).filter({visible: true}).first().click();
        await idle(page);
        const wtab = top().getByRole('tab', {name: windowTab, exact: true});
        await wtab.waitFor({timeout: T});
        const tabs = (await top().getByRole('tab').allInnerTexts()).map((x) => x.trim());
        await wtab.click();
        await idle(page); await pause(600); await idle(page);
        return tabs;
    }
    async function readIdentifiers() {
        await form().waitFor({timeout: T});
        const box = form().locator('input[name="publisherId"]');
        return {
            publisherIdBox: await box.count() ? await box.inputValue() : '(no box)',
            formText: (await form().innerText()).replace(/\s+/g, ' ').trim().slice(0, 400),
        };
    }
    // Press "Save" on a tab form and read what the window shows afterwards.
    async function save(formLoc, urlRe, name) {
        const resp = page.waitForResponse((r) => urlRe.test(r.url()) && r.request().method() === 'POST', {timeout: 30_000}).catch(() => null);
        await formLoc.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await resp;
        let body = null;
        if (r) body = await r.json().catch(() => null);
        await idle(page); await pause(1500); await idle(page);
        const out = {status: r ? r.status() : null, request: r ? r.url().replace(/^https?:\/\/[^/]+/, '') : null,
            answer: body ? {status: body.status, content: typeof body.content === 'string' ? `(${body.content.length} chars of form)` : body.content, event: body.event || null} : null};
        out.windowOpen = await top().isVisible().catch(() => false);
        out.formOpen = await formLoc.isVisible().catch(() => false);
        if (out.formOpen) {
            // the refusal arrives as a form-error notice fetched after the form re-renders
            await formLoc.locator('.notifyFormError, .pkp_notification').filter({visible: true}).first().waitFor({timeout: 8000}).catch(() => {});
            await idle(page);
            out.formText = (await formLoc.innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 500);
        }
        const s = await snap(name);
        out.notices = (s.notices || []).map((x) => (typeof x === 'string' ? x : x.text || JSON.stringify(x)));
        return out;
    }
    async function closeWindow() {
        if (!(await top().isVisible().catch(() => false))) return;
        const c = top().getByRole('button', {name: /^Close/}).first();
        if (await c.count()) await c.click().catch(() => {});
        await idle(page); await pause(800);
    }
    async function setPid(issue, value, name) {
        const tabs = await openIssueTab(issue, 'Identifiers');
        const before = await readIdentifiers();
        await snap(`${name}-identifiers`);
        await form().locator('input[name="publisherId"]').fill(value);
        const r = await save(form(), /update-identifiers/, `${name}-save`);
        const out = {windowTabs: tabs, before: before.publisherIdBox, typed: value, ...r, storedAfter: stored(issue.id)};
        if (r.formOpen) out.boxAfterSave = await form().locator('input[name="publisherId"]').inputValue().catch(() => null);
        await closeWindow();
        return out;
    }
    async function reopen(issue, name) {
        await openIssueTab(issue, 'Identifiers');
        const r = await readIdentifiers();
        await snap(name);
        await closeWindow();
        return r;
    }

    try {
        await signIn(page, 'dbarnes');                                    // step 1
        await idle(page);
        fact('steps 2-3 settings', await enableIssueIds());               // steps 2-3
        if (PHASE === 'steps') {
            fact('steps 4-6 save', await setPid(FUTURE, PID, 'step6'));   // steps 4-6
            fact('step 7 reopened', await reopen(FUTURE, 'step7-reopened')); // step 7
            fact('control 12345', await setPid(FUTURE, '12345', 'control-digits'));
            fact('stored at end (issue 2)', stored(FUTURE.id));
        } else {
            fact('N0 issue 2 takes the value', await setPid(FUTURE, PID, 'n0'));
            fact('N0 reopened', await reopen(FUTURE, 'n0-reopened'));
            // N2: the "Issue Data" tab saved leaves the Publisher ID in place
            await openIssueTab(FUTURE, 'Issue Data');
            const dataForm = page.locator('form#issueForm');
            await dataForm.waitFor({timeout: T});
            const d = await save(dataForm, /update-issue/, 'n2-issue-data-save');
            await closeWindow();
            fact('N2 Issue Data saved', {...d, storedAfter: stored(FUTURE.id), reopened: await reopen(FUTURE, 'n2-reopened')});
            // N1: the same value on the other issue
            fact('N1 same value on Vol. 1 No. 2', await setPid(BACK, PID, 'n1'));
            fact('N1 reopened', await reopen(BACK, 'n1-reopened'));
        }
    } finally {
        record(PHASE === 'steps' ? 'walk' : 'neighbour', facts);
        await close();
    }
});
