// Second neighbour check of the U21 A7 / OPS5 acknowledgement fix (issue report
// docs/issues/U21-A7-OPS5-editorial-submitter-no-acknowledgement.md): the author ccorino
// (OMP aclark) starts a submission and leaves it as a draft; dbarnes, a manager-role editor
// whom the section (series) assigns automatically on OJS and OMP, opens the draft's wizard
// address, finishes it and presses "Submit". The confirmation must go to the author who
// started it, and not to dbarnes. Walked with the fix in and out.
//   PROBE_FEATURE=issues-ir28b PROBE_AGENT=ir28 node bin/probe.js all shared/playwright/checks/issues/editorial-submitter-no-acknowledgement/neighbour-draft.js
const {forEachApp, launch, signIn, signOut, screen, record, tag} = require('../../../probe');
const A8 = require('../section-editors-not-assigned-second-journal/lib.js');
const H = require('./lib.js');

forEachApp(async (app) => {
    const w = H.WORDS[app.name];
    const run = tag('u21ir28');
    const facts = {app: app.name, line: app.line || 'main', run};
    const {page, close} = await launch(app);
    try {
        // the author starts the submission and leaves it as a draft
        const t = `${run} draft`;
        await signIn(page, w.author);
        const id = await A8.beginSubmission(page, app, app.contextPath, {title: t, section: w.section});
        await signOut(page);
        // dbarnes opens the draft's wizard address, finishes it and submits
        await signIn(page, 'dbarnes');
        await page.goto(app.url(`/index.php/${app.contextPath}${H.L(app)}/submission?id=${id}`));
        await page.locator('.pkpSteps__step__label--current').waitFor({timeout: H.T});
        const problems = await A8.completeSubmission(page, app, app.contextPath, id, {series: w.series});
        const s = await screen(page);
        record('n2-draft-submitted-by-dbarnes', s);
        await signOut(page);
        facts.draft = {id, title: t, problems};
        facts.author = {mail: await H.waitMail(page, app, `${w.author}@mailinator.com`, t, 45_000)};
        facts.editor = {mail: await H.waitMail(page, app, 'dbarnes@mailinator.com', t, 5_000)};
        facts.observed = {
            authorAcks: H.acks(facts.author.mail).map((m) => m.subject),
            dbarnesAcks: H.acks(facts.editor.mail).map((m) => m.subject),
            dbarnesOtherMail: facts.editor.mail.filter((m) => !H.acks([m]).length).map((m) => m.subject),
        };
    } finally {
        record('neighbour-draft', facts);
        console.log(JSON.stringify(facts.observed || facts, null, 1));
        await close();
    }
});
