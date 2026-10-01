// U21 A6 neighbour (issue report docs/issues/U21-A6-double-submit-empty-problems-banner.md).
// On PKP's default test dataset: the same author takes a new submission to "Review" without
// uploading a file, the ordinary refusal the problems banner is for. The banner and the
// panel's complaint must read the same with the fix in and out.
//   PROBE_FEATURE=issues-ir33 PROBE_AGENT=ir33 node bin/probe.js all shared/playwright/checks/issues/double-submit-empty-problems-banner/neighbour.js
const {forEachApp, launch, signIn, screen, record} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const title = 'u21ir33 no file';
    const w = H.WORDS[app.name];
    const facts = {app: app.name, line: app.line || 'main', author: w.author, title};
    const {page, close} = await launch(app);
    try {
        await signIn(page, w.author);
        facts.id = await H.beginSubmission(page, app, app.contextPath, {title, section: w.section});
        await H.toReview(page, app, {noFile: true});
        facts.review = await H.readReview(page);
        record('n1-review-without-file', await screen(page));
    } finally {
        record('neighbour-facts', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
