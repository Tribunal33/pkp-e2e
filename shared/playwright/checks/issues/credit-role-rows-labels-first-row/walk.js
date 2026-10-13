// Issue report docs/issues/U41-A25-credit-role-rows-labels-first-row.md (U41 A25): in a contributor's
// "CRediT roles and the degrees of contribution" table every row's drop-downs share two ids, so every
// row's labels point at the first row's drop-downs: the first row's are named twice over, the later
// rows' have no name, and a click on a later row's label puts the cursor in the first row.
//
// Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's default test
// dataset, as the dataset's editor `dbarnes` on `publicknowledge`: the submission of lib.js CASES,
// "Contributors", "Edit" on its contributor, "Add Another Role" twice, the second row set to
// "Investigation" / "Supporting", the four drop-downs read, a click on the second row's "Select a new
// role (required)" and the Down arrow, then "Close". The kit builds nothing.
//
// Modes (first argument):
//   steps (default)  the Steps. Saves nothing.
//   untouched        what a fix must leave alone (runs alone, on a fresh dataset): the form's other
//                    fields keep their ids ("Country", "Given Name"); two rows set by mouse picks
//                    ("Conceptualization" / "Lead", "Investigation" / "Supporting") are saved,
//                    stored and shown again in a reopened "Edit".
//   more             three rows: every drop-down's name; a click on the second row's "Degree" label and
//                    the Down arrow; a click on its role label and the "m" key (type-ahead). Saves nothing.
//
// A name is read as Chromium's accessibility tree computes it (what a screen reader is given).
//
// Reset first:  npm run fleet-prep -- --feature issues-h13i --dataset 5 --reset
// Run (main):   PROBE_FEATURE=issues-h13i PROBE_AGENT=h13i node bin/probe.js <app|all> shared/playwright/checks/issues/credit-role-rows-labels-first-row/walk.js [steps|untouched|more]
// Fix trial:    PROBE_RUN=fix (steps), nb-in / nb-out (untouched), with fix.diff applied or not.
// Facts: .reports/<feature>/h13i/credit-rows-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');
const L = require('./lib');

