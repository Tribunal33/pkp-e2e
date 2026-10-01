// Issue report walk: docs/issues/U54-A1-A5-roles-list-stale-after-change.md
// (spec U54 register A5, and A1, one cause). Takes the report's Steps through
// the screens on a dataset fleet (PKP's default test dataset, harness.md
// "Dataset fleets"), signed in as `rvaca` (the context's manager):
//   The stage box: 1-2 Settings › Users & Roles › "Roles"; 3 press the
//     unticked "Production" box of "Copyeditor" (OPS: "Editorial Board
//     Member"); 4 press it again; 5 reload; 6 press the now ticked box;
//     7 press it again; 8 reload.
//   A removed role: 9 "Create New Role" (Assistant level, "u54w45 Spare
//     desk", "u54w45"); 10 its "Remove" › "OK"; 11 press its "Production"
//     box; 12 its "Remove" › "OK" again; 13 reload.
//   The first row: 14 the first row's "Settings" arrow.
// Each press records the answer's status, the notice, the box's look, and the
// grid's follow-up `fetch-row` (the row id it asks for, and whether the
// answer is a row or `elementNotFound`).
// Neighbour (the path a fix must leave alone), after step 13: "Remove" › "OK"
// on the "Designer" row (OPS: "Editorial Board Member"; a role the context
// was created with: refused, the row stays); then "Items per page" 10 and
// page "2" (the paging line and the rows; not on OPS, whose five roles show
// no "Items per page:"), then a reload. NEIGHBOUR_ONLY=1 (with its own
// PROBE_RUN) takes the neighbour alone. The kit builds nothing.
//
// Run (main, then stable-3_5_0); reset the fleet first:
//   npm run fleet-prep -- --feature issues-w45 --dataset 1 --reset
//   PROBE_FEATURE=issues-w45 PROBE_AGENT=w45 node bin/probe.js all shared/playwright/checks/issues/roles-list-stale-after-change/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w45-3_5 --dataset 1 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w45-3_5 PROBE_AGENT=w45 node bin/probe.js all shared/playwright/checks/issues/roles-list-stale-after-change/walk.js
// With the fix applied (node bin/try-fix.js apply …/fix.diff ojs omp ops), run with PROBE_RUN=fix.
// Facts: .reports/<feature>/w45/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const NEW_ROLE = 'u54w45 Spare desk';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const {RolesTab} = require('../../../pages/RolesConfigurationPages.js');
    const facts = {line: app.line || 'main', baseURL: app.baseURL};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const ROLE = app.name === 'ops' ? 'Editorial Board Member' : 'Copyeditor';
    // A role the context was created with and nobody holds.
    const NEIGHBOUR_ROLE = app.name === 'ops' ? 'Editorial Board Member' : 'Designer';
    // NEIGHBOUR_ONLY=1 takes only the neighbour checks (a run that already walked the Steps).
    const steps = !process.env.NEIGHBOUR_ONLY;
    const {page, close} = await launch(app);
    // The grid's row refreshes: every fetch-row, with the row id it asks for.
    const rowFetches = [];
    page.on('response', async (r) => {
        if (!/user-group-grid\/fetch-row/.test(r.url())) return;
        const rowId = new URL(r.url()).searchParams.get('rowId');
        let body = null;
        try { body = await r.json(); } catch (e) { /* not JSON */ }
        rowFetches.push({rowId, status: r.status(),
            elementNotFound: body && body.elementNotFound !== undefined ? body.elementNotFound : null,
            rowName: body && body.content ? flat((body.content.match(/-name"[^>]*>\s*<span class="label[^"]*">([^<]*)/) || [])[1], 80) : null});
    });
    let n = 0;
    const snap = async (name) => {
        const s = await screen(page);
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(page, `${String(n).padStart(2, '0')}-${name}`);
        return s;
    };
    const notices = async () => flat(await page.locator('.app__notifications').innerText().catch(() => ''));
    try {
        await signIn(page, 'rvaca');
        const roles = new RolesTab(page, app.contextPath, {stages: []});
        await roles.goto();
        const cols = await roles.columns();
        roles.stages = cols.slice(cols.length - (await roles.stageBoxes(ROLE).count()));
        fact('columns', cols);
        const STAGE = 'Production';
        if (!roles.stages.includes(STAGE)) throw new Error(`no Production column: ${cols.join(', ')}`);
        const rowIds = async () => page.locator('#roleGridContainer tbody tr.gridRow').evaluateAll((trs) =>
            trs.map((tr) => `${tr.id.replace(/^.*-row-/, '')}:${((tr.querySelector('[id$="-name"] .label') || {}).innerText || '').trim()}`));
        fact('02-row ids (row id:role) on landing', await rowIds());
        await snap('roles-landing');

        // One press of a box: the answer, the notice, the look, the refresh.
        const press = async (label, name) => {
            const before = rowFetches.length;
            const resp = await roles.pressStageBox(name, STAGE).catch((e) => ({status: () => `no answer: ${e.message.split('\n')[0]}`, url: () => ''}));
            await idle(page).catch(() => {});
            await pause(1200);
            const out = {status: resp.status(), op: (resp.url().match(/(un)?assign-stage/) || [''])[0],
                notice: await notices(), box: (await roles.boxStates(name).catch(() => ({})))[STAGE] || null,
                fetchRow: rowFetches.slice(before)};
            fact(label, out);
            await snap(label);
            return out;
        };

        if (steps) {
        // The stage box: tick.
        fact('02-box before', (await roles.boxStates(ROLE))[STAGE]);
        await press('03-press unticked box', ROLE);
        await press('04-press it again', ROLE);
        await roles.reload();
        fact('05-after reload', (await roles.boxStates(ROLE))[STAGE]);
        await snap('05-after-reload');
        // The stage box: untick.
        await press('06-press ticked box', ROLE);
        await press('07-press it again', ROLE);
        await roles.reload();
        fact('08-after reload', (await roles.boxStates(ROLE))[STAGE]);
        await snap('08-after-reload');

        // A removed role.
        const win = await roles.openCreate();
        const levels = await win.levelOptions();
        const assistant = levels.find((l) => /^Assistant$/.test(l));
        if (!assistant) throw new Error(`no Assistant level: ${levels.join(', ')}`);
        await win.chooseLevel(assistant);
        await win.nameBox('en').fill(NEW_ROLE);
        await win.abbrevBox('en').fill('u54w45');
        const saved = await win.save();
        await pause(1000);
        fact('09-create', {status: saved.status(), notice: await notices(), rows: await rowIds()});
        await snap('09-created');
        const first = (await roles.rowNames())[0];
        if (first === NEW_ROLE) {
            fact('09-note', 'the new role is listed first (A13): no arrow, so steps 10-12 cannot be taken; stopping');
        } else {
            const before = rowFetches.length;
            const dialog = await roles.openRemove(NEW_ROLE);
            const r1 = await dialog.ok();
            await pause(1200);
            fact('10-remove', {status: r1.status(), notice: await notices(), rowStillListed: await roles.row(NEW_ROLE).count(), fetchRow: rowFetches.slice(before)});
            await snap('10-removed');
            if (await roles.row(NEW_ROLE).count()) {
                await press('11-press box of removed role', NEW_ROLE);
                const b2 = rowFetches.length;
                const line = page.locator(`tr[id="${await roles.row(NEW_ROLE).getAttribute('id')}"] + tr`);
                if (!(await line.getByRole('link', {name: 'Remove', exact: true}).isVisible())) {
                    await roles.row(NEW_ROLE).locator('a.show_extras').click();
                }
                const answer = page.waitForResponse((r) => r.url().includes('remove-user-group'), {timeout: 20_000});
                await line.getByRole('link', {name: 'Remove', exact: true}).click();
                await page.getByRole('dialog').filter({hasText: 'You are about to remove this role'})
                    .getByRole('button', {name: 'OK', exact: true}).click();
                const r2 = await answer.catch(() => null);
                await idle(page).catch(() => {});
                await pause(1500);
                fact('12-remove again', {status: r2 ? r2.status() : 'no answer', notice: await notices(), fetchRow: rowFetches.slice(b2)});
                await snap('12-removed-again');
            }
            await roles.reload();
            fact('13-after reload', {listed: await roles.row(NEW_ROLE).count()});
            await snap('13-after-reload');
        }

        // The first row.
        const firstRow = page.locator('#roleGridContainer tbody tr.gridRow').first();
        fact('14-first row', {row: flat(await firstRow.locator('[id$="-name"] .label').innerText(), 80),
            arrow: await firstRow.locator('a.show_extras, a.hide_extras').count(),
            rowsWithArrow: await page.locator('#roleGridContainer tbody tr.gridRow a.show_extras').count(),
            rows: await roles.rows().count()});

        }

        // Neighbour: a role the context was created with stays refused and listed.
        {
            const before = rowFetches.length;
            const dialog = await roles.openRemove(NEIGHBOUR_ROLE);
            const r = await dialog.ok();
            await pause(1200);
            fact('N1-remove a default role', {status: r.status(), notice: await notices(), rowStillListed: await roles.row(NEIGHBOUR_ROLE).count(), fetchRow: rowFetches.slice(before)});
            await snap('N1-remove-default');
        }
        // Neighbour: paging, 10 per page, page 2 (a preprint server's five roles show no "Items per page").
        if (!(await roles.itemsPerPage.isVisible())) {
            fact('N2-paging', 'no "Items per page:" on this list');
            return;
        }
        await roles.chooseItemsPerPage('10');
        fact('N2-10 per page', {line: await roles.pagingLine(), rows: await rowIds()});
        await roles.gotoListPage('2');
        const p2first = page.locator('#roleGridContainer tbody tr.gridRow:visible').first();
        fact('N3-page 2', {line: await roles.pagingLine(), rows: await rowIds(),
            firstRowArrow: await p2first.locator('a.show_extras, a.hide_extras').count()});
        await snap('N3-page-2');
        await roles.reload();
        fact('N4-after reload', {line: await roles.pagingLine(), rows: (await rowIds()).length});
    } finally {
        record('facts', facts);
        await close();
    }
});
