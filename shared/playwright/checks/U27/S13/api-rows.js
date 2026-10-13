// U27 claim check S13, incidentals rows 61-64 (OJS `main` only; unreleased code): four API faults re-driven
// on PKP's default test dataset fleet, twice (PROBE_RUN r1, r2, the fleet reset before each):
//
//   Row 61 (U14)  (1) GET api/v1/comments/public?publicationIds=<id>&includeReports=1, SIGNED OUT, returns each
//                     approved comment's `reports` (the reporter's name, affiliation, ORCID, reason).
//                 (2) POST api/v1/comments by any signed-in account accepts a publicationId that is not published
//                     and answers with that publication's fullTitle and authorsStringShort; it works with public
//                     comments switched off.
//   Row 62 (U29)  GET api/v1/peerReviews/open/submissions/{id}, signed out, for a review the editor made public,
//                 returns the answers to review-form questions NOT marked "Included".
//   Row 63 (U30)  the same API returns the round's `authorResponse` as soon as any one review of the round is public,
//                 though the response's own `isPublic` is false.
//
// Preconditions are made through the app: the comment through the comments API (reader account), its approval by the
// manager and a report by a second reader; the review form on Settings > Workflow > Review > Review Forms (two items,
// one unticked "Included"), assigned to a reviewer through the workflow's reviewer "Edit" window with its
// public-visibility box ticked; the review submitted by the reviewer in the review wizard; "Read Review" ›
// confirmation by the editor; the author response requested through the editor's API and submitted through the
// author's. Every request below is made with the signed-in account's own session (the page's fetch with its CSRF
// token) or, for "signed out", from a fresh browser context with no cookies.
//
//   bin/app-lock.sh shared ojs -- env PKP_E2E_DATASET=3 PROBE_FEATURE=U27 PROBE_AGENT=ccS13f PROBE_RUN=r1 \
//       node bin/probe.js ojs shared/playwright/checks/U27/S13/api-rows.js     (reset the fleet first: npm run reset:ojs -- --dataset 3)
// STEPS=api61,api64,form,review,read,author,api62  narrows (default: all, in that order).
const path = require('path');
const {request: pwRequest} = require('@playwright/test');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const STEPS = process.env.STEPS ? process.env.STEPS.split(',') : ['api61', 'api64', 'form', 'review', 'read', 'author', 'api62'];
const on = (s) => STEPS.includes(s);

