// Walk of U31 A12 (issue report docs/issues/U31-A12-suggestion-panel-add-reviewer-already-on-round.md):
// rvaca turns "Reviewer Suggestion at Submission" on; the author suggests Adela Gallego (the
// dataset's reviewer agallego, agallego@mailinator.com) as "AGallego@Mailinator.com" and submits;
// dbarnes sends the submission to review and adds Adela through "Reviewers" › "Add Reviewer" ›
// "Select Reviewer"; the "Reviewers Suggested by Author" panel still lists her (U31 A6 leaves the
// suggestion pending); the window's own list shows the "already assigned" notice; the panel row's
// "…" › "Add Reviewer" opens on "Selected Reviewer" and its "Add Reviewer" is sent.
// OJS and OMP have the surface; OPS has none. On PKP's default test dataset, the fleet reset first.
//   PROBE_FEATURE=issues-r8 PROBE_AGENT=r8 node bin/probe.js ojs,omp shared/playwright/checks/issues/suggestion-panel-add-reviewer-already-on-round/walk.js
// Modes (each alone, on a fresh reset):
//   WALK_MODE=stale: the server's own refusal, for the fix trial: dbarnes opens the panel row's
//     "Add Reviewer" (Adela not yet on the round), adds her in a second tab through the window's
//     list, then presses "Add Reviewer" in the first tab's window.
//   WALK_MODE=twoeditors: the steps' second path, on any database: the suggestion carries Adela's
//     address exactly (agallego@mailinator.com); dbarnes opens the row's "Add Reviewer" in one tab,
//     adds Adela from the same row in a second tab, then presses "Add Reviewer" in the first.
//   WALK_MODE=nb: what the fix must leave alone: an exact-address suggestion of a reviewer (Adela,
//     agallego@mailinator.com) and one with no account (Kay Suggested): both rows still offer
//     "Add Reviewer", and each add answers 200 and takes the row out of the panel.
const {forEachApp, launch, signIn, signOut, screen, record, note, sql} = require('../../../probe');
const {beginSubmission} = require('../wizard-refused-save-hangs-saving/lib.js');
const H = require('../reviewer-suggestion-same-address-other-case/lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const REC = MODE === 'steps' ? 's-' : `${MODE}-`;
const NAME = 'Adela Gallego';
const ADELA = {
    givenName: 'Adela',
    familyName: 'Gallego',
    email: 'AGallego@Mailinator.com',
    affiliation: 'Public Knowledge University',
    reason: 'Reviewed for the journal before.',
};
const KAY = {
    givenName: 'Kay',
    familyName: 'Suggested',
    email: 'kay.u31r8@mailinator.com',
    affiliation: 'Public Knowledge University',
    reason: 'Expert in open access publishing.',
};
const strip = ({w, ...rest}) => rest;

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    if (app.name === 'ops') {
        facts.skipped = 'OPS has no reviewer suggestions (no Review settings, no reviewerSuggestionEnabled)';
        record(`${REC}facts`, facts);
        return;
    }
    const {page, context, close} = await launch(app);
    try {
        // 1-2
        await signIn(page, 'rvaca');
        facts.enableSave = await H.enableSuggestions(page, app);
        await signOut(page);

        // 3-6
        await signIn(page, H.AUTHOR[app.name]);
        const title = MODE === 'nb' ? 'u31r8 Neighbour' : 'u31r8 Already on the round';
        facts.submissionId = await beginSubmission(page, app, {title, section: H.SECTION[app.name]});
        const id = facts.submissionId;
        facts.passed = await H.toStep(page, app, 'Reviewer Suggestions');
        const exact = {...ADELA, email: 'agallego@mailinator.com'};
        const suggested = MODE === 'nb' ? [exact, KAY] : MODE === 'twoeditors' ? [exact] : [ADELA];
        facts.s5 = [];
        for (const s of suggested) {
            const a = await H.addSuggestion(page, s);
            facts.s5.push(strip(a));
            await H.closeWindow(page, a.w);
        }
        facts.s5entries = await H.entries(page);
        record(`${REC}s5-suggestions`, await screen(page));
        facts.submitProblems = await H.submit(page, app);
        await signOut(page);

        // 7
        await signIn(page, 'dbarnes');
        facts.decision = await H.sendToReview(page, app, id).catch((e) => ({error: H.flat(e.message, 300)}));
        facts.s7panel = await H.openReview(page, app, id, NAME);
        record(`${REC}s7-review-panel`, await screen(page));

        if (MODE === 'nb') {
            await neighbour(app, page, facts);
            return;
        }
        if (MODE === 'stale' || MODE === 'twoeditors') {
            await stale(app, page, context, facts);
            return;
        }

        // 8
        facts.s8select = await H.selectFromList(page, NAME);
        if (facts.s8select.selected) facts.s8send = await H.sendRequest(page, app);

        // 9
        facts.s9panel = await H.openReview(page, app, id, NAME);
        record(`${REC}s9-review-panel`, await screen(page));
        try {
            facts.s9list = (await H.addReviewerList(page, NAME)).entries;
            record(`${REC}s9-add-reviewer-list`, await screen(page));
        } catch (e) {
            facts.s9list = {error: H.flat(e.message, 300)};
        }

        // 10
        await H.openReview(page, app, id, NAME);
        facts.s10open = await H.openRowAddReviewer(page, NAME, 0);
        if (facts.s10open.offered) {
            record(`${REC}s10-window`, await screen(page));
            // 11
            facts.s11send = await H.sendRequest(page, app);
            record(`${REC}s11-after-send`, await screen(page));
        }
        facts.after = await H.openReview(page, app, id, NAME);
        facts.db = rows(app, id);
        note(`u31r8 ${facts.line} ${MODE} ${app.name}: s8 ${JSON.stringify(facts.s8send && facts.s8send.answer)}; s9 rows ${JSON.stringify(facts.s9panel.rows)} menus ${facts.s9panel.menus}; s9 list ${JSON.stringify(facts.s9list)}; s10 ${JSON.stringify(facts.s10open)}; s11 ${JSON.stringify(facts.s11send ? {answer: facts.s11send.answer, alerts: facts.s11send.alerts, windowsAfter: facts.s11send.windowsAfter, log: facts.s11send.serverLog} : null)}; db ${JSON.stringify(facts.db)}`);
        record(`${REC}facts`, facts);
        await signOut(page);
    } catch (e) {
        facts.error = H.flat(e.message, 600);
        record(`${REC}facts`, facts);
        record(`${REC}error-screen`, await screen(page).catch(() => null));
        throw e;
    } finally {
        await close();
    }
});

