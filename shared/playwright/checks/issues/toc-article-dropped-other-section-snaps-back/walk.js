// Issue report docs/issues/U50-A10-toc-article-dropped-other-section-snaps-back.md (U50 A10):
// in an issue's "Table of Contents" › "Order", an article dragged up under the section above shows
// there and "Done" is accepted, but on reopening it is back in its own section. Takes the
// report's Steps on PKP's default test dataset (OJS alone has issues), journal `publicknowledge`:
//   1-2  dbarnes publishes submission 9 ("Hansen & Pinto: Reason Reclaimed", section "Reviews")
//        into "Vol. 1 No. 2 (2014)"
//   3-5  Issues › "Back Issues" › the issue › "Edit" › "Table of Contents", "Order", the drag
//        of "Hansen & Pinto" up under "Antimicrobial…" (the last of "Articles"), "Done"
//   6-8  the window closed and reopened, the issue's page, submission 9's "Issue" page
// Neighbour (`neighbour` as the argument; fix in and out): the same steps with a drag within a
// section ("Antimicrobial…" above "Signalling…"), which must keep its new order after "Done",
// on reopening and on the issue's page.
// Reset first: npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/toc-article-dropped-other-section-snaps-back/walk.js [neighbour]
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const L = require('./lib');

const NEIGHBOUR = process.argv.includes('neighbour');
const HANSEN = 'Hansen & Pinto: Reason Reclaimed';
const SIGNALLING = 'Signalling Theory Dividends';
const ANTI = 'Antimicrobial, heavy metal resistance';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // issues are a journal's
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const facts = {line: app.line || 'main', neighbour: NEIGHBOUR};
    const log = (k, v) => console.log(`[fact] ${k}: ${JSON.stringify(v)}`);
    const {page, close} = await launch(app);
    try {
        const posts = L.watchSaveSequence(page);
        // Steps 1-2.
        await signIn(page, 'dbarnes');
        facts.publish = await L.publishIntoIssue(page, app, 9, L.ISSUE, 'step2');
        log('publish', facts.publish);
        // Step 3.
        const toc = await L.openToc(page, app);
        const full = (part) => toc.outline.find((t) => t.includes(part));
        facts.tocBefore = toc.outline;
        facts.blocksBefore = await L.tocBlocks(toc.win);
        await L.snap(page, 'step3-toc');
        log('tocBefore', facts.blocksBefore);
        // Step 4 (neighbour: an article dragged within its own section).
        const ordering = toc.win.tocOrdering();
        await ordering.start();
        if (NEIGHBOUR) {
            await toc.win.dragArticle(full(ANTI), full(SIGNALLING), 'above');
        } else {
            await toc.win.dragArticle(full(HANSEN), full(ANTI), 'above');
        }
        await L.sleep(500);
        facts.outlineDropped = await toc.win.tocOutline();
        facts.blocksDropped = await L.tocBlocks(toc.win);
        await L.snap(page, 'step4-dropped');
        log('dropped', {outline: facts.outlineDropped, blocks: facts.blocksDropped});
        // Step 5.
        const r = await ordering.done();
        facts.done = r ? r.status() : null;
        facts.doneBody = L.flat(r ? await r.text().catch(() => null) : null, 200);
        facts.posted = posts.slice();
        facts.outlineAfterDone = await toc.win.tocOutline();
        await L.snap(page, 'step5-done');
        log('done', {status: facts.done, posted: facts.posted, outline: facts.outlineAfterDone});
        // Step 6.
        await toc.win.close();
        const again = await L.openToc(page, app);
        facts.tocReopened = again.outline;
        facts.blocksReopened = await L.tocBlocks(again.win);
        await L.snap(page, 'step6-reopened');
        log('reopened', facts.blocksReopened);
        await again.win.close();
        // Step 7 (the issue is the current one).
        facts.issuePage = await L.readIssuePage(page, app, 'issue/current');
        await L.snap(page, 'step7-issue-page');
        log('issuePage', facts.issuePage.outline);
        // Step 8.
        facts.hansenSection = await L.sectionShown(page, app, 9, 'step8');
        log('hansenSection', facts.hansenSection);
    } finally {
        record(NEIGHBOUR ? 'neighbour' : 'facts', facts);
        await close();
    }
});
