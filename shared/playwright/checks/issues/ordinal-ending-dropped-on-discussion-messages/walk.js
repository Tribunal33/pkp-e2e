// Issue report docs/issues/U10-A18-ordinal-ending-dropped-on-discussion-messages.md (U10 A18): the
// report's Steps to reproduce, walked through the screens on PKP's default test dataset (a dataset
// fleet, harness.md "Dataset fleets"). The kit builds nothing; the OPS discussion and the library
// file are made on screen.
//   walk       steps 1–5: as dbarnes, Settings › Website › "Setup" › "Date & Time": "Date & Time
//              (Short)" › "Custom" `jS M Y H:i`, "Save"; a library file added, its "Edit" window's
//              "Date uploaded"; a discussion message's date and time
//   short      steps S1–S3 ("Date (Short)" path, the one the 3.5 screens reach): as dbarnes,
//              "Date (Short)" › "Custom" `jS M Y`, "Save"; a submission's workflow: every short date
//              it shows (OJS 12 and OMP 2 at Review, the reviewers' "Response due"; OPS 1, its files)
//   neighbour  (the fix's): steps 1–5 with `j \S M Y H:i` (an escaped S, a literal "S"), so the
//              fix must leave it printing "S"
//
// Reset first:  npm run fleet-prep -- --feature issues-h19r --dataset 7 --reset
// Run (main):   PROBE_FEATURE=issues-h19r PROBE_AGENT=h19r node bin/probe.js all shared/playwright/checks/issues/ordinal-ending-dropped-on-discussion-messages/walk.js [walk|neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-h19r-3_5 --dataset 7 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-h19r-3_5 PROBE_AGENT=h19r node bin/probe.js all …/walk.js
// A fix trial: PROBE_RUN=fix (walk), nb-in / nb-out (neighbour).
// Facts: .reports/<feature>/h19r/a18-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, record, screen, sql, serverLog} = require('../../../probe');
const L = require('./lib');

const MODE = process.argv[2] || 'walk';
const PATTERN = MODE === 'neighbour' ? 'j \\S M Y H:i' : MODE === 'short' ? 'jS M Y' : 'jS M Y H:i';

/** Per app, for the "Date (Short)" path: the submission whose workflow shows short dates. */
const SHORT = {ojs: {id: 12, menuKeys: [null]}, omp: {id: 2, menuKeys: [null]}, ops: {id: 1, menuKeys: [null, 'workflow_1', 'workflow_5']}};
const NAME = 'h19r ordinal check';

/** Per app, on the default dataset: where the discussion is. OPS has none, so a precondition makes one. */
const CASES = {
    ojs: {where: {id: 2, menuKey: 'workflow_3_2', panelTitle: 'Review Tasks & Discussions'}, name: 'Editor Recommendation'},
    omp: {where: {id: 6, menuKey: 'workflow_2_7', panelTitle: 'Review Tasks & Discussions'}, name: 'Editor Recommendation'},
    ops: {
        where: {id: 1, menuKey: 'workflow_5', panelTitle: 'Production Tasks & Discussions'},
        name: NAME,
        create: {participant: 'dbuskins', participantName: 'David Buskins', message: 'h19r'},
    },
};

forEachApp(async (app) => {
    const c = CASES[app.name];
    const out = {app: app.name, line: app.line || 'main', mode: MODE, pattern: PATTERN, steps: {}, pageErrors: []};
    const log = serverLog(app);
    const from = log.mark();
    const {page} = await launch(app);
    page.on('pageerror', (e) => out.pageErrors.push(L.flat(e.message, 300)));
    const step = async (name, fn) => {
        try {
            out.steps[name] = await fn();
        } catch (e) {
            out.steps[name] = {error: L.flat(String(e && e.message), 400)};
        }
        console.log('[a18]', app.name, name, JSON.stringify(out.steps[name]).slice(0, 900));
    };
    const stored = () => sql(app, `select locale, coalesce(setting_value, '<null>') from ${app.contextTables.settings} where setting_name = 'datetimeFormatShort' order by 1`).split('\n');

    await step('1-signIn', async () => { await signIn(page, 'dbarnes'); return page.url(); });
    if (MODE === 'short') {
        const shortStored = () => sql(app, `select setting_name, locale, coalesce(setting_value, '<null>') from ${app.contextTables.settings} where setting_name in ('dateFormatShort','datetimeFormatShort') order by 1, 2`).split('\n');
        let f;
        await step('S2-custom', async () => {
            f = await L.openDateTime(page, app);
            await L.chooseCustom(f, 'dateFormatShort', PATTERN);
            return {dateFormatShort: await L.readGroup(f, 'dateFormatShort'), datetimeFormatShort: await L.readGroup(f, 'datetimeFormatShort')};
        });
        await step('S2-save', () => L.save(page, f));
        await step('S2-stored', async () => shortStored());
        for (const key of SHORT[app.name].menuKeys) {
            await step(`S3-workflow-${key || 'default'}`, () => L.workflowDates(page, app, SHORT[app.name].id, key, `a18-${MODE}-S3-${key || 'default'}`));
        }
        out.serverLog = log.since(from).map((l) => L.flat(l, 400));
        record(`a18-${MODE}`, out);
        return;
    }
    if (c.create) {
        await step('0-createDiscussion', () => L.addDiscussion(page, app, c.where, {name: c.name, ...c.create, label: `a18-${MODE}-create`}));
    }
    await step('0-messageBefore', () => L.messageDates(page, app, c.where, c.name, `a18-${MODE}-0`));
    let form;
    await step('2-custom', async () => {
        form = await L.openDateTime(page, app);
        await L.chooseCustom(form, 'datetimeFormatShort', PATTERN);
        return L.readGroup(form, 'datetimeFormatShort');
    });
    await step('2-save', () => L.save(page, form));
    await step('2-stored', async () => stored());
    await step('2-tabReloaded', async () => {
        form = await L.openDateTime(page, app);
        record(`a18-${MODE}-2-tab`, await screen(page));
        return L.readGroup(form, 'datetimeFormatShort');
    });
    await step('3-addLibraryFile', () => L.addLibraryFile(page, app, NAME));
    await step('4-dateUploaded', () => L.libraryDateUploaded(page, app, NAME, `a18-${MODE}-4-library`));
    await step('5-message', () => L.messageDates(page, app, c.where, c.name, `a18-${MODE}-5`));
    out.serverLog = log.since(from).map((l) => L.flat(l, 400));
    record(`a18-${MODE}`, out);
});
