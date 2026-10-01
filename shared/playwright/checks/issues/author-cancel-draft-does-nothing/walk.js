// U21 OPS3 walk (issue report docs/issues/U21-OPS3-author-cancel-draft-does-nothing.md).
// On PKP's default test dataset: the report's steps 1-4, the dataset's author (ccorino; OMP
// aclark) starting a submission and cancelling it from the wizard footer. Where the draft
// survives, the same author also tries "Delete Incomplete Submissions" on it, and the manager
// rvaca then cancels it from the draft's wizard. Steps 5-7 (a fresh draft) are neighbour.js.
//   PROBE_FEATURE=issues-ir30 PROBE_AGENT=ir30 node bin/probe.js all shared/playwright/checks/issues/author-cancel-draft-does-nothing/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, shot} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const title = 'u21ir30 cancel';
    const author = H.AUTHOR[app.name];
    const facts = {app: app.name, line: app.line || 'main', author, title};
    const {page, close} = await launch(app);
    const deletes = H.watchDeletes(page);
    try {
        // 1-2. the author starts a submission
        await signIn(page, author);
        const id = await H.beginSubmission(page, app, {title, section: H.SECTION[app.name]});
        facts.id = id;
        record('01-wizard', await screen(page));
        // 3-4. footer "Cancel" › "OK"
        const c = await H.cancelInWizard(page);
        record('02-after-cancel', c.after);
        await shot(page, '02-after-cancel');
        facts.cancel = {dialog: c.dialog, navigated: c.navigated, url: c.url.replace(/^https?:\/\/[^/]+/, ''),
            heading: H.flat(c.after.text && c.after.text.main, 160), notices: c.after.notices};
        await H.openMySubmissions(page, app);
        facts.listedAfterCancel = await H.listed(page, title);
        record('03-my-submissions', await screen(page));
        if (facts.listedAfterCancel) {
            // 5-6. My Submissions › "Delete Incomplete Submissions"
            const b = await H.bulkDelete(page, app, title);
            record('04-after-bulk-delete', b.after);
            await H.openMySubmissions(page, app);
            facts.bulk = {offered: b.offered, dialog: b.dialog, notices: b.after.notices, listedAfter: await H.listed(page, title)};
            // 7. the control: the manager cancels the same draft
            await signOut(page);
            await signIn(page, 'rvaca');
            await page.goto(app.url(`/index.php/${app.contextPath}${H.L(app)}/submission?id=${id}`));
            await page.locator('.pkpSteps__step__label--current').waitFor({timeout: H.T});
            const m = await H.cancelInWizard(page);
            record('05-manager-after-cancel', m.after);
            facts.manager = {navigated: m.navigated, url: m.url.replace(/^https?:\/\/[^/]+/, ''), heading: H.flat(m.after.text && m.after.text.main, 160)};
        }
    } finally {
        facts.deletes = deletes;
        record('facts', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