const mode = process.argv[2] || 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const facts = {
        app: app.name,
        line: app.line || 'main',
        mode,
        run: process.env.PROBE_RUN || null,
    };
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1600)}`);
    };
    const {page, close} = await launch(app);
    /** One part; a throw is recorded, never fatal (a fix changes the screen). */
    const part = async (key, fn) => {
        try {
            await fn();
        } catch (e) {
            fact(`${key} error`, L.flat(e.message, 500));
            await shot(page, `credit-rows-${key}-error${run}`).catch(() => {});
        }
    };
    const group = app.name === 'ops' ? 'Preprint' : 'Publication';
    const wf = new WorkflowPage(page, app.contextPath, {
        labels: {publicationGroup: group},
    });
    const c = L.CASES[app.name];

    /** Steps 2-5: the contributor's "Edit", "Add Another Role" twice. Returns the form, or null. */
    const openWithTwoRows = async (key) => {
        if (!(await L.openPage(wf, page, c.id, 'Contributors'))) {
            fact(`${key} Contributors page`, 'absent');
            return null;
        }
        const dlg = await L.openContributorEdit(page, wf, c.contributor);
        const f = L.creditField(dlg);
        await f.scrollIntoViewIfNeeded().catch(() => {});
        fact(`${key} CRediT field on opening`, L.flat(await f.innerText(), 300));
        const add = f.getByRole('button', {
            name: 'Add Another Role',
            exact: true,
        });
        await add.click();
        await L.sleep(500);
        await add.click();
        await L.sleep(500);
        fact(`${key} rows after "Add Another Role" twice`, await L.rowValues(dlg));
        if ((await L.creditRows(dlg).count()) < 2) {
            fact(`${key} second row`, 'absent');
            return null;
        }
        return dlg;
    };

    try {
        await signIn(page, 'dbarnes');

        if (mode === 'steps') {
            await part('S', async () => {
                const dlg = await openWithTwoRows('S5');
                if (!dlg) return;
                const rows = L.creditRows(dlg);
                // step 6
                await L.pick(rows.nth(1).locator('select').nth(0), 'Investigation');
                await L.pick(rows.nth(1).locator('select').nth(1), 'Supporting');
                fact('S6 rows', await L.rowValues(dlg));
                // step 7
                const sel = [];
                for (let i = 0; i < 2; i++)
                    for (let j = 0; j < 2; j++)
                        sel.push({
                            row: i + 1,
                            ...(await L.selectFacts(page, rows.nth(i).locator('select').nth(j))),
                        });
                fact('S7 drop-downs', sel);
                fact('S7 aria snapshot of the CRediT field', L.flat(await L.creditField(dlg).ariaSnapshot(), 1500));
                record(`credit-rows-two-rows${run}`, await screen(page));
                await shot(page, `credit-rows-two-rows${run}`);
                // step 8
                const label = rows.nth(1).locator('label').first();
                fact('S8 label clicked', L.flat(await label.innerText(), 80));
                await label.click({position: {x: 4, y: 4}});
                await L.sleep(250);
                fact('S8 cursor after the click', await L.cursor(page));
                await page.keyboard.press('ArrowDown');
                await L.sleep(400);
                fact('S8 rows after the Down arrow', await L.rowValues(dlg));
                record(`credit-rows-after-key${run}`, await screen(page));
                await shot(page, `credit-rows-after-key${run}`);
                // step 9
                await dlg.getByRole('button', {name: 'Close', exact: true}).first().click();
                await L.sleep(800);
                await idle(page);
            });
        } else if (mode === 'more') {
            await part('M', async () => {
                const dlg = await openWithTwoRows('M');
                if (!dlg) return;
                const rows = L.creditRows(dlg);
                await L.creditField(dlg).getByRole('button', {name: 'Add Another Role', exact: true}).click();
                await L.sleep(500);
                await L.pick(rows.nth(1).locator('select').nth(0), 'Investigation');
                await L.pick(rows.nth(1).locator('select').nth(1), 'Supporting');
                await L.pick(rows.nth(2).locator('select').nth(0), 'Software');
                await L.pick(rows.nth(2).locator('select').nth(1), 'Lead');
                fact('M three rows', await L.rowValues(dlg));
                const names = [];
                for (let i = 0; i < 3; i++)
                    for (let j = 0; j < 2; j++) names.push({row: i + 1, ax: (await L.axOf(page, rows.nth(i).locator('select').nth(j))).name});
                fact('M names with three rows', names);
                // the second row's "Degree" label, then the Down arrow
                await rows.nth(1).locator('label').nth(1).click({position: {x: 4, y: 4}});
                await L.sleep(250);
                fact('M cursor after a click on row 2 "Degree"', await L.cursor(page));
                await page.keyboard.press('ArrowDown');
                await L.sleep(400);
                fact('M rows after the Down arrow', await L.rowValues(dlg));
                // the second row's role label, then a typed letter (type-ahead, no list opened)
                await rows.nth(1).locator('label').first().click({position: {x: 4, y: 4}});
                await L.sleep(250);
                fact('M cursor after a click on row 2 role label', await L.cursor(page));
                await page.keyboard.press('m');
                await L.sleep(400);
                fact('M rows after typing "m"', await L.rowValues(dlg));
                await shot(page, `credit-rows-more${run}`);
                await dlg.getByRole('button', {name: 'Close', exact: true}).first().click();
                await L.sleep(800);
            });
        } else if (mode === 'untouched') {
            await part('untouched', async () => {
                const dlg = await openWithTwoRows('untouched');
                if (!dlg) return;
                const rows = L.creditRows(dlg);
                fact('untouched country select', await L.selectFacts(page, dlg.locator('select[name="country"]').first()));
                fact('untouched given name box id', await dlg.locator('input[name^="givenName"]').first().getAttribute('id'));
                fact('untouched CRediT field id', await L.creditField(dlg).getAttribute('id'));
                await L.pick(rows.nth(0).locator('select').nth(1), 'Lead');
                await L.pick(rows.nth(1).locator('select').nth(0), 'Investigation');
                await L.pick(rows.nth(1).locator('select').nth(1), 'Supporting');
                fact('untouched rows before Save', await L.rowValues(dlg));
                const answer = page
                    .waitForResponse((r) => /\/contributors\/\d+/.test(r.url()) && r.request().method() === 'POST', {timeout: L.T})
                    .catch(() => null);
                await dlg.getByRole('button', {name: 'Save', exact: true}).click();
                const r = await answer;
                const authorId = r ? (r.url().match(/\/contributors\/(\d+)/) || [])[1] : null;
                fact('untouched save', {status: r ? r.status() : null, authorId});
                await dlg.waitFor({state: 'hidden', timeout: L.T}).catch(() => {});
                await idle(page);
                await L.sleep(800);
                fact('untouched stored', L.storedCredit(sql, app, authorId));
                const again = await L.openContributorEdit(page, wf, c.contributor);
                fact('untouched rows in the reopened "Edit"', await L.rowValues(again));
                await shot(page, `credit-rows-untouched-reopened${run}`);
                await again.getByRole('button', {name: 'Close', exact: true}).first().click();
                await L.sleep(800);
            });
        }
    } finally {
        record(`credit-rows-facts${run}`, facts);
        await close();
    }
});
