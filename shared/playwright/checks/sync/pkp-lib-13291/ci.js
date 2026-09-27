// Regression re-check for pkp/pkp-lib#13291 (PR #13369, 5af3b39336), kept from the 2026-09-23 sync (rr15;
// docs/tracking/ci-triage.md "Open regressions"). Runs on OJS and OMP (OMP carries the same lib/pkp change through
// its pointer 25182919bf); scratch contexts A (no competing-interests policy) and B (with one):
//   s1   PUT …/reviewAssignments/{id}/review on A: "text" → 422 (holds), "" → 200 and competingInterestsDeclared true
//        with a log entry (the gap); fixed when result-<app>.json .s1.putEmpty.status is 422 and .s1.after declared false
//   s2a/s2b  a competing-interests change on B leaves dateCompleted, step, the task notification and the round alone
//            (OMP's reviewer form offers no recommendation select, so B2 is saved for later without one there)
//   s3   the Activity Log and its "View changes" after the change
//   PROBE_FEATURE=sync PROBE_AGENT=<agent> node bin/probe.js ojs|omp shared/playwright/checks/sync/pkp-lib-13291/ci.js
// DB reads use the harness's test DB credentials (TEST_DB_USERNAME / TEST_DB_PASSWORD, default the OS user, as
// bin/fetch-apps.js provisions them) and the app's own <app>_test database.
const os = require('os');
const {execFileSync} = require('child_process');
const {request: pwRequest} = require('playwright');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, settled, note, tag} =
    require('../../../probe');
const log = (...a) => console.log(...a);

const ASSOC_REVIEW_ASSIGNMENT = 517; // 0x205
const NOTIF_REVIEW_ASSIGNMENT = 16777227; // 0x100000B

const DB_USER = process.env.TEST_DB_USERNAME || os.userInfo().username;
const DB_PASSWORD = process.env.TEST_DB_PASSWORD || DB_USER;
let dbName = null; // `<app>_test`, set per app in forEachApp

function sql(q) {
    return execFileSync('psql', ['-h', '127.0.0.1', '-U', DB_USER, '-d', dbName, '-At', '-F', '|', '-c', q],
        {env: {...process.env, PGPASSWORD: DB_PASSWORD}}).toString().trim();
}

// The app's own page objects for the Reviewers panel row, the Review Details window and the workflow frame.
function pagesFor(app) {
    if (app.name === 'omp') {
        const {DecisionWorkflow} = require('../../../../../apps/omp/playwright/pages/ReviewStagePages.js');
        const {reviewDetailsModal} = require('../../../../../apps/omp/playwright/pages/ReviewerAssignmentPages.js');
        return {
            WorkflowPage: DecisionWorkflow,
            openReviewDetails: async (page, row) => {
                await row.getByRole('button', {name: 'Read Review', exact: true}).click();
                const modal = reviewDetailsModal(page);
                await modal.waitFor({state: 'visible', timeout: 30_000});
                return modal;
            },
            awaitReviewDetailsSettled: (modal) => require('@playwright/test').expect(
                modal.getByRole('button', {name: 'Modify Review', exact: true})).toBeEnabled({timeout: 30_000}),
            closeReviewDetails: async (page, modal) => {
                await modal.getByRole('button', {name: 'Cancel', exact: true}).click();
                await modal.waitFor({state: 'hidden', timeout: 30_000});
            },
        };
    }
    return require('../../../../../apps/ojs/playwright/pages/ReviewStagePages.js');
}
function dbState(raId, roundId) {
    return {
        assignment: sql(`select date_completed, step, date_confirmed, reviewer_recommendation_id, competing_interests, competing_interests_declared, last_modified_by_id, last_modified from review_assignments where review_id=${raId}`),
        taskNotifications: sql(`select count(*) from notifications where assoc_type=${ASSOC_REVIEW_ASSIGNMENT} and assoc_id=${raId} and type=${NOTIF_REVIEW_ASSIGNMENT}`),
        roundStatus: sql(`select status from review_rounds where review_round_id=${roundId}`),
        ciLogEntries: sql(`select count(*) from event_log where assoc_type=${ASSOC_REVIEW_ASSIGNMENT} and assoc_id=${raId} and event_type=1073741861`),
    };
}

