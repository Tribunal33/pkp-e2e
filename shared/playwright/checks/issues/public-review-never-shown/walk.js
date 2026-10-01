// Issue report docs/issues/U13-OJS12-public-review-never-shown.md
// (U13 OJS12): the report's Steps to reproduce, walked through the screens
// on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"), journal `publicknowledge`, as the dataset's own users.
//
// The kit builds nothing. Everything goes through the screens:
//   1. dbarnes opens submission 10 "Condensing Water Availability Models…"
//      (Review, round 1; two submitted reviews, Aisla McCrae and Adela Gallego)
//   2. Aisla McCrae's row › "Edit": review type "Open", "Publicly Show
//      Reviewer Comments" ticked, "OK"
//   3. her "Read Review" › "Mark as Complete" (the dialog's words recorded)
//   4. Adela Gallego's (left private) the same
//   5-6. "Accept Submission", then "Send To Production"
//   7. "Schedule For Publication" into "Vol. 1 No. 2 (2014)", "Publish"
//   8. signed out: article 10's page; 9. as dbarnes: the same page
//   controls (also the neighbour check for a fix): article 1's and 17's
//   pages, published with no review made public, must show no review part.
// Neighbour (`neighbour` as the script's argument, walked with the fix in
// and out), after the steps: submission 7 "Developing efficacy beliefs in
// the classroom": Paul Hudson's submitted review made Open and public but
// never confirmed (no "Mark as Complete", and "Skip this email" on the
// Accept decision's "Notify Reviewers"), accepted, sent to production and
// published; article 7's page must show no review part, not even an empty
// one. Then article 10 at the address its peer-review DOI is deposited
// with (`?tab=peer-review-record&reviewId=<McCrae's review>`, the id read
// from the database): her review must be on the page, open, in view.
// On 3.5 the steps stop at step 2 when the Edit window has no box.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir10 --dataset 5 --reset
// Run (main):   PROBE_FEATURE=issues-ir10 PROBE_AGENT=ir10 node bin/probe.js ojs shared/playwright/checks/issues/public-review-never-shown/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir10-3_5 --dataset 5 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir10-3_5 PROBE_AGENT=ir10 node bin/probe.js ojs shared/playwright/checks/issues/public-review-never-shown/walk.js
// Neighbour:    the same with `neighbour` after the script's path
// Facts: .reports/<feature>/ir10/facts[-<run>]-ojs.json (neighbour[-<run>]-ojs.json)
const {forEachApp, launch, signIn, signOut, shot, record, sql} = require('../../../probe');
const {flat, editReview, markComplete, acceptAndSendToProduction, readArticle, readReviewLanding} = require('./lib');
const {publish} = require('../recommend-by-author-list-never-shown/lib');

const SUBMISSION = 10;
const PUBLIC = 'Aisla McCrae';
const PRIVATE = 'Adela Gallego';
const COMMENT = 'Here are my review comments';
const ISSUE = /Vol\. 1 No\. 2 \(2014\)/;
const NEIGHBOUR = process.argv.includes('neighbour');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // the review display is prepared on OJS's article page alone
    const {page, close} = await launch(app);
    const facts = {line: app.line, dataset: app.dataset, steps: [], articles: []};
    try {
        await signIn(page, 'dbarnes');
        const edit = await editReview(page, app, SUBMISSION, PUBLIC, {reviewType: 'Open', makePublic: true});
        facts.steps.push({step: 2, ...edit});
        if (!edit.boxCount) {
            facts.stoppedAt = 2;
            return;
        }
        facts.steps.push({step: 3, ...(await markComplete(page, app, SUBMISSION, PUBLIC))});
        facts.steps.push({step: 4, ...(await markComplete(page, app, SUBMISSION, PRIVATE))});
        facts.steps.push({step: '5-6', ...(await acceptAndSendToProduction(page, app, SUBMISSION))});
        facts.steps.push({step: 7, ...(await publish(page, app, SUBMISSION, ISSUE))});
        await signOut(page);
        const opts = {names: [PUBLIC, PRIVATE], comment: COMMENT};
        facts.articles.push({as: 'visitor', ...(await readArticle(page, app, SUBMISSION, opts))});
        await shot(page, `article-${SUBMISSION}-visitor`).catch(() => {});
        for (const id of [1, 17]) {
            facts.articles.push({as: 'visitor', control: true, ...(await readArticle(page, app, id, opts))});
            await shot(page, `article-${id}-visitor`).catch(() => {});
        }
        await signIn(page, 'dbarnes');
        facts.articles.push({as: 'dbarnes', ...(await readArticle(page, app, SUBMISSION, opts))});
        await shot(page, `article-${SUBMISSION}-dbarnes`).catch(() => {});
        if (NEIGHBOUR) {
            facts.steps.push({step: 'n1', ...(await editReview(page, app, 7, 'Paul Hudson', {reviewType: 'Open', makePublic: true}))});
            facts.steps.push({step: 'n2', ...(await acceptAndSendToProduction(page, app, 7, {skipReviewerEmail: true}))});
            facts.steps.push({step: 'n3', ...(await publish(page, app, 7, ISSUE))});
            facts.reviewRows = await sql(app, 'select review_id, submission_id, is_review_publicly_visible, date_completed is not null, date_considered is not null, date_acknowledged is not null from review_assignments where submission_id in (7, 10) order by 1');
            await signOut(page);
            facts.articles.push({as: 'visitor', neighbour: true, ...(await readArticle(page, app, 7, {names: ['Paul Hudson'], comment: COMMENT}))});
            await shot(page, 'article-7-visitor').catch(() => {});
            const id = String(await sql(app, "select ra.review_id from review_assignments ra join users u on u.user_id = ra.reviewer_id where ra.submission_id = 10 and u.username = 'amccrae'")).trim();
            facts.landing = await readReviewLanding(page, app, SUBMISSION, id);
            await shot(page, 'article-10-landing').catch(() => {});
        }
    } finally {
        record(NEIGHBOUR ? 'neighbour' : 'facts', facts);
        for (const s of facts.steps) console.log(`step ${s.step}`, flat(JSON.stringify(s), 700));
        for (const a of facts.articles) console.log(`article ${a.articleId} (${a.as}) ${a.status}`, flat(JSON.stringify(a), 900));
        if (facts.reviewRows) console.log('review rows', flat(JSON.stringify(facts.reviewRows), 600));
        if (facts.landing) console.log('landing', flat(JSON.stringify(facts.landing), 600));
        if (facts.stoppedAt) console.log(`stopped at step ${facts.stoppedAt}: no "Publicly Show Reviewer Comments" box`);
        await close();
    }
});
