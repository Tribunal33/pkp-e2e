// U29 OJS1: a review made public lists, in the journal's public review data (read signed out), the answers to
// review form items whose "Included in message to author" box is unticked.
// Steps: docs/issues/U29-OJS1-public-review-data-editor-only-answers.md. PKP's default test dataset (OJS),
// a fleet freshly reset before each run; everything is made on screen except the final signed-out GET
// (an API no screen calls).
//
//   MODE=walk (default) the report's Steps: a form with one ticked and one unticked item, Aisla McCrae's review of
//                       submission 1 on it made public, submitted, read and marked complete; the signed-out GET.
//   MODE=nb             the neighbour, alone: Julie Janssen's review of submission 1, no form, made public, with a
//                       "For author and editor" and a "For editor" comment; the signed-out GET keeps the first and
//                       leaves out the second (fix in and out).
// On 3.5 (PKP_E2E_LINE=stable-3_5_0) the walk builds the form, records the "Edit" window (no public box there)
// and the signed-out GET.
//
//   npm run fleet-prep -- --feature <f> --dataset <n> --apps ojs --reset
//   PROBE_FEATURE=<f> PROBE_AGENT=<id> [MODE=nb] [PROBE_RUN=<r>] node bin/probe.js ojs \
//       shared/playwright/checks/issues/public-review-data-editor-only-answers/walk.js
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, serverLog} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const FORM = 'hkk18 Open review form';
const Q_INC = 'hkk18 Shared question';
const Q_EXC = 'hkk18 Editor-only question';
const A_INC = 'hkk18 answer for author and editor';
const A_EXC = 'hkk18 answer meant for the editor only';
const C_AUTHOR = 'hkk18 comment for author and editor';
const C_EDITOR = 'hkk18 comment for the editor only';
const SUB = 1, ROUND = 1;

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`[k18] ${app.name}: no public review data (OJS only)`); return; }
    const is35 = app.line === 'stable-3_5_0';
    const out = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode: MODE, run: process.env.PROBE_RUN || null,
        startedAt: new Date().toISOString(), steps: {}};
    const {page, close} = await launch(app);
    const as = async (u) => { await signIn(page, u, {contextPath: app.contextPath}); };
    async function step(name, fn) {
        const t0 = Date.now();
        try { out.steps[name] = await fn(); console.log(`[k18] ${name} done in ${Math.round((Date.now() - t0) / 1000)}s`); }
        catch (e) {
            console.log(`[k18] ${name} FAILED: ${L.flat(e.message, 400)}`);
            out.steps[name] = {failed: L.flat(e.stack || e.message, 900), screen: await screen(page).catch(() => ({url: page.url()}))};
            await shot(page, `fail-${name}`).catch(() => {});
        }
    }
    async function publicData() {
        const log = serverLog(app), from = log.mark();
        const res = await L.signedOutGet(app, `api/v1/peerReviews/open/submissions/${SUB}`);
        const rounds = (res.json && res.json.reviewRounds) || [];
        const reviews = rounds.flatMap((r) => r.reviews || []);
        const questions = reviews.flatMap((x) => (x.reviewForm && x.reviewForm.questions) || [])
            .map((x) => ({question: L.plain(x.question), responses: (x.responses || []).map(L.plain)}));
        const comments = reviews.flatMap((x) => x.reviewerComments || []).map(L.plain);
        return {request: `GET /index.php/${app.contextPath}/api/v1/peerReviews/open/submissions/${SUB} (no session)`,
            status: res.status, body: res.json ? undefined : L.flat(res.text, 300), rounds: rounds.length,
            reviews: reviews.map((x) => ({id: x.id, reviewerFullName: x.reviewerFullName, reviewMethod: x.reviewMethod,
                reviewForm: x.reviewForm ? {title: x.reviewForm.title, questions: x.reviewForm.questions.length} : null,
                reviewerComments: x.reviewerComments ? x.reviewerComments.length : null})),
            questions, comments,
            sharedAnswerListed: questions.some((x) => x.question === Q_INC && x.responses.includes(A_INC)),
            editorOnlyQuestionListed: questions.some((x) => x.question === Q_EXC),
            editorOnlyAnswerListed: questions.some((x) => x.responses.includes(A_EXC)),
            authorCommentListed: comments.some((c) => c.includes(C_AUTHOR)),
            editorCommentListed: comments.some((c) => c.includes(C_EDITOR)),
            serverErrors: log.since(from)};
    }

    try {
        if (MODE === 'walk') {
            await as('dbarnes');
            await step('1-5 build form', () => L.buildReviewForm(page, app, FORM, [
                {question: Q_INC, type: 'Extended text box', included: true},
                {question: Q_EXC, type: 'Extended text box', included: false},
            ]));
            await step('6-7 edit review', () => L.editReview(page, app, SUB, ROUND, 'Aisla McCrae', {formTitle: FORM, makePublic: true}));
            await signOut(page);
            if (!is35 || (out.steps['6-7 edit review'] && out.steps['6-7 edit review'].publicBoxCount)) {
                await as('amccrae');
                await step('8-9 submit review', () => L.submitReview(page, app, SUB, async () => {
                    const areas = page.locator('textarea[name^="reviewFormResponses"]').filter({visible: true});
                    await areas.first().waitFor({timeout: L.T});
                    await areas.nth(0).fill(A_INC);
                    await areas.nth(1).fill(A_EXC);
                }));
                await signOut(page);
                await as('dbarnes');
                await step('10 read and complete', () => L.readAndComplete(page, app, SUB, ROUND, 'Aisla McCrae'));
                const rr = out.steps['10 read and complete'];
                if (rr && rr.windowText) rr.readReviewListsBoth = [Q_INC, A_INC, Q_EXC, A_EXC].every((s) => rr.windowText.includes(s));
                await signOut(page);
            }
            await step('11 public data', publicData);
        } else {
            await as('dbarnes');
            await step('nb edit review', () => L.editReview(page, app, SUB, ROUND, 'Julie Janssen', {makePublic: true}));
            await signOut(page);
            await as('jjanssen');
            await step('nb submit review', () => L.submitReview(page, app, SUB, async (w) => {
                await w.typeComments(C_AUTHOR);
                await w.typePrivateComments(C_EDITOR);
            }));
            await signOut(page);
            await as('dbarnes');
            await step('nb read and complete', () => L.readAndComplete(page, app, SUB, ROUND, 'Julie Janssen'));
            await signOut(page);
            await step('nb public data', publicData);
        }
    } finally {
        out.finishedAt = new Date().toISOString();
        record(MODE, out);
        const pd = out.steps['11 public data'] || out.steps['nb public data'];
        if (pd) console.log('[k18] public data:', JSON.stringify({status: pd.status, rounds: pd.rounds, questions: pd.questions, comments: pd.comments,
            editorOnlyAnswerListed: pd.editorOnlyAnswerListed, sharedAnswerListed: pd.sharedAnswerListed,
            authorCommentListed: pd.authorCommentListed, editorCommentListed: pd.editorCommentListed}));
        await close();
    }
});
