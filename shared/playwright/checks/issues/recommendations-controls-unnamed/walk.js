// Issue report docs/issues/U29-A12-recommendations-controls-unnamed.md (U29
// A12): on Settings › Workflow › "Review" › "Reviewer Recommendations" every
// row's "Activate" tick box, and the "Active Upon Saving" list of the "Add
// Recommendation" window, have no accessible name. Takes the report's Steps
// through the screens on a dataset fleet freshly reset to PKP's default test
// dataset, as the dataset's journal manager `rvaca` on `publicknowledge`.
//
// MODE=steps (default; nothing is saved: the window is closed unsaved and
// the Space press is answered "No"):
//   1. sign in as rvaca
//   2. Settings › Workflow › "Review" › "Reviewer Recommendations"
//   3. read the name of every row's "Activate" tick box
//   4. "Add Recommendation": read the name of the list under
//      "Recommendation type" ("Active Upon Saving")
//   5. close the window unsaved
//   Control: the row's "More Actions" button and the window's other boxes
//   are named; Space on the first tick box opens "Deactivate Reviewer
//   Recommendation", "No" leaves it ticked.
// On a line without the side tab (3.5 and older) it records the side tabs
// and stops.
//
// MODE=neighbour (what a fix must leave alone; saves through the screens,
// so reset the fleet before it): Space on the first tick box, "Yes"
// deactivates it, Space again and "Yes" activates it; "Add Recommendation"
// saved as "hkk19 Neighbour", "With Comments", "Deactivate" gives an
// unticked row; the window's other labels, the list's options and its
// preselected choice; the row header's text. Every step records what it saw
// and goes on.
//
// Reset first:  npm run fleet-prep -- --feature issues-k12 --dataset 6 --reset
// Run (main):   bin/app-lock.sh shared ojs -- env PROBE_FEATURE=issues-k12 PROBE_AGENT=k19 node bin/probe.js ojs shared/playwright/checks/issues/recommendations-controls-unnamed/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, feature
//               issues-k12-3_5, and PROBE_RUN=r35 in front of the run.
// PROBE_RUN names a trial's run (fix, nb-in, nb-out) so its records keep
// the main walk's.
// Facts: .reports/<feature>/k19/recs-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const {flat, axOf} = require('./lib.js');

