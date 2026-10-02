// Issue report docs/issues/U44-OMP4-press-publish-window-urn-table.md (U44 OMP4): with only "Monographs"
// ticked in the URN settings, a press's publish window shows the URN table with one "Publication" row,
// where a journal with only "Articles" ticked shows one line. Takes the report's Steps on PKP's default
// test dataset (a dataset fleet), as `dbarnes`:
//   OMP  1-3  sign in; Settings › Website › "Plugins": "URN" enabled; "Settings": "Monographs" only, prefix,
//             namespace, resolver, "Save"
//        4    submission 4's workflow, Publication › "Title & Abstract"
//        5    "Publish": the window's URN part read; closed with "Close" without publishing
//        6    Publication › "Identifiers": "Assign", "Save"
//        7    "Publish" again: the window read; closed
//   OJS  control: "Articles" only; submission 5, "Schedule For Publication" (through "Review Publishing
//        Details" on main): the window read; closed. OPS has no URN plugin.
// Each window read records the table's rows (with their warning signs), the one-line warning and the
// "The URN for this publication will be" line, whichever the window holds, so the walk takes the state
// the fix brings without throwing.
// WALK=neighbour runs alone (fix in and out), OMP only: "Monographs" and "Publication Formats" ticked,
// "Publish" read; then "Publication Formats" alone, "Publish" read (both must keep the table).
//
// Reset first:  npm run fleet-prep -- --feature issues-u44p --dataset 7 --reset
// Run (main):   PROBE_FEATURE=issues-u44p PROBE_AGENT=u44p node bin/probe.js all shared/playwright/checks/issues/press-publish-window-urn-table/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u44p-3_5 --dataset 7 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u44p-3_5 PROBE_AGENT=u44p node bin/probe.js all shared/playwright/checks/issues/press-publish-window-urn-table/walk.js
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const {flat, setUrnKinds, readPublishWindow, assignUrn} = require('./lib');

const MODE = process.env.WALK || 'walk';
const KINDS = {
    ojs: ['Issues', 'Articles', 'Galleys'],
    omp: ['Monographs', 'Chapters', 'Publication Formats', 'Files'],
};
// The dataset's production submission each app's steps open (dataset.md): OMP 4, OJS 5.
const SUBMISSION = {omp: 4, ojs: 5};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const kinds = KINDS[app.name];
    if (!kinds) {
        console.log(`[fact] ${app.name} skipped: no URN plugin`);
        return;
    }
    if (MODE === 'neighbour' && app.name !== 'omp') {
        console.log(`[fact] ${app.name} skipped: the neighbour check is OMP's`);
        return;
    }
    const {workflowFrame} = require('../older-version-tab-current-title/lib');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `${s}${run}-${app.name}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1800)}`);
    };
    const sid = SUBMISSION[app.name];

    const {page, close} = await launch(app);
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    const frame = workflowFrame(page, app);
    let currentPublicationId = null;
    page.on('response', async (r) => {
        if (new RegExp(`/submissions/${sid}(\\?|$)`).test(r.url()) && r.request().method() === 'GET' && r.ok()) {
            const body = await r.json().catch(() => null);
            if (body && body.currentPublicationId) currentPublicationId = body.currentPublicationId;
        }
    });
    const openWorkflow = async () => {
        await frame.gotoEditorial(sid);
        await frame.expectVersionLoaded().catch(() => {});
        // The header's "Publish" is offered on the version's pages: open Publication › "Title & Abstract".
        await frame.menuLink('Title & Abstract').first().click();
        await idle(page).catch(() => {});
    };
    const step = async (label, fn) => {
        try {
            fact(label, await fn());
        } catch (e) {
            fact(`${label} threw`, flat(e.message, 300));
            record(name(`${label.split(' ')[0]}-threw`), await screen(page).catch(() => null));
        }
    };

    try {
        await signIn(page, 'dbarnes');
        if (app.name === 'ojs') {
            await step('c1-3 Articles only', () => setUrnKinds(page, app, kinds, ['Articles']));
            await openWorkflow();
            await step('c4 schedule window', () => readPublishWindow(page, app, name('c4-window'), record));
        } else if (MODE === 'neighbour') {
            await step('n1 Monographs and Publication Formats', () => setUrnKinds(page, app, kinds, ['Monographs', 'Publication Formats']));
            await openWorkflow();
            await step('n1 publish window', () => readPublishWindow(page, app, name('n1-window'), record));
            await step('n2 Publication Formats alone', () => setUrnKinds(page, app, kinds, ['Publication Formats']));
            await openWorkflow();
            await step('n2 publish window', () => readPublishWindow(page, app, name('n2-window'), record));
        } else {
            await step('1-3 Monographs only', () => setUrnKinds(page, app, kinds, ['Monographs']));
            await openWorkflow();
            await step('5 publish window, no URN', () => readPublishWindow(page, app, name('5-window'), record));
            // The version's id, from the submission the workflow page itself fetched.
            facts.publicationId = currentPublicationId;
            await step('6 assign URN', () => assignUrn(page, app, frame, sid, currentPublicationId));
            await step('7 publish window, URN assigned', () => readPublishWindow(page, app, name('7-window'), record));
        }
        facts.pageErrors = pageErrors;
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
