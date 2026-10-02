// Issue report docs/issues/U53-A15-merge-fails-for-discussion-opener.md: the walk.
//
// On PKP's default test dataset (OJS, OMP, OPS; main and stable-3_5_0), as the Steps say:
//   OJS, OMP: `minoue` opened the discussion "Editor Recommendation" (OJS submission 2 at Review,
//   OMP submission 6 at Internal Review); OPS has none, so 0a–0d: `dbuskins` adds "u53r5 merge
//   check" on submission 1 at Production with Stephanie Berardo ticked.
//   1–6  `rvaca`: Settings › Users & Roles, the merged account's "…" › "Merge user", the chosen
//        account's "Merge into this User" › "OK" (OJS, OMP: minoue into dbuskins; OPS: dbuskins
//        into minoue)
//   7    the list searched again for the merged account
//   8    the merged account's username at sign-in
//   9    the discussion's "Created by:" line and its participants
//
// Modes (the first argument):
//   walk       (default) the Steps above
//   neighbour  an account that only takes part in the discussion merged into another participant
//              (OJS: sberardo into dbuskins; OMP: dbarnes into dbuskins; OPS: 0a–0d, then sberardo
//              into dbuskins): the merge must work and list dbuskins once, with the fix in and out
//
// Run (main):  PROBE_FEATURE=issues-r5 PROBE_AGENT=r5 node bin/probe.js all shared/playwright/checks/issues/merge-fails-for-discussion-opener/walk.js [walk|neighbour]
// 3.5:         PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r5-3_5 PROBE_AGENT=r5 node bin/probe.js all …/walk.js
// A fix trial: PROBE_RUN=fix (walk), nb-in / nb-out (neighbour).
const {forEachApp, launch, record, serverLog} = require('../../../probe');
const {flat, mergeUser, listRow, trySignIn, readDiscussion, addDiscussion, signIn, signOut} = require('./lib');

const MODE = process.argv[2] || 'walk';

/** Per app, on the default dataset: where the discussion is, who is merged into whom. */
const CASES = {
    ojs: {
        where: {id: 2, menuKey: 'workflow_3_2', panelTitle: 'Review Tasks & Discussions'},
        name: 'Editor Recommendation',
        walk: {from: 'minoue', search: 'Inoue', into: 'dbuskins', intoSearch: 'Buskins'},
        neighbour: {from: 'sberardo', search: 'Berardo', into: 'dbuskins', intoSearch: 'Buskins'},
    },
    omp: {
        where: {id: 6, menuKey: 'workflow_2_7', panelTitle: 'Review Tasks & Discussions'},
        name: 'Editor Recommendation',
        walk: {from: 'minoue', search: 'Inoue', into: 'dbuskins', intoSearch: 'Buskins'},
        neighbour: {from: 'dbarnes', search: 'Barnes', into: 'dbuskins', intoSearch: 'Buskins'},
    },
    ops: {
        where: {id: 1, menuKey: 'workflow_5', panelTitle: 'Production Tasks & Discussions'},
        name: 'u53r5 merge check',
        create: {as: 'dbuskins', participant: 'sberardo', participantName: 'Stephanie Berardo', message: 'u53r5: a discussion opened before the merge.'},
        walk: {from: 'dbuskins', search: 'Buskins', into: 'minoue', intoSearch: 'Inoue'},
        neighbour: {from: 'sberardo', search: 'Berardo', into: 'dbuskins', intoSearch: 'Buskins'},
    },
};

forEachApp(async (app) => {
    const c = CASES[app.name];
    const m = c[MODE];
    const out = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const log = serverLog(app);
    const {page, close} = await launch(app);
    const step = async (name, fn) => {
        try {
            out.steps[name] = await fn();
        } catch (e) {
            out.steps[name] = {error: flat(String(e && e.message), 400)};
        }
        record(`a15-${MODE}`, out);
    };
    try {
        if (c.create) {
            await step('0 discussion added', async () => {
                await signIn(page, c.create.as);
                const r = await addDiscussion(page, app, c.where, {name: c.name, ...c.create, label: `s0-${MODE}`});
                await signOut(page);
                return r;
            });
        }
        await signIn(page, 'rvaca');
        await step('before: discussion', () => readDiscussion(page, app, c.where, c.name, `b-${MODE}`));
        await step('1-6 merge', () => mergeUser(page, app, {...m, label: `s6-${MODE}`, log}));
        await step('7 list', async () => ({
            mergedRow: await listRow(page, app, m.search, m.from, `s7-${MODE}-merged`),
        }));
        await step('8 sign-in', () => trySignIn(app, m.from, `s8-${MODE}`));
        await step('9 discussion', () => readDiscussion(page, app, c.where, c.name, `s9-${MODE}`));
        out.summary = {
            merge: out.steps['1-6 merge'] && out.steps['1-6 merge'].status,
            windowStayed: out.steps['1-6 merge'] && out.steps['1-6 merge'].windowOpen,
            mergedStillListed: out.steps['7 list'] && out.steps['7 list'].mergedRow,
            mergedSignsIn: out.steps['8 sign-in'] && out.steps['8 sign-in'].signedIn,
            discussionAfter: out.steps['9 discussion'],
        };
        record(`a15-${MODE}`, out);
        console.log(JSON.stringify(out.summary));
    } finally {
        await close();
    }
});
