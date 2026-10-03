// U27 A19: the Add Reviewer window's template chooser renders on every add, as a select with one
// option ("Review Request"), when the email has no added templates to choose from
// (docs/issues/U27-A19-reviewer-template-chooser-nothing-to-choose.md).
//
// Walks the report's Steps on PKP's default test dataset as `dbarnes`: open a submission in
// review, "Add Reviewer", "Select Reviewer" on Aisla McCrae, read the request form's chooser,
// then "Cancel" (nothing is added).
//   K6_MODE=walk (default): the Steps.
//   K6_MODE=nb: the neighbour check for the fix. First Settings › Workflow › Emails › "Add and
//   edit templates" › "Review Request" › "Add Template" ("Short request u27k6"), then the same
//   Steps: the chooser must still render, with both templates.
//
//   PROBE_FEATURE=issues-k6 PROBE_AGENT=k6 ONLY=ojs,omp node bin/probe.js all \
//     shared/playwright/checks/issues/reviewer-template-chooser-nothing-to-choose/walk.js
const {forEachApp, launch, signIn, screen, record, shot, sql} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.K6_MODE || 'walk';

/** Per app, on the default dataset: a submission in review and a reviewer not on it. */
const CASES = {
    ojs: {id: 12, person: 'Aisla McCrae'},
    omp: {id: 9, person: 'Aisla McCrae'},
};

forEachApp(async (app) => {
    const c = CASES[app.name];
    if (!c) return; // a preprint server has no review stage
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submission: c.id, person: c.person};
    facts.templatesInDb = sql(
        app,
        "select email_key || ' alternate_to=' || coalesce(alternate_to, '-') from email_templates where email_key like 'REVIEW_REQUEST%' or alternate_to like 'REVIEW_REQUEST%' order by 1"
    ).split('\n').filter(Boolean);
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        if (MODE === 'nb') {
            facts.added = await L.addRequestTemplate(page, app, 'Short request u27k6');
        }
        const modal = await L.openWorkflow(page, app, c.id);
        facts.stage = await L.stageHeading(modal);
        const win = await L.openAdd(page);
        await L.select(page, win, c.person);
        facts.form = await L.readChooser(win);
        record(`a19-${MODE}-form`, await screen(page));
        await shot(page, `a19-${MODE}-form`);
        await L.closeAdd(page, win);
        facts.rowAfterCancel = await L.reviewerRow(modal, c.person);
    } catch (e) {
        facts.error = String(e && e.message).slice(0, 600);
        await shot(page, `a19-${MODE}-error`).catch(() => {});
    } finally {
        record(`a19-${MODE}-facts`, facts);
        await close();
    }
});
