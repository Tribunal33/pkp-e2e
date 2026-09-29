// Kept verification probe for ui-library#992's second round (d458b2e1, dev-team#316): the frontend usePkpFetch now
// calls openDialogNetworkError (it called a missing openModalNetworkError, so every failed frontend request threw) and
// opens that dialog for POST, PUT and DELETE only; an `onError` option lets a caller take the error. The reader
// comments are the other frontend caller: this reads what a reader meets when the server refuses each of their
// writes. The failures are made by answering the request in the browser (page.route) with a 500 carrying
// {error: "<marker>"}, so the server is never reached. Run at the PR heads:
//   PROBE_FEATURE=sync PROBE_AGENT=ce node bin/probe.js ojs shared/playwright/checks/sync/ui-library-992/comment-errors.js
//   w1  the writer submits a comment, POST /comments answers 500                                    (w1-*)
//   d1  the writer deletes their own comment ("…" › "Delete Comment" › "Delete"), the DELETE answers 500 (d1-*)
//   r1  the writer reports another reader's comment ("…" › "Report" › "Submit"), POST …/reports answers 500 (r1-*)
// No assertions: the session judges. Each leg records every open dialog (title, text) after the action and after
// pressing each dialog's "OK".
const path = require('path');
const ROOT = path.resolve(__dirname, '../../../../..');
const {forEachApp, launch, signIn, shot, record, idle, tag} = require('../../../probe');
const log = (...a) => console.log(...a);
const MARK = 'Probe refused this request.';

async function dialogs(page) {
    await page.waitForTimeout(1200);
    return page.evaluate(() => [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')]
        .filter((d) => d.offsetParent !== null || getComputedStyle(d).position === 'fixed')
        .map((d) => ({role: d.getAttribute('role'), text: d.innerText.trim().replace(/\s+/g, ' ').slice(0, 300)})));
}

async function pressOkUntilGone(page, key) {
    const seen = [];
    for (let i = 0; i < 4; i++) {
        const ok = page.getByRole('button', {name: 'OK', exact: true});
        if (!(await ok.count())) break;
        await ok.last().click().catch(() => {});
        seen.push(await dialogs(page));
    }
    record(`${key}-after-ok`, seen);
    return seen;
}

forEachApp(async (app) => {
    const {ArticleCommentsPage} = require(path.join(ROOT, `apps/${app.name}/playwright/pages/ReaderCommentsPages.js`));
    const T = tag('ce992');
    const u = (k, roles) => ({username: `${T}${k}`, givenName: k, familyName: 'Probe', email: `${T}${k}@mail.test`, roles});
    await app.api.createContext({tag: T, enablePublicComments: true, users: [u('mg', ['manager']), u('au', ['author']), u('ra', ['reader']), u('rb', ['reader'])]});
    const own = `Own comment ${T}.`, other = `Other comment ${T}.`;
    const sub = await app.api.createSubmission({tag: `${T}s`, context: T, submitter: `${T}au`, title: `Article ${T}`, published: true,
        userComments: [{user: `${T}ra`, text: own, approved: true}, {user: `${T}rb`, text: other, approved: true}]});
    record('seed', {T, submissionId: sub.submissionId});

    const {page, close} = await launch(app);
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 300)));
    const refuse = (route) => route.fulfill({status: 500, contentType: 'application/json', body: JSON.stringify({error: MARK})});
    try {
        await signIn(page, `${T}ra`);
        const lp = new ArticleCommentsPage(page, T);
        await lp.goto(sub.submissionId);
        await idle(page);

        // ---------- w1 ----------
        await page.route(/\/api\/v1\/comments$/, (r) => (r.request().method() === 'POST' ? refuse(r) : r.continue()));
        await lp.box().fill(`New comment ${T}.`);
        await lp.submitButton().click();
        const w1 = {dialogs: await dialogs(page)};
        await shot(page, 'w1').catch(() => {});
        w1.afterOk = await pressOkUntilGone(page, 'w1');
        w1.boxText = await lp.box().inputValue().catch(() => null);
        w1.submitDisabled = await lp.submitButton().isDisabled().catch(() => null);
        w1.pageErrors = errors.splice(0);
        record('w1-submit-refused', w1);
        log('w1', JSON.stringify(w1));
        await page.unroute(/\/api\/v1\/comments$/);

        // ---------- d1 ----------
        await page.route(/\/api\/v1\/comments\/\d+$/, (r) => (r.request().method() !== 'GET' ? refuse(r) : r.continue()));
        const dlg = await lp.openDeleteDialog(lp.comment(own));
        await dlg.getByRole('button', {name: 'Delete', exact: true}).click();
        const d1 = {dialogs: await dialogs(page)};
        await shot(page, 'd1').catch(() => {});
        d1.afterOk = await pressOkUntilGone(page, 'd1');
        d1.ownStillListed = await lp.comment(own).count();
        d1.pageErrors = errors.splice(0);
        record('d1-delete-refused', d1);
        log('d1', JSON.stringify(d1));
        await page.unroute(/\/api\/v1\/comments\/\d+$/);

        // ---------- r1 ----------
        await page.route(/\/reports$/, (r) => (r.request().method() === 'POST' ? refuse(r) : r.continue()));
        const rd = await lp.openReportDialog(lp.comment(other));
        await lp.reasonBox(rd).fill(`Report reason ${T}.`);
        await rd.getByRole('button', {name: 'Submit', exact: true}).click();
        const r1 = {dialogs: await dialogs(page)};
        await shot(page, 'r1').catch(() => {});
        r1.afterOk = await pressOkUntilGone(page, 'r1');
        r1.pageErrors = errors.splice(0);
        record('r1-report-refused', r1);
        log('r1', JSON.stringify(r1));
        await page.unroute(/\/reports$/);
    } finally {
        await close();
    }
});
