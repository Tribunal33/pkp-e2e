// Issue report docs/issues/U46-A5-ordering-arrows-unnamed.md (U46 A5, U42 A19, U43 A5's arrows
// half): in ordering mode the Galleys list's, the Funders table's and the Data Citations table's
// up and down arrows (ui-library TableCellOrder) are buttons with no accessible name.
//
// Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's default
// test dataset, as the dataset's editor `dbarnes` on `publicknowledge`: ticks "Enable data citation
// metadata" (Settings > Workflow > Submission > Metadata), then on submission 1 (OJS, OPS) or 4
// (OMP) reads the Galleys list's arrows, adds two funders by typed name and two data citations and
// reads their arrows, and reads the Contributors list's arrows as the control. Names tagged u46w3.
// The kit builds nothing.
//
// Modes (first argument):
//   steps (default)  the Steps above.
//   nb               what the fix must leave alone, on the state `steps` left (run it right after
//                    `steps`, no reset): the Contributors arrows' names; outside ordering mode each
//                    row's "More Actions" name; in ordering mode the arrows still move rows (the
//                    first row's down arrow swaps the first two funders and data citations), and
//                    leaving the page without "Save Order" keeps the earlier order. Saves nothing.
//
// A name is read as Chromium's accessibility tree computes it (what a screen reader is given).
//
// Reset first:  npm run fleet-prep -- --feature issues-w3 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-w3 PROBE_AGENT=w3 node bin/probe.js all shared/playwright/checks/issues/ordering-arrows-unnamed/walk.js [steps|nb]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, feature issues-w3-3_5, PROBE_RUN=r35.
// Fix trial:    PROBE_RUN=fix (steps), nb-in / nb-out (nb), with fix.diff applied or not.
// Facts: .reports/<feature>/w3/arrows-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const {axOf} = require('../role-stage-boxes-unnamed/lib.js');

