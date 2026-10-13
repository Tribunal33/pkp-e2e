// Issue report docs/issues/U69-A26-book-page-public-review-never-shown.md (U69 A26): a review
// made public with "Publicly Show Reviewer Comments" never shows on the published book's page.
// The report's Steps, walked through the screens on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"), press `publicknowledge`, as the dataset's own users. The kit
// builds nothing.
//
// Steps (default mode):
//   1-2  dbarnes opens submission 16 "A Designer's Log: Case Studies in Instructional Design"
//        (External Review, round 1; Adela Gallego's review submitted): her row › "More Actions" ›
//        "Edit": "Open", "Publicly Show Reviewer Comments" ticked, "OK"
//   3    her "Read Review" › "Mark as Complete" (the dialog's words recorded), confirmed
//   4-5  "Accept Submission", then "Send To Production", each to "Record Decision"
//   6    "Publication" › "Title & Abstract" › "Publish", "Version of Record"
//   7    signed out: book 16's page; controls: books 5 and 14 (published, no review made public)
//   8    as dbarnes: book 16's page
// On 3.5 the walk stops at step 2 when the Edit window has no such box.
//
// Neighbour (`neighbour` as the script's argument; walked alone, with a fix in and out; each
// step recorded, none throws): submission 13 "Mobile Learning: Transforming the Delivery of
// Education and Training" (Copyediting; Adela Gallego's and Gonzalo Favio's reviews submitted
// and already confirmed): Adela Gallego's row in "External Review" › "Review Round 1" › "Edit":
// "Open", ticked; Gonzalo Favio's left private; "Send To Production"; "Publish". Signed out:
// book 13's page must show Adela Gallego's review and not Gonzalo Favio's; books 5 and 14 none.
//
// Reset first:  npm run fleet-prep -- --feature <dataset fleet's feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/book-page-public-review-never-shown/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<3.5 fleet's feature> … the same command
const {forEachApp, launch, signIn, signOut, shot, record, sql} = require('../../../probe');
const L = require('./lib.js');

const NEIGHBOUR = process.argv.includes('neighbour');
const BOOK = 16;
const PUBLIC = 'Adela Gallego';
const COMMENT = 'I recommend that the author revise this submission.';
const NB = {book: 13, public: 'Adela Gallego', private: 'Gonzalo Favio', publicComment: 'I recommend requiring revisions.', privateComment: 'I recommend resubmitting.'};
const CONTROLS = [5, 14];

/** Run one step, record what it gave or how it failed; never throws. */
async function step(facts, name, fn) {
    try {
        const r = await fn();
        facts.steps.push({step: name, ...r});
        return r;
    } catch (e) {
        facts.steps.push({step: name, error: L.flat(e.message, 600)});
        return null;
    }
}

/** Evidence beside the screens, never a step: the stored review rows. */
function reviewRows(app, ids) {
    return String(sql(app, `select ra.review_id, ra.submission_id, u.username, ra.review_method, ra.is_review_publicly_visible,
        ra.date_completed is not null, ra.date_considered is not null, ra.date_acknowledged is not null
        from review_assignments ra join users u on u.user_id = ra.reviewer_id where ra.submission_id in (${ids.join(',')}) order by 1`) || '').split('\n');
}

forEachApp(async (app) => {
    if (app.name !== 'omp') return; // a press's book page; a journal's article page is pkp-e2e#218
    const {page, close} = await launch(app);
    const facts = {line: app.line, dataset: app.dataset, mode: NEIGHBOUR ? 'neighbour' : 'steps', steps: [], books: []};
    try {
        await signIn(page, 'dbarnes');
        if (!NEIGHBOUR) {
            const edit = await step(facts, 2, () => L.editReview(page, app, BOOK, PUBLIC, {reviewType: 'Open', makePublic: true}));
            if (!edit || !edit.boxCount) {
                facts.stoppedAt = 2;
                return;
            }
            await step(facts, 3, () => L.markComplete(page, app, BOOK, PUBLIC));
            await step(facts, 4, () => L.decide(page, app, BOOK, 'Accept Submission'));
            await step(facts, 5, () => L.decide(page, app, BOOK, 'Send To Production'));
            await step(facts, 6, () => L.publish(page, app, BOOK));
            facts.reviewRows = reviewRows(app, [BOOK]);
            await signOut(page);
            const opts = {names: [PUBLIC, 'Al Zacharia', 'Gonzalo Favio'], comments: [COMMENT]};
            facts.books.push({as: 'visitor', ...(await L.readBook(page, app, BOOK, opts))});
            await shot(page, `book-${BOOK}-visitor`).catch(() => {});
            for (const id of CONTROLS) {
                facts.books.push({as: 'visitor', control: true, ...(await L.readBook(page, app, id, opts))});
                await shot(page, `book-${id}-visitor`).catch(() => {});
            }
            await signIn(page, 'dbarnes');
            facts.books.push({as: 'dbarnes', ...(await L.readBook(page, app, BOOK, opts))});
            await shot(page, `book-${BOOK}-dbarnes`).catch(() => {});
        } else {
            const edit = await step(facts, 'n1', () => L.editReview(page, app, NB.book, NB.public, {reviewType: 'Open', makePublic: true, pastRound: true}));
            if (!edit || !edit.boxCount) {
                facts.stoppedAt = 'n1';
                return;
            }
            await step(facts, 'n2', () => L.decide(page, app, NB.book, 'Send To Production'));
            await step(facts, 'n3', () => L.publish(page, app, NB.book));
            facts.reviewRows = reviewRows(app, [NB.book]);
            await signOut(page);
            const opts = {names: [NB.public, NB.private], comments: [NB.publicComment, NB.privateComment]};
            for (const id of [NB.book, ...CONTROLS]) {
                facts.books.push({as: 'visitor', control: id !== NB.book, ...(await L.readBook(page, app, id, opts))});
                await shot(page, `nb-book-${id}-visitor`).catch(() => {});
            }
        }
    } finally {
        record(NEIGHBOUR ? 'neighbour' : 'facts', facts);
        for (const s of facts.steps) console.log(`step ${s.step}`, L.flat(JSON.stringify(s), 900));
        for (const b of facts.books) console.log(`book ${b.bookId} (${b.as}) ${b.status}`, L.flat(JSON.stringify(b), 1200));
        if (facts.reviewRows) console.log('review rows', L.flat(JSON.stringify(facts.reviewRows), 600));
        if (facts.stoppedAt) console.log(`stopped at step ${facts.stoppedAt}: no "Publicly Show Reviewer Comments" box`);
        await close();
    }
});
