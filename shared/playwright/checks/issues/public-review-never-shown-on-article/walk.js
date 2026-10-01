// Issue report walk: docs/issues/U13-OJS12-public-review-never-shown-on-article.md
// (spec U13 register OJS12). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// OJS only (the review visibility and the article page are OJS's): its
// `dbarnes`, `publicknowledge`, submission 10 ("Condensing Water Availability
// Models …", Review round 1, Aisla McCrae's and Adela Gallego's reviews
// submitted) and issue "Vol. 1 No. 2 (2014)". The kit builds nothing.
//   1    dbarnes opens submission 10's Review stage
//   2    Aisla McCrae › More Actions › "Edit": "Open", tick "Publicly Show
//        Reviewer Comments", "OK"
//   3    "Read Review" › "Mark as Complete" (the dialog's text) › "Mark as Complete"
//   4    "Accept Submission" › "Record Decision"
//   5    "Send To Production" › "Record Decision"
//   6    "Schedule For Publication" › "Vol. 1 No. 2 (2014)" › "Confirm" › "Publish"
//   7    the article page signed out and as dbarnes
//   8    the address a peer-review DOI is deposited with (?tab=peer-review-record&reviewId=…)
// Neighbour (the fix must leave these alone): Adela Gallego's review, left
// private, never shows (her name is not on the page), and article 17 (no
// public review) shows no review section.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir3 --dataset 3 --reset --apps ojs
// Run (main):   PROBE_FEATURE=issues-ir3 PROBE_AGENT=u13ojs12 node bin/probe.js ojs shared/playwright/checks/issues/public-review-never-shown-on-article/walk.js
// Fix trial:    trial.sh beside this file.
// Facts: .reports/<feature>/u13ojs12/facts[-<run>]-ojs.json
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const REPO = path.resolve(__dirname, '../../../../..');
const SID = 10;
const ISSUE = 'Vol. 1 No. 2 (2014)';
const PUBLIC = 'Aisla McCrae';
const PRIVATE = 'Adela Gallego';
const COMMENT = 'Here are my review comments';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const line = app.line || 'main';
    const ctx = app.contextPath;
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[ojs] ${k}: ${JSON.stringify(v).slice(0, 1200)}`); };
    const q = (s) => (sql(app, s) || '').trim();
    const pubId = q(`select current_publication_id from submissions where submission_id=${SID}`);
    const roundId = q(`select review_round_id from review_rounds where submission_id=${SID} and stage_id=3 order by round desc limit 1`);
    const reviewId = q(`select review_id from review_assignments ra join users u on u.user_id=ra.reviewer_id where ra.submission_id=${SID} and u.username='amccrae'`);
    fact('fleet', {line, dataset: app.dataset, run: process.env.PROBE_RUN || null, pubId, roundId, reviewId});

    const LOG = path.join(REPO, 'apps', 'ojs', 'playwright', '.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logMark = () => { try { return fs.statSync(LOG).size; } catch { return 0; } };
    const logSince = (m) => {
        try {
            return fs.readFileSync(LOG).subarray(m).toString('utf8').split('\n')
                .filter((l) => /PHP (Fatal|Warning|Deprecated)|Error|Exception|SQLSTATE/.test(l) && !/Accepted|Closing/.test(l))
                .map((l) => l.replace(/^\[[^\]]+\] /, '').slice(0, 400)).slice(0, 8);
        } catch { return []; }
    };
    let n = 0;
    const snap = async (page, label) => {
        const name = `${String(++n).padStart(2, '0')}-${label}`;
        try { record(name, await screen(page)); } catch (e) { record(name, {error: String(e).slice(0, 300), url: page.url()}); }
        await shot(page, name).catch(() => {});
    };
    const right = (page) => page.locator('[data-cy="workflow-controls-right"]');
    // The workflow's own action buttons (the stage's decisions sit in the window's side column).
    const action = (page, name) => page.getByRole('button', {name, exact: true}).filter({visible: true}).first();
    const wfUrl = (key) => app.url(`/index.php/${ctx}/en/dashboard/editorial?workflowSubmissionId=${SID}${key ? `&workflowMenuKey=${key}` : ''}`);

    // The decision wizard: "Continue" to its last page, "Record Decision", "View Submission Summary".
    const recordDecision = async (page, label) => {
        await page.waitForURL(/decision/, {timeout: T, waitUntil: 'commit'});
        await idle(page);
        const recordBtn = page.getByRole('button', {name: 'Record Decision', exact: true});
        const cont = page.getByRole('button', {name: 'Continue', exact: true});
        for (let i = 0; i < 8; i++) {
            await pause(1200); await idle(page);
            if (await recordBtn.isVisible().catch(() => false)) break;
            if (await cont.last().isVisible().catch(() => false)) await cont.last().click();
        }
        await page.locator('.composer__loadingTemplateMask').waitFor({state: 'detached', timeout: T}).catch(() => {});
        await snap(page, `${label}-decision`);
        const done = page.waitForResponse((r) => /\/decisions(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: 2 * T});
        await recordBtn.click();
        const r = await done;
        const summary = page.getByRole('link', {name: 'View Submission Summary', exact: true});
        await summary.waitFor({timeout: T});
        const text = flat(await page.getByRole('dialog').filter({has: summary}).innerText());
        await summary.click();
        await page.waitForURL(/\/dashboard\//, {timeout: T, waitUntil: 'commit'});
        await idle(page); await pause(1000);
        return {status: r.status(), closing: text};
    };

    const pickIssue = async (scope) => {
        const select = scope.locator('select[name="issueId"]');
        await select.waitFor({timeout: T});
        const option = select.locator('option').filter({hasText: ISSUE});
        for (let i = 0; i < 60 && (await option.count()) !== 1; i++) await pause(500);
        await select.selectOption((await option.first().getAttribute('value')) || '');
    };

    // The article page as data: what a reader sees, and what the page holds.
    const readArticle = async (page, label, address) => {
        const peer = [];
        const onResp = (r) => { if (/peerReviews/.test(r.url())) peer.push(`${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`); };
        page.on('response', onResp);
        const errors = [];
        const onErr = (e) => errors.push(flat(e.message, 300));
        page.on('pageerror', onErr);
        const m = logMark();
        const r = await page.goto(app.url(address));
        await idle(page); await pause(1500);
        await snap(page, label);
        // A reader opens the first review card when the display is there.
        const section = page.locator('#peer-review-record');
        let opened = null;
        if (await section.count()) {
            const card = section.getByRole('button', {name: /Read Review/}).first();
            if (await card.count()) {
                opened = flat(await card.innerText(), 200);
                await card.click().catch(() => {}); await pause(800);
                await snap(page, `${label}-review-opened`);
            }
        }
        const body = flat(await page.locator('body').innerText(), 20000);
        const html = await page.content();
        const out = {
            address, status: r ? r.status() : null, title: await page.title(),
            headings: (await page.locator('h1,h2,h3,h4').allInnerTexts()).map((h) => flat(h, 120)).filter(Boolean),
            section: (await section.count()) ? flat(await section.innerText(), 900) : null,
            opened,
            commentShown: body.includes(COMMENT),
            publicReviewerShown: body.includes(PUBLIC),
            privateReviewerShown: body.includes(PRIVATE),
            reviewWords: (body.match(/[^.]{0,60}(Peer Review|Open Review|Review Round|Reviewer|Sort by)[^.]{0,60}/gi) || []).slice(0, 6),
            mounted: await page.locator('.PkpOpenReview, .PkpOpenReviewSummary, pkp-open-review, pkp-open-review-summary').count(),
            sourceHasComment: html.includes(COMMENT),
            sourceHasOpenReviewMarkup: /PkpOpenReview|pkp-open-review/.test(html),
            peerReviewRequests: peer,
            pageErrors: errors,
            serverLog: logSince(m),
        };
        page.off('response', onResp);
        page.off('pageerror', onErr);
        return out;
    };

    const {page, close} = await launch(app);
    try {
        // 1. dbarnes, submission 10, Review stage.
        await signIn(page, 'dbarnes');
        await page.goto(wfUrl(`workflow_3_${roundId}`)); await idle(page);
        const table = page.getByRole('table', {name: 'Reviewers', exact: true});
        const row = (name) => table.getByRole('row').filter({hasText: name}).first();
        await row(PUBLIC).waitFor({timeout: T});
        await pause(800);
        await snap(page, 'review-stage');
        fact('1-review-stage', {rows: (await table.getByRole('row').allInnerTexts()).map((x) => flat(x, 160))});

        // 2. "More Actions" › "Edit": "Open", "Publicly Show Reviewer Comments", "OK".
        await row(PUBLIC).getByRole('button', {name: /More Actions/}).first().click();
        await page.getByRole('menuitem').first().waitFor({timeout: 10000});
        const items = (await page.getByRole('menuitem').allInnerTexts()).map((x) => x.trim());
        await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
        const edit = page.getByRole('dialog').filter({has: page.locator('form#editReviewForm')}).last();
        const box = edit.locator('input[name="isReviewPubliclyVisible"]');
        await box.waitFor({timeout: T});
        await idle(page);
        await edit.getByRole('radio', {name: 'Open', exact: true}).check();
        await box.check();
        await snap(page, 'edit-review');
        const saved = page.waitForResponse((r) => /updateReview/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await edit.getByRole('button', {name: 'OK', exact: true}).click();
        const sr = await saved;
        await edit.locator('form#editReviewForm').waitFor({state: 'hidden', timeout: 20000}).catch(() => {});
        await pause(1000); await idle(page);
        fact('2-edit', {menu: items, save: sr ? sr.status() : null,
            db: q(`select review_method||' visible='||is_review_publicly_visible from review_assignments where review_id=${reviewId}`)});

        // 3. "Read Review" › "Mark as Complete" › "Mark as Complete".
        await row(PUBLIC).getByRole('button', {name: 'Read Review', exact: true}).click();
        const rd = page.getByRole('dialog', {name: /^Review Details:/}).last();
        await rd.waitFor({timeout: T});
        const mark = rd.getByRole('button', {name: 'Mark as Complete', exact: true});
        await mark.waitFor({timeout: T}); await idle(page);
        await mark.click();
        const dlg = page.locator('[data-cy="dialog"]').filter({hasText: 'Mark this review as complete?'}).last();
        await dlg.waitFor({timeout: T});
        const dialogText = flat(await dlg.innerText());
        await snap(page, 'mark-complete-dialog');
        const cons = page.waitForResponse((r) => /\/consider/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await dlg.getByRole('button', {name: 'Mark as Complete', exact: true}).click();
        const cr = await cons;
        await pause(1500); await idle(page);
        await snap(page, 'marked');
        await rd.getByRole('button', {name: /^Close/}).first().click().catch(() => {});
        await pause(800); await idle(page);
        fact('3-mark-complete', {dialog: dialogText, consider: cr ? cr.status() : null, row: flat(await row(PUBLIC).innerText().catch(() => ''), 200),
            db: q(`select considered||' '||coalesce(date_considered::text,'-') from review_assignments where review_id=${reviewId}`)});

        // 4. "Accept Submission" › "Record Decision".
        await page.goto(wfUrl(`workflow_3_${roundId}`)); await idle(page); await pause(800);
        await action(page, 'Accept Submission').click();
        fact('4-accept', await recordDecision(page, 'accept'));

        // 5. "Send To Production" › "Record Decision".
        await page.goto(wfUrl('workflow_4')); await idle(page); await pause(800);
        await action(page, 'Send To Production').click();
        fact('5-production', await recordDecision(page, 'production'));

        // 6. "Schedule For Publication" › the issue › "Confirm" › "Publish".
        await page.goto(wfUrl(`publication_${pubId}_titleAbstract`)); await idle(page); await pause(1000);
        const pb = right(page).getByRole('button', {name: /^(Schedule For Publication|Publish)$/}).first();
        await pb.waitFor({timeout: T});
        const pressed = flat(await pb.innerText());
        const done = page.waitForResponse((r) => /\/publish(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: 2 * T});
        await pb.click();
        const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
        await panel.getByRole('button', {name: 'Confirm', exact: true}).waitFor({timeout: T});
        const stage = panel.locator('select[name="versionStage"]');
        if ((await stage.isVisible().catch(() => false)) && !(await stage.inputValue())) await stage.selectOption('VoR');
        const minor = panel.locator('select[name="versionIsMinor"]');
        if ((await minor.isVisible().catch(() => false)) && !(await minor.inputValue())) await minor.selectOption('false');
        const back = panel.getByRole('radio', {name: 'Assign To Current/Back Issue'});
        await back.waitFor({timeout: T});
        for (let i = 0; i < 60 && (await panel.locator('input[name="assignment"]:checked').count()) !== 1; i++) await pause(500);
        await back.check();
        await pickIssue(panel);
        await snap(page, 'publish-panel');
        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
        const confirm = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Publish', exact: true})}).last();
        await confirm.waitFor({timeout: T});
        const question = flat(await confirm.innerText(), 300);
        await confirm.getByRole('button', {name: 'Publish', exact: true}).last().click();
        const pr = await done;
        await idle(page); await pause(800);
        await snap(page, 'published');
        fact('6-publish', {pressed, question, status: pr.status(),
            db: q(`select status||' issue '||coalesce(issue_id::text,'-') from publications where publication_id=${pubId}`)});

        // 7. The article page, as dbarnes and signed out.
        fact('7-article-dbarnes', await readArticle(page, 'article-dbarnes', `/index.php/${ctx}/article/view/${SID}`));
        await signOut(page);
        fact('7-article-visitor', await readArticle(page, 'article-visitor', `/index.php/${ctx}/article/view/${SID}`));

        // 8. The address a peer-review DOI is deposited with.
        fact('8-deposit-address', await readArticle(page, 'article-deposit-address',
            `/index.php/${ctx}/article/view/${SID}?tab=peer-review-record&reviewId=${reviewId}`));

        // Neighbour: an article without a public review.
        fact('nb-article-17', await readArticle(page, 'article-17', `/index.php/${ctx}/article/view/17`));
    } finally {
        record('facts', facts);
        await close();
    }
});
