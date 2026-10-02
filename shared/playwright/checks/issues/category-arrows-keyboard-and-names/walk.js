// Issue reports (U16, docs/specs/U16-categories.md):
//   docs/issues/U16-A11-category-arrows-keyboard-and-names.md   (A11: the arrows of the "Categories"
//     tab and of the "Select Categories" window cannot be worked from the keyboard, carry one fixed
//     name, and sit invisible on rows with nothing under them)
//   docs/issues/U16-A12-select-categories-column-raw-code.md    (A12: the window's arrow column is
//     announced as "##common.expand##")
//   docs/issues/U16-A18-delete-category-box-unnamed.md          (A18: the delete dialog's box has no name)
// Takes the reports' Steps through the screens on a dataset fleet freshly reset to PKP's default test
// dataset, as the dataset's manager `rvaca` on `publicknowledge`, using the dataset's own categories
// ("Applied Science" > "Computer Science" > "Computer Vision", "Engineering"). The kit builds
// nothing and nothing is saved: the delete dialog is cancelled.
//
// Modes (first argument):
//   steps (default)  A: the tab's arrows (keyboard, names, a row with nothing under it);
//                    B: the "Select Categories" window from the dashboard's "Filters" (column
//                       heading, arrow names, keyboard); C: the delete dialog's box; and, as the
//                       Cause's reach, the "Contributor Roles" delete dialog's box (Settings > Workflow).
//   nb               what the fixes must leave alone: the pointer still opens and closes rows on
//                    the tab and in the window, the tab's own arrow column heading and the window's
//                    "Name" heading are unchanged, ticking a category in the window and its "Save"
//                    still give the chip, the delete button stays greyed until the exact name is
//                    typed (then cancelled).
//
// A name is read as Chromium's accessibility tree computes it (what a screen reader gets).
//
// Reset first:  npm run fleet-prep -- --feature issues-c6 --dataset 6 --reset
// Run (main):   PROBE_FEATURE=issues-c6 PROBE_AGENT=c6 node bin/probe.js all shared/playwright/checks/issues/category-arrows-keyboard-and-names/walk.js [steps|nb]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, feature issues-c6-3_5, PROBE_RUN=r35.
// Fix trial:    PROBE_RUN=fix (steps), nb-in / nb-out (nb), with the fixes applied or not;
//               PROBE_RUN=fix2 (steps) with the A18 fix.diff alone, after it gained the boxes' names.
// Facts: .reports/<feature>/c6/catarrows-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const {axOf} = require('../role-stage-boxes-unnamed/lib.js');

