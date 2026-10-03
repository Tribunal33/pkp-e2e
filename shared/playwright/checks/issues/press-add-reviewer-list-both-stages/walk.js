// U27 OMP2: on a press, the Add Reviewer window's opening list holds the reviewers of both review
// stages, and a reviewer of the other stage picked from it is added to the round
// (docs/issues/U27-OMP2-press-add-reviewer-list-both-stages.md).
//
// Walks the report's Steps on PKP's default test dataset, OMP, as `dbarnes`: submission 9 in
// Internal Review, "Add Reviewer", read the opening list, search "Gallego" and "McCrae", reopen,
// "Select Reviewer" on Adela Gallego (External Reviewer only) from the opening list, "Add
// Reviewer", read the Reviewers panel, reload and read it again.
//   K6_MODE=walk (default): the Steps (OMP).
//   K6_MODE=nb: the neighbour check for the fix, without adding anyone: the opening list of
//   External Review on OMP submission 16, and of Review on OJS submission 12.
//   K6_MODE=other: the two other add modes still add on OMP submission 9's Internal Review:
//   "Enroll Existing User" (Maria Fritz, a copyeditor) and "Create New Reviewer" (u27k6 Created).
//
//   PROBE_FEATURE=issues-k6 PROBE_AGENT=k6 ONLY=omp node bin/probe.js all \
//     shared/playwright/checks/issues/press-add-reviewer-list-both-stages/walk.js
const {forEachApp, launch, signIn, screen, record, shot} = require('../../../probe');
const L = require('../reviewer-template-chooser-nothing-to-choose/lib.js');

const MODE = process.env.K6_MODE || 'walk';

const OTHER = 'Adela Gallego'; // External Reviewer only
const OWN = 'Aisla McCrae'; // Internal Reviewer only

/** The neighbour's lists: a press's External Review, and a journal's one review stage. */
const NB = {omp: {id: 16}, ojs: {id: 12}};

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    if ((MODE === 'walk' || MODE === 'other') && app.name !== 'omp') return;
    if (MODE === 'nb' && !NB[app.name]) return;
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        if (MODE === 'nb') {
            const modal = await L.openWorkflow(page, app, NB[app.name].id);
            facts.submission = NB[app.name].id;
            facts.stage = await L.stageHeading(modal);
            const win = await L.openAdd(page);
            facts.opening = (await L.listEntries(win)).map((e) => e.name);
            record(`omp2-nb-list`, await screen(page));
            await shot(page, `omp2-nb-list`);
            await L.closeAdd(page, win);
            return;
        }
        if (MODE === 'other') {
            facts.submission = 9;
            const modal = await L.openWorkflow(page, app, 9);
            facts.stage = await L.stageHeading(modal);
            facts.enroll = await L.addOtherWay(page, 'enroll', {search: 'Fritz', person: 'Maria Fritz'});
            facts.enrollRow = await L.reviewerRow(modal, 'Maria Fritz');
            facts.create = await L.addOtherWay(page, 'create', {given: 'u27k6', family: 'Created', email: 'u27k6created@mailinator.com', username: 'u27k6created'});
            facts.createRow = await L.reviewerRow(modal, 'u27k6 Created');
            record(`omp2-other`, await screen(page));
            await shot(page, `omp2-other`);
            return;
        }
        facts.submission = 9;
        let modal = await L.openWorkflow(page, app, 9);
        facts.stage = await L.stageHeading(modal);
        let win = await L.openAdd(page);
        facts.opening = (await L.listEntries(win)).map((e) => e.name);
        record(`omp2-${MODE}-opening`, await screen(page));
        await shot(page, `omp2-${MODE}-opening`);
        facts.searchOther = await L.search(page, win, 'Gallego');
        facts.searchOwn = await L.search(page, win, 'McCrae');
        await L.closeAdd(page, win);

        win = await L.openAdd(page);
        const offered = (await L.listEntries(win)).map((e) => e.name);
        facts.otherOfferedOnReopen = offered.includes(OTHER);
        if (!facts.otherOfferedOnReopen) {
            facts.add = 'not offered: Adela Gallego is not in the opening list';
            await L.closeAdd(page, win);
        } else {
            await L.select(page, win, OTHER, {fromSearch: false});
            facts.selected = await win.locator('[id^="selectedReviewerName"]').innerText().catch(() => null);
            facts.add = await L.submitAdd(page, win);
            facts.rowAfterAdd = await L.reviewerRow(modal, OTHER);
            record(`omp2-${MODE}-added`, await screen(page));
            await shot(page, `omp2-${MODE}-added`);
            modal = await L.openWorkflow(page, app, 9);
            facts.stageAfterReload = await L.stageHeading(modal);
            facts.rowAfterReload = await L.reviewerRow(modal, OTHER);
            record(`omp2-${MODE}-reloaded`, await screen(page));
        }
        facts.ownStillListed = offered.includes(OWN);
    } catch (e) {
        facts.error = String(e && e.message).slice(0, 600);
        await shot(page, `omp2-${MODE}-error`).catch(() => {});
    } finally {
        record(`omp2-${MODE}-facts`, facts);
        await close();
    }
});
