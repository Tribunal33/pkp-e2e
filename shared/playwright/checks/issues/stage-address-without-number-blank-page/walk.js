// U71 OMP9 with U24 A5 issue walk: a workflow stage's address typed without a submission number
// (or with a number no submission has) gives a blank page, the request failing on the server.
// On PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), journal, press or
// preprint server `publicknowledge`. The kit builds nothing.
//
// MODE=walk (default):
//   1 sign in as dbarnes; 2 type the stage's address without a number; 3 the other stage-naming
//   addresses; 4 a stage's address with number 999999; 5 sign in as an author, type step 2's again.
//   Controls, same walk: `workflow/access` without a number, the stage's address with a number.
// MODE=nb, the neighbour alone (with a fix in and out), every step recorded, none throwing:
//   the numbered stage address for dbarnes (forwards) and for an author of another submission
//   (refused); `workflow/access` with and without a number; `workflow/index/<id>` with no stage;
//   a submission an author began and left unfinished, typed by dbarnes (still "incomplete").
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/stage-address-without-number-blank-page/walk.js
//               MODE=nb PROBE_RUN=nb … the same
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/stage-address-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const {flat, visit} = require('./lib.js');
const S = require('../file-over-request-limit-server-error/lib.js');

const MODE = process.env.MODE || 'walk';
const CASES = {
    ojs: {first: 'externalReview', rest: ['submission', 'editorial', 'production', 'index', 'internalReview'], id: 7, author: 'dsokoloff', other: 'ccorino'},
    omp: {first: 'internalReview', rest: ['externalReview', 'submission', 'editorial', 'production', 'index'], id: 12, author: 'lelder', other: 'afinkel'},
    ops: {first: 'production', rest: ['submission', 'externalReview', 'editorial', 'index', 'internalReview'], id: 1, author: 'ccorino', other: 'ckwantes'},
};

forEachApp(async (app) => {
    const c = CASES[app.name];
    const base = `/index.php/${app.contextPath}/en/workflow`;
    const o = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    let n = 0;
    const step = async (key, fn, {snap = false} = {}) => {
        try {
            o[key] = await fn();
        } catch (e) {
            o[key] = {threw: flat(e.message, 400)};
        }
        if (snap) {
            const id = `stage-address-${MODE}-${String(++n).padStart(2, '0')}-${key}`;
            record(id, await screen(page).catch((e) => ({url: page.url(), error: flat(e.message)})));
            await shot(page, id).catch(() => {});
        }
        console.log(`[stage-address ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 1500));
    };
    try {
        if (MODE === 'walk') {
            await signIn(page, 'dbarnes');                                                              // 1
            await step(`2-${c.first}`, () => visit(page, app, `${base}/${c.first}`), {snap: true});     // 2
            for (const op of c.rest) await step(`3-${op}`, () => visit(page, app, `${base}/${op}`));    // 3
            await step('4-unknownNumber', () => visit(page, app, `${base}/submission/999999`), {snap: true}); // 4
            await step('control-access', () => visit(page, app, `${base}/access`), {snap: true});
            await step('control-numbered', () => visit(page, app, `${base}/${c.first}/${c.id}`), {snap: true});
            await signIn(page, c.author);                                                               // 5
            await step(`5-author-${c.first}`, () => visit(page, app, `${base}/${c.first}`), {snap: true});
        } else {
            await signIn(page, 'dbarnes');
            await step('editor-numbered', () => visit(page, app, `${base}/${c.first}/${c.id}`));
            await step('editor-access', () => visit(page, app, `${base}/access`));
            await step('editor-access-numbered', () => visit(page, app, `${base}/access/${c.id}`));
            await step('editor-index-noStage', () => visit(page, app, `${base}/index/${c.id}`));
            await signIn(page, c.other);
            await step('otherAuthor-numbered', () => visit(page, app, `${base}/${c.first}/${c.id}`), {snap: true});
            // An unfinished submission: the author begins one on "Make a Submission" and leaves it.
            await step('author-begins', async () => ({id: await S.startSubmission(page, app, app.baseURL, c.other, 'u71e unfinished')}));
            const begun = o['author-begins'].id;
            await signIn(page, 'dbarnes');
            if (begun) await step('editor-unfinished', () => visit(page, app, `${base}/submission/${begun}`), {snap: true});
        }
    } catch (e) {
        o.error = flat(e.stack || e.message, 800);
    } finally {
        record(`stage-address-facts-${MODE}`, o);
        await Promise.race([idle(page).catch(() => {}), new Promise((done) => setTimeout(done, 5000))]);
        await close();
    }
});
