// Issue report docs/issues/U10-A3-appearance-ordering-arrows-misnamed.md (U10 A3): on Settings ›
// Website › Appearance, a screen reader hears the "Editorial Masthead" list's up arrows by the
// wrong name, and every "Sidebar" tick box by its block's name plus both arrows' texts.
//
// Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's default
// test dataset, as the dataset's editor `dbarnes` on `publicknowledge`: the "Editorial Masthead"
// side tab (the first two roles' arrows; a click on the second role's name), then "Setup" ›
// "Sidebar" (the first block's box and arrows; a click on its drag handle). Nothing is saved.
// The kit builds nothing. All three apps have both lists.
//
// A name is read as Chromium's accessibility tree computes it (what a screen reader is given).
//
// Modes (MODE=):
//   walk (default)  the Steps above.
//   nb              what the fix must leave alone, alone on a fresh reset: a click on a sidebar
//                   block's name still ticks its box; the second role's and the second ticked
//                   block's up arrows still move them, a drag by the handle still moves a block,
//                   both tabs' "Save" keep the new order after a reload; the masthead's
//                   "Enrollment-based Masthead" box keeps its name.
//
// Reset first:  PATH=<psql 16+>:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/appearance-ordering-arrows-misnamed/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, the 3.5 fleet's feature, PROBE_RUN=r35.
// Fix trial:    PROBE_RUN=fix (walk), nb-in / nb-out (MODE=nb), with fix.diff applied or not.
// Records each screen and the facts (facts-<mode>[-<run>]-<app>.json); asserts nothing.
const {forEachApp, launch, signIn, record, shot, screen, idle} = require('../../../probe');
const {axOf} = require('../role-stage-boxes-unnamed/lib.js');