const mode = process.argv[2] || 'steps';
// optional second argument: the parts of `steps` to take (S2,G,F,D,C; default all)
const only = process.argv[3] ? process.argv[3].split(',') : null;
const T = 30_000;
const SUBMISSION = {ojs: 1, omp: 4, ops: 1};
const FUNDERS = ['u46w3 Funder A', 'u46w3 Funder & Trust B'];
const DATASETS = ['u46w3 Dataset A', 'u46w3 Dataset B'];
const SUPPORTING = 'Supporting data without specifying whether they were generated or analyzed (supporting).';
const flat = (s, n = 600) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {MetadataForm} = require('../../../pages/SubmissionIntakePages.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const facts = {app: app.name, line: app.line || 'main', mode, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1600)}`);
    };
    /** Run one part; a throw is recorded, never fatal (a fix or an older line changes the screen). */
    const part = async (name, fn) => {
        if (mode === 'steps' && only && !only.includes(name)) return;
        try {
            await fn();
        } catch (e) {
            fact(`${name} error`, flat(e.message, 400));
        }
    };

    const {page, close} = await launch(app);
    const group = app.name === 'ops' ? 'Preprint' : 'Publication';
    const wf = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: group}});
    const sub = SUBMISSION[app.name];

    /** Open the submission's workflow and a publication page by its side-menu entry; false when absent. */
    const openPage = async (label) => {
        await wf.gotoEditorial(sub);
        await wf.expectOpen(sub);
        await idle(page);
        await wf.expandLatestVersionNode().catch(() => {}); // 3.5 has no version nodes
        if (!(await wf.menuLink(label).count())) return false;
        await wf.select(label, `${group}: ${label}`);
        await idle(page);
        return true;
    };
    const dlg = () => wf.dialog();
    const table = (name) => dlg().getByRole('table', {name, exact: true});
    /** Per row: its first cell's text and the accessible role and name of each button in its last cell. */
    const rowControls = async (tbl) => {
        const rows = tbl.locator('tbody tr');
        const out = [];
        for (let i = 0; i < (await rows.count()); i++) {
            const row = rows.nth(i);
            const btns = row.locator('td:last-child button');
            const names = [];
            for (let j = 0; j < (await btns.count()); j++) names.push(await axOf(page, btns.nth(j)));
            out.push({row: flat(await row.locator('td, th').first().innerText(), 80), buttons: names});
        }
        return out;
    };
    const firstArrowHtml = async (tbl) => {
        const b = tbl.locator('tbody tr').first().locator('td:last-child button').first();
        return (await b.count()) ? flat(await b.evaluate((el) => el.outerHTML), 400) : null;
    };
    const rowTexts = async (tbl) => (await tbl.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => (tr.cells[0] ? tr.cells[0].innerText : '')))).map((t) => flat(t, 80));
    const pressTop = async (name) => {
        await dlg().getByRole('button', {name, exact: true}).first().click();
        await idle(page);
        await sleep(400);
    };

    /** The Contributors list in ordering mode (the control): its arrows' names. */
    const contributors = async (key) => {
        if (!(await openPage('Contributors'))) return fact(`${key} Contributors page`, 'absent');
        await pressTop('Order');
        const items = dlg().locator('.listPanel__item');
        const first = items.first();
        const btns = first.locator('.orderer__up, .orderer__down');
        const names = [];
        for (let j = 0; j < (await btns.count()); j++) names.push(await axOf(page, btns.nth(j)));
        fact(`${key} Contributors first row and its arrows`, {row: flat(await first.innerText(), 120), buttons: names});
    };

    try {
        await signIn(page, 'dbarnes');

        if (mode === 'steps') {
            // ------------------------------------------------ step 2: turn Data Citations on
            await part('S2', async () => {
                await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/workflow`));
                await idle(page);
                await page.locator('#submission-button').first().click();
                await page.locator('#metadata-button').click();
                const form = new MetadataForm(page);
                await form.ready();
                const box = form.box('Enable data citation metadata');
                if (!(await box.count())) return fact('S2 "Enable data citation metadata"', 'absent');
                await box.check();
                await form.saveButton.click();
                await form.savedStatus.waitFor({timeout: T});
                fact('S2 data citations on, saved', true);
            });

            // ------------------------------------------------ steps 3-6: the Galleys list
            await part('G', async () => {
                if (!(await openPage('Galleys'))) return fact('G4 Galleys page', 'absent');
                const tbl = table('Galleys');
                await tbl.waitFor({timeout: T});
                fact('G4 rows, out of ordering mode', await rowControls(tbl));
                await pressTop('Order');
                record(`arrows-galleys${run}`, await screen(page));
                fact('G6 rows and their arrows in ordering mode', await rowControls(tbl));
                fact('G6 first arrow markup', await firstArrowHtml(tbl));
            });

            // ------------------------------------------------ steps 7-9: the Funders table
            await part('F', async () => {
                if (!(await openPage('Funding'))) return fact('F7 Funding page', 'absent');
                const tbl = table('Funders');
                await tbl.waitFor({timeout: T});
                // the registry answers nothing (no outside call); the typed-text choice is drawn without it
                await page.route('https://api.ror.org/**', (r) =>
                    r.fulfill({status: 200, contentType: 'application/json', headers: {'Access-Control-Allow-Origin': '*'}, body: '{"items":[]}'})
                );
                for (const name of FUNDERS) {
                    await pressTop('Add Funder');
                    const panel = page.getByRole('dialog', {name: 'Add Funder'});
                    await panel.waitFor({timeout: T});
                    const search = panel.locator('input.pkpAutosuggest__input');
                    await search.click();
                    await search.pressSequentially(name, {delay: 15});
                    await panel.locator('li.autosuggest__results-item').filter({hasText: name}).first().click();
                    await panel.locator('input[name="name"]').first().waitFor({timeout: T});
                    await panel.getByRole('button', {name: 'Save', exact: true}).click();
                    await panel.waitFor({state: 'detached', timeout: T});
                    await tbl.locator('tbody tr').filter({hasText: name}).first().waitFor({timeout: T});
                }
                fact('F8 rows, out of ordering mode', await rowControls(tbl));
                await pressTop('Order');
                record(`arrows-funders${run}`, await screen(page));
                fact('F9 rows and their arrows in ordering mode', await rowControls(tbl));
                fact('F9 first arrow markup', await firstArrowHtml(tbl));
            });

            // ------------------------------------------------ steps 10-12: the Data Citations table
            await part('D', async () => {
                if (!(await openPage('Data'))) return fact('D10 Data page', 'absent');
                const tbl = table('Data Citations');
                await tbl.waitFor({timeout: T});
                for (const title of DATASETS) {
                    await pressTop('Add Data Citation');
                    const panel = page.getByRole('dialog', {name: 'Add Data Citation', exact: true});
                    await panel.waitFor({timeout: T});
                    await panel.getByRole('textbox', {name: /^Title/}).fill(title);
                    await panel.getByRole('combobox', {name: /^Relationship type/}).selectOption({label: SUPPORTING});
                    await panel.getByRole('button', {name: 'Save', exact: true}).click();
                    await panel.waitFor({state: 'detached', timeout: T});
                    await tbl.locator('tbody tr').filter({hasText: title}).first().waitFor({timeout: T});
                }
                fact('D11 rows, out of ordering mode', await rowControls(tbl));
                await pressTop('Order');
                record(`arrows-datacitations${run}`, await screen(page));
                fact('D12 rows and their arrows in ordering mode', await rowControls(tbl));
                fact('D12 first arrow markup', await firstArrowHtml(tbl));
            });

            // ------------------------------------------------ step 13: the control
            await part('C', () => contributors('C13'));
        } else if (mode === 'nb') {
            await part('nb contributors', () => contributors('nb'));
            for (const [label, name] of [
                ['Funding', 'Funders'],
                ['Data', 'Data Citations'],
                ['Galleys', 'Galleys'],
            ]) {
                await part(`nb ${name}`, async () => {
                    if (!(await openPage(label))) return fact(`nb ${label} page`, 'absent');
                    const tbl = table(name);
                    await tbl.waitFor({timeout: T});
                    fact(`nb ${name} rows, out of ordering mode`, await rowControls(tbl));
                    const before = await rowTexts(tbl);
                    await pressTop('Order');
                    const firstDown = tbl.locator('tbody tr').first().locator('td:last-child button').last();
                    await firstDown.click();
                    await sleep(400);
                    fact(`nb ${name} order: before, after the first row's down arrow`, [before, await rowTexts(tbl)]);
                    // leave without "Save Order", come back
                    if (!(await openPage(label))) return;
                    await tbl.waitFor({timeout: T});
                    fact(`nb ${name} order after leaving and coming back`, await rowTexts(tbl));
                });
            }
        }
    } finally {
        record(`arrows-facts${run}`, facts);
        await close();
    }
});
