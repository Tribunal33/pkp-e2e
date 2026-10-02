// U28 A4 issue walk: a reviewer saves text in the review's two boxes with "Save for Later", empties
// both and saves again; the saved texts stay on record, come back on a reload, and are what the
// editor reads after "Submit Review" with both boxes empty. Issue report:
// docs/issues/U28-A4-emptied-review-text-kept-after-save.md. On PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"), journal or press `publicknowledge`. The kit builds
// nothing. A preprint server has no review: not walked. Helpers: ./lib.js.
//
// MODE=walk (default), as `jjanssen` on OJS submission 12 / OMP submission 17:
//   1 open the review; 2 "Accept Review, Continue to Step #2", "Continue to Step #3"; 3 type a text
//   into each box, "Save for Later"; 4 delete both, "Save for Later"; 5 reload; 6 delete both again,
//   (journal) choose "Accept Submission", "Submit Review", "OK"; 7 `dbarnes` opens the workflow and
//   presses "Read Review" on Julie Janssen's row.
// MODE=nb, the neighbour alone (with a fix in and out), as `phudson` on the same submission, every
//   step recorded, none throwing: "Save for Later" with both boxes never filled stores nothing; a
//   text typed in both and saved, then the first replaced by another text and saved, shows the new
//   text and the second box's own after a reload.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/emptied-review-text-kept-after-save/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a4-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const FROM = process.env.FROM || ''; // FROM=submit finishes a walk that stopped after step 5: steps 5 to 7 only
const CASES = {
    ojs: {id: 12, privateLabel: 'For editor', recommendation: 'Accept Submission', reviewer: 'jjanssen', name: 'Julie Janssen', nb: 'phudson'},
    omp: {id: 17, privateLabel: 'For editor only', recommendation: null, reviewer: 'jjanssen', name: 'Julie Janssen', nb: 'phudson'},
};
const FIRST = {author: 'u28c first text for the author', editor: 'u28c first text for the editor'};
const SECOND = 'u28c second text for the author';

forEachApp(async (app) => {
    const c = CASES[app.name];
    if (!c) { console.log(`[a4 ${app.name}] no review: not walked`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE, submission: c.id};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) {
            o[key] = {threw: L.flat(e.message, 400)};
            record(`a4-${MODE}-${key}-threw`, await screen(page).catch(() => ({url: page.url()})));
            await shot(page, `a4-${MODE}-${key}-threw`).catch(() => {});
        }
        console.log(`[a4 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 2500));
        return o[key];
    };
    const snap = async (label) => { record(label, await screen(page)); await shot(page, label).catch(() => {}); };
    try {
        if (MODE === 'nb') {
            await step('open', async () => { await signIn(page, c.nb); return L.openStep3(page, app, c.id, {accept: true}); });
            await step('emptySave', async () => ({...(await L.saveForLater(page)), rows: L.savedRows(app, c.id, c.nb)}));
            await step('typed', async () => {
                await L.typeBoxes(page, app, FIRST);
                return {...(await L.saveForLater(page)), rows: L.savedRows(app, c.id, c.nb)};
            });
            await step('replaced', async () => {
                await L.clearBoxes(page, {editor: false});
                await L.typeBoxes(page, app, {author: SECOND});
                return {...(await L.saveForLater(page)), rows: L.savedRows(app, c.id, c.nb)};
            });
            await step('reloaded', async () => { await L.openStep3(page, app, c.id); await snap('a4-nb-reloaded'); return L.readBoxes(page); });
        } else {
            if (FROM === 'submit') await signIn(page, c.reviewer);
            else {
            await step('open', async () => { await signIn(page, c.reviewer); return L.openStep3(page, app, c.id, {accept: true}); }); // 1, 2
            await step('labels', async () => L.boxLabels(page));
            await step('typed', async () => {                                                                                      // 3
                await L.typeBoxes(page, app, FIRST);
                const s = await L.saveForLater(page);
                await snap('a4-3-saved');
                return {...s, boxes: await L.readBoxes(page), rows: L.savedRows(app, c.id, c.reviewer)};
            });
            await step('emptied', async () => {                                                                                    // 4
                await L.clearBoxes(page);
                const before = await L.readBoxes(page);
                const s = await L.saveForLater(page);
                await snap('a4-4-emptied-saved');
                return {...s, before, boxes: await L.readBoxes(page), rows: L.savedRows(app, c.id, c.reviewer)};
            });
            }
            await step('reloaded', async () => { await L.openStep3(page, app, c.id); await snap('a4-5-reloaded'); return L.readBoxes(page); }); // 5
            await step('submitted', async () => {                                                                                  // 6
                await L.clearBoxes(page);
                const before = await L.readBoxes(page);
                const s = await L.submitReview(page, app, c.recommendation);
                await snap('a4-6-submitted');
                return {...s, before, rows: L.savedRows(app, c.id, c.reviewer)};
            });
            await step('editor', async () => {                                                                                     // 7
                await signIn(page, 'dbarnes');
                const r = await L.editorReadsReview(page, app, c.id, c.name);
                await snap('a4-7-editor');
                return {...r, hasAuthorText: (r.text || '').includes(FIRST.author), hasEditorText: (r.text || '').includes(FIRST.editor)};
            });
        }
    } finally {
        record(`a4-facts-${MODE}${FROM ? `-from-${FROM}` : ''}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
