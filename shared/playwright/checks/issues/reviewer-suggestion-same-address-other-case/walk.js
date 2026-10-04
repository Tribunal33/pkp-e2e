// Walk of U31 A6 (issue report docs/issues/U31-A6-reviewer-suggestion-same-address-other-case.md):
// rvaca turns "Reviewer Suggestion at Submission" on; an author starts a submission and, on the
// "Reviewer Suggestions" step, adds Kay Suggested, then the same person with the address in another
// case (accepted: the finding), then with the same address exactly (refused: the control); submits;
// dbarnes reads the workflow's "Reviewers Suggested by Author" panel. OJS and OMP have the surface;
// OPS has none (no review settings). On PKP's default test dataset, the fleet reset first.
//   PROBE_FEATURE=issues-q2 PROBE_AGENT=q2 node bin/probe.js ojs,omp shared/playwright/checks/issues/reviewer-suggestion-same-address-other-case/walk.js
// Then the editor (steps 10-14): dbarnes sends it to review, adds Kay Suggested as a reviewer from
// the panel entry carrying the capitals address (no account yet: "Create New Reviewer"), then
// presses the twin entry's "…" › "Add Reviewer" and sends it; the panel and the Add Reviewer
// window's suggestions list are read after. PHASE=author stops after step 9, PHASE=editor starts at
// step 10 on the submission the author phase left (a fix trial applies the fix between the two).
// A reviewer the journal already has (WALK_MODE=known, alone, on a fresh reset; steps 15-20): the
// author suggests Adela Gallego (agallego, a reviewer in the dataset) as "AGallego@Mailinator.com";
// dbarnes sends the submission to review and adds her through "Reviewers" › "Add Reviewer" ›
// "Select Reviewer" on her suggestion; the panel is read after, and its row's "Add Reviewer" sent.
// Neighbour (WALK_MODE=nb, alone, on a fresh reset): what a case-insensitive check must leave alone:
// an address another submission's suggestion carries saves on this draft; a second, different
// address saves; an entry's own "Edit" to its own address in capitals saves; an "Edit" to another
// entry's address typed exactly is refused. Then the one the fix changes: an "Edit" to another
// entry's address in another case. Then (nb6) the draft is submitted and sent to review, and dbarnes
// adds Kay Suggested from her entry: the other people's entries must stay pending in the panel.
const {forEachApp, launch, signIn, signOut, screen, record, note, sql} = require('../../../probe');
const {beginSubmission} = require('../wizard-refused-save-hangs-saving/lib.js');
const H = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const PHASE = process.env.PHASE || 'all';
const REC = MODE === 'nb' ? 'nb-' : MODE === 'known' ? 'k-' : PHASE === 'editor' ? 's-ed-' : 's-';

