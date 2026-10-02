// U71 OMP7 with U24 A6 issue walk: the review stage's own side-menu entry ("Review" on a journal,
// "Internal Review" / "External Review" on a press), pressed instead of one of its rounds, opens a
// page that belongs to no round, and the page's script fails. On PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"), journal or press `publicknowledge`. The kit builds
// nothing. A preprint server has no review stage: nothing to walk on OPS.
//
// MODE=walk (default), per case (OJS 12 "Review"; OMP 17 "Internal Review", OMP 2 "External Review"):
//   1 sign in as dbarnes, open the submission from the dashboard; 2 press the stage's entry;
//   3 "Add Reviewer"; 4 sign in as the author, open it from My Submissions; 5 press the entry;
//   6 reload the page.
// MODE=nb, the neighbour alone (with a fix in and out), every step recorded, none throwing:
//   a review stage without a round (OJS 4 "Review", OMP 16 "Internal Review"), editor and author:
//     the entry is still a page of its own;
//   a round's entry pressed from "Submission" and opened by its address (OJS 12, OMP 17);
//   the stage's key typed on a submission that has left the stage (OJS 3, OMP 1) and a group's
//     key typed (`publication`, OJS 12).
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/issues/review-stage-entry-page-of-no-round/walk.js
//               MODE=nb PROBE_RUN=nb … the same
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/entry-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const W = require('../change-file-keeps-first-upload/lib.js');
const H = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const CASES = {
    ojs: {
        walk: [{key: 'review', id: 12, entry: 'Review', author: 'lchristopher'}],
        nb: [
            {key: 'noRound', id: 4, author: 'cmontgomerie', ops: [['press', 'Review']], both: true},
            {key: 'round', id: 12, ops: [['press', 'Submission'], ['press', 'Review Round 1'], ['typedRound', 3]]},
            {key: 'leftStage', id: 3, ops: [['typed', 'workflow_3'], ['press', 'Review']]},
            {key: 'group', id: 12, ops: [['typed', 'publication']]},
        ],
    },
    omp: {
        walk: [
            {key: 'internal', id: 17, entry: 'Internal Review', author: 'msmith'},
            {key: 'external', id: 2, entry: 'External Review', author: 'afinkel'},
        ],
        nb: [
            {key: 'noRound', id: 16, author: 'mpower', ops: [['press', 'Internal Review']], both: true},
            {key: 'round', id: 17, ops: [['press', 'Submission'], ['press', 'Review Round 1'], ['typedRound', 2]]},
            {key: 'leftStage', id: 1, ops: [['typed', 'workflow_3'], ['press', 'External Review']]},
        ],
    },
};

forEachApp(async (app) => {
    const cases = (CASES[app.name] || {})[MODE] || [];
    if (!cases.length) { console.log(`[entry ${app.name} ${MODE}] nothing to walk on this app`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    const errors = H.watchErrors(page);
    let n = 0;
    const snap = async (name) => {
        const data = await screen(page).catch((e) => ({url: page.url(), error: W.flat(e.message)}));
        const id = `entry-${MODE}-${String(++n).padStart(2, '0')}-${name}`;
        record(id, data);
        await shot(page, id).catch(() => {});
    };
    // One step: run `fn`, then read the workflow's state and the console errors the step logged.
    const step = async (key, fn) => {
        try {
            const did = await fn();
            o[key] = {...(did === undefined ? {} : {did}), ...(await H.state(page)), console: errors.take()};
        } catch (e) {
            o[key] = {threw: W.flat(e.message, 400), console: errors.take()};
        }
        await snap(key).catch(() => {});
        console.log(`[entry ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 1800));
        return o[key];
    };
    try {
        for (const c of cases) {
            o[`${c.key}Rounds`] = H.rounds(app, c.id);
            if (MODE === 'walk') {
                await signIn(page, 'dbarnes');
                errors.take();
                await step(`${c.key}-1-editorOpens`, () => H.open(page, app, c.id));                 // 1
                await step(`${c.key}-2-editorPresses`, () => H.pressEntry(page, c.entry));           // 2
                await step(`${c.key}-3-addReviewer`, () => H.addReviewer(page));                     // 3
                await signIn(page, c.author);
                errors.take();
                await step(`${c.key}-4-authorOpens`, () => H.open(page, app, c.id, {author: true})); // 4
                await step(`${c.key}-5-authorPresses`, () => H.pressEntry(page, c.entry));           // 5
                await step(`${c.key}-6-authorReloads`, () => H.reload(page));                        // 6
                continue;
            }
            for (const who of c.both ? ['dbarnes', c.author] : ['dbarnes']) {
                const author = who !== 'dbarnes';
                const tag = `${c.key}-${author ? 'author' : 'editor'}`;
                await signIn(page, who);
                errors.take();
                await step(`${tag}-opens`, () => H.open(page, app, c.id, {author}));
                let i = 0;
                for (const [op, arg] of c.ops) {
                    const name = `${tag}-${++i}-${op}`;
                    if (op === 'press') await step(name, () => H.pressEntry(page, arg));
                    if (op === 'typed') await step(name, () => H.open(page, app, c.id, {author, key: arg}));
                    if (op === 'typedRound') {
                        const round = o[`${c.key}Rounds`].find((r) => r.stageId === arg);
                        await step(name, () => H.open(page, app, c.id, {author, key: `workflow_${arg}_${round && round.id}`}));
                    }
                }
            }
        }
    } catch (e) {
        o.error = W.flat(e.stack || e.message, 800);
        await snap('error').catch(() => {});
    } finally {
        record(`entry-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
