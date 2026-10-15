// Kept walk for docs/issues/U30-A10-public-review-data-unpublic-author-response.md (spec U30, register A10):
// the journal's open peer review record, read signed out, lists the author's response to a round whose reviews
// are not all public, so the response is not marked public. On PKP's default test dataset (a dataset fleet,
// freshly reset before each run), OJS only (OMP serves no such record, OPS has no review stage). Everything is
// made on screen; the last step is a signed-out GET of an API no screen calls.
//
//   MODE=walk (default) the report's Steps: on submission 1's Review round 1, Aisla McCrae's review made public,
//                       her review and Julie Janssen's and Adela Gallego's submitted (theirs not public), hers
//                       marked complete, the author's response requested and submitted by amwandenga; the record.
//   MODE=nb             the neighbour, alone: the same with all three reviews made public. The record is read
//                       twice: with only Aisla McCrae's review marked complete ("10 open peer review record": two
//                       answered reviews not yet in the record, so the response must stay out with the fix), and
//                       after the editor marks Julie Janssen's and Adela Gallego's complete too ("11 record, all
//                       complete": every answered review in the record, so the response must be listed with the
//                       fix in and out).
// On 3.5 (PKP_E2E_LINE=stable-3_5_0) the walk records the "Edit" window (no public box there), the round's
// "Author Response" table (none there) and the signed-out GET.
//
//   npm run fleet-prep -- --feature <f> --dataset <n> --reset
//   PROBE_FEATURE=<f> PROBE_AGENT=<id> [MODE=nb] [PROBE_RUN=<r>] node bin/probe.js ojs \
//       shared/playwright/checks/issues/public-review-data-unpublic-author-response/walk.js
const {forEachApp, launch, signIn, signOut, screen, shot, record, serverLog} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const SUB = 1, ROUND = 1;
const AUTHOR = {user: 'amwandenga', name: 'Alan Mwandenga'};
const REVIEWERS = [
    {user: 'amccrae', name: 'Aisla McCrae', comment: 'hkk25 public review by Aisla McCrae'},
    {user: 'jjanssen', name: 'Julie Janssen', comment: 'hkk25 private review by Julie Janssen'},
    {user: 'agallego', name: 'Adela Gallego', comment: 'hkk25 private review by Adela Gallego'},
];
const RESPONSE = 'hkk25 our response to the three reviews';

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`[k25] ${app.name}: no open peer review record (OJS only)`); return; }
    const is35 = app.line === 'stable-3_5_0';
    const out = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode: MODE, run: process.env.PROBE_RUN || null,
        startedAt: new Date().toISOString(), steps: {}};
    const {page, close} = await launch(app);
    const as = async (u) => { await signIn(page, u, {contextPath: app.contextPath}); };
    async function step(name, fn) {
        const t0 = Date.now();
        try { out.steps[name] = await fn(); console.log(`[k25] ${name} done in ${Math.round((Date.now() - t0) / 1000)}s`); }
        catch (e) {
            console.log(`[k25] ${name} FAILED: ${L.flat(e.message, 400)}`);
            out.steps[name] = {failed: L.flat(e.stack || e.message, 900), screen: await screen(page).catch(() => ({url: page.url()}))};
            await shot(page, `fail-${name.replace(/\W+/g, '-')}`).catch(() => {});
        }
        return out.steps[name];
    }
    async function record_() {
        const log = serverLog(app), from = log.mark();
        const res = await L.signedOutGet(app, `api/v1/peerReviews/open/submissions/${SUB}`);
        const rounds = (res.json && res.json.reviewRounds) || [];
        const ar = rounds.map((r) => r.authorResponse).filter(Boolean)[0] || null;
        return {request: `GET /index.php/${app.contextPath}/api/v1/peerReviews/open/submissions/${SUB} (no session)`,
            status: res.status, body: res.json ? undefined : L.flat(res.text, 300), rounds: rounds.length,
            roundsSeen: rounds.map((r) => ({roundId: r.roundId, roundNumber: r.roundNumber, reviews: (r.reviews || []).length,
                reviewComments: (r.reviews || []).flatMap((x) => x.reviewerComments || []).map(L.plain),
                authorResponse: r.authorResponse ? 'present' : r.authorResponse})),
            authorResponse: ar ? {response: Object.fromEntries(Object.entries(ar.response || {}).map(([k, v]) => [k, L.plain(v)])),
                associatedAuthors: ar.associatedAuthors, submittedByUser: ar.submittedByUser, isPublic: ar.isPublic, createdAt: ar.createdAt} : null,
            serverErrors: log.since(from)};
    }

    try {
        const rid = L.roundId(app, SUB, ROUND);
        out.reviewRoundId = rid;
        const publicOnes = MODE === 'nb' ? REVIEWERS : REVIEWERS.slice(0, 1);
        await as('dbarnes');
        for (const r of publicOnes) await step(`2 edit ${r.user}`, () => L.makePublic(page, app, SUB, rid, r.name));
        const boxThere = !!(out.steps[`2 edit ${REVIEWERS[0].user}`] || {}).publicBoxCount;
        if (boxThere) {
            await signOut(page);
            for (const r of REVIEWERS) {
                await as(r.user);
                await step(`3-5 review ${r.user}`, () => L.submitReview(page, app, SUB, r.comment));
                await signOut(page);
            }
            await as('dbarnes');
            await step('6 read and complete', () => L.readAndComplete(page, app, SUB, rid, REVIEWERS[0].name));
        }
        await step('7 author response table', async () => {
            await L.openRound(page, app, SUB, rid);
            return L.readTable(page, app);
        });
        const t = out.steps['7 author response table'] || {};
        if (t.button === 'enabled') {
            await step('7 request response', () => L.sendRequest(page, app));
            await signOut(page);
            await as(AUTHOR.user);
            await step('8 author responds', () => L.respond(page, app, SUB, rid, AUTHOR.name, RESPONSE));
            await signOut(page);
            await as('dbarnes');
            await step('9 editor table', async () => { await L.openRound(page, app, SUB, rid); return L.readTable(page, app); });
        } else if (!is35) {
            console.log(`[k25] "Request Response" is ${t.button || 'not read'}: steps 7-8 not taken`);
        }
        await signOut(page);
        await step('10 open peer review record', record_);
        if (MODE === 'nb' && boxThere) {
            await as('dbarnes');
            for (const r of REVIEWERS.slice(1)) await step(`11 read and complete ${r.user}`, () => L.readAndComplete(page, app, SUB, rid, r.name));
            await signOut(page);
            await step('11 record, all complete', record_);
        }
    } finally {
        out.finishedAt = new Date().toISOString();
        record(MODE, out);
        for (const k of ['10 open peer review record', '11 record, all complete']) {
            const pd = out.steps[k];
            if (pd) console.log(`[k25] ${k}:`, JSON.stringify({status: pd.status, rounds: pd.roundsSeen, authorResponse: pd.authorResponse, serverErrors: pd.serverErrors}));
        }
        await close();
    }
});