const MODE = process.env.MODE || 'walk';
const THUMB = {ojs: 'journalThumbnail', omp: 'pressThumbnail', ops: 'serverThumbnail'};
const flat = (s, n = 600) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {WebsiteSettings} = require('../../../pages/AppearancePages.js');
    const {page, close} = await launch(app);
    const facts = {mode: MODE, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[${app.name} ${MODE}] ${k}: ${flat(JSON.stringify(v), 1500)}`);
    };
    /** One step; a throw is recorded, never fatal (a fix or an older line changes the screen). */
    const step = async (name, fn) => {
        try {
            return await fn();
        } catch (e) {
            await shot(page, `${name}-error`).catch(() => {});
            return {error: flat(e.message, 2000)};
        }
    };
    const snap = async (name) => {
        await idle(page);
        record(`${name}-screen`, await screen(page));
        await shot(page, name);
    };
    const settings = new WebsiteSettings(page, app.contextPath, {thumbnailField: THUMB[app.name]});

    // An orderable list, read from its arrows so it holds with the arrows inside or outside the
    // row's <label>: row i is the i-th Orderer, its name the first option label of its row.
    const list = (fieldset) => {
        const ups = fieldset.locator('button.orderer__up');
        const downs = fieldset.locator('button.orderer__down');
        const handles = fieldset.locator('.orderer__dragDrop');
        const read = () =>
            fieldset.locator('.orderer').evaluateAll((els) =>
                els.map((o) => {
                    const row = o.closest('label') || o.parentElement;
                    const label = row.querySelector('.pkpFormField--options__optionLabel');
                    const box = row.querySelector('input[type="checkbox"]');
                    return {label: label ? label.textContent.replace(/\s+/g, ' ').trim() : '', checked: box ? box.checked : null};
                })
            );
        const labels = async () => (await read()).map((r) => r.label);
        const index = async (label) => (await labels()).indexOf(label);
        /** The names of row i's box (if any) and arrows, and where the arrows sit. */
        const names = async (i) => {
            const box = fieldset.locator('.orderer').nth(i).evaluate((o) => {
                const row = o.closest('label') || o.parentElement;
                const b = row.querySelector('input[type="checkbox"]');
                return {hasBox: !!b, arrowsInsideLabel: !!o.closest('label')};
            });
            const where = await box;
            const boxes = fieldset.locator('input[type="checkbox"]');
            return {
                row: (await labels())[i],
                ...where,
                box: where.hasBox ? await axOf(page, boxes.nth(i)) : null,
                up: await axOf(page, ups.nth(i)),
                down: await axOf(page, downs.nth(i)),
                upText: flat(await ups.nth(i).innerText(), 200),
            };
        };
        return {ups, downs, handles, read, labels, index, names};
    };

    const masthead = () => list(settings.masthead.form.locator('fieldset.pkpFormField--options').filter({has: page.locator('[id^="appearanceMasthead-mastheadUserGroupIds"]')}));
    const sidebar = () => list(settings.setup.form.locator('fieldset.pkpFormField--options').filter({has: page.locator('input[name="sidebar"]')}));

    try {
        // Step 1.
        await signIn(page, 'dbarnes');
        // Steps 2-3: the masthead list.
        fact('s3-masthead-arrows', await step('s3', async () => {
            await settings.goto();
            await settings.open('appearance-masthead');
            await snap('s2-masthead');
            const m = masthead();
            await m.ups.first().waitFor({timeout: 30_000});
            return {rows: await m.labels(), first: await m.names(0), second: await m.names(1)};
        }));

        if (MODE === 'walk') {
            // Step 4: a click on the second role's name.
            fact('s4-click-role-name', await step('s4', async () => {
                const m = masthead();
                const before = await m.labels();
                const target = page.locator('[id^="appearanceMasthead-mastheadUserGroupIds"]').locator('xpath=ancestor::fieldset[1]')
                    .locator('.pkpFormField--options__optionLabel', {hasText: before[1]}).first();
                await target.click();
                await idle(page);
                const after = await m.labels();
                await shot(page, 's4-after-name-click');
                return {clicked: before[1], before, after, moved: JSON.stringify(before) !== JSON.stringify(after)};
            }));
            // Steps 5-6: the sidebar list.
            fact('s6-sidebar-names', await step('s6', async () => {
                await settings.goto(); // reload: drops the unsaved masthead change
                await settings.open('appearance-setup');
                const s = sidebar();
                await s.ups.first().scrollIntoViewIfNeeded();
                await snap('s5-sidebar');
                return {rows: await s.read(), first: await s.names(0), second: await s.names(1)};
            }));
            // Step 7: a click on the first block's drag handle.
            fact('s7-click-handle', await step('s7', async () => {
                const s = sidebar();
                const before = await s.read();
                await s.handles.first().click();
                await idle(page);
                const after = await s.read();
                await shot(page, 's7-after-handle-click');
                return {before: before[0], after: after[0], ticked: !before[0].checked && after[0].checked};
            }));
        } else {
            // Neighbour 1: the masthead's up arrow still moves a role; Save keeps it.
            fact('n1-masthead-arrow-save', await step('n1', async () => {
                const m = masthead();
                const before = await m.labels();
                await m.ups.nth(1).click();
                await idle(page);
                const moved = await m.labels();
                const status = (await settings.masthead.save()).status();
                await settings.goto();
                await settings.open('appearance-masthead');
                await masthead().ups.first().waitFor({timeout: 30_000});
                return {before, moved, saved: status, reloaded: await masthead().labels()};
            }));
            fact('n2-enrollment-box-name', await step('n2', async () => ({
                enrollment: await axOf(page, settings.masthead.enrollmentBox),
                reviewers: (await settings.masthead.reviewersBox.count()) ? await axOf(page, settings.masthead.reviewersBox) : null,
            })));
            // Neighbour 3: a click on a block's name ticks its box; a second block too.
            fact('n3-sidebar-name-click', await step('n3', async () => {
                await settings.open('appearance-setup');
                const s = sidebar();
                const rows = await s.read();
                const fs = settings.setup.form.locator('fieldset.pkpFormField--options').filter({has: page.locator('input[name="sidebar"]')});
                await fs.locator('.pkpFormField--options__optionLabel', {hasText: rows[0].label}).first().click();
                await fs.locator('.pkpFormField--options__optionLabel', {hasText: rows[1].label}).first().click();
                await idle(page);
                return {before: rows, after: await s.read()};
            }));
            // Neighbour 4: the second block's up arrow and a drag by the last block's handle move
            // blocks; Save keeps the order and the ticks after a reload.
            fact('n4-sidebar-arrow-drag-save', await step('n4', async () => {
                const s = sidebar();
                const before = await s.labels();
                await s.ups.nth(1).click();
                await idle(page);
                const arrowed = await s.labels();
                const n = before.length;
                const fs = settings.setup.form.locator('fieldset.pkpFormField--options').filter({has: page.locator('input[name="sidebar"]')});
                const firstRow = fs.locator('label.pkpFormField--options__option').first();
                await firstRow.scrollIntoViewIfNeeded();
                // Dropped on the first row's name (left of it sits that row's own handle, which
                // with a fix is no longer inside the <label>).
                await s.handles.nth(n - 1).dragTo(firstRow, {targetPosition: {x: 200, y: 3}});
                await idle(page);
                const dragged = await s.read();
                const status = (await settings.setup.save()).status();
                await settings.goto();
                await settings.open('appearance-setup');
                await sidebar().ups.first().waitFor({timeout: 30_000});
                return {before, arrowed, dragged, saved: status, reloaded: await sidebar().read()};
            }));
        }
    } finally {
        record(`facts-${MODE}`, facts);
        await close();
    }
});