const mode = process.argv[2] || 'steps';
const T = 30_000;
const flat = (s, n = 600) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {CategoriesTab, DeleteCategoryDialog, CategoryPicker, SelectCategoriesWindow} = require('../../../pages/CategoriesPages.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const facts = {app: app.name, line: app.line || 'main', mode, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1600)}`);
    };
    /** Run one part; a throw is recorded, never fatal (a fix or an older line changes the screen). */
    const part = async (name, fn) => {
        try {
            await fn();
        } catch (e) {
            fact(`${name} error`, flat(e.message, 400));
        }
    };

    const {page, close} = await launch(app);
    const tab = new CategoriesTab(page, app.contextPath);

    /** The element holding the keyboard focus: tag, accessible name, state, size, its row. */
    const focused = async () => {
        const raw = await page.evaluate(() => {
            const a = document.activeElement;
            if (!a || a === document.body) return null;
            const r = a.getBoundingClientRect();
            const tr = a.closest('tr');
            return {
                tag: a.tagName.toLowerCase(),
                ariaExpanded: a.getAttribute('aria-expanded'),
                size: `${Math.round(r.width)}x${Math.round(r.height)}`,
                row: tr ? (tr.innerText || '').split('\n')[0].trim() : null,
                html: a.outerHTML.replace(/\s+/g, ' ').slice(0, 300),
            };
        });
        if (!raw) return null;
        return {...raw, ax: await axOf(page, page.locator(':focus'))};
    };
    /** A tab row's arrow: count, accessible node, aria-expanded, drawn size. */
    const arrowFacts = async (arrow) => {
        const n = await arrow.count();
        if (!n) return {count: 0};
        const box = await arrow.first().boundingBox();
        return {
            count: n,
            ax: await axOf(page, arrow),
            ariaExpanded: await arrow.first().getAttribute('aria-expanded'),
            size: box ? `${Math.round(box.width)}x${Math.round(box.height)}` : 'not drawn',
            icon: await arrow.first().locator('svg').count(),
        };
    };
    const tabRows = async () => (await tab.shownNameCells().allInnerTexts()).map((t) => flat(t, 60));
    const headerNames = async (table) => {
        const ths = table.getByRole('columnheader');
        const out = [];
        for (let i = 0; i < (await ths.count()); i++) out.push((await axOf(page, ths.nth(i))).name);
        return out;
    };

    const filtersWin = () => page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Apply Filters', exact: true})}).last();
    const openSelectCategories = async () => {
        await page.goto(`/index.php/${app.contextPath}/en/dashboard/editorial`);
        await idle(page);
        await page.locator('main, #app-main').first().getByRole('button', {name: 'Filters', exact: true}).first().click();
        await filtersWin().getByRole('button', {name: 'Apply Filters', exact: true}).waitFor({timeout: T});
        await idle(page);
        const picker = new CategoryPicker(page, filtersWin());
        const win = await picker.openWindow();
        await idle(page);
        return {picker, win};
    };
    const winRows = async (win) => (await win.read()).filter((r) => r.visible).map((r) => r.name);
    const winArrow = (win, name) => win.row(name).locator('td:last-child button');

    try {
        await signIn(page, 'rvaca');

        if (mode === 'steps') {
            // ---------------------------------------------------------------- A. the tab's arrows (A11)
            await part('A', async () => {
                await tab.goto();
                record(`catarrows-tab${run}`, await screen(page));
                fact('A2 column headings (accessible names)', await headerNames(tab.table()));
                fact('A2 rows shown', await tabRows());
                // Step 3: focus on the row's "More Actions", then Tab once
                await tab.moreActions('Applied Science').focus();
                await page.keyboard.press('Tab');
                await sleep(300);
                fact('A3 focus after Tab from "Applied Science" More Actions', await focused());
                // Step 4: Enter, then Space
                await page.keyboard.press('Enter');
                await idle(page);
                await sleep(500);
                fact('A4 rows after Enter', await tabRows());
                await page.keyboard.press('Space');
                await idle(page);
                await sleep(500);
                fact('A4 rows after Space', await tabRows());
                // Step 5: the closed row's arrow
                fact('A5 "Applied Science" arrow, row closed', await arrowFacts(tab.arrow('Applied Science')));
                // Step 6: a pointer click, then the name again
                await tab.arrow('Applied Science').click();
                await idle(page);
                await sleep(500);
                fact('A6 rows after a click', await tabRows());
                fact('A6 "Applied Science" arrow, row open', await arrowFacts(tab.arrow('Applied Science')));
                record(`catarrows-tab-open${run}`, await screen(page));
                // Step 7: the "Engineering" row (no sub-categories)
                fact('A7 "Engineering" arrow', await arrowFacts(tab.arrow('Engineering')));
                await tab.moreActions('Engineering').focus();
                await page.keyboard.press('Tab');
                await sleep(300);
                fact('A7 focus after Tab from "Engineering" More Actions', await focused());
                fact(
                    'A every arrow name on the tab now',
                    await tab.rows().locator('td:last-child button').evaluateAll((bs) => bs.map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim()))
                );
            });

            // ---------------------------------------------------------------- B. the window (A11 window part, A12)
            await part('B', async () => {
                const {win} = await openSelectCategories();
                record(`catarrows-window${run}`, await screen(page));
                fact('B10 window column headings (accessible names)', await headerNames(win.root().locator('table')));
                fact('B10 window column headings (drawn text)', (await win.root().locator('thead th').allInnerTexts()).map((t) => flat(t, 60)));
                fact('B9 rows shown on open', await winRows(win));
                fact('B11 "Applied Science" arrow on open', await arrowFacts(winArrow(win, 'Applied Science')));
                await winArrow(win, 'Applied Science').click();
                await idle(page);
                await sleep(500);
                fact('B11 rows after a click', await winRows(win));
                fact('B11 "Applied Science" arrow after the click', await arrowFacts(winArrow(win, 'Applied Science')));
                await winArrow(win, 'Applied Science').focus();
                await page.keyboard.press('Enter');
                await idle(page);
                await sleep(500);
                fact('B12 rows after Enter on the arrow', await winRows(win));
                fact('B13 "Sociology" arrow (no sub-categories)', await arrowFacts(winArrow(win, 'Sociology')));
                await win.close();
                await filtersWin().getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
                await sleep(600);
            });

            // ---------------------------------------------------------------- C. the delete dialog (A18)
            await part('C', async () => {
                await tab.goto();
                const dialog = await tab.openDelete('Applied Science');
                await idle(page);
                record(`catarrows-delete${run}`, await screen(page));
                fact('C15 dialog text', flat(await dialog.root().innerText(), 900));
                fact('C16 the box', {
                    count: await dialog.confirmBox().count(),
                    ax: await axOf(page, dialog.confirmBox()),
                    html: flat(await dialog.confirmBox().first().evaluate((el) => el.outerHTML), 300),
                    labelFor: await dialog.confirmBox().first().evaluate((el) => (el.labels && el.labels.length ? el.labels[0].outerHTML : null)),
                });
                fact('C16 textboxes in the dialog by name', await dialog.root().getByRole('textbox').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label'))));
                await dialog.cancel();
            });

            // ---------------------------------------------------------------- reach: Contributor Roles' delete dialog
            await part('reach', async () => {
                await page.goto(`/index.php/${app.contextPath}/en/management/settings/workflow`);
                await idle(page);
                const btn = page.locator('#contributorRoles-button');
                if (!(await btn.count())) return fact('reach Contributor Roles tab', 'absent');
                await btn.click();
                await idle(page);
                const table = page.getByRole('table', {name: 'Contributor Roles'});
                await table.waitFor({timeout: T});
                fact('reach roles', (await table.locator('tbody tr').allInnerTexts()).map((t) => flat(t, 60)));
                await table.locator('tbody tr').first().getByRole('button', {name: 'More Actions'}).click();
                await page.getByRole('menuitem', {name: 'Delete Role', exact: true}).click();
                const dlg = page.getByRole('dialog').filter({hasText: /below to proceed/});
                await dlg.waitFor({timeout: T});
                fact('reach Contributor Roles delete dialog', {
                    text: flat(await dlg.innerText(), 500),
                    box: await axOf(page, dlg.locator('input')),
                    html: flat(await dlg.locator('input').first().evaluate((el) => el.outerHTML), 300),
                    labelFor: await dlg.locator('input').first().evaluate((el) => (el.labels && el.labels.length ? el.labels[0].outerHTML : null)),
                });
                await dlg.getByRole('button', {name: 'Cancel', exact: true}).click();
                await sleep(600);
            });
        } else if (mode === 'nb') {
            // ---------------------------------------------------------------- neighbours
            await part('nb tab', async () => {
                await tab.goto();
                fact('nb tab column headings', await headerNames(tab.table()));
                fact('nb tab rows on load', await tabRows());
                await tab.arrow('Applied Science').click();
                await idle(page);
                await sleep(400);
                fact('nb tab rows after a click', await tabRows());
                await tab.arrow('Computer Science').click();
                await idle(page);
                await sleep(400);
                fact('nb tab rows after "Computer Science" click', await tabRows());
                await tab.arrow('Applied Science').click();
                await idle(page);
                await sleep(400);
                fact('nb tab rows after closing "Applied Science"', await tabRows());
                fact('nb tab cells per row', await tab.rows().evaluateAll((trs) => [...new Set(trs.map((tr) => tr.children.length))]));
            });
            await part('nb delete', async () => {
                const dialog = await tab.openDelete('Applied Science');
                await dialog.confirmBox().fill('applied science');
                const lower = await dialog.deleteButton().isDisabled();
                await dialog.confirmBox().fill('Applied Science');
                const exact = await dialog.deleteButton().isDisabled();
                fact('nb delete button disabled (lower case typed, exact name typed)', [lower, exact]);
                fact('nb delete dialog text', flat(await dialog.root().innerText(), 900));
                await dialog.cancel();
                fact('nb rows after Cancel', await tabRows());
            });
            await part('nb window', async () => {
                const {picker, win} = await openSelectCategories();
                fact('nb window column headings', await headerNames(win.root().locator('table')));
                fact('nb window rows on open', await winRows(win));
                await winArrow(win, 'Applied Science').click();
                await idle(page);
                await sleep(400);
                fact('nb window rows after a click', await winRows(win));
                await winArrow(win, 'Applied Science').click();
                await idle(page);
                await sleep(400);
                fact('nb window rows after a second click', await winRows(win));
                fact('nb window "Sociology" arrow (no sub-categories)', await arrowFacts(winArrow(win, 'Sociology')));
                await win.box('Engineering').check();
                await win.save();
                fact('nb chips after ticking "Engineering" and Save', await picker.chipLines());
                await filtersWin().getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
                await sleep(600);
            });
        }
    } finally {
        record(`catarrows-facts${run}`, facts);
        await close();
    }
});
