// Issue report docs/issues/U53-A9-merge-drops-section-editor-assignments.md: the walk.
//
// On PKP's default test dataset (OJS, OMP, OPS; main and stable-3_5_0), as the Steps say:
//   1  sign in as `rvaca`
//   2  Settings › Journal › "Sections" (Press › "Series", Server › "Sections"): the "Edit" window of
//      the section `dbuskins` edits (OJS "Articles", OMP "Library & Information Studies", OPS
//      "Preprints"), its "Assign … as …" boxes; "Cancel"
//   3  Settings › Users & Roles: dbuskins's "…" › "Merge user" › Minoti Inoue's "Merge into this
//      User" › "OK"
//   4  the same "Edit" window again
// Also read (for the A15 report's reach, OJS and OMP): the participants of the discussion
// "Editor Recommendation" dbuskins takes part in, before and after the merge.
//
// Modes (the first argument):
//   walk       (default) the Steps above
//   neighbour  an editor merged into one already assigned to the same section (OJS, OPS: sberardo
//              into dbuskins; OMP: Stephanie Berardo first ticked on "Library & Information
//              Studies" on screen, then the same merge): the merge must work, dbuskins stay ticked
//              once; walked with the fix in and out
//
// Run (main):  PROBE_FEATURE=issues-r5 PROBE_AGENT=r5 node bin/probe.js all shared/playwright/checks/issues/merge-drops-section-editor-assignments/walk.js [walk|neighbour]
// 3.5:         PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r5-3_5 PROBE_AGENT=r5 node bin/probe.js all …/walk.js
// A fix trial: PROBE_RUN=fix (walk), nb-in / nb-out (neighbour).
const {forEachApp, launch, record, serverLog} = require('../../../probe');
const {flat, mergeUser, sectionEditors, readDiscussion, signIn} = require('../merge-fails-for-discussion-opener/lib');

const MODE = process.argv[2] || 'walk';

const SECTION = {ojs: 'Articles', omp: 'Library & Information Studies', ops: 'Preprints'};
const DISCUSSION = {
    ojs: {id: 2, menuKey: 'workflow_3_2', panelTitle: 'Review Tasks & Discussions'},
    omp: {id: 6, menuKey: 'workflow_2_7', panelTitle: 'Review Tasks & Discussions'},
};
const MERGE = {
    walk: {from: 'dbuskins', search: 'Buskins', into: 'minoue', intoSearch: 'Inoue'},
    neighbour: {from: 'sberardo', search: 'Berardo', into: 'dbuskins', intoSearch: 'Buskins'},
};

forEachApp(async (app) => {
    const out = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const log = serverLog(app);
    const {page, close} = await launch(app);
    const step = async (name, fn) => {
        try {
            out.steps[name] = await fn();
        } catch (e) {
            out.steps[name] = {error: flat(String(e && e.message), 400)};
        }
        record(`a9-${MODE}`, out);
    };
    const section = SECTION[app.name];
    const d = DISCUSSION[app.name];
    try {
        await step('1 sign in', async () => { await signIn(page, 'rvaca'); return 'rvaca'; });
        if (MODE === 'neighbour' && app.name === 'omp') {
            await step('0 sberardo ticked on the series', () => sectionEditors(page, app, section, {label: `s0-${MODE}`, tick: 'Stephanie Berardo'}));
        }
        await step('2 section before', () => sectionEditors(page, app, section, {label: `s2-${MODE}`}));
        if (MODE === 'walk' && d) await step('discussion before', () => readDiscussion(page, app, d, 'Editor Recommendation', `d0-${MODE}`));
        await step('3 merge', () => mergeUser(page, app, {...MERGE[MODE], label: `s3-${MODE}`, log}));
        await step('4 section after', () => sectionEditors(page, app, section, {label: `s4-${MODE}`}));
        if (MODE === 'walk' && d) await step('discussion after', () => readDiscussion(page, app, d, 'Editor Recommendation', `d1-${MODE}`));
        out.summary = {
            before: out.steps['2 section before'] && out.steps['2 section before'].assigned,
            merge: out.steps['3 merge'] && out.steps['3 merge'].status,
            after: out.steps['4 section after'] && out.steps['4 section after'].assigned,
            offeredAfter: out.steps['4 section after'] && out.steps['4 section after'].offered,
        };
        record(`a9-${MODE}`, out);
        console.log(JSON.stringify(out.summary));
    } finally {
        await close();
    }
});
