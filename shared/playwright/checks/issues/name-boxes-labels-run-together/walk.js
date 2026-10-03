// Issue report docs/issues/U41-A10-name-boxes-labels-run-together.md (U41 A10, U43 A5's typed-name
// half): a typed affiliation's and a typed funder's per-language name boxes share one id, so the
// first box takes every label as its name and the others have none.
//
// Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's default
// test dataset, as the dataset's editor `dbarnes` on `publicknowledge`: on the submission of
// lib.js CASES, the contributor's Edit form, the typed affiliation's "Edit institution name"; then
// "Funding" > "Add Funder" with a typed name. Saves nothing. Names tagged u41f. The kit builds
// nothing. The Funder box's registry search (api.ror.org) is answered with an empty list, so the
// box offers only the typed text, as when the registry knows no such funder.
//
// Modes (first argument):
//   steps (default)  the Steps.
//   nb               what a fix must leave alone (runs alone, on a fresh dataset or after `steps`):
//                    the contributor form's own name boxes keep their ids and names; a French name
//                    typed into the typed affiliation's editor and into a new typed affiliation, and
//                    into a typed funder, is saved and stored (read back from the database).
//
// A name is read as Chromium's accessibility tree computes it (what a screen reader is given).
//
// Reset first:  npm run fleet-prep -- --feature issues-u41f --dataset 6 --reset
// Run (main):   PROBE_FEATURE=issues-u41f PROBE_AGENT=u41f node bin/probe.js all shared/playwright/checks/issues/name-boxes-labels-run-together/walk.js [steps|nb]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, feature issues-u41f-3_5, PROBE_RUN=r35.
// Fix trial:    PROBE_RUN=fix (steps), nb-in / nb-out (nb), with fix.diff applied or not.
// Facts: .reports/<feature>/u41f/name-boxes-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');
const L = require('./lib');
const R = require('../registry-pick-saves-nameless/lib.js');

