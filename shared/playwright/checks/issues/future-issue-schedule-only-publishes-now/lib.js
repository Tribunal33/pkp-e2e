// Helpers for walk.js (U49 OJS2: on a journal with no published issue, the issue choice is not the
// one made). Requiring this file runs nothing. Page objects are required inside the functions (probe
// kit: a suite page object is required inside forEachApp's callback).
const path = require('path');
const {idle, screen, record, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const BACK = 'Vol. 1 No. 2 (2014)';
const FUTURE = /Vol\. 2 No\. 1 \(2015\)/;
const SCHEDULE_ONLY = 'Assign To Future Issue and Schedule Only';

function pubScreen(page, app) {
    const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
    return new PublicationScreen(page, app.contextPath);
}

/** Every write to a publication (save, publish) with the fields it sent, kept on `log`. */
function watchWrites(page, log) {
    page.on('request', (req) => {
        const u = new URL(req.url());
        if (!/\/publications\/\d+(\/publish)?$/.test(u.pathname) || req.method() === 'GET') return;
        let body = null;
        try { body = JSON.parse(req.postData() || 'null'); } catch { body = flat(req.postData(), 200); }
        const keep = body && typeof body === 'object'
            ? Object.fromEntries(Object.entries(body).filter(([k]) => ['status', 'issueId', 'assignment', 'pages'].includes(k)))
            : body;
        log.push({path: u.pathname.replace(/^.*\/api\/v1/, ''), method: req.method(), sent: keep});
    });
}

/** The "Issue Assignment" radios in `scope`: label and whether checked. */
async function readRadios(scope) {
    const radios = scope.locator('input[name="assignment"]');
    const n = await radios.count();
    const out = [];
    for (let i = 0; i < n; i++) {
        const r = radios.nth(i);
        const label = await r.evaluate((el) => {
            const l = el.closest('label') || (el.id && document.querySelector(`label[for="${el.id}"]`));
            return l ? l.innerText : el.value;
        });
        out.push({label: flat(label, 80), value: await r.getAttribute('value'), checked: await r.isChecked()});
    }
    return out;
}
const checkedOf = (radios) => radios.filter((r) => r.checked).map((r) => r.label);

/** Open a submission's workflow afresh (about:blank first: the same address does not reload). */
async function openWorkflow(page, app, sid) {
    const pub = pubScreen(page, app);
    await page.goto('about:blank');
    await pub.gotoWorkflow(sid);
    await idle(page).catch(() => {});
    await sleep(800);
    return pub;
}

/** The "Publication Settings" page's form (the one holding "Pages"), opened and settled. */
async function openSettings(page, app, sid) {
    const pub = await openWorkflow(page, app, sid);
    await pub.openEntry('Publication Settings');
    const pages = page.locator('input[name="pages"]').first();
    await pages.waitFor({state: 'visible', timeout: T});
    const form = page.locator('form').filter({has: pages}).last();
    await form.locator('input[name="assignment"]').first().waitFor({state: 'visible', timeout: T});
    await idle(page).catch(() => {});
    await sleep(1500);
    return {pub, form};
}

/** Press the form's "Save"; returns the write's status (null when the browser sent none) and the form's messages. */
async function saveForm(page, form) {
    const answered = page.waitForResponse((r) => /\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: 8000}).catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answered;
    await idle(page).catch(() => {});
    await sleep(1500);
    const text = flat(await form.innerText().catch(() => ''), 3000) || '';
    const errors = [...new Set((text.match(/(Please correct[^.]*\.|Go to [^:]+: [^.]*\.|This field is required\.)/g) || []))];
    const saved = await page.locator('[role="status"]:has-text("Saved")').count();
    return {status: r ? r.status() : null, saved: saved > 0, errors};
}

/**
 * The publish button › "Review Publishing Details", settled. Returns the panel and its radios as it
 * opened.
 */
async function openPanel(page, app, sid) {
    const pub = await openWorkflow(page, app, sid);
    await pub.openEntry('Title & Abstract');
    const button = flat(await pub.publishButton().first().innerText().catch(() => null), 60);
    const panel = await pub.pressPublish();
    await sleep(1000);
    return {pub, panel, button, opened: await readRadios(panel)};
}

/** In the panel: "Version of Record", "Major"; `pick` (a radio label) and the future issue; "Confirm". Reads the window. */
async function confirmPanel(page, pub, panel, {pick = null, issue = false} = {}) {
    await pub.fillVersionDetails(panel);
    if (pick) await panel.getByRole('radio', {name: pick, exact: true}).check();
    if (issue) await pub.selectIssueOption(panel, FUTURE);
    await sleep(800);
    const atConfirm = await readRadios(panel);
    await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
    const question = page.getByRole('dialog').filter({hasText: /Are you sure you want to/}).last();
    const shown = await question.waitFor({state: 'visible', timeout: 10_000}).then(() => true).catch(() => false);
    const out = {atConfirm: checkedOf(atConfirm)};
    if (!shown) {
        out.window = null;
        out.panelText = flat(await panel.innerText().catch(() => ''), 600);
        return {out, question: null};
    }
    out.window = flat((await question.innerText()).replace(/^[\s\S]*?Close/, ''), 400);
    out.buttons = (await question.getByRole('button').allInnerTexts()).map((s) => flat(s, 40));
    return {out, question};
}

/** The window's own button (Publish / Schedule For Publication) pressed; the status readout after. */
async function answerWindow(page, pub, question) {
    const answered = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    const btn = question.getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).last();
    const pressed = flat(await btn.innerText(), 40);
    await btn.click();
    const r = await answered;
    await page.getByRole('button', {name: /^(Unpublish|Unschedule)$/}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    await sleep(800);
    return {pressed, publish: r ? r.status() : null, status: flat(await pub.leftControls().innerText().catch(() => ''), 120)};
}

async function cancelWindow(question) {
    await question.getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
    await sleep(500);
}

/** Issues › "Back Issues" › the issue › "Unpublish Issue" › "OK". */
async function unpublishIssue(page, app, name) {
    const {IssuesAdmin, ISSUES_TEXT, ISSUES_REQUEST} = require('../../../pages/IssuesPages.js');
    const issues = new IssuesAdmin(page, app.contextPath);
    await issues.goto('Back Issues');
    const q = await issues.openQuestion('Back Issues', name, 'Unpublish Issue', ISSUES_TEXT.unpublishQuestion);
    const question = flat(await q.innerText(), 200);
    const r = await issues.answer(q, 'OK', ISSUES_REQUEST.unpublish);
    await idle(page).catch(() => {});
    return {question, status: r ? r.status() : null};
}

/** What the database holds for these submissions' publications (status, issue): read only, for Evidence. */
function stored(app, sids) {
    return sql(app, `select submission_id, publication_id, status, issue_id, date_published from publications where submission_id in (${sids.join(',')}) order by 1, 2`)
        .split('\n').filter(Boolean);
}

module.exports = {T, sleep, flat, BACK, FUTURE, SCHEDULE_ONLY, watchWrites, readRadios, checkedOf, openWorkflow, openSettings, saveForm, openPanel, confirmPanel, answerWindow, cancelWindow, unpublishIssue, stored, screen, record};