const KAY = {
    givenName: 'Kay',
    familyName: 'Suggested',
    email: 'kay.suggested@mailinator.com',
    affiliation: 'Public Knowledge University',
    reason: 'Expert in open access publishing; no conflict of interest.',
};
const strip = ({w, ...rest}) => rest;

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    if (app.name === 'ops') {
        facts.skipped = 'OPS installs no Review settings tab: no reviewer suggestions';
        record(`${REC}facts`, facts);
        return;
    }
    const {page, close} = await launch(app);
    try {
        if (MODE === 'known') {
            await knownReviewer(app, page, facts);
            return;
        }
        if (MODE !== 'nb' && PHASE === 'editor') {
            Object.assign(facts, H.readState(app));
            await editorPart(app, page, facts);
            return;
        }

        // 1-3
        await signIn(page, 'rvaca');
        facts.enableSave = await H.enableSuggestions(page, app);
        record(`${REC}s3-review-setup`, await screen(page));
        await signOut(page);

        // 4-6
        await signIn(page, H.AUTHOR[app.name]);
        const title = MODE === 'nb' ? 'u31q2 Neighbour' : 'u31q2 Suggested twice';
        facts.submissionId = await beginSubmission(page, app, {title, section: H.SECTION[app.name]});
        facts.passed = await H.toStep(page, app, 'Reviewer Suggestions');
        record(`${REC}s6-step`, await screen(page));

        if (MODE === 'nb') {
            // nb1: an address another submission's suggestion holds (jdoe's, on the dataset's
            // submission with suggestions) saves here: the check stays per submission.
            const a = await H.addSuggestion(page, {...KAY, givenName: 'Jhon', familyName: 'Doe', email: 'jdoe@mailinator.com'});
            facts.nb1OtherSubmissionsAddress = strip(a);
            await H.closeWindow(page, a.w);
            // nb2: Kay, then a different address (Lee) saves.
            facts.nb2Kay = strip(await H.addSuggestion(page, KAY));
            const b = await H.addSuggestion(page, {...KAY, givenName: 'Lee', familyName: 'Second', email: 'lee.second@mailinator.com', affiliation: 'Second University', reason: 'Knows the corpus.'});
            facts.nb2DifferentAddress = strip(b);
            await H.closeWindow(page, b.w);
            // nb3: Kay's own "Edit", her own address in capitals: saves (the entry is not its own duplicate).
            const c = await H.editSuggestion(page, 'kay.suggested@mailinator.com', {email: 'KAY.SUGGESTED@MAILINATOR.COM'});
            facts.nb3OwnAddressOtherCase = strip(c);
            await H.closeWindow(page, c.w);
            // nb4: Lee's "Edit" to Kay's address exactly as stored: refused.
            const d = await H.editSuggestion(page, 'lee.second@mailinator.com', {email: 'KAY.SUGGESTED@MAILINATOR.COM'});
            facts.nb4OtherEntryExact = strip(d);
            await H.closeWindow(page, d.w);
            // nb5: Lee's "Edit" to Kay's address in another case: the fix's own effect on "Edit".
            const e = await H.editSuggestion(page, 'lee.second@mailinator.com', {email: 'kay.suggested@mailinator.com'});
            facts.nb5OtherEntryOtherCase = strip(e);
            await H.closeWindow(page, e.w);
            facts.entries = await H.entries(page);
            record(`${REC}end`, await screen(page));
            // nb6: submitted and sent to review, dbarnes adds Kay Suggested from her entry: the other
            // people's entries (Jhon Doe, Lee Second) stay pending in the panel.
            facts.nb6submit = await H.submit(page, app);
            await signOut(page);
            await signIn(page, 'dbarnes');
            facts.nb6decision = await H.sendToReview(page, app, facts.submissionId).catch((x) => ({error: H.flat(x.message, 300)}));
            facts.nb6before = await H.openReview(page, app, facts.submissionId, 'Kay Suggested');
            facts.nb6open = await H.openRowAddReviewer(page, 'Kay Suggested', 0);
            if (facts.nb6open.offered) facts.nb6send = await H.sendRequest(page, app, {username: 'kaysuggested'});
            facts.nb6after = await H.openReview(page, app, facts.submissionId, 'Kay Suggested');
            record(`${REC}nb6-review-panel`, await screen(page));
            facts.db = sql(app, `select email, approved_at is not null from reviewer_suggestions where submission_id = ${Number(facts.submissionId)} order by 1`);
            note(`u31q2 ${facts.line} nb ${app.name}: ${JSON.stringify({nb1: a.status, nb2: b.status, nb3: c.status, nb4: d.status, nb5: e.status, entries: facts.entries.length, nb6send: facts.nb6send && facts.nb6send.answer, nb6after: facts.nb6after.rows})}`);
            record(`${REC}facts`, facts);
            await signOut(page);
            return;
        }

        // 7
        const s7 = await H.addSuggestion(page, KAY);
        facts.s7 = strip(s7);
        facts.s7entries = await H.entries(page);
        record(`${REC}s7-first`, await screen(page));

        // 8
        const s8 = await H.addSuggestion(page, {...KAY, email: 'Kay.Suggested@Mailinator.com'});
        facts.s8 = strip(s8);
        record(`${REC}s8-other-case`, await screen(page));
        await H.closeWindow(page, s8.w);
        facts.s8entries = await H.entries(page);

        // control
        const s9 = await H.addSuggestion(page, KAY);
        facts.s9 = strip(s9);
        record(`${REC}s9-exact`, await screen(page));
        await H.closeWindow(page, s9.w);
        facts.s9entries = await H.entries(page);

        // 9
        facts.submitProblems = await H.submit(page, app);
        await signOut(page);

        H.saveState(app, {submissionId: facts.submissionId, s8entries: facts.s8entries});
        note(`u31q2 ${facts.line} ${MODE} ${app.name}: s8 ${s8.status} closed=${s8.closed} entries ${facts.s8entries.length}; s9 ${s9.status} ${JSON.stringify(s9.emailError || null)}`);
        if (PHASE === 'author') {
            record(`${REC}facts`, facts);
            return;
        }
        await editorPart(app, page, facts);
    } catch (e) {
        facts.error = H.flat(e.message, 600);
        record(`${REC}facts`, facts);
        record(`${REC}error-screen`, await screen(page).catch(() => null));
        throw e;
    } finally {
        await close();
    }
});

