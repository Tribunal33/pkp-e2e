// Issue report docs/issues/U10-A8-*.md (U10 A8): the report's Steps to reproduce, walked through
// the screens on PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"). The kit
// builds nothing; the OPS discussion and the library file are made on screen.
//   walk       steps 1–6: as dbarnes, Settings › Website › "Setup" › "Date & Time": the "Time"
//              labels; the third choice, "Save"; a Publisher Library file added, its "Edit"
//              window's "Date uploaded"; a discussion message's date and time
//   neighbour  (the fix's): nothing saved; the "Time" labels (English, French) and the
//              discussion message on the journal's default "Time" (h:i A)
//
// Reset first:  npm run fleet-prep -- --feature issues-u10f --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-u10f PROBE_AGENT=u10f node bin/probe.js all shared/playwright/checks/issues/time-choice-3-05pm-prints-lower-case/walk.js [walk|neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u10f-3_5 --dataset 4 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u10f-3_5 PROBE_AGENT=u10f node bin/probe.js all …/walk.js
// A fix trial: PROBE_RUN=fix (walk), nb-in / nb-out (neighbour).
// Facts: .reports/<feature>/u10f/a8-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, record, screen, sql, serverLog} = require('../../../probe');
const L = require('./lib');
const {addDiscussion} = require('../merge-fails-for-discussion-opener/lib');

const MODE = process.argv[2] || 'walk';
const FILE = 'u10f time check';

/** Per app, on the default dataset: where the discussion is. OPS has none, so a precondition makes one. */
const CASES = {
    ojs: {where: {id: 2, menuKey: 'workflow_3_2', panelTitle: 'Review Tasks & Discussions'}, name: 'Editor Recommendation'},
    omp: {where: {id: 6, menuKey: 'workflow_2_7', panelTitle: 'Review Tasks & Discussions'}, name: 'Editor Recommendation'},
    ops: {
        where: {id: 1, menuKey: 'workflow_5', panelTitle: 'Production Tasks & Discussions'},
        name: 'u10f time check',
        create: {participant: 'dbuskins', participantName: 'David Buskins', message: 'u10f'},
    },
};

forEachApp(async (app) => {
    const c = CASES[app.name];
    const out = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const log = serverLog(app);
    const from = log.mark();
    const {page} = await launch(app);
    const step = async (name, fn) => {
        try {
            out.steps[name] = await fn();
        } catch (e) {
            out.steps[name] = {error: L.flat(String(e && e.message), 400)};
        }
        console.log('[a8]', app.name, name, JSON.stringify(out.steps[name]).slice(0, 900));
    };
    const stored = () => sql(app, `select setting_name, locale, coalesce(setting_value, '<null>') from ${app.contextTables.settings} where setting_name in ('timeFormat','datetimeFormatShort') order by 1, 2`).split('\n');

    await step('1-signIn', async () => { await signIn(page, 'dbarnes'); return page.url(); });
    if (c.create) {
        await step('0-createDiscussion', () => addDiscussion(page, app, c.where, {name: c.name, ...c.create, label: `a8-${MODE}-create`}));
    }
    let form;
    await step('2-timeLabels', async () => { form = await L.openDateTime(page, app); record(`a8-${MODE}-2-tab`, await screen(page)); return L.timeGroups(form); });

    if (MODE === 'neighbour') {
        await step('n3-message', () => L.messageDates(page, app, c.where, c.name, `a8-${MODE}-n3`));
    } else {
        await step('3-chooseThird', async () => { await L.choose(form, 'timeFormat', 2); return L.timeGroups(form); });
        await step('3-save', () => L.save(page, form));
        await step('3-stored', async () => stored());
        await step('3-tabReloaded', async () => { form = await L.openDateTime(page, app); record(`a8-${MODE}-3-tab`, await screen(page)); return L.timeGroups(form); });
        await step('4-addLibraryFile', () => L.addLibraryFile(page, app, FILE));
        await step('5-dateUploaded', () => L.libraryDateUploaded(page, app, FILE, `a8-${MODE}-5-library`));
        await step('6-message', () => L.messageDates(page, app, c.where, c.name, `a8-${MODE}-6`));
    }
    out.serverLog = log.since(from).map((l) => L.flat(l, 400));
    record(`a8-${MODE}`, out);
});