async function makeKey(app, page, ctxPath) {
    await page.goto(app.url(`/index.php/${ctxPath}/user/profile`));
    await idle(page);
    await page.locator('#profileTabs > ul > li > a[name="apiSettings"]').click();
    await idle(page);
    const form = page.locator('form#apiProfileForm');
    await form.waitFor({state: 'visible', timeout: 30_000});
    const create = form.getByRole('button', {name: 'Create API Key', exact: true});
    if (await create.count()) {
        const saved = page.waitForResponse((r) => r.url().includes('profile-tab') && r.request().method() === 'POST', {timeout: 30_000});
        await create.click();
        await saved;
        await idle(page);
    }
    return settled(page, page.locator('form#apiProfileForm input[name="apiKey"]'));
}

function client(api, base) {
    const parse = async (r) => { let body; try { body = await r.json(); } catch (e) { body = (await r.text()).slice(0, 400); } return {status: r.status(), body}; };
    return {
        get: async (p) => parse(await api.get(`${base}${p}`)),
        put: async (p, data) => parse(await api.put(`${base}${p}`, {data: data || {}})),
    };
}
const pick = (ra) => (ra && ra.body && typeof ra.body === 'object') ? {
    status: ra.status,
    competingInterests: ra.body.competingInterests, competingInterestsDeclared: ra.body.competingInterestsDeclared,
    dateCompleted: ra.body.dateCompleted, step: ra.body.step, statusId: ra.body.statusId,
    reviewerRecommendationId: ra.body.reviewerRecommendationId, lastModifiedById: ra.body.lastModifiedById,
    error: ra.body.error, errors: ra.body.errors,
} : ra;
const raIdOf = (seed) => {
    const r = (seed.reviewAssignments || [])[0];
    return typeof r === 'object' ? (r.id || r.reviewAssignmentId) : r;
};

