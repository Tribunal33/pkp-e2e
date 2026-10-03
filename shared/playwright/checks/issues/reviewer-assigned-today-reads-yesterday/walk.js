// U27 A36: in the Add Reviewer list, a reviewer assigned today reads "Yesterday", while the
// entry's own statistics give 0 days since the last assignment
// (docs/issues/U27-A36-reviewer-assigned-today-reads-yesterday.md).
//
// Walks the report's Steps on PKP's default test dataset as `dbarnes`: add Aisla McCrae as a
// reviewer of one submission, then open "Add Reviewer" on another submission in review (the
// round she was added to shows "already assigned" in place of the figures), search "McCrae" and
// read her entry collapsed and expanded; then the control, Julie Janssen, whose last request is
// the dataset's own (made the day the dataset was built).
//   K6_MODE=walk (default): the Steps.
//   K6_MODE=nb: the neighbour check for the fix, without adding anyone: Julie Janssen's entry
//   (assigned on an earlier day) collapsed and expanded.
//
//   PROBE_FEATURE=issues-k6 PROBE_AGENT=k6 ONLY=ojs,omp node bin/probe.js all \
//     shared/playwright/checks/issues/reviewer-assigned-today-reads-yesterday/walk.js
const {forEachApp, launch, signIn, screen, record, shot, sql} = require('../../../probe');
const L = require('../reviewer-template-chooser-nothing-to-choose/lib.js');

const MODE = process.env.K6_MODE || 'walk';

/** Per app, on the default dataset: a submission in review, a reviewer not on it, and the control. */
const CASES = {
    ojs: {id: 12, read: 2, person: 'Aisla McCrae', search: 'McCrae', username: 'amccrae', control: 'Julie Janssen', controlSearch: 'Janssen', controlUser: 'jjanssen'},
    omp: {id: 17, read: 9, person: 'Aisla McCrae', search: 'McCrae', username: 'amccrae', control: 'Julie Janssen', controlSearch: 'Janssen', controlUser: 'jjanssen'},
};

const lastAssigned = (app, username) =>
    sql(app, `select max(ra.date_assigned) from review_assignments ra join users u on u.user_id = ra.reviewer_id where u.username = '${username}'`);

/** Search the open list for a person and read the entry collapsed, then expanded. */
async function readEntry(page, win, search, name) {
    const s = await L.search(page, win, search);
    const entry = (await L.listEntries(win)).find((e) => e.name === name) || null;
    const expanded = entry ? await L.expandEntry(win, name).catch((e) => ({error: String(e.message).slice(0, 200)})) : null;
    return {search: s, collapsed: entry && {last: entry.last, complete: entry.complete, title: entry.title}, expanded};
}

forEachApp(async (app) => {
    const c = CASES[app.name];
    if (!c) return; // a preprint server has no review stage
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submission: c.id, readOn: c.read};
    facts.browserNow = new Date().toString();
    facts.dbNow = sql(app, 'select now()');
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        let modal, win;
        if (MODE === 'walk') {
            modal = await L.openWorkflow(page, app, c.id);
            facts.stage = await L.stageHeading(modal);
            facts.personLastAssignedBefore = lastAssigned(app, c.username);
            win = await L.openAdd(page);
            await L.select(page, win, c.person);
            facts.add = await L.submitAdd(page, win);
            facts.rowAfterAdd = await L.reviewerRow(modal, c.person);
            facts.personLastAssignedAfter = lastAssigned(app, c.username);
        }
        modal = await L.openWorkflow(page, app, c.read);
        facts.readOn = {submission: c.read, stage: await L.stageHeading(modal)};
        if (MODE === 'walk') {
            win = await L.openAdd(page);
            facts.person = await readEntry(page, win, c.search, c.person);
            record(`a36-${MODE}-person`, await screen(page));
            await shot(page, `a36-${MODE}-person`);
            await L.closeAdd(page, win);
        }
        facts.controlLastAssigned = lastAssigned(app, c.controlUser);
        win = await L.openAdd(page);
        facts.control = await readEntry(page, win, c.controlSearch, c.control);
        record(`a36-${MODE}-control`, await screen(page));
        await shot(page, `a36-${MODE}-control`);
        await L.closeAdd(page, win);
    } catch (e) {
        facts.error = String(e && e.message).slice(0, 600);
        await shot(page, `a36-${MODE}-error`).catch(() => {});
    } finally {
        record(`a36-${MODE}-facts`, facts);
        await close();
    }
});