/** Steps 10-14, as dbarnes. Records each answer; never throws on a state the fix brings. */
async function editorPart(app, page, facts) {
    const name = 'Kay Suggested';
    const id = facts.submissionId;
    // 10
    await signIn(page, 'dbarnes');
    facts.editorPanel = await H.editorPanel(page, app, id);
    record(`${REC}s12-editor-panel`, await screen(page));

    // 11
    facts.decision = await H.sendToReview(page, app, id).catch((e) => ({error: H.flat(e.message, 300)}));

    // 11: the Review stage's panel
    facts.s14 = await H.openReview(page, app, id, name);
    record(`${REC}s14-review-panel`, await screen(page));

    // 12: the entry whose "Create New Reviewer" is filled with the capitals address
    facts.s15tries = [];
    let picked = null;
    for (let i = 0; i < facts.s14.menus; i++) {
        const opened = await H.openRowAddReviewer(page, name, i);
        facts.s15tries.push({row: i, ...opened});
        const last = i === facts.s14.menus - 1;
        if (opened.offered && (opened.email !== 'kay.suggested@mailinator.com' || last)) { picked = i; break; }
        const {ReviewerRequestWindow} = require('../../../pages/ReviewerSuggestionPages.js');
        await new ReviewerRequestWindow(page).cancel().catch(() => {});
        await H.sleep(1200);
    }
    if (picked !== null) {
        record(`${REC}s15-create-form`, await screen(page));
        facts.s15send = await H.sendRequest(page, app, {username: 'kaysuggested'});
    }

    // 12: the panel after
    facts.s16 = await H.openReview(page, app, id, name);
    record(`${REC}s16-review-panel`, await screen(page));

    // 13: the twin's "…" › "Add Reviewer", then "Add Reviewer" in the window
    facts.s17open = await H.openRowAddReviewer(page, name, 0);
    if (facts.s17open.offered) {
        record(`${REC}s17-twin-window`, await screen(page));
        facts.s17send = await H.sendRequest(page, app, {username: 'kaysuggested2'});
        record(`${REC}s17-after-send`, await screen(page));
    }

    // 14: the panel once more, and the Add Reviewer window's suggestions list
    facts.s18 = await H.openReview(page, app, id, name);
    try {
        const {entries} = await H.addReviewerList(page, name);
        facts.s18list = entries;
        record(`${REC}s18-add-reviewer-list`, await screen(page));
    } catch (e) {
        facts.s18list = {error: H.flat(e.message, 300)};
    }

    // the stored rows behind the screens (Evidence)
    facts.db = {
        accounts: sql(app, "select username, email from users where lower(email) = 'kay.suggested@mailinator.com'"),
        suggestions: sql(app, `select reviewer_suggestion_id, email, approved_at is not null, reviewer_id from reviewer_suggestions where submission_id = ${Number(id)} order by 1`),
    };
    note(`u31q2 ${facts.line} ${MODE}/${PHASE} ${app.name} editor: s14 menus ${facts.s14.menus}; s15 ${JSON.stringify(facts.s15send && facts.s15send.answer)}; s16 menus ${facts.s16.menus}; s17 ${JSON.stringify(facts.s17send ? facts.s17send.answer : facts.s17open)}; s18 menus ${facts.s18.menus}`);
    record(`${REC}facts`, facts);
    await signOut(page);
}

