// Issue report walk: docs/issues/U44-OJS1-new-issue-galley-publisher-id-save-error.md
// (spec U44 register OJS1). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// signed in as the dataset's editor `dbarnes` on `publicknowledge`; the kit
// builds nothing, every change is made on screen. Records every screen with
// screen(). OJS only (issue galleys are an OJS surface). Reset the fleet
// before each walk: the walk changes a setting and adds issue galleys.
//
//   PHASE=steps (default)  Steps 1-7, then the control (8-9)
//   PHASE=neighbour        what fix.diff must leave alone, walked with the fix in
//                          and out: an existing galley's Publisher ID saves and
//                          re-saves (its own value is not a duplicate); another
//                          galley's value is refused on an existing galley and,
//                          with the fix, on a new one
//
// Run (main, then stable-3_5_0):
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/new-issue-galley-publisher-id-save-error/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-3_5 --dataset --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-3_5 PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/new-issue-galley-publisher-id-save-error/walk.js
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');

const T = 20_000;
const PHASE = process.env.PHASE || 'steps';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const PID = 'u44r1-pdf';
const ISSUE = 'Vol. 2 No. 1 (2015)';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // no issue galleys on a press or a preprint server
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const FILE = path.resolve('apps/ojs/playwright/fixtures/files/article.pdf');
    const facts = {phase: PHASE};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
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
    const form = () => page.locator('form#issueGalleyForm');

    // Steps 2-3: Settings › Workflow › Submission › Metadata › "Enable for Issue Galleys"
    async function enableIssueGalleyIds() {
        await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/workflow`));
        await idle(page);
        await page.locator('#metadata-button').click();
        await idle(page);
        const group = page.getByRole('group', {name: 'Publisher ID'});
        await group.waitFor({timeout: T});
        const box = group.getByRole('checkbox', {name: 'Enable for Issue Galleys'});
        const before = await box.isChecked();
        if (!before) await box.click();
        const f = page.locator('form').filter({has: group});
        await f.getByRole('button', {name: 'Save', exact: true}).click();
        const saved = await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: T}).then(() => true).catch(() => false);
        await idle(page);
        await snap('settings-metadata-saved');
        return {before, saved, groupText: (await group.innerText()).replace(/\s+/g, ' ').trim()};
    }
    // Step 4-5: Issues › Future Issues › the issue's "Edit" › "Issue Galleys"
    async function openIssueGalleys() {
        await page.goto(app.url(`/index.php/${app.contextPath}/manageIssues`));
        await idle(page);
        const tab = page.getByRole('tab', {name: 'Future Issues'});
        if (await tab.count()) { await tab.first().click(); await idle(page); }
        const row = page.locator('tr.gridRow').filter({hasText: ISSUE}).first();
        await row.waitFor({timeout: T});
        await row.locator('a.show_extras').click();
        await pause(300);
        await page.getByRole('link', {name: 'Edit', exact: true}).filter({visible: true}).first().click();
        await idle(page);
        await top().getByRole('tab', {name: 'Issue Galleys', exact: true}).waitFor({timeout: T});
        await top().getByRole('tab', {name: 'Issue Galleys', exact: true}).click();
        await idle(page);
        await top().getByRole('link', {name: 'Create Issue Galley'}).first().waitFor({timeout: T});
        await idle(page); await pause(400);
        return readGrid();
    }
    async function readGrid() {
        return top().evaluate((d) => [...d.querySelectorAll('table')].filter((t) => t.getClientRects().length).map((t) => ({
            columns: [...t.querySelectorAll('thead th')].map((th) => th.innerText.trim()),
            rows: [...t.querySelectorAll('tbody tr.gridRow')].filter((tr) => tr.getClientRects().length).map((tr) => tr.innerText.replace(/\s+/g, ' ').trim()),
            empty: [...t.querySelectorAll('tbody.empty')].filter((b) => b.getClientRects().length).map((b) => b.innerText.trim()),
        }))).catch(() => []);
    }
    async function openCreate() {
        await top().getByRole('link', {name: 'Create Issue Galley'}).first().click();
        await form().waitFor({timeout: T});
        await idle(page); await pause(400);
    }
    async function openEdit(label) {
        const row = top().locator('tr.gridRow').filter({hasText: new RegExp(`(^|\\s)${label}(\\s|$)`)}).first();
        await row.locator('a.show_extras').click();
        await pause(300);
        await top().getByRole('link', {name: 'Edit', exact: true}).filter({visible: true}).first().click();
        await form().waitFor({timeout: T});
        await idle(page); await pause(400);
        return form().locator('input[name="publicGalleyId"]').inputValue().catch(() => null);
    }
    async function fill({upload, label, pid}) {
        if (upload) {
            const up = page.waitForResponse((r) => /issue-galley-grid\/upload/.test(r.url()), {timeout: T}).catch(() => null);
            await form().locator('input[type="file"]').first().setInputFiles(FILE);
            const r = await up;
            await idle(page); await pause(800);
            facts.uploads = (facts.uploads || []).concat(r ? r.status() : null);
        }
        if (label !== undefined) await form().locator('input[name="label"]').fill(label);
        if (pid !== undefined) await form().locator('input[name="publicGalleyId"]').fill(pid);
    }
    // Press "Save" and read what the window shows afterwards.
    async function save(name) {
        const resp = page.waitForResponse((r) => /issue-galley-grid\/update/.test(r.url()), {timeout: 30_000}).catch(() => null);
        await form().getByRole('button', {name: 'Save', exact: true}).click();
        const r = await resp;
        await idle(page); await pause(1500); await idle(page);
        const open = await form().isVisible().catch(() => false);
        const out = {status: r ? r.status() : null, request: r ? r.url().replace(/^https?:\/\/[^/]+/, '') : null, windowOpen: open};
        if (open) {
            out.saveDisabled = await form().getByRole('button', {name: 'Save', exact: true}).isDisabled().catch(() => null);
            out.spinner = await form().locator('.pkp_spinner').filter({visible: true}).count().catch(() => 0);
            out.formErrors = (await form().locator('#formErrors, .error, label.error').allInnerTexts().catch(() => [])).map((x) => x.trim()).filter(Boolean);
        }
        const s = await snap(name);
        out.notices = (s.notices || []).map((x) => (typeof x === 'string' ? x : x.text || JSON.stringify(x)));
        return out;
    }
    async function cancel() {
        const c = form().getByRole('link', {name: 'Cancel', exact: true});
        if (await c.count()) { await c.click().catch(() => {}); }
        await form().waitFor({state: 'hidden', timeout: T}).catch(() => {});
        await idle(page); await pause(800);
    }
    async function closeWindowAndReopen() {
        const c = top().getByRole('button', {name: /^Close/}).first();
        if (await c.count()) await c.click().catch(() => {});
        await idle(page); await pause(800);
        return openIssueGalleys();
    }

    try {
        await signIn(page, 'dbarnes');                                   // step 1
        await idle(page);
        fact('settings', await enableIssueGalleyIds());                  // steps 2-3
        fact('grid at start', await openIssueGalleys());                 // steps 4-5
        await snap('issue-galleys-tab');
        if (PHASE === 'steps') {
            await openCreate();                                          // step 5
            await snap('create-form');
            await fill({upload: true, label: 'PDF', pid: PID});          // step 6
            fact('step 7 save (new galley, Publisher ID)', await save('create-save'));   // step 7
            await cancel();
            fact('grid after Cancel', await readGrid());
            fact('grid after reopening the issue', await closeWindowAndReopen());
            // control: step 8 without an ID, step 9 the ID on the saved galley
            await openCreate();
            await fill({upload: true, label: 'PDF'});
            const c8 = await save('control-create-no-id');
            if (c8.windowOpen) await cancel();
            fact('step 8 save (new galley, no Publisher ID)', c8);
            fact('grid after step 8', await readGrid());
            const before9 = await openEdit('PDF');
            await fill({pid: PID});
            const c9 = await save('control-edit-add-id');
            if (c9.windowOpen) await cancel();
            fact('step 9 save (existing galley, Publisher ID)', {before: before9, ...c9});
            fact('grid after step 9', await closeWindowAndReopen());
        } else {
            // N0: "PDF" created with the Publisher ID the way that works either way
            await openCreate();
            await fill({upload: true, label: 'PDF'});
            let r = await save('n0-create-pdf');
            if (r.windowOpen) await cancel();
            await openEdit('PDF'); await fill({pid: PID});
            r = await save('n0-edit-pdf-id');
            if (r.windowOpen) await cancel();
            fact('N0 "PDF" holds the ID', {save: r, grid: await closeWindowAndReopen()});
            // N2: "PDF" saved again with its own value
            const own = await openEdit('PDF');
            r = await save('n2-resave-own');
            if (r.windowOpen) await cancel();
            fact('N2 existing galley re-saves its own ID', {before: own, ...r, grid: await closeWindowAndReopen()});
            // N1: a new galley "PDF2" with the value "PDF" holds
            await openCreate();
            await fill({upload: true, label: 'PDF2', pid: PID});
            r = await save('n1-create-dup');
            r.valueAfter = r.windowOpen ? await form().locator('input[name="publicGalleyId"]').inputValue().catch(() => null) : null;
            if (r.windowOpen) await cancel();
            fact('N1 new galley with another galley\'s ID', {...r, grid: await closeWindowAndReopen()});
            // N3: "PDF2" without an ID, then "PDF"'s value on it
            await openCreate();
            await fill({upload: true, label: 'PDF2'});
            r = await save('n3-create-pdf2');
            if (r.windowOpen) await cancel();
            const b3 = await openEdit('PDF2');
            await fill({pid: PID});
            r = await save('n3-edit-dup');
            if (r.windowOpen) await cancel();
            fact('N3 existing galley with another galley\'s ID', {before: b3, ...r, grid: await closeWindowAndReopen()});
        }
    } finally {
        record(PHASE === 'steps' ? 'walk' : 'neighbour', facts);
        await close();
    }
});