const MODE = process.env.MODE || 'steps';
const T = 30000;

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {ReviewSettingsPage} = require('../../../pages/ReviewSettingsPages.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const tagName = `recs-${MODE}${run}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 3000)}`);
    };
    const step = async (k, fn) => {
        try {
            fact(k, await fn());
        } catch (e) {
            fact(k, {error: flat(e.message, 400)});
        }
    };

    const {page, close} = await launch(app);
    try {
        const settings = new ReviewSettingsPage(page, app.contextPath);
        const recs = settings.recommendations;

        /** Every row: its title, its tick box's accessibility node and its menu button's name. */
        const readRows = async () => {
            const rows = recs.rows();
            const n = await rows.count();
            const out = [];
            for (let i = 0; i < n; i++) {
                const row = rows.nth(i);
                const menu = recs.menuButton(row);
                out.push({
                    title: flat(await row.locator('th').innerText(), 80),
                    box: await axOf(page, recs.tick(row)),
                    menu: (await menu.count()) ? (await axOf(page, menu)).name : null,
                });
            }
            return out;
        };

        /** The add/edit window's boxes: role and name of each, the list's options and choice. */
        const readWindow = async () => ({
            title: await axOf(page, recs.titleInput),
            type: await axOf(page, recs.typeSelect),
            status: await axOf(page, recs.statusSelect),
            statusOptions: (await recs.statusSelect.locator('option').allInnerTexts()).map((s) => flat(s)),
            statusChosen: flat(await recs.statusSelect.evaluate((el) => el.options[el.selectedIndex] && el.options[el.selectedIndex].text)),
            labels: (await recs.window.locator('label').allInnerTexts()).map((s) => flat(s, 80)).filter(Boolean),
            statusByName: await recs.window.getByRole('combobox', {name: /\S/}).count(),
            comboboxes: await recs.window.getByRole('combobox').count(),
        });

        const closeWindow = async () => {
            await recs.window.getByRole('button', {name: /^Close/}).first().click();
            await recs.titleInput.waitFor({state: 'hidden', timeout: T}).catch(() => {});
            await page.waitForTimeout(500);
        };

        /** Focus a row's tick box, press Space, answer the dialog; the dialog's text and the box after. */
        const spaceOn = async (title, answer) => {
            const box = recs.tick(recs.row(title));
            await box.focus();
            const focused = await page.evaluate(() => ({tag: document.activeElement.tagName, type: document.activeElement.type}));
            await page.keyboard.press('Space');
            const dialog = page.getByRole('dialog').filter({hasText: /Are you sure you want to (de)?activate/}).last();
            await dialog.waitFor({state: 'visible', timeout: T});
            const text = flat(await dialog.innerText(), 300);
            await dialog.getByRole('button', {name: answer, exact: true}).click();
            await dialog.waitFor({state: 'hidden', timeout: T}).catch(() => {});
            await idle(page);
            await page.waitForTimeout(1200);
            return {focused, dialog: text, answer, checkedAfter: await recs.tick(recs.row(title)).isChecked()};
        };

        // Steps 1 and 2
        await signIn(page, 'rvaca');
        await settings.goto();
        await settings.openReviewTab();
        const sideTabs = await settings.sideTabNames();
        fact('2 side tabs', sideTabs);
        if (!sideTabs.includes('Reviewer Recommendations')) {
            record(`${tagName}-review-tab`, await screen(page));
            await shot(page, `${tagName}-review-tab`).catch(() => {});
            fact('2 reviewer recommendations', 'absent: "Review" has no "Reviewer Recommendations" side tab');
            return;
        }
        await settings.openSideTab('Reviewer Recommendations');
        await recs.rows().first().waitFor({timeout: T});
        await idle(page);
        record(`${tagName}-table`, await screen(page));
        await shot(page, `${tagName}-table`).catch(() => {});

        if (MODE === 'steps') {
            // Step 3
            await step('3 rows', async () => {
                const rows = await readRows();
                return {
                    rows,
                    boxes: rows.length,
                    boxesNamed: await recs.root.getByRole('checkbox', {name: /\S/}).count(),
                    columns: (await recs.root.locator('thead th').allInnerTexts()).map((s) => flat(s)),
                    firstRowSnapshot: flat(await recs.rows().first().ariaSnapshot(), 400),
                    firstBoxHtml: flat(await recs.tick(recs.rows().first()).evaluate((el) => el.parentElement.outerHTML), 600),
                    // a fix naming the box by an id must not repeat an id on the page
                    duplicateIds: await page.evaluate(() => {
                        const seen = {};
                        document.querySelectorAll('[id]').forEach((el) => (seen[el.id] = (seen[el.id] || 0) + 1));
                        return Object.keys(seen).filter((k) => seen[k] > 1);
                    }),
                };
            });
            // Step 4
            await step('4 add window', async () => {
                await recs.openAdd();
                await idle(page);
                record(`${tagName}-add-window`, await screen(page));
                await shot(page, `${tagName}-add-window`).catch(() => {});
                const out = await readWindow();
                out.statusHtml = flat(await recs.statusSelect.evaluate((el) => el.closest('.pkpFormField').outerHTML), 900);
                return out;
            });
            // Step 5
            await step('5 window closed', async () => {
                await closeWindow();
                return {open: await recs.titleInput.isVisible()};
            });
            // Control: the keyboard reaches and works the first box
            await step('control space then No', async () => spaceOn(await recs.rows().first().locator('th').innerText().then((s) => s.trim()), 'No'));
        } else {
            const first = (await recs.rows().first().locator('th').innerText()).trim();
            fact('neighbour first row', first);
            await step('neighbour space Yes (deactivate)', async () => spaceOn(first, 'Yes'));
            await step('neighbour space Yes (activate)', async () => spaceOn(first, 'Yes'));
            await step('neighbour add deactivated', async () => {
                await recs.openAdd();
                await idle(page);
                const before = await readWindow();
                record(`${tagName}-add-window`, await screen(page));
                await shot(page, `${tagName}-add-window`).catch(() => {});
                await recs.saveOpenWindow({title: 'hkk19 Neighbour', type: 'With Comments', status: 'Deactivate'});
                await idle(page);
                const row = recs.row('hkk19 Neighbour');
                return {
                    window: before,
                    rowHeader: flat(await row.locator('th').innerText()),
                    rowChecked: await recs.tick(row).isChecked(),
                    rowBox: await axOf(page, recs.tick(row)),
                    rowCells: (await row.locator('td').allInnerTexts()).map((s) => flat(s, 80)),
                };
            });
            await step('neighbour rows after', async () => readRows());
            record(`${tagName}-table-after`, await screen(page));
            await shot(page, `${tagName}-table-after`).catch(() => {});
        }
    } finally {
        record(`recs-facts-${MODE}${run}`, facts);
        await close();
    }
});