forEachApp(async (app) => {
    dbName = require('../../../../../bin/apps.js').dbName(app.name);
    await app.api.bootstrapProbe(app.contextPath);
    const A = tag('rr15a');
    const B = tag('rr15b');
    const users = (T) => [
        {username: `${T}mgr`, roles: ['manager'], givenName: 'Meg', familyName: `Mgr${T}`},
        {username: `${T}rev`, roles: ['externalReviewer'], givenName: 'Rhea', familyName: `Rev${T}`},
        {username: `${T}aut`, roles: ['author'], givenName: 'Au', familyName: `Thor${T}`},
    ];
    const ctxA = await app.api.createContext({tag: A, users: users(A)});
    const ctxB = await app.api.createContext({tag: B, users: users(B),
        review: {competingInterests: {en: '<p>rr15 policy: declare any competing interests.</p>'}}});
    const round = (T, status) => [{reviewers: [{username: `${T}rev`, status}]}];
    const a1 = await app.api.createSubmission({tag: `${A}c`, context: A, submitter: `${A}aut`, title: `RR15 A1 ${A}`,
        decisions: ['sendExternalReview'], reviewRounds: round(A, 'completed')});
    const b1 = await app.api.createSubmission({tag: `${B}c`, context: B, submitter: `${B}aut`, title: `RR15 B1 ${B}`,
        decisions: ['sendExternalReview'], reviewRounds: round(B, 'completed')});
    const b2 = await app.api.createSubmission({tag: `${B}p`, context: B, submitter: `${B}aut`, title: `RR15 B2 ${B}`,
        decisions: ['sendExternalReview'], reviewRounds: round(B, 'accepted')});
    record('seed', {ctxA, ctxB, a1, b1, b2});
    const ra = {a1: raIdOf(a1), b1: raIdOf(b1), b2: raIdOf(b2)};
    const rnd = {a1: a1.reviewRounds[0].id, b1: b1.reviewRounds[0].id, b2: b2.reviewRounds[0].id};
    log('seeded', A, B, ra, rnd);
    const out = {A, B, ra, rnd};

    const {page, close} = await launch(app);
    const apis = [];
    try {
        // ---------- S2(b) prep: B2's reviewer saves step 3 for later with a recommendation ----------
        await signIn(page, `${B}rev`, {contextPath: B});
        await page.goto(app.url(`/index.php/${B}/reviewer/submission/${b2.submissionId}`));
        await idle(page);
        record('b2-step1-before', await screen(page));
        const stepOne = page.getByRole('button', {name: /Accept Review, Continue to Step #2|Save and continue/}).filter({visible: true});
        await stepOne.first().waitFor({timeout: 30_000});
        const noCI = page.locator('input#noCompetingInterests').filter({visible: true});
        if (await noCI.count()) await noCI.check();
        const privacy = page.locator('input[name="privacyConsent"]').filter({visible: true});
        if (await privacy.count()) await privacy.check();
        await stepOne.first().click();
        const step3 = page.getByRole('button', {name: 'Continue to Step #3'}).filter({visible: true});
        await step3.waitFor({timeout: 30_000});
        await step3.click();
        const later = page.getByRole('button', {name: 'Save for Later', exact: true}).filter({visible: true});
        await later.waitFor({timeout: 30_000});
        if (app.name === 'omp') {
            // OMP's step 3 renders no recommendation select (the template is OJS's own); record that it is absent.
            out.b2RecommendationSelects = await page.locator('select[id="reviewerRecommendationId"]').count();
        } else {
            await page.locator('select[id="reviewerRecommendationId"]').selectOption({label: 'Accept Submission'});
        }
        await later.click();
        await idle(page);
        await page.waitForTimeout(1500);
        record('b2-after-save-for-later', await screen(page));
        out.b2AfterSaveForLater = dbState(ra.b2, rnd.b2);
        log('b2 after save for later', out.b2AfterSaveForLater);
        await signOut(page);

        // ---------- keys ----------
        await signIn(page, `${A}mgr`, {contextPath: A});
        const keyA = await makeKey(app, page, A);
        await signIn(page, `${B}mgr`, {contextPath: B});
        const keyB = await makeKey(app, page, B);
        log('keys', !!keyA, !!keyB);
        const apiA = await pwRequest.newContext({baseURL: app.baseURL, extraHTTPHeaders: {Authorization: `Bearer ${keyA}`}});
        const apiB = await pwRequest.newContext({baseURL: app.baseURL, extraHTTPHeaders: {Authorization: `Bearer ${keyB}`}});
        apis.push(apiA, apiB);
        const cA = client(apiA, `/index.php/${A}/api/v1`);
        const cB = client(apiB, `/index.php/${B}/api/v1`);
        const raPath = (sub, id) => `/submissions/${sub.submissionId}/reviewAssignments/${id}`;

        // ---------- S1: journal A has no policy ----------
        const a1Before = await cA.get(raPath(a1, ra.a1));
        const recA = a1Before.body.reviewerRecommendationId;
        out.s1 = {before: pick(a1Before), dbBefore: dbState(ra.a1, rnd.a1)};
        out.s1.putText = pick(await cA.put(`${raPath(a1, ra.a1)}/review`, {reviewerRecommendationId: recA, competingInterests: 'rr15 control text'}));
        out.s1.putEmpty = pick(await cA.put(`${raPath(a1, ra.a1)}/review`, {reviewerRecommendationId: recA, competingInterests: ''}));
        out.s1.after = pick(await cA.get(raPath(a1, ra.a1)));
        out.s1.putNullAfter = pick(await cA.put(`${raPath(a1, ra.a1)}/review`, {reviewerRecommendationId: recA, competingInterests: null}));
        out.s1.dbAfter = dbState(ra.a1, rnd.a1);
        log('S1', JSON.stringify(out.s1, null, 1));

        // Review Details window and Activity Log on A1, as the manager of A
        await signIn(page, `${A}mgr`, {contextPath: A});
        const {WorkflowPage, openReviewDetails, awaitReviewDetailsSettled, closeReviewDetails} = pagesFor(app);
        const wfA = new WorkflowPage(page, A);
        await wfA.gotoEditorial(a1.submissionId);
        await idle(page);
        const rowA = wfA.reviewerRow(`Rev${A}`); // OJS: panelRow('Reviewers', …)
        await rowA.waitFor({timeout: 30_000});
        record('a1-reviewers', {row: await rowA.innerText()});
        const modalA = await openReviewDetails(page, rowA);
        await awaitReviewDetailsSettled(modalA);
        const sA = await screen(page);
        record('a1-review-details', sA);
        await shot(page, 'a1-review-details');
        out.s1.reviewDetailsHasCI = /Competing Interests/i.test(sA.text.dialog || '');
        out.s1.reviewDetailsCIText = ((sA.text.dialog || '').match(/Competing Interests[\s\S]{0,80}/i) || [null])[0];
        await closeReviewDetails(page, modalA);
        const logA = await wfA.frame.openActivityLog();
        await idle(page);
        const sLogA = await screen(page);
        record('a1-activity-log', sLogA);
        out.s1.activityLogCIRow = /Reviewer Competing Interests/.test(sLogA.text.dialog || '');
        await wfA.frame.closeActivityLog();

        // ---------- S2(a): B1 completed review, CI-only PUT ----------
        const b1Before = await cB.get(raPath(b1, ra.b1));
        const recB1 = b1Before.body.reviewerRecommendationId;
        out.s2a = {before: pick(b1Before), dbBefore: dbState(ra.b1, rnd.b1)};
        out.s2a.put = pick(await cB.put(`${raPath(b1, ra.b1)}/review`, {reviewerRecommendationId: recB1, competingInterests: '<p>rr15 B1 declared by editor</p>'}));
        out.s2a.after = pick(await cB.get(raPath(b1, ra.b1)));
        out.s2a.dbAfter = dbState(ra.b1, rnd.b1);
        out.s2a.putMissingRec = pick(await cB.put(`${raPath(b1, ra.b1)}/review`, {competingInterests: 'no recommendation in body'}));
        log('S2a', JSON.stringify(out.s2a, null, 1));

        // ---------- S2(b): B2 in progress with a saved recommendation, CI-only PUT ----------
        const b2Before = await cB.get(raPath(b2, ra.b2));
        const recB2 = b2Before.body.reviewerRecommendationId;
        out.s2b = {before: pick(b2Before), dbBefore: dbState(ra.b2, rnd.b2)};
        out.s2b.put = pick(await cB.put(`${raPath(b2, ra.b2)}/review`, {reviewerRecommendationId: recB2, competingInterests: 'rr15 B2 declared by editor'}));
        out.s2b.after = pick(await cB.get(raPath(b2, ra.b2)));
        out.s2b.dbAfter = dbState(ra.b2, rnd.b2);
        log('S2b', JSON.stringify(out.s2b, null, 1));

        // ---------- S3: B1 activity log and its View changes ----------
        await signIn(page, `${B}mgr`, {contextPath: B});
        const wfB = new WorkflowPage(page, B);
        await wfB.gotoEditorial(b1.submissionId);
        await idle(page);
        const logB = await wfB.frame.openActivityLog();
        await idle(page);
        const sLogB = await screen(page);
        record('b1-activity-log', sLogB);
        await shot(page, 'b1-activity-log');
        out.s3 = {rows: await logB.getByRole('row').allInnerTexts()};
        const ciRow = wfB.frame.activityLogRow('Reviewer Competing Interests');
        out.s3.ciRowCount = await ciRow.count();
        if (out.s3.ciRowCount) {
            const view = page.locator('a[id^="component-grid-eventlog"][id*="viewReviewChange"]').filter({visible: true});
            out.s3.viewLinks = await view.count();
            const link = (await view.count()) ? view.first() : ciRow.first().getByRole('link').first();
            await link.click();
            await page.waitForTimeout(2500);
            await idle(page);
            const sView = await screen(page);
            record('b1-view-changes', sView);
            await shot(page, 'b1-view-changes');
            out.s3.viewChanges = sView.text.dialog;
        }
        log('S3', JSON.stringify(out.s3, null, 1));
        await signOut(page);

        // ---------- S2(b) reviewer step 1 re-opened ----------
        await signIn(page, `${B}rev`, {contextPath: B});
        await page.goto(app.url(`/index.php/${B}/reviewer/submission/${b2.submissionId}?step=1`));
        await idle(page);
        const s1r = await screen(page);
        record('b2-step1-reopened', s1r);
        await shot(page, 'b2-step1-reopened');
        out.s2b.step1 = {
            hasChecked: await page.locator('input#hasCompetingInterests').isChecked().catch(() => null),
            noChecked: await page.locator('input#noCompetingInterests').isChecked().catch(() => null),
            textarea: await page.locator('textarea[name="reviewerCompetingInterests"]').inputValue().catch(() => null),
        };
        log('S2b step1', out.s2b.step1);
    } catch (e) {
        log('ERROR', e.stack || e);
        out.error = String(e.stack || e);
        await shot(page, 'error').catch(() => {});
    } finally {
        record('result', out);
        for (const a of apis) await a.dispose();
        await close();
    }
});