const ADELA = {
    givenName: 'Adela',
    familyName: 'Gallego',
    email: 'AGallego@Mailinator.com',
    affiliation: 'Public Knowledge University',
    reason: 'Reviewed for the journal before.',
};

/** Steps 15-20: a single suggestion whose address differs only in capitals from a reviewer's account. */
async function knownReviewer(app, page, facts) {
    const name = 'Adela Gallego';
    // 15 (steps 1-6 as above)
    await signIn(page, 'rvaca');
    facts.enableSave = await H.enableSuggestions(page, app);
    await signOut(page);
    await signIn(page, H.AUTHOR[app.name]);
    facts.submissionId = await beginSubmission(page, app, {title: 'u31q2 Known reviewer', section: H.SECTION[app.name]});
    facts.passed = await H.toStep(page, app, 'Reviewer Suggestions');
    // 16
    const a = await H.addSuggestion(page, ADELA);
    facts.s19 = strip(a);
    facts.s19entries = await H.entries(page);
    await H.closeWindow(page, a.w);
    // 17
    facts.submitProblems = await H.submit(page, app);
    await signOut(page);
    // 18
    await signIn(page, 'dbarnes');
    facts.decision = await H.sendToReview(page, app, facts.submissionId).catch((e) => ({error: H.flat(e.message, 300)}));
    facts.s21 = await H.openReview(page, app, facts.submissionId, name);
    record(`${REC}s21-review-panel`, await screen(page));
    // 19
    facts.s22select = await H.selectFromList(page, name);
    record(`${REC}s22-selected`, await screen(page));
    if (facts.s22select.selected) facts.s22send = await H.sendRequest(page, app);
    // 20
    facts.s23 = await H.openReview(page, app, facts.submissionId, name);
    record(`${REC}s23-review-panel`, await screen(page));
    facts.s23open = await H.openRowAddReviewer(page, name, 0);
    if (facts.s23open.offered) {
        facts.s23send = await H.sendRequest(page, app);
        record(`${REC}s23-after-send`, await screen(page));
    }
    facts.db = {
        accounts: sql(app, "select username, email from users where lower(email) = 'agallego@mailinator.com'"),
        suggestions: sql(app, `select reviewer_suggestion_id, email, approved_at is not null, reviewer_id from reviewer_suggestions where submission_id = ${Number(facts.submissionId)} order by 1`),
        assignments: sql(app, `select count(*) from review_assignments ra join users u on u.user_id = ra.reviewer_id where ra.submission_id = ${Number(facts.submissionId)} and u.username = 'agallego'`),
    };
    note(`u31q2 ${facts.line} known ${app.name}: s21 menus ${facts.s21.menus}; s22 ${JSON.stringify(facts.s22send && facts.s22send.answer)}; s23 menus ${facts.s23.menus}; s23 send ${JSON.stringify(facts.s23send ? facts.s23send.answer : facts.s23open)}; db ${JSON.stringify(facts.db)}`);
    record(`${REC}facts`, facts);
    await signOut(page);
}