function rows(app, id) {
    return {
        suggestions: sql(app, `select reviewer_suggestion_id, email, approved_at is not null, reviewer_id from reviewer_suggestions where submission_id = ${Number(id)} order by 1`),
        assignments: sql(app, `select u.username, ra.review_round_id from review_assignments ra join users u on u.user_id = ra.reviewer_id where ra.submission_id = ${Number(id)} order by 1`),
    };
}

/** WALK_MODE=stale and twoeditors: a window opened before the person was added, sent after. Records, never throws. */
async function stale(app, page, context, facts) {
    const id = facts.submissionId;
    facts.t1open = await H.openRowAddReviewer(page, NAME, 0);
    record(`${REC}t1-window`, await screen(page));
    const other = await context.newPage();
    try {
        await H.openReview(other, app, id, NAME);
        if (MODE === 'twoeditors') {
            // the second tab adds her from the same row
            facts.t2open = await H.openRowAddReviewer(other, NAME, 0);
            if (facts.t2open.offered) facts.t2send = await H.sendRequest(other, app);
        } else {
            facts.t2select = await H.selectFromList(other, NAME);
            if (facts.t2select.selected) facts.t2send = await H.sendRequest(other, app);
        }
    } finally {
        await other.close().catch(() => {});
    }
    if (facts.t1open.offered) {
        facts.t3send = await H.sendRequest(page, app);
        record(`${REC}t3-after-send`, await screen(page));
    }
    facts.after = await H.openReview(page, app, id, NAME);
    facts.db = rows(app, id);
    note(`u31r8 ${facts.line} ${MODE} ${app.name}: t1 ${JSON.stringify(facts.t1open)}; t2 ${JSON.stringify(facts.t2send && facts.t2send.answer)}; t3 ${JSON.stringify(facts.t3send ? {answer: facts.t3send.answer, alerts: facts.t3send.alerts, formErrors: facts.t3send.formErrors, windowsAfter: facts.t3send.windowsAfter, log: facts.t3send.serverLog} : null)}; after ${JSON.stringify(facts.after.rows)}; db ${JSON.stringify(facts.db)}`);
    record(`${REC}facts`, facts);
    await signOut(page);
}

/** WALK_MODE=nb: rows whose person is not on the round keep "Add Reviewer", and it works. */
async function neighbour(app, page, facts) {
    const id = facts.submissionId;
    facts.nbAdela = await H.openRowAddReviewer(page, NAME, 0);
    if (facts.nbAdela.offered) facts.nbAdelaSend = await H.sendRequest(page, app);
    facts.nbAfterAdela = await H.openReview(page, app, id, 'Kay Suggested');
    facts.nbKay = await H.openRowAddReviewer(page, 'Kay Suggested', 0);
    if (facts.nbKay.offered) facts.nbKaySend = await H.sendRequest(page, app, {username: 'kayu31r8'});
    facts.after = await H.openReview(page, app, id, 'Kay Suggested');
    record(`${REC}after`, await screen(page));
    facts.db = rows(app, id);
    const a = (x) => (x ? {answer: x.answer, alerts: x.alerts, windowsAfter: x.windowsAfter, log: x.serverLog} : null);
    note(`u31r8 ${facts.line} nb ${app.name}: s7 rows ${JSON.stringify(facts.s7panel.rows)}; adela ${JSON.stringify(facts.nbAdela)} ${JSON.stringify(a(facts.nbAdelaSend))}; kay ${JSON.stringify(facts.nbKay)} ${JSON.stringify(a(facts.nbKaySend))}; after ${JSON.stringify(facts.after.rows)}; db ${JSON.stringify(facts.db)}`);
    record(`${REC}facts`, facts);
    await signOut(page);
}
