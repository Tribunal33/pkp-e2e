// U27 A18 walk (issue report docs/issues/U27-A18-emptied-request-letter-half-adds-reviewer.md).
// On PKP's default test dataset, as dbarnes, on a journal's submission 12 (a press's submission 2), both in
// Review: "Reviewers" › "Add Reviewer", search and "Select" a reviewer, the request letter emptied (click in it,
// select all, Delete), "Add Reviewer", "Add Reviewer" pressed again; "Cancel"; the workflow opened again (the
// reviewer's row), the reviewer's mailbox, "Add Reviewer" opened again (the reviewer in the list); then the
// reviewer signs in: their dashboard and the review's page. A preprint server has no review stage.
//   PROBE_FEATURE=issues-k2 PROBE_AGENT=k2 node bin/probe.js all shared/playwright/checks/issues/emptied-request-letter-half-adds-reviewer/walk.js
const {forEachApp, launch, signIn, signOut, screen, record} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    if (!c) {
        console.log(`${app.name}: no review stage, skipped`);
        return;
    }
    const who = c.letter;
    const facts = {app: app.name, line: app.line || 'main', submission: c.id, reviewer: who.name, dialogs: []};
    const {page, close} = await launch(app);
    H.watchDialogs(page, facts.dialogs);
    try {
        // 1-2. dbarnes opens the submission, in Review
        await signIn(page, 'dbarnes');
        let modal = await H.openWorkflow(page, app, c.id);
        facts.rowsBefore = await H.reviewerRows(modal, who.name);
        // 3-4. "Add Reviewer", search, "Select": the letter fills
        const win = await H.openAndSelect(page, who.name);
        facts.letterBefore = await H.letterText(win);
        // 5. the letter emptied
        facts.letterAfter = await H.emptyLetter(page, win);
        record('l5-letter-empty', await screen(page));
        // 6. "Add Reviewer"
        const since = new Date();
        facts.submit = await H.submit(page, app, win, {button: 'Add Reviewer', url: /\/update-reviewer(\?|$)/,
            formSel: 'form#advancedSearchReviewerForm', label: 'l6-after-add'});
        // 7. "Add Reviewer" pressed again
        if (facts.submit.windowOpen) {
            const button = win.getByRole('button', {name: 'Add Reviewer', exact: true});
            facts.againEnabled = await button.isEnabled().catch(() => null);
            facts.again = await H.submit(page, app, win, {button: 'Add Reviewer', url: /\/update-reviewer(\?|$)/,
                formSel: 'form#advancedSearchReviewerForm', label: 'l7-after-second-add'}).catch((e) => ({error: H.flat(e.message, 200)}));
        }
        // 8. "Cancel"
        if (facts.submit.windowOpen) facts.cancel = await H.cancel(page, win, 'form#advancedSearchReviewerForm', 'l7-after-cancel');
        // 9. the workflow again: the reviewer's row
        modal = await H.openWorkflow(page, app, c.id);
        facts.rowsAfter = await H.reviewerRows(modal, who.name);
        record('l8-reviewers', await screen(page));
        // 10. the reviewer's mailbox (bounded wait: the dataset runs jobs on web requests)
        await H.sleep(5000);
        facts.mailsToReviewer = await app.mail.count({to: H.mailOf(who.username), since});
        // 11. "Add Reviewer" again: the reviewer in the list
        facts.reopened = await H.listedAsAssigned(page, who.name);
        // 12-13. the reviewer signs in: the dashboard, the review's page
        facts.reviewer = await H.reviewerSide(page, app, c.id, who.username, 'l13-reviewer');
        await signOut(page);
    } finally {
        record('walk-letter', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
