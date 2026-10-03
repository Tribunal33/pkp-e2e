// Issue report docs/issues/U10-A9-date-short-empty-custom-strips-editorial-dates.md (U10 A9): the
// report's Steps to reproduce, walked through the screens on PKP's default test dataset (a dataset
// fleet, harness.md "Dataset fleets"). The kit builds nothing; the OPS discussion is made on screen.
//   walk       steps 1–9: as dbarnes, read a discussion's message date; Settings › Website › "Setup" ›
//              "Date & Time": "Date (Short)" › "Custom", box left empty, "Save"; reload; the
//              discussion again; then the way round (another "Date (Short)", then the
//              "Date & Time (Short)" ready choice)
//   neighbour  (the fix's): "Date (Short)" › "Custom", "d/m/Y" typed, "Save": "Date & Time (Short)"
//              follows and the message prints "dd/mm/yyyy hh:mm AM"; then "Time" on "15:05" (H:i),
//              "Save", "Date (Short)" › "Custom" left empty, "Save": the 24-hour time is kept
//
// Reset first:  npm run fleet-prep -- --feature issues-u10g --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u10g PROBE_AGENT=u10g node bin/probe.js all shared/playwright/checks/issues/date-short-empty-custom-strips-editorial-dates/walk.js [walk|neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u10g-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u10g-3_5 PROBE_AGENT=u10g node bin/probe.js all …/walk.js
// A fix trial: PROBE_RUN=fix (walk), nb-in / nb-out (neighbour).
// Facts: .reports/<feature>/u10g/a9-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, record, sql, serverLog} = require('../../../probe');
const L = require('./lib');
const {addDiscussion} = require('../merge-fails-for-discussion-opener/lib');

const MODE = process.argv[2] || 'walk';

/** Per app, on the default dataset: where the discussion is. OPS has none, so step 0 makes one. */
const CASES = {
    ojs: {where: {id: 2, menuKey: 'workflow_3_2', panelTitle: 'Review Tasks & Discussions'}, name: 'Editor Recommendation'},
    omp: {where: {id: 6, menuKey: 'workflow_2_7', panelTitle: 'Review Tasks & Discussions'}, name: 'Editor Recommendation'},
    ops: {
        where: {id: 1, menuKey: 'workflow_5', panelTitle: 'Production Tasks & Discussions'},
        name: 'u10g date check',
        create: {participant: 'dbuskins', participantName: 'David Buskins', message: 'u10g'},
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
        console.log('[a9]', app.name, name, JSON.stringify(out.steps[name]).slice(0, 700));
    };
    const stored = () => sql(app, `select setting_name, locale, coalesce(setting_value, '<null>') from ${app.contextTables.settings} where setting_name in ('dateFormatShort','datetimeFormatShort') order by 1, 2`).split('\n');

    await step('1-signIn', async () => { await signIn(page, 'dbarnes'); return page.url(); });
    if (c.create) {
        await step('0-createDiscussion', () => addDiscussion(page, app, c.where, {name: c.name, ...c.create, label: `a9-${MODE}-create`}));
    }
    await step('2-messageBefore', () => L.messageDates(page, app, c.where, c.name, `a9-${MODE}-2`));
    let form;
    await step('3-tabAsOpened', async () => { form = await L.openDateTime(page, app); return L.shortGroups(form); });
    await step('storedBefore', async () => stored());

    if (MODE === 'neighbour') {
        await step('n4-customTyped', async () => {
            await L.chooseCustom(form, 'dateFormatShort', 'd/m/Y');
            return L.shortGroups(form);
        });
        await step('n5-save', () => L.save(page, form));
        await step('n5-stored', async () => stored());
        await step('n6-tabReloaded', async () => { form = await L.openDateTime(page, app); return L.shortGroups(form); });
        await step('n7-messageAfter', () => L.messageDates(page, app, c.where, c.name, `a9-${MODE}-n7`));
        // The context's own "Time" kept: "Time" on its first choice ("15:05", H:i), "Save"; then
        // "Date (Short)" › "Custom" left empty, "Save": "Date & Time (Short)" keeps the 24-hour time.
        await step('n8-time24', async () => {
            form = await L.openDateTime(page, app);
            await L.choose(form, 'timeFormat', 0);
            return {saved: await L.save(page, form), stored: stored()};
        });
        await step('n9-customEmpty', async () => {
            form = await L.openDateTime(page, app);
            await L.chooseCustom(form, 'dateFormatShort');
            const before = await L.shortGroups(form);
            return {before, saved: await L.save(page, form), stored: stored()};
        });
        await step('n10-tabReloaded', async () => { form = await L.openDateTime(page, app); return L.shortGroups(form); });
        await step('n11-message', () => L.messageDates(page, app, c.where, c.name, `a9-${MODE}-n11`));
    } else {
        await step('4-customEmpty', async () => {
            await L.chooseCustom(form, 'dateFormatShort');
            return L.shortGroups(form);
        });
        await step('5-save', () => L.save(page, form));
        await step('5-stored', async () => stored());
        await step('6-tabReloaded', async () => { form = await L.openDateTime(page, app); return L.shortGroups(form); });
        await step('7-messageAfter', () => L.messageDates(page, app, c.where, c.name, `a9-${MODE}-7`));
        await step('8-otherDateShort', async () => {
            form = await L.openDateTime(page, app);
            await L.choose(form, 'dateFormatShort', 3);
            const before = await L.shortGroups(form);
            const saved = await L.save(page, form);
            form = await L.openDateTime(page, app);
            return {before, saved, stored: stored(), reloaded: await L.shortGroups(form)};
        });
        await step('8-message', () => L.messageDates(page, app, c.where, c.name, `a9-${MODE}-8`));
        await step('9-readyCombined', async () => {
            form = await L.openDateTime(page, app);
            await L.choose(form, 'datetimeFormatShort', 0);
            const saved = await L.save(page, form);
            return {saved, stored: stored()};
        });
        await step('9-message', () => L.messageDates(page, app, c.where, c.name, `a9-${MODE}-9`));
    }
    out.serverLog = log.since(from).map((l) => L.flat(l, 400));
    record(`a9-${MODE}`, out);
});
