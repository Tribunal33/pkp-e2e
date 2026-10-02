// Issue report reach check: docs/issues/U66-A2-unsaved-name-kept-after-closing-edit-panel.md,
// Cause "Reach". The other edit panels that fill a form from a list row the
// same way (useForm setValues(row)): Categories (Settings › Journal ›
// Categories), Contributor Roles (Settings › Workflow › Submission ›
// Contributor Roles) and Reviewer Recommendations (Settings › Workflow ›
// Review; OJS only, OMP and OPS do not offer it). On each: "Edit" on a dataset item, add " Draft" to the
// title or name, close with the panel's close control, read the row, "Edit"
// again and read the box, "Save" unchanged, reload and read. On a dataset
// fleet, signed in as `rvaca`; the kit builds nothing. Reset the fleet first.
// The category is "Applied Science" on OJS and OMP, "Social Sciences" on OPS.
//
// On stable-3_5_0 only Categories exists, as a legacy grid: the category's
// name is the link to the "Edit Category" window, whose "Name" (name[en]) is
// changed, then its "Close Panel" control (which asks "The data on this form has changed. Continue anyway?", accepted),
// then the same reads ("Social sciences" on OPS, whose 3.5 dataset has no
// "Applied Science"). Also U16 A16 (docs/specs/U16-categories.md#a16).
//
// Run:
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/unsaved-name-kept-after-closing-edit-panel/reach.js
//   (stable-3_5_0: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front)
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 600)}`); };
    if (!app.dataset) throw new Error('reach.js drives a dataset fleet (fleet-prep --dataset)');
    const path = app.contextPath;
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => record(`${String(++n).padStart(2, '0')}-${name}`, await screen(page));

    async function openTab(settings, ids) {
        await page.goto(app.url(`/index.php/${path}/en/management/settings/${settings}`));
        await idle(page);
        for (const id of ids) {
            const b = page.locator(`#${id}-button`).first();
            await b.waitFor({timeout: T});
            if ((await b.getAttribute('aria-selected')) !== 'true') await b.click();
            await idle(page);
        }
    }
    const rowNames = (panel) => panel.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => (tr.querySelector('th, td')?.innerText || '').trim()));
    const rowOf = (panel, text) => panel.locator('tbody tr').filter({has: page.locator('th, td').first().filter({hasText: new RegExp(`^\\s*${text}`)})}).first();
    async function openEdit(panel, rowText, dialogName) {
        await rowOf(panel, rowText).getByRole('button', {name: 'More Actions'}).click();
        await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
        const d = page.getByRole('dialog', {name: dialogName}).last();
        await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        await idle(page); await pause(500);
        return d;
    }
    async function closeByControl(d) {
        await d.getByRole('button', {name: 'Close', exact: true}).first().click();
        await d.waitFor({state: 'hidden', timeout: 6000}).catch(() => {});
        await idle(page); await pause(1200);
    }
    async function save(d, re) {
        const resp = page.waitForResponse((r) => re.test(r.url()) && r.request().method() !== 'GET', {timeout: 15_000}).catch(() => null);
        await d.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await resp;
        await d.waitFor({state: 'hidden', timeout: 8000}).catch(() => {});
        await idle(page); await pause(1200);
        return r ? r.status() : null;
    }

    async function check(label, {settings, tabs, panelSel, item, dialog, box, saveRe}) {
        const res = {};
        await openTab(settings, tabs);
        const panel = page.locator(panelSel).first();
        await panel.locator('tbody tr').first().waitFor({timeout: T});
        res.rowsBefore = await rowNames(panel);
        let d = await openEdit(panel, item, dialog);
        const input = d.locator(`input[name="${box}"]`);
        res.boxBefore = await input.inputValue();
        await input.click(); await input.press('End');
        await input.pressSequentially(' Draft', {delay: 40});
        await pause(400);
        res.rowsWhileOpen = await rowNames(panel);
        await closeByControl(d);
        res.rowsAfterClose = await rowNames(panel);
        await snap(`${label}-after-close`);
        d = await openEdit(panel, item, dialog);
        res.boxReopened = await input.inputValue();
        await snap(`${label}-reopened`);
        res.saveStatus = await save(d, saveRe);
        res.rowsAfterSave = await rowNames(panel);
        await page.reload(); await idle(page);
        await openTab(settings, tabs);
        await panel.locator('tbody tr').first().waitFor({timeout: T});
        res.rowsAfterReload = await rowNames(panel);
        d = await openEdit(panel, item, dialog);
        res.boxStored = await input.inputValue();
        await snap(`${label}-stored`);
        await closeByControl(d);
        fact(label, res);
    }

    // stable-3_5_0: the Categories tab is a legacy grid with a legacy form window.
    async function check35(label, item) {
        const res = {};
        const dialogs = [];
        page.on('dialog', async (dlg) => { dialogs.push(`${dlg.type()}: ${dlg.message()}`); await dlg.accept().catch(() => {}); });
        const grid = () => page.locator('#categoriesContainer');
        async function land() {
            await openTab('context', ['categories']);
            await grid().locator('tr.gridRow').first().waitFor({timeout: T});
            await idle(page);
        }
        const names35 = () => grid().locator('tr.gridRow').evaluateAll((trs) => trs.map((tr) => (tr.querySelector('td')?.innerText || '').trim()));
        async function edit35() {
            // the category's name in the grid is the link that opens "Edit Category"
            const link = grid().locator('tr.gridRow').getByRole('link', {name: item, exact: true}).first();
            await link.waitFor({timeout: T});
            await link.click();
            const d = page.getByRole('dialog', {name: 'Edit Category'}).last();
            const box = d.locator('input[name="name[en]"]');
            await box.waitFor({timeout: T});
            await idle(page); await pause(500);
            return {d, box};
        }
        async function close35(d) {
            await d.getByRole('button', {name: /close/i}).first().click();
            await d.waitFor({state: 'hidden', timeout: 6000}).catch(() => {});
            await idle(page); await pause(1200);
        }
        await land();
        res.rowsBefore = await names35();
        let {d, box} = await edit35();
        res.boxBefore = await box.inputValue();
        await box.click(); await box.press('End');
        await box.pressSequentially(' Draft', {delay: 40});
        await box.blur();
        await pause(400);
        await close35(d);
        res.closeDialogs = dialogs.slice();
        res.rowsAfterClose = await names35();
        await snap(`${label}-after-close`);
        ({d, box} = await edit35());
        res.boxReopened = await box.inputValue();
        await snap(`${label}-reopened`);
        const resp = page.waitForResponse((r) => /update-?category/i.test(r.url()), {timeout: 15_000}).catch(() => null);
        await d.getByRole('button', {name: 'OK', exact: true}).click();
        const r = await resp;
        res.saveStatus = r ? r.status() : null;
        await d.waitFor({state: 'hidden', timeout: 8000}).catch(() => {});
        await idle(page); await pause(1200);
        res.rowsAfterSave = await names35();
        await page.reload(); await idle(page);
        await land();
        res.rowsAfterReload = await names35();
        ({d, box} = await edit35());
        res.boxStored = await box.inputValue();
        await snap(`${label}-stored`);
        await close35(d);
        res.dialogs = dialogs;
        fact(label, res);
    }

    try {
        await signIn(page, 'rvaca');
        if (app.line === 'stable-3_5_0') {
            fact('line', app.line);
            fact('no such screen on 3.5', ['Contributor Roles', 'Reviewer Recommendations']);
            const item = app.name === 'ops' ? 'Social sciences' : 'Applied Science';
            await check35('categories', item).catch(async (e) => { fact('categories ERROR', String(e.message || e).slice(0, 500)); await snap('categories-ERROR').catch(() => {}); });
            return;
        }
        const ctxTab = {OJS: 'Journal', OMP: 'Press', OPS: 'Server'};
        fact('context tab', ctxTab[app.name.toUpperCase()]);
        const tries = [
            ['categories', {settings: 'context', tabs: ['categories'], panelSel: '#categories', item: app.name === 'ops' ? 'Social Sciences' : 'Applied Science', dialog: 'Edit Category', box: 'title-en', saveRe: /\/api\/v1\/categories/}],
            ['contributorRoles', {settings: 'workflow', tabs: ['submission', 'contributorRoles'], panelSel: '#contributorRoles', item: 'Translator', dialog: 'Edit Role', box: 'name-en', saveRe: /\/api\/v1\/contributorRoles/}],
        ];
        if (app.name === 'ojs') tries.push(['reviewerRecommendations', {settings: 'workflow', tabs: ['review', 'reviewerRecommendations'], panelSel: '#reviewerRecommendations', item: 'Accept Submission', dialog: 'Edit Recommendation', box: 'title-en', saveRe: /\/api\/v1\/reviewers\/recommendations/}]);
        for (const [label, cfg] of tries) {
            await check(label, cfg).catch(async (e) => { fact(`${label} ERROR`, String(e.message || e).slice(0, 500)); await snap(`${label}-ERROR`).catch(() => {}); });
        }
    } finally {
        record('reach-facts', facts);
        await close();
    }
});
