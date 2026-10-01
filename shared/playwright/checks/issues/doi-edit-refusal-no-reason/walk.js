// Issue report docs/issues/U45-A3-doi-edit-refusal-no-reason.md (U45 A3): a
// DOI typed on the DOIs page that the server refuses gives only "Some DOI(s)
// could not be updated", never the reason. Takes the report's Steps through
// the screens on a dataset fleet freshly reset to PKP's default test dataset,
// as the dataset's `dbarnes` on `publicknowledge`. The kit builds nothing.
//
//   1. sign in as dbarnes; side menu "DOIs"
//   2. expand X, "Edit", type 10.1234/u45ir10, "Save" (accepted)
//   3. expand Y, "Edit", type abc, "Save"
//   4. "Edit", type 10.1234/a b, "Save"
//   5. "Edit", type 10.1234/u45ir10 (X's DOI), "Save"
//   control (the neighbour a fix must leave alone): "Edit", type
//   10.1234/u45ir10-y, "Save" (accepted, the success notice and no window)
// X, Y: OJS 17 and 5, OMP 5 and 14, OPS 2 and 5. The box is the work's own
// row ("Article", "Monograph", "Preprint"), the first of the table.
//
// WALK=versions (OPS, whose dataset has "DOI Versioning" "Yes" and preprint 3
// in two published versions): step 2, then expand 3, "View all", the
// window's "Edit", type X's DOI into the first version's "Preprint" box, the
// window's "Save"; a window that opens is answered "OK", and the side window
// must still be there.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=ir10 node bin/probe.js all shared/playwright/checks/issues/doi-edit-refusal-no-reason/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, the line fleet's
//               feature, and PROBE_RUN=r35 in front of the run.
// PROBE_RUN=fix names the run with fix.diff applied.
// Facts: .reports/<feature>/ir10/edit-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const {watchDialogs, takeDialogs, takeNotices, watchDoiAnswers} = require('../bulk-action-refusal-no-message/lib.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const X = {ojs: 17, omp: 5, ops: 2};
const Y = {ojs: 5, omp: 14, ops: 5};
const DOI_X = '10.1234/u45ir10';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {DoisPage, recordNotices} = require('../../../pages/DoisPages.js');
    const {expect} = require('@playwright/test');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1400)}`);
    };

    const {page, close} = await launch(app);
    try {
        await recordNotices(page);
        await watchDialogs(page);
        const answers = watchDoiAnswers(page);
        const dois = new DoisPage(page, app.contextPath);

        /** On row `id`: "Edit", type `value` in the work's own box, "Save"; read what follows. */
        const type = async (step, id, value) => {
            const row = dois.row(id);
            await dois.expand(row, id);
            const label = (await dois.doiTypes(row))[0];
            await dois.startEditing(row);
            const box = dois.doiRows(row).first().locator('input[type="text"]');
            const before = await box.inputValue();
            await box.fill(value);
            await takeDialogs(page);
            await takeNotices(page);
            // "Save": wait for the first DOI request's answer, then for the page to settle (a
            // window may open over the list, which hides the row's buttons from role reads)
            const answered = page.waitForResponse((r) => /\/api\/v1\/dois(\/\d+)?(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
            await dois.editButton(row).click();
            await answered;
            await idle(page);
            await sleep(1500);
            const s = await screen(page);
            record(`edit-${step}${run}`, s);
            await shot(page, `edit-${step}${run}`).catch(() => {});
            const open = page.getByRole('dialog');
            const out = {
                row: id, box: label, before, typed: value,
                answers: answers.take(),
                notices: await takeNotices(page),
                windowsShown: await takeDialogs(page),
                windowOpenNow: (await open.count()) ? flat(await open.last().innerText()) : null,
                boxAfter: await box.inputValue(),
                badge: flat(await dois.rowBadge(row).innerText()),
            };
            if (await open.count()) {
                await open.last().getByRole('button', {name: 'OK', exact: true}).click();
                await expect(open).toHaveCount(0, {timeout: T});
            }
            await expect(dois.editButton(row)).toHaveText(/^\s*Edit\s*$/, {timeout: T});
            return out;
        };

        await signIn(page, 'dbarnes');
        await dois.goto();
        fact('2 X accepted', await type('2-x', X[app.name], DOI_X));
        if (process.env.WALK === 'versions') {
            if (app.name !== 'ops') return;
            const row = dois.row(3);
            await dois.expand(row, 3);
            const bar = flat(await dois.versionsBar(row).innerText());
            await dois.openVersionsWindow(row);
            const headings = (await dois.versionHeadings().allInnerTexts()).map((t) => flat(t));
            await dois.versionsEditButton().click();
            const box = dois.versionsWindow().locator('.doiListItem__versionContainer').first().locator('tbody tr input[type="text"]').first();
            const before = await box.inputValue();
            await box.fill(DOI_X);
            await takeDialogs(page);
            await takeNotices(page);
            const answered = page.waitForResponse((r) => /\/api\/v1\/dois(\/\d+)?(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
            await dois.versionsWindow().locator('.doiListItem__versionContainer--actionsBar button').filter({hasText: /^\s*Save\s*$/}).click();
            await answered;
            await idle(page);
            await sleep(1500);
            record(`edit-versions${run}`, await screen(page));
            await shot(page, `edit-versions${run}`).catch(() => {});
            const failed = page.getByRole('dialog').filter({hasText: 'DOI Updates Failed'});
            const out = {bar, headings, before, typed: DOI_X, answers: answers.take(), notices: await takeNotices(page),
                windowsShown: (await takeDialogs(page)).filter((t) => !/^DOIs for all versions/.test(t)),
                failedWindow: (await failed.count()) ? flat(await failed.last().innerText()) : null};
            if (await failed.count()) {
                await failed.last().getByRole('button', {name: 'OK', exact: true}).click();
                await expect(failed).toHaveCount(0, {timeout: T});
            }
            await sleep(700);
            out.sideWindowStillOpen = await dois.versionsWindow().isVisible();
            out.boxAfter = await box.inputValue();
            out.editButtonAfter = flat(await dois.versionsWindow().locator('.doiListItem__versionContainer--actionsBar button').last().innerText());
            fact('versions window, duplicate', out);
            return;
        }
        fact('3 abc', await type('3-abc', Y[app.name], 'abc'));
        fact('4 space', await type('4-space', Y[app.name], '10.1234/a b'));
        fact('5 duplicate', await type('5-duplicate', Y[app.name], DOI_X));
        fact('control accepted', await type('ctl', Y[app.name], `${DOI_X}-y`));
        await dois.reload();
        const row = dois.row(Y[app.name]);
        await dois.expand(row, Y[app.name]);
        fact('after reload', {y: flat(await dois.expanded(row).locator('table').innerText())});
    } finally {
        record(`edit-facts${run}`, facts);
        await close();
    }
});
