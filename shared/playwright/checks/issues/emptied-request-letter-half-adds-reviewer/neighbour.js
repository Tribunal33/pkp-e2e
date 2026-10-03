// U27 A18 neighbour check (issue report docs/issues/U27-A18-emptied-request-letter-half-adds-reviewer.md):
// what the fix must leave alone. On PKP's default
// test dataset, as dbarnes, on a journal's submission 12 (a press's submission 2):
//   control: "Add Reviewer", "Select" a reviewer, nothing changed, "Add Reviewer": added, the request mail sent;
//   skip:    "Add Reviewer", "Select" another, the letter emptied and "Do not send email to reviewer" ticked,
//            "Add Reviewer": added, no mail;
//   edit:    the control reviewer's "Edit", "Review Due Date" a week later than shown, "OK": saved;
//   space:   "Add Reviewer", "Select" another, the letter emptied and one space typed in it, "Add Reviewer"
//            (recorded as it happens; on 2026-10-03 the editor did not keep the space and the letter posted empty).
//   PROBE_FEATURE=issues-k2 PROBE_AGENT=k2 node bin/probe.js all shared/playwright/checks/issues/emptied-request-letter-half-adds-reviewer/neighbour.js
const {forEachApp, launch, signIn, signOut, screen, record} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    if (!c) {
        console.log(`${app.name}: no review stage, skipped`);
        return;
    }
    const facts = {app: app.name, line: app.line || 'main', submission: c.id, dialogs: [], control: {}, skip: {}, edit: {}, space: {}};
    const {page, close} = await launch(app);
    H.watchDialogs(page, facts.dialogs);
    try {
        await signIn(page, 'dbarnes');
        let modal = await H.openWorkflow(page, app, c.id);
        // control: a plain add
        let since = new Date();
        let win = await H.openAndSelect(page, c.control.name);
        facts.control.submit = await H.submit(page, app, win, {button: 'Add Reviewer', url: /\/update-reviewer(\?|$)/,
            formSel: 'form#advancedSearchReviewerForm', label: 'n-control'});
        modal = await H.openWorkflow(page, app, c.id);
        facts.control.rows = await H.reviewerRows(modal, c.control.name);
        facts.control.mail = await app.mail.find({to: H.mailOf(c.control.username), since, timeoutMs: 20_000})
            .then((m) => H.flat(m.Subject, 120)).catch(() => null);
        // skip: the letter emptied, "Do not send email to reviewer" ticked
        since = new Date();
        win = await H.openAndSelect(page, c.skip.name);
        facts.skip.letterAfter = await H.emptyLetter(page, win);
        await win.locator('input[name="skipEmail"]').check();
        facts.skip.submit = await H.submit(page, app, win, {button: 'Add Reviewer', url: /\/update-reviewer(\?|$)/,
            formSel: 'form#advancedSearchReviewerForm', label: 'n-skip'});
        if (facts.skip.submit.windowOpen) facts.skip.cancel = await H.cancel(page, win, 'form#advancedSearchReviewerForm', 'n-skip-cancel');
        modal = await H.openWorkflow(page, app, c.id);
        facts.skip.rows = await H.reviewerRows(modal, c.skip.name);
        await H.sleep(5000);
        facts.skip.mails = await app.mail.count({to: H.mailOf(c.skip.username), since});
        // edit: a valid later review due date on the control reviewer
        const row = modal.locator('[data-cy="reviewer-manager"]').getByRole('row').filter({hasText: c.control.name});
        await H.R().clickRowAction(page, row.first(), 'Edit');
        const edit = H.R().legacyModal(page, 'editReviewForm');
        await edit.locator('input.datepicker[id^="reviewDueDate"]').waitFor({timeout: H.T});
        await H.sleep(1500);
        facts.edit.datesShown = await H.dueDates(edit);
        const later = new Date(Date.parse(facts.edit.datesShown.review) + 7 * 24 * 3600 * 1000);
        later.setHours(12, 0, 0, 0);
        await H.R().pickDate(page, edit, 'reviewDueDate', later);
        facts.edit.datesSet = await H.dueDates(edit);
        facts.edit.submit = await H.submit(page, app, edit, {button: 'OK', url: /\/update-review(\?|$)/,
            formSel: 'form#editReviewForm', label: 'n-edit'});
        if (facts.edit.submit.windowOpen) facts.edit.cancel = await H.cancel(page, edit, 'form#editReviewForm', 'n-edit-cancel');
        modal = await H.openWorkflow(page, app, c.id);
        facts.edit.rowAfter = (await H.reviewerRows(modal, c.control.name))[0] || null;
        record('n-reviewers', await screen(page));
        // space: a letter holding one space
        since = new Date();
        win = await H.openAndSelect(page, c.space.name);
        await H.emptyLetter(page, win);
        facts.space.letterAfter = await H.spaceLetter(page, win);
        facts.space.submit = await H.submit(page, app, win, {button: 'Add Reviewer', url: /\/update-reviewer(\?|$)/,
            formSel: 'form#advancedSearchReviewerForm', label: 'n-space'});
        if (facts.space.submit.windowOpen) facts.space.cancel = await H.cancel(page, win, 'form#advancedSearchReviewerForm', 'n-space-cancel');
        modal = await H.openWorkflow(page, app, c.id);
        facts.space.rows = await H.reviewerRows(modal, c.space.name);
        await H.sleep(5000);
        facts.space.mails = await app.mail.count({to: H.mailOf(c.space.username), since});
        await signOut(page);
    } finally {
        record('neighbour', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
