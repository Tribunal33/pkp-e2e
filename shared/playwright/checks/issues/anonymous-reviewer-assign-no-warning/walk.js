// U35 A11 walk (issue report docs/issues/U35-A11-anonymous-reviewer-assign-no-warning.md).
// On PKP's default test dataset, as dbarnes, on a journal's submission 12 (a press's submission 2), both in
// Review: "Reviewers" › "Add Reviewer" › "Enroll Existing User", "Minoti Inoue" picked under "Search By Name",
// "Review Type" left at "Anonymous Reviewer/Anonymous Author", "Add Reviewer"; then "Participants" › "Assign",
// the role "Section editor" ("Series editor"), "Search", "Minoti Inoue" chosen (the warning is expected here),
// "OK". A preprint server has no review and is skipped.
//   PROBE_FEATURE=issues-r4 PROBE_AGENT=r4 node bin/probe.js all shared/playwright/checks/issues/anonymous-reviewer-assign-no-warning/walk.js
const {forEachApp, launch, signIn, signOut, screen, record} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    if (!c.id) {
        console.log(`${app.name}: no review stage, skipped`);
        return;
    }
    const facts = {app: app.name, line: app.line || 'main', submission: c.id, steps: {}};
    const {page, close} = await launch(app);
    try {
        // 1-2. dbarnes opens the submission, which is in Review
        await signIn(page, 'dbarnes');
        let panel = await H.openWorkflow(page, app, c.id);
        record('w2-review', await screen(page));
        // 3-4. the Section (Series) editor becomes an anonymous reviewer
        facts.steps.enroll = await H.enrollReviewer(page, {search: c.search, person: c.person, label: 'w4'});
        panel = await H.openWorkflow(page, app, c.id);
        facts.steps.reviewerRows = await H.reviewerRows(page, c.person);
        record('w4-reviewers', await screen(page));
        // 5-7. "Assign": the role, "Search", the person (warning expected), "OK"
        facts.steps.assign = await H.assign(page, panel, {role: c.role, person: c.person, label: 'w6'});
        record('w7-participants', await screen(page));
        await signOut(page);
        const a = facts.steps.assign;
        facts.observed = {
            enrolled: {status: facts.steps.enroll.status, reviewType: facts.steps.enroll.reviewType, rows: facts.steps.reviewerRows},
            anonymousReviewerIdsInForm: a.ids,
            chosenValue: a.chosenValue,
            listed: a.listed,
            warning: a.warning,
            save: a.save,
            participants: a.participants,
        };
    } finally {
        record('walk', facts);
        console.log(JSON.stringify(facts.observed || facts, null, 1));
        await close();
    }
});
