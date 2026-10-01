// Issue report walk: docs/issues/U50-A11-issue-galley-language-offered-then-refused.md
// (spec U50 register A11). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// signed in as the dataset's editor `dbarnes` on `publicknowledge`; the kit
// builds nothing, every change is made on screen. Records every screen with
// screen(). OJS only (issue galleys are an OJS surface). Reset the fleet
// before each walk: the walk changes the journal's languages and adds galleys.
//
//   PHASE=steps (default)  Steps 1-5 (French unticked under "Forms", a French
//                          galley), then the control (6-7, the same galley in English)
//   PHASE=neighbour        what fix.diff must leave alone or put right, walked
//                          with the fix in and out:
//                          N2 a French galley saved while French is a form
//                             language, then French unticked under "Forms",
//                             the galley edited (label only) and saved;
//                          N1 French ticked again under "Forms" and unticked
//                             under "UI": is French offered, and does it save
//
// Run (main, then stable-3_5_0):
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/issue-galley-language-offered-then-refused/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-3_5 --dataset --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-3_5 PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/issue-galley-language-offered-then-refused/walk.js
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');

const T = 20_000;
const PHASE = process.env.PHASE || 'steps';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const ISSUE = 'Vol. 2 No. 1 (2015)';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // no issue galleys on a press or a preprint server
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const FILE = path.resolve('apps/ojs/playwright/fixtures/files/article.pdf');
    const facts = {phase: PHASE};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const {page, close} = await launch(app);
    page.on('dialog', (d) => { facts.dialogs = (facts.dialogs || []).concat(`${d.type()}: ${d.message()}`); d.accept().catch(() => {}); });
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

    // Settings › Website › "Setup" › "Languages": set French's box in one column
    async function setFrench(column, want) {
        await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/website`));
        await idle(page);
        await page.locator('#setup-button').first().click();
        await idle(page);
        await page.getByRole('tab', {name: 'Languages', exact: true}).filter({visible: true}).first().click();
        await idle(page); await pause(500);
        const row = page.locator('tr.gridRow').filter({hasText: 'fr_CA'}).first();
        await row.waitFor({timeout: T});
        const box = row.locator(`input[type="checkbox"][id*="${column}"]`).first();
        const before = await box.isChecked();
        let status = null;
        if (before !== want) {
            const w = page.waitForResponse((r) => /language-grid/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
            await box.click({noWaitAfter: true});
            const r = await w;
            status = r ? r.status() : null;
            await pause(1500); await idle(page);
        }
        const after = await page.locator('tr.gridRow').filter({hasText: 'fr_CA'}).first().locator(`input[type="checkbox"][id*="${column}"]`).first().isChecked();
        const rowText = (await page.locator('tr.gridRow').filter({hasText: 'fr_CA'}).first().innerText()).replace(/\s+/g, ' ').trim();
        await snap(`languages-${column}-${want ? 'on' : 'off'}`);
        return {column, before, after, status, rowText};
    }
    // Issues › "Future Issues" › the issue's "Edit" › "Issue Galleys"
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
    const langSelect = () => form().locator('select[name="galleyLocale"]');
    async function languageList() {
        const options = await langSelect().locator('option').evaluateAll((os) => os.map((o) => ({value: o.value, label: o.textContent.trim()})));
        const selected = await langSelect().inputValue().catch(() => null);
        return {options, selected};
    }
    async function openCreate() {
        await top().getByRole('link', {name: 'Create Issue Galley'}).first().click();
        await form().waitFor({timeout: T});
        await idle(page); await pause(400);
        return languageList();
    }
    async function openEdit(label) {
        const row = top().locator('tr.gridRow').filter({hasText: new RegExp(`(^|\\s)${label}(\\s|$)`)}).first();
        await row.locator('a.show_extras').click();
        await pause(300);
        await top().getByRole('link', {name: 'Edit', exact: true}).filter({visible: true}).first().click();
        await form().waitFor({timeout: T});
        await idle(page); await pause(400);
        return languageList();
    }
    async function fill({upload, label, locale}) {
        if (upload) {
            const up = page.waitForResponse((r) => /issue-galley-grid\/upload/.test(r.url()), {timeout: T}).catch(() => null);
            await form().locator('input[type="file"]').first().setInputFiles(FILE);
            const r = await up;
            await idle(page); await pause(800);
            facts.uploads = (facts.uploads || []).concat(r ? r.status() : null);
        }
        if (label !== undefined) await form().locator('input[name="label"]').fill(label);
        if (locale !== undefined) await langSelect().selectOption(locale);
    }
    // Press "Save" and read what the window shows afterwards.
    async function save(name) {
        const resp = page.waitForResponse((r) => /issue-galley-grid\/update/.test(r.url()), {timeout: 30_000}).catch(() => null);
        await form().getByRole('button', {name: 'Save', exact: true}).click();
        const r = await resp;
        await idle(page); await pause(1500); await idle(page);
        const open = await form().isVisible().catch(() => false);
        const out = {status: r ? r.status() : null, windowOpen: open};
        if (open) {
            out.formErrors = (await form().locator('#formErrors, .error, label.error, .pkp_form_error').allInnerTexts().catch(() => [])).map((x) => x.trim()).filter(Boolean);
            out.invalid = await form().locator('[aria-invalid="true"], .error').count().catch(() => null);
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
        if (PHASE === 'steps') {
            fact('step 2 French "Forms" off', await setFrench('formLocale', false));
            fact('step 3 grid', await openIssueGalleys());
            await snap('issue-galleys-tab');
            const list = await openCreate();
            fact('step 4 "Language" list', list);
            await snap('create-form');
            if (list.options.some((o) => o.value === 'fr_CA')) {
                await fill({upload: true, label: 'PDF', locale: 'fr_CA'});
                fact('step 5 save (French)', await save('create-save-french'));
                if (await form().isVisible().catch(() => false)) await cancel();
            } else {
                fact('step 5 save (French)', 'French not offered');   // Expected's second form
                await cancel();
            }
            fact('grid after step 5, reopened', await closeWindowAndReopen());
            // control: steps 6-7, the same galley in English
            await openCreate();
            await fill({upload: true, label: 'PDF', locale: 'en'});
            const c = await save('control-save-english');
            if (c.windowOpen) await cancel();
            fact('step 7 save (English)', c);
            fact('grid after step 7, reopened', await closeWindowAndReopen());
        } else {
            // N2: a French galley saved while French is a form language
            fact('N2 grid', await openIssueGalleys());
            fact('N2 create list (French a form language)', await openCreate());
            await fill({upload: true, label: 'PDF-fr', locale: 'fr_CA'});
            let r = await save('n2-create-french');
            if (r.windowOpen) await cancel();
            fact('N2 create (French)', {...r, grid: await closeWindowAndReopen()});
            fact('N2 French "Forms" off', await setFrench('formLocale', false));
            await openIssueGalleys();
            const e = await openEdit('PDF-fr');
            await fill({label: 'PDF-fr2'});
            r = await save('n2-edit-label-only');
            if (r.windowOpen) await cancel();
            fact('N2 edit after French left "Forms"', {list: e, ...r, grid: await closeWindowAndReopen()});
            // N1: French a form language but not a UI language
            fact('N1 French "Forms" on', await setFrench('formLocale', true));
            fact('N1 French "UI" off', await setFrench('uiLocale', false));
            await openIssueGalleys();
            const l = await openCreate();
            fact('N1 create list (French forms only)', l);
            if (l.options.some((o) => o.value === 'fr_CA')) {
                await fill({upload: true, label: 'PDF-fr-forms', locale: 'fr_CA'});
                r = await save('n1-create-french-forms-only');
                if (r.windowOpen) await cancel();
                fact('N1 create (French, forms only)', {...r, grid: await closeWindowAndReopen()});
            } else {
                await snap('n1-french-not-offered');
                await cancel();
            }
        }
    } finally {
        record(PHASE === 'steps' ? 'walk' : 'neighbour', facts);
        await close();
    }
});