const mode = process.argv[2] || 'steps';
const T = 30_000;
const FUNDER = 'u41f Funder';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const facts = {app: app.name, line: app.line || 'main', mode, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1600)}`);
    };
    const {page, close} = await launch(app);
    /** One part; a throw is recorded, never fatal (a fix or an older line changes the screen). */
    const part = async (key, fn) => {
        try {
            await fn();
        } catch (e) {
            fact(`${key} error`, L.flat(e.message, 500));
            await shot(page, `name-boxes-${key}-error${run}`).catch(() => {});
        }
    };
    const group = app.name === 'ops' ? 'Preprint' : 'Publication';
    const wf = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: group}});
    const c = L.CASES[app.name];
    // the registry answers nothing (no outside call); the typed-text choice is drawn without it
    await page.route('https://api.ror.org/**', (r) =>
        r.fulfill({status: 200, contentType: 'application/json', headers: {'Access-Control-Allow-Origin': '*'}, body: '{"items":[]}'})
    );
    const affBoxes = (dlg) => dlg.locator('.pkpFormField--affiliations tbody input.pkpFormField--text__input');
    const typeAndPickTyped = async (scope, text) => {
        const search = scope.locator('input.pkpAutosuggest__input').first();
        await search.click();
        await search.pressSequentially(text, {delay: 15});
        await scope.locator('li.autosuggest__results-item').filter({hasText: text}).first().click();
        await L.sleep(400);
    };
    const openAddFunder = async () => {
        await wf.dialog().getByRole('button', {name: 'Add Funder', exact: true}).first().click();
        const panel = page.getByRole('dialog', {name: 'Add Funder'});
        await panel.waitFor({timeout: T});
        return panel;
    };
    const funderBoxes = (panel) => panel.locator('.pkpFormField--funder input.pkpFormField--text__input');

    try {
        await signIn(page, 'dbarnes');

        if (mode === 'steps') {
            // ------------------------------------------------ steps 2-6: a typed affiliation's names
            await part('A', async () => {
                if (!(await R.openPage(wf, page, c.id, 'Contributors'))) return fact('A3 Contributors page', 'absent');
                const dlg = await R.openContributorEdit(page, wf, c.contributor);
                fact('A4 affiliations rows', await R.affiliationRows(dlg));
                await L.rowAction(page, dlg, c.institution, 'Edit institution name');
                const boxes = affBoxes(dlg);
                await boxes.first().waitFor({timeout: T});
                fact('A6 boxes', await L.boxFacts(page, boxes));
                fact('A6 aria snapshot of the Affiliations field', L.flat(await dlg.locator('.pkpFormField--affiliations').first().ariaSnapshot(), 1500));
                record(`name-boxes-affiliation${run}`, await screen(page));
                await shot(page, `name-boxes-affiliation${run}`);
                if ((await boxes.count()) > 1) fact('A6 cursor after a click on the second label (box index)', await L.clickOwnLabel(page, boxes, 1));
                await R.closeForm(page, dlg);
            });

            // ------------------------------------------------ steps 7-9: a typed funder's names
            await part('F', async () => {
                if (!(await R.openPage(wf, page, c.id, 'Funding'))) return fact('F7 Funding page', 'absent');
                const panel = await openAddFunder();
                await typeAndPickTyped(panel, FUNDER);
                const boxes = funderBoxes(panel);
                await boxes.first().waitFor({timeout: T});
                fact('F9 boxes', await L.boxFacts(page, boxes));
                fact('F9 aria snapshot of the Funder field', L.flat(await panel.locator('.pkpFormField--funder').first().ariaSnapshot(), 1500));
                record(`name-boxes-funder${run}`, await screen(page));
                await shot(page, `name-boxes-funder${run}`);
                if ((await boxes.count()) > 1) fact('F9 cursor after a click on the second label (box index)', await L.clickOwnLabel(page, boxes, 1));
                await R.closeForm(page, panel);
            });
        } else if (mode === 'nb') {
            // ------------------------------------------------ the contributor form's own fields, and a saved French name
            await part('nbA', async () => {
                if (!(await R.openPage(wf, page, c.id, 'Contributors'))) return fact('nbA Contributors page', 'absent');
                let dlg = await R.openContributorEdit(page, wf, c.contributor);
                fact('nbA given name boxes', await L.boxFacts(page, dlg.locator('input[name^="givenName"]')));
                await L.rowAction(page, dlg, c.institution, 'Edit institution name');
                const boxes = affBoxes(dlg);
                await boxes.nth(1).waitFor({timeout: T});
                await boxes.nth(1).fill('u41f Établissement');
                await boxes.nth(1).blur();
                // a new typed affiliation: its French box only (the English name is the typed text)
                await typeAndPickTyped(dlg, 'u41f Institute');
                fact('nbA boxes with a new typed affiliation picked', await L.boxFacts(page, affBoxes(dlg)));
                const all = affBoxes(dlg);
                await all.last().fill('u41f Institut');
                await all.last().blur();
                await dlg.locator('.pkpFormField--affiliations').getByRole('button', {name: 'Add', exact: true}).click();
                await L.sleep(400);
                fact('nbA rows before Save', await R.affiliationRows(dlg));
                fact('nbA save', await R.saveContributor(page, dlg));
                dlg = await R.openContributorEdit(page, wf, c.contributor);
                fact('nbA rows after reopening', await R.affiliationRows(dlg));
                await R.closeForm(page, dlg);
                fact('nbA stored affiliations', R.storedAffiliations(app, R.authorId(app, c.id, c.contributor)));
            });
            await part('nbF', async () => {
                if (!(await R.openPage(wf, page, c.id, 'Funding'))) return fact('nbF Funding page', 'absent');
                const panel = await openAddFunder();
                await typeAndPickTyped(panel, FUNDER);
                const boxes = funderBoxes(panel);
                await boxes.nth(1).waitFor({timeout: T});
                await boxes.nth(1).fill('u41f Bailleur');
                await boxes.nth(1).blur();
                fact('nbF boxes before Save', await L.boxFacts(page, boxes));
                await panel.getByRole('button', {name: 'Save', exact: true}).click();
                await panel.waitFor({state: 'detached', timeout: T}).catch(() => {});
                await idle(page);
                await L.sleep(800);
                fact('nbF funders after save', await R.funderRows(wf));
                fact('nbF stored funders', R.storedFunders(app, c.id));
            });
        }
    } finally {
        record(`name-boxes-facts${run}`, facts);
        await close();
    }
});