const FORM = 'S13f review form';
const Q_INC = 'S13f included question';
const Q_EXC = 'S13f editor-only question';
const A_INC = 'S13f answer to the included question';
const A_EXC = 'S13f SECRET answer to the editor-only question';
const C_TEXT = 'S13f comment text on a published article';
const C_NOTE = 'S13f report reason: the comment is rude';
const RESPONSE = 'S13f author response text';
const TEXTAREA = 'Extended text box';

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`[S13f] ${app.name}: not driven`); return; }
    const base = (p) => `${app.baseURL}/index.php/${app.contextPath}/${p}`;
    const api = (p) => base(`api/v1/${p}`);
    const log = (...a) => console.log('[S13f]', ...a);
    const facts = {app: app.name, run: process.env.PROBE_RUN, dataset: app.dataset, startedAt: new Date().toISOString(), steps: STEPS, rows: {}};
    const row = (k) => (facts.rows[k] = facts.rows[k] || {});
    const q = (query) => sql(app, query);
    const ctxId = q(`select ${app.contextTables.id} from ${app.contextTables.table} where path='${app.contextPath}'`);
    facts.contextId = ctxId;

    const {page, close} = await launch(app);
    const anon = await pwRequest.newContext({baseURL: app.baseURL});

    /** The signed-in account's own request: the page's fetch, with the session and the page's CSRF token. */
    async function call(method, p, body) {
        return page.evaluate(async ({url, method, body}) => {
            const token = window.pkp && pkp.currentUser && pkp.currentUser.csrfToken;
            const headers = {'X-Csrf-Token': token || '', Accept: 'application/json'};
            if (body !== undefined) headers['Content-Type'] = 'application/json';
            const r = await fetch(url, {method, headers, body: body === undefined ? undefined : JSON.stringify(body)});
            const text = await r.text();
            let json = null;
            try { json = JSON.parse(text); } catch (_) { /* not json */ }
            return {status: r.status, json, text: text.slice(0, 600), hadToken: !!token};
        }, {url: api(p), method, body});
    }
    /** The same request signed out (a fresh context holding no cookies). */
    async function callAnon(p) {
        const r = await anon.get(api(p));
        const text = await r.text();
        let json = null;
        try { json = JSON.parse(text); } catch (_) { /* not json */ }
        return {status: r.status(), json, text: text.slice(0, 600)};
    }
    const as = async (user) => {
        await signIn(page, user, {contextPath: app.contextPath});
        await page.goto(base('en/user/profile'));
        await idle(page);
    };
    async function step(name, fn) {
        if (!on(name)) return;
        const t0 = Date.now();
        try { await fn(); log(`${name} done in ${Math.round((Date.now() - t0) / 1000)}s`); }
        catch (e) {
            log(`${name} FAILED`, flat(e.message, 600));
            facts.rows[name] = Object.assign(facts.rows[name] || {}, {failed: flat(e.stack || e.message, 900)});
            record(`fail-${name}`, await screen(page).catch(() => ({url: page.url()})));
            await shot(page, `fail-${name}`).catch(() => {});
        }
    }
    const keys = (o) => (o && typeof o === 'object' ? Object.keys(o) : null);

    try {
        // The state the rows read: the comments switch, the publications, the review assignments.
        facts.before = {
            enablePublicComments: q(`select setting_value from ${app.contextTables.settings} where ${app.contextTables.id}=${ctxId} and setting_name='enablePublicComments'`),
            publications: q(`select publication_id||':'||submission_id||':status='||status from publications where publication_id in (1,5,11,18) order by 1`).split('\n'),
            reviewAssignmentsSub1: q(`select review_id||':reviewer='||reviewer_id||':confirmed='||coalesce(date_confirmed::text,'-')||':public='||is_review_publicly_visible from review_assignments where submission_id=1 order by 1`).split('\n'),
        };

        // ------------------------------------------------------------------ Row 61 (U14)
        await step('api61', async () => {
            const r = row('61');
            const PUB = 18; // submission 17, published: its current publication
            const UNPUB = [5, 11]; // submission 4 (submission stage), submission 10 (review stage): current, not published
            // The manager turns the journal's comments on (the realistic state for fault 1).
            await as('rvaca');
            const set1 = await call('PUT', `contexts/${ctxId}`, {enablePublicComments: true});
            r.commentsOn = {status: set1.status, enablePublicComments: set1.json && set1.json.enablePublicComments};
            r.commentsOnDb = q(`select setting_value from ${app.contextTables.settings} where ${app.contextTables.id}=${ctxId} and setting_name='enablePublicComments'`);
            await signOut(page);
            // A reader comments on the published article.
            await as('ccorino');
            const add = await call('POST', 'comments', {publicationId: PUB, commentText: C_TEXT});
            const cid = add.json && add.json.id;
            if (!cid) throw new Error(`the comment was not created: ${add.status} ${add.text}`);
            r.addComment = {status: add.status, id: cid, isApproved: add.json && add.json.isApproved};
            await signOut(page);
            // The manager approves it.
            await as('rvaca');
            const ap = await call('PUT', `comments/${cid}/setApproval`, {approved: true});
            r.approve = {status: ap.status, isApproved: ap.json && ap.json.isApproved};
            await signOut(page);
            // A second reader reports it.
            await as('lchristopher');
            const rep = await call('POST', `comments/${cid}/reports`, {note: C_NOTE});
            r.report = {status: rep.status, id: rep.json && rep.json.id};
            await signOut(page);
            // Signed out: the public list with and without includeReports; the moderator route for contrast.
            const withR = await callAnon(`comments/public?publicationIds=${PUB}&includeReports=1`);
            const without = await callAnon(`comments/public?publicationIds=${PUB}`);
            const modRoute = await callAnon(`comments/${cid}/reports`);
            const c1 = withR.json && withR.json.data && withR.json.data.find((c) => c.id === cid);
            const rp = c1 && c1.reports && (c1.reports.data || c1.reports)[0];
            r.fault1 = {
                signedOut: true,
                withIncludeReports: {status: withR.status, comments: withR.json && withR.json.data ? withR.json.data.length : null,
                    commentKeys: keys(c1), reportsKey: !!(c1 && 'reports' in c1), reportCount: c1 && c1.reports ? (c1.reports.data || c1.reports).length : null,
                    reportKeys: keys(rp),
                    reporterNamePresent: !!(rp && rp.userName), reporterName: rp && rp.userName,
                    affiliationKeyPresent: !!(rp && 'userAffiliation' in rp), affiliationNonEmpty: !!(rp && rp.userAffiliation),
                    orcidKeyPresent: !!(rp && 'userOrcidDisplayValue' in rp), orcidNonEmpty: !!(rp && rp.userOrcidDisplayValue),
                    reasonPresent: !!(rp && rp.note), reasonIsOurs: !!(rp && rp.note === C_NOTE), userIdPresent: !!(rp && rp.userId != null)},
                withoutIncludeReports: {status: without.status, reportsKey: !!(without.json && without.json.data && without.json.data[0] && 'reports' in without.json.data[0]),
                    commentKeys: keys(without.json && without.json.data && without.json.data[0])},
                moderatorReportsRouteSignedOut: {status: modRoute.status, body: flat(modRoute.text, 160)},
            };
            r.fault1.holds = !!(withR.status === 200 && rp && rp.userName && rp.note === C_NOTE);
            record('row61-fault1', r.fault1);
            // Fault 2: comments switched OFF, then a reader posts on unpublished publications.
            await as('rvaca');
            const set0 = await call('PUT', `contexts/${ctxId}`, {enablePublicComments: false});
            r.commentsOff = {status: set0.status, db: q(`select setting_value from ${app.contextTables.settings} where ${app.contextTables.id}=${ctxId} and setting_name='enablePublicComments'`)};
            await signOut(page);
            await as('ccorino');
            r.fault2 = {commentsSwitchOff: r.commentsOff.db, posts: []};
            for (const pid of UNPUB) {
                const st = q(`select p.status||'|submission '||p.submission_id||'|submission status '||s.status||'|stage '||s.stage_id from publications p join submissions s on s.submission_id=p.submission_id where p.publication_id=${pid}`);
                const res = await call('POST', 'comments', {publicationId: pid, commentText: `S13f comment on unpublished publication ${pid}`});
                const pub = res.json && res.json.publication;
                r.fault2.posts.push({publicationId: pid, publicationStatus_submissionStatus_stage: st, status: res.status,
                    commentId: res.json && res.json.id, publicationKeys: keys(pub),
                    fullTitlePresent: !!(pub && pub.fullTitle), fullTitle: pub && pub.fullTitle,
                    authorsStringShortPresent: !!(pub && pub.authorsStringShort), authorsStringShort: pub && pub.authorsStringShort});
            }
            r.fault2.holds = r.fault2.posts.every((p) => p.status === 200 && p.fullTitlePresent && p.authorsStringShortPresent);
            // The same publication is not reachable the ordinary way.
            r.fault2.publicListForUnpublished = (await callAnon(`comments/public?publicationIds=${UNPUB[0]}`)).status;
            await signOut(page);
            record('row61-fault2', r.fault2);
        });

        // ------------------------------------------------------------------ the review form (rows 62 and 63)
        await step('form', async () => {
            const r = row('62');
            const {ReviewSettingsPage} = require(path.resolve(__dirname, '../../../pages/ReviewSettingsPages.js'));
            await as('dbarnes');
            const settings = new ReviewSettingsPage(page, app.contextPath);
            const forms = settings.forms;
            await settings.goto('Review Forms');
            await idle(page);
            await forms.createForm(FORM);
            const controls = await forms.rowControls(forms.row(FORM).first());
            await forms.control(controls, 'Edit').click();
            await forms.windowHeading().waitFor({timeout: T});
            await forms.openWindowTab('Form Items');
            await forms.openCreateItem();
            await forms.saveItem({question: Q_INC, type: TEXTAREA, included: true});
            await forms.openCreateItem();
            await forms.saveItem({question: Q_EXC, type: TEXTAREA, included: false});
            r.items = (await forms.itemRows().allInnerTexts()).map((t) => flat(t, 100));
            await forms.closeWindow();
            await idle(page);
            await forms.activeBox(forms.row(FORM).first()).click();
            await forms.answerConfirm(/activate this review form/i, 'OK');
            await idle(page);
            r.formActive = await forms.activeBox(forms.row(FORM).first()).isChecked();
            r.formDb = q(`select rf.review_form_id||':active='||rf.is_active from review_forms rf join review_form_settings s on s.review_form_id=rf.review_form_id and s.setting_name='title' where s.setting_value='${FORM}'`);
            r.elementsDb = q(`select e.review_form_element_id||':included='||e.included||':type='||e.element_type from review_form_elements e join review_forms rf on rf.review_form_id=e.review_form_id join review_form_settings s on s.review_form_id=rf.review_form_id and s.setting_name='title' where s.setting_value='${FORM}' order by 1`).split('\n');
            await signOut(page);
        });

        // The editor assigns the form to the reviewer's request and makes that review public.
        const REVIEWER = {name: 'Aisla McCrae', username: 'amccrae'};
        const SUB = 1, ROUND = 1;
        await step('review', async () => {
            const r = row('62');
            const R = require(path.resolve(__dirname, '../../../../../apps/ojs/playwright/pages/ReviewStagePages.js'));
            await as('dbarnes');
            await page.goto(base(`en/dashboard/editorial?workflowSubmissionId=${SUB}&workflowMenuKey=workflow_3_${ROUND}`));
            await idle(page);
            const table = page.getByRole('table', {name: 'Reviewers', exact: true});
            await table.waitFor({timeout: T});
            const rr = table.getByRole('row').filter({hasText: REVIEWER.name}).first();
            await rr.waitFor({timeout: T});
            const modal = await R.openEditReview(page, rr);
            const sel = R.reviewFormSelect(modal);
            r.editWindow = {reviewFormListShown: (await sel.count()) > 0, options: (await sel.first().locator('option').allInnerTexts().catch(() => [])).map((t) => flat(t, 60))};
            await sel.selectOption({label: FORM});
            await R.publicVisibilityCheckbox(modal).check();
            await shot(page, 'review-edit-window').catch(() => {});
            await R.saveEditReview(page, modal);
            r.assignmentAfterEdit = q(`select review_id||':reviewer='||reviewer_id||':form='||coalesce(review_form_id::text,'-')||':public='||is_review_publicly_visible from review_assignments where submission_id=${SUB} order by 1`).split('\n');
            await signOut(page);
            // The reviewer accepts and submits the review in the wizard, answering both questions.
            const {ReviewWizardPage} = require(path.resolve(__dirname, '../../../pages/ReviewerPages.js'));
            await as(REVIEWER.username);
            const w = new ReviewWizardPage(page, app.contextPath, {privateBoxLabel: 'For editor'});
            await w.goto(SUB);
            await idle(page);
            if (await w.acceptButton.count()) await w.accept();
            else { if (await w.privacyBox.count()) await w.privacyBox.check().catch(() => {}); await w.saveAndContinueButton.click(); await w.expectStep(2); }
            await w.continueToStep3();
            const areas = page.locator('textarea[name^="reviewFormResponses"]');
            await areas.first().waitFor({state: 'attached', timeout: T});
            r.reviewerForm = {textareas: await areas.count(), step3Text: flat(await w.step3Form.innerText().catch(() => ''), 400)};
            const vis = areas.filter({visible: true});
            await vis.nth(0).fill(A_INC);
            await vis.nth(1).fill(A_EXC);
            await w.chooseRecommendation('Accept Submission');
            await shot(page, 'review-wizard-step3').catch(() => {});
            await w.submitReview();
            await w.expectCompleted().catch(() => {});
            r.afterSubmit = q(`select review_id||':completed='||coalesce(date_completed::text,'-')||':confirmed='||coalesce(date_confirmed::text,'-')||':considered='||coalesce(date_considered::text,'-')||':public='||is_review_publicly_visible from review_assignments where submission_id=${SUB} order by 1`).split('\n');
            await signOut(page);
        });

        // The editor reads the review and confirms it.
        await step('read', async () => {
            const r = row('62');
            const R = require(path.resolve(__dirname, '../../../../../apps/ojs/playwright/pages/ReviewStagePages.js'));
            await as('dbarnes');
            await page.goto(base(`en/dashboard/editorial?workflowSubmissionId=${SUB}&workflowMenuKey=workflow_3_${ROUND}`));
            await idle(page);
            const table = page.getByRole('table', {name: 'Reviewers', exact: true});
            await table.waitFor({timeout: T});
            const rr = table.getByRole('row').filter({hasText: REVIEWER.name}).first();
            await rr.waitFor({timeout: T});
            const modal = await R.openReviewDetails(page, rr);
            await R.awaitReviewDetailsSettled(modal);
            r.readWindow = {buttons: (await modal.getByRole('button').allInnerTexts()).map((t) => flat(t, 60)), text: flat(await modal.innerText(), 1500)};
            record('read-review-window', await screen(page).catch(() => ({url: page.url()})));
            await shot(page, 'read-review-window').catch(() => {});
            const stateSql = `select review_id||':considered='||coalesce(date_considered::text,'-')||':ack='||coalesce(date_acknowledged::text,'-')||':completed='||coalesce(date_completed::text,'-')||':public='||is_review_publicly_visible from review_assignments where submission_id=${SUB} and reviewer_id=(select user_id from users where username='${REVIEWER.username}')`;
            r.afterOpen = q(stateSql);
            // "Mark as Complete" is the editor's confirmation that the review may proceed (reviewRead: date_considered).
            await R.markReviewComplete(page, modal);
            await idle(page);
            r.afterMarkComplete = q(stateSql);
            await shot(page, 'read-review-marked').catch(() => {});
            await R.closeReviewDetails(page, modal).catch(() => {});
            await signOut(page);
        });

        // Row 63: the editor requests the round's author response (the editor's API), the author submits it (the author's API).
        await step('author', async () => {
            const r = row('63');
            r.roundId = q(`select review_round_id from review_assignments where submission_id=${SUB} and reviewer_id=(select user_id from users where username='${REVIEWER.username}')`);
            const authorIds = q(`select author_id from authors where publication_id=1 order by seq, author_id`).split('\n').map(Number);
            r.setup = {submission: SUB, roundId: r.roundId, authorIds,
                roundAssignments: q(`select review_id||':declined='||declined||':cancelled='||cancelled||':public='||is_review_publicly_visible from review_assignments where review_round_id=${r.roundId} order by 1`).split('\n'),
                authorStageAssignments: q(`select u.username||':role='||ug.role_id from stage_assignments sa join users u on u.user_id=sa.user_id join user_groups ug on ug.user_group_id=sa.user_group_id where sa.submission_id=${SUB} and ug.role_id=65536`).split('\n')};
            await as('dbarnes');
            const rq = await call('POST', `reviews/${SUB}/${r.roundId}/authorResponse/requestResponse`,
                {subject: 'S13f author response requested', body: '<p>Please respond to the reviews.</p>', locale: 'en', attachments: [], cc: [], bcc: []});
            r.request = {status: rq.status, body: flat(rq.text, 200)};
            await signOut(page);
            await as('amwandenga');
            const sub = await call('POST', `reviews/${SUB}/${r.roundId}/authorResponse/`, {authorResponse: {en: RESPONSE}, associatedAuthorIds: [authorIds[0]]});
            r.submit = {status: sub.status, id: sub.json && sub.json.id, isPublic: sub.json && sub.json.isPublic, body: flat(sub.text, 200)};
            await signOut(page);
            r.responseDb = q(`select count(*) from review_round_author_responses where review_round_id=${r.roundId}`);
        });

        // Rows 62 and 63: the open peer review API, signed out.
        await step('api62', async () => {
            const r62 = row('62'), r63 = row('63');
            const res = await callAnon(`peerReviews/open/submissions/${SUB}`);
            const j = res.json || {};
            const rounds = j.reviewRounds || [];
            const rev = rounds[0] && rounds[0].reviews || [];
            const questions = rev.flatMap((x) => (x.reviewForm && x.reviewForm.questions) || []);
            const plain = (t) => String(t || '').replace(/<[^>]+>/g, '').trim();
            const secret = questions.find((x) => plain(x.question) === Q_EXC);
            const inc = questions.find((x) => plain(x.question) === Q_INC);
            r62.signedOut = {status: res.status, roundCount: rounds.length, reviewCount: rev.length,
                reviewKeys: keys(rev[0]), reviewFormKeys: keys(rev[0] && rev[0].reviewForm),
                questionCount: questions.length, questions: questions.map((x) => ({question: plain(x.question), responses: x.responses})),
                includedQuestionAnswered: !!(inc && inc.responses && inc.responses.includes(A_INC)),
                editorOnlyQuestionReturned: !!secret, editorOnlyAnswerReturned: !!(secret && secret.responses && secret.responses.includes(A_EXC)),
                elementsIncludedFlags: q(`select e.review_form_element_id||':included='||e.included from review_form_elements e order by 1`).split('\n')};
            r62.holds = r62.signedOut.status === 200 && r62.signedOut.editorOnlyAnswerReturned;
            record('row62', r62);
            const ar = rounds[0] && rounds[0].authorResponse;
            r63.signedOut = {status: res.status, authorResponseNull: ar == null, authorResponseKeys: keys(ar),
                responseTextReturned: !!(ar && JSON.stringify(ar.response || '').includes(RESPONSE)), response: ar && ar.response,
                isPublic: ar ? ar.isPublic : undefined, associatedAuthorsCount: ar && ar.associatedAuthors ? ar.associatedAuthors.length : null,
                associatedAuthorKeys: keys(ar && ar.associatedAuthors && ar.associatedAuthors[0]),
                submittedByUserPresent: !!(ar && ar.submittedByUser), submittedByUserKeys: keys(ar && ar.submittedByUser),
                reviewsPublicInRound: q(`select review_id||':declined='||declined||':public='||is_review_publicly_visible from review_assignments where review_round_id=${r63.roundId || 1} order by 1`).split('\n')};
            r63.holds = !!(ar && r63.signedOut.responseTextReturned && ar.isPublic === false);
            record('row63', r63);
        });
    } finally {
        facts.finishedAt = new Date().toISOString();
        record('facts', facts);
        await anon.dispose().catch(() => {});
        await close();
    }
});
