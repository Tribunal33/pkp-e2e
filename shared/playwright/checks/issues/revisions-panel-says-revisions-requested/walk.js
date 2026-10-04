// U26 A10 issue walk: the review round's "Revisions Uploaded" list says "These files have been
// submitted by the author after revisions were requested" on a round where no revisions were
// ever requested. On PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// journal or press `publicknowledge`. The steps change nothing; the kit builds nothing.
// A preprint server has no review rounds: not walked.
//
// MODE=walk (default):
//   OJS submission 12 (review round 1, waiting for reviews): 1 sign in as dbarnes, open it,
//   2 read the "Revisions Uploaded" list; 3 sign in as lchristopher, open it from "My
//   Submissions", read the list.
//   OMP submission 2 (external review round 1): the same as dbarnes, then afinkel; submission 17
//   (internal review round 1) as dbarnes.
// MODE=nb, the neighbour alone (with a fix in and out): OJS 13 (round 1 "Revisions have been
//   requested.") as dbarnes: the "Revisions Uploaded" list; OJS 12 and OMP 2 as dbarnes: the
//   "Files for Review" list beside it, which a fix must leave alone.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/revisions-panel-says-revisions-requested/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a10-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const A = require('../author-revisions-upload-offered-then-refused/lib.js');
const R = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const LIST = 'Revisions Uploaded';
const CASES = {
    ojs: {
        walk: [{key: 'editor12', id: 12, user: 'dbarnes'}, {key: 'author12', id: 12, user: 'lchristopher', author: true}],
        nb: [{key: 'editor13', id: 13, user: 'dbarnes'}, {key: 'review12', id: 12, user: 'dbarnes', list: 'Files for Review'}],
    },
    omp: {
        walk: [{key: 'editor2', id: 2, user: 'dbarnes'}, {key: 'author2', id: 2, user: 'afinkel', author: true}, {key: 'editor17', id: 17, user: 'dbarnes'}],
        nb: [{key: 'review2', id: 2, user: 'dbarnes', list: 'Files for Review'}],
    },
};

forEachApp(async (app) => {
    const c = CASES[app.name];
    if (!c) { console.log(`[a10 ${app.name}] no review rounds: not walked`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    const rounds = A.watchRounds(page);
    let n = 0;
    const snap = async (name) => {
        const data = await screen(page).catch((e) => ({url: page.url(), error: String(e.message).slice(0, 300)}));
        const id = `a10-${MODE}-${String(++n).padStart(2, '0')}-${name}`;
        record(id, data);
        await shot(page, id).catch(() => {});
        return data;
    };
    try {
        for (const s of c[MODE]) {
            try {
                await signIn(page, s.user);                                                 // 1, 3
                await A.openWorkflow(page, app, s.id, {author: !!s.author});
                const data = await snap(s.key);
                const main = (data.text && (data.text.dialog || data.text.main)) || '';
                o[s.key] = {
                    user: s.user,
                    submission: s.id,
                    heading: (main.match(/^(Review|External Review|Internal Review)[^\n]*$/m) || [null])[0],
                    list: await R.fileList(page, s.list || LIST),                           // 2
                    rounds: rounds.last(),
                    storedRounds: A.storedRounds(app, s.id),
                    storedDecisions: R.storedDecisions(app, s.id),
                };
            } catch (e) {
                o[s.key] = {threw: String(e.message).slice(0, 400)};
                await snap(`${s.key}-threw`).catch(() => {});
            }
            console.log(`[a10 ${app.name} ${MODE}] ${s.key}`, JSON.stringify(o[s.key]).slice(0, 1200));
        }
    } finally {
        record(`a10-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
