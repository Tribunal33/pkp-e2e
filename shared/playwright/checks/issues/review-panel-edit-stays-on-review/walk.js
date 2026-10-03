// U75 A11 and U72 A5 walk (issue report docs/issues/U75-A11-review-panel-edit-stays-on-review.md).
// On PKP's default test dataset: the dataset's author (OPS ccorino, OMP aclark) starts a
// submission, takes the wizard to "Review", and presses "Edit" on the panels the app adds
// there (OPS "Relation status" and "License", OMP "Chapters"), then on a pkp-lib panel as the
// control (OPS "For Readers", OMP "Details"). Each press records the step the wizard is on.
//   PROBE_FEATURE=issues-u75r6 PROBE_AGENT=u75r6 node bin/probe.js ops shared/playwright/checks/issues/review-panel-edit-stays-on-review/walk.js
//   PROBE_FEATURE=issues-u75r6-omp PROBE_AGENT=u75r6 node bin/probe.js omp shared/playwright/checks/issues/review-panel-edit-stays-on-review/walk.js
// Neighbour mode (PROBE_MODE=neighbour, run alone): press "Edit" on every Review panel and
// record where each goes, and read the panels' contents, so a fix is seen to change only the
// app's own panels, and read a public page (OPS preprint 2, OMP book 5) signed out.
const {forEachApp, launch, signIn, signOut, screen, record, tag} = require('../../../probe');
const A6 = require('../double-submit-empty-problems-banner/lib.js');
const A8 = require('../section-editors-not-assigned-second-journal/lib.js');
const H = require('./lib.js');

const MODE = process.env.PROBE_MODE || 'walk';
const PANELS = {
    ops: {targets: ['Relation status', 'License'], control: 'For Readers (English)', expected: /For Readers$/, publicPage: 'preprint/view/2'},
    omp: {targets: ['Chapters'], control: 'Details (English)', expected: /Details$/, publicPage: 'catalog/book/5'},
};

forEachApp(async (app) => {
    const p = PANELS[app.name];
    const w = A6.WORDS[app.name];
    const run = tag('u75r6');
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, run};
    const {page, close} = await launch(app);
    try {
        // 1-2. sign in as the dataset's author, "Make a Submission", "Begin Submission"
        await signIn(page, w.author);
        facts.title = `${run} Review edit`;
        facts.submissionId = await A8.beginSubmission(page, app, app.contextPath, {title: facts.title, section: w.section});
        // 3-6. every step up to "Review"
        await A6.toReview(page, app);
        facts.review = {step: await require("../wizard-refused-save-hangs-saving/lib.js").currentStep(page)};
        facts.review.headings = await H.panelHeadings(page);
        facts.review.served = await H.servedBindings(page);
        record(`${MODE}-01-review`, await screen(page));
        const order = MODE === 'neighbour' ? facts.review.headings : [...p.targets, p.control];
        facts.presses = [];
        for (const heading of order) {
            await H.railToReview(page);
            const r = await H.pressPanelEdit(page, heading).catch((e) => ({panel: heading, error: String(e.message).slice(0, 300)}));
            facts.presses.push(r);
            record(`${MODE}-press-${heading.replace(/\W+/g, '-').toLowerCase()}`, await screen(page));
        }
        if (MODE === 'neighbour') {
            await H.railToReview(page);
            facts.panelText = A8.flat(await page.locator('.submissionWizard__reviewPanel:visible').allInnerTexts().then((a) => a.join(' || ')), 3000);
        }
        await signOut(page);
        if (MODE === 'neighbour') {
            // A public page drawn with many template hooks, read signed out.
            const r = await page.goto(app.url(`/index.php/${app.contextPath}${A8.L(app)}/${p.publicPage}`));
            const s = await screen(page);
            record(`${MODE}-public`, s);
            facts.publicPage = {status: r && r.status(), title: s.title, text: A8.flat(s.text && s.text.main || JSON.stringify(s.text), 4000)};
        }
        facts.observed = facts.presses.map((r) => `${r.panel}: ${r.before} -> ${r.after} (${r.hash})${r.found === false ? ' NOT FOUND' : ''}${r.error ? ' ERROR ' + r.error : ''}`);
        facts.observed.push(`served: ${JSON.stringify(facts.review.served)}`);
        facts.targetsOpenStep = facts.presses.filter((r) => p.targets.includes(r.panel)).map((r) => p.expected.test(r.after || ''));
    } finally {
        record(`facts-${MODE}`, facts);
        console.log(JSON.stringify(facts.observed || facts, null, 1));
        await close();
    }
});
