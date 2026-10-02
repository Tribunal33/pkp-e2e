// Helpers of walk.js (U71 OMP2: "Accept Submission" and "Create New Review Round" on an internal
// round carry none of the author's revised files;
// docs/issues/U71-OMP2-internal-round-revised-files-not-carried.md). Requiring this file runs nothing.
const fs = require('fs');
const path = require('path');
const {idle, sql} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const PDF = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ojs', 'playwright', 'fixtures', 'files', 'article.pdf'));
const pdfNamed = (name) => ({name, mimeType: 'application/pdf', buffer: PDF});

/** The submission's review rounds as stored (id, stageId, round), oldest first: only to name a round's page in an address. */
function rounds(app, submissionId) {
    const rows = sql(app, `select review_round_id, stage_id, round from review_rounds where submission_id = ${Number(submissionId)} order by 1`);
    return rows ? rows.split('\n').map((l) => { const [id, stageId, round] = l.split('|').map(Number); return {id, stageId, round}; }) : [];
}
const roundKey = (r) => `workflow_${r.stageId}_${r.id}`;

/** Open a submission's workflow by the dashboard's address ("My Submissions" for an author), on a side-menu page when given. */
async function openWorkflow(page, app, id, {author = false, menuKey = null} = {}) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/${author ? 'mySubmissions' : 'editorial'}?workflowSubmissionId=${id}${menuKey ? `&workflowMenuKey=${menuKey}` : ''}`));
    await idle(page);
    await page.locator('[role="dialog"]:visible').first().waitFor({timeout: T}).catch(() => {});
    await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15_000}).catch(() => {});
    await idle(page);
    await page.waitForTimeout(400);
}

/** The rows of the workflow's table `name` ({absent: true} when the page has no such table). */
async function tableRows(page, name) {
    const t = page.locator('[role="dialog"]:visible').first().getByRole('table', {name, exact: true}).first();
    await t.waitFor({state: 'visible', timeout: 10_000}).catch(() => {});
    if (!(await t.count())) return {absent: true};
    await idle(page);
    return {rows: await t.evaluate((el) => [...el.querySelectorAll('tbody tr')].filter((r) => r.getClientRects().length).map((tr) => tr.innerText.trim().replace(/\s+/g, ' ').slice(0, 200)))};
}

/** The round's status box and decision buttons, as shown. */
const roundState = (page) => page.evaluate(() => {
    const vis = (e) => e.getClientRects().length > 0;
    const root = [...document.querySelectorAll('[role=dialog]')].filter(vis)[0] || document.body;
    const actions = root.querySelector('[data-cy="workflow-action-items"]');
    const h = [...root.querySelectorAll('h1,h2,h3,h4')].filter(vis).find((x) => /Status$/.test(x.innerText.trim()));
    return {
        status: h ? h.parentElement.innerText.replace(/\s+/g, ' ').trim().slice(0, 400) : null,
        buttons: actions ? [...actions.querySelectorAll('button, a')].filter(vis).map((b) => b.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean) : null,
    };
});

const onWizard = (page) => /\/decision\/record\//.test(page.url());

/**
 * Press the decision button `name` on the open workflow. A window that asks first (External
 * Review's "Request Revisions") takes its radio `choice` and "Next". Returns the windows met and
 * whether the decision's pages opened; {absent: true} when the round offers no such button.
 */
async function pressDecision(page, name, {choice = 0} = {}) {
    const dlg = page.locator('[role="dialog"]:visible').first();
    const btn = dlg.locator('[data-cy="workflow-action-items"]').getByRole('button', {name, exact: true}).first();
    await btn.waitFor({state: 'visible', timeout: 10_000}).catch(() => {});
    if (!(await btn.count())) return {absent: true, offered: (await roundState(page)).buttons};
    const before = page.url();
    await btn.click();
    await idle(page);
    const windows = [];
    for (let i = 0; i < 3 && !onWizard(page); i++) {
        await page.waitForFunction((b) => location.href !== b || [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length).length > 1, before, {timeout: 10_000}).catch(() => {});
        if (onWizard(page)) break;
        const open = page.locator('[role="dialog"]:visible');
        if ((await open.count()) < 2) break;
        const top = open.last();
        windows.push(flat(await top.innerText(), 500));
        const radios = top.locator('input[type=radio]');
        if ((await radios.count()) > choice) await radios.nth(choice).check({force: true});
        const next = top.getByRole('button', {name: /^(Next|Yes, Continue|Continue|OK)$/}).first();
        if (!(await next.count())) break;
        await next.click();
        await idle(page);
    }
    await page.waitForURL(/decision\/record/, {timeout: 20_000}).catch(() => {});
    return {windows, onWizard: onWizard(page)};
}

/** One page of the decision's wizard: its heading, the step list, each file list with its rows (ticked or not) and its text. */
async function wizardPage(page) {
    await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    await page.waitForTimeout(400);
    return page.evaluate(() => {
        const vis = (e) => e.getClientRects().length > 0;
        const txt = (e) => (e ? e.innerText.trim().replace(/\s+/g, ' ') : null);
        const main = document.querySelector('main') || document.body;
        const stepHeads = [...main.querySelectorAll('h2, h3')].filter(vis).map(txt).filter(Boolean).slice(0, 8);
        const lists = [...main.querySelectorAll('.listPanel')].filter(vis).map((p) => ({
            title: txt(p.querySelector('.listPanel__title, h2, h3')),
            files: [...p.querySelectorAll('.listPanel__item')].map((it) => ({text: txt(it).slice(0, 160), ticked: it.querySelector('input[type=checkbox]') ? it.querySelector('input[type=checkbox]').checked : null})),
            text: txt(p).slice(0, 300),
        }));
        return {h1: txt(main.querySelector('h1')), headings: stepHeads, lists};
    });
}

/**
 * "Continue" through the decision's pages to the one with "Record Decision", reading each
 * (`each(n, pageData)` is called per page, for a screen record), then press it.
 * Returns the pages, the decision request's status and the window that follows.
 */
async function throughWizard(page, each = async () => {}) {
    const pages = [];
    const rec = page.getByRole('button', {name: 'Record Decision', exact: true}).first();
    for (let n = 1; n < 8; n++) {
        const p = await wizardPage(page);
        pages.push(p);
        await each(n, p);
        if (await rec.isVisible().catch(() => false)) break;
        const cont = page.getByRole('button', {name: 'Continue', exact: true}).first();
        if (!(await cont.isVisible().catch(() => false))) break;
        await cont.click();
        await idle(page);
    }
    if (!(await rec.isVisible().catch(() => false))) return {pages, decision: null, done: null};
    const requests = [];
    const onResponse = (r) => {
        if (/\/submissions\/\d+\/(decisions|files\/\d+\/copy)/.test(r.url()) && r.request().method() !== 'GET') requests.push({url: r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 160), status: r.status()});
    };
    page.on('response', onResponse);
    await rec.click();
    await idle(page);
    await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog]')].some((e) => e.getClientRects().length), null, {timeout: T}).catch(() => {});
    await page.waitForTimeout(800);
    await idle(page);
    page.off('response', onResponse);
    const done = flat(await page.locator('[role="dialog"]:visible').last().innerText().catch(() => null), 400);
    return {pages, requests, done};
}

/** The "Select Files" page among a wizard's pages: its lists. */
const selectFiles = (pages) => (pages.find((p) => (p.lists || []).length) || {lists: []}).lists;

/** The author's "Upload revisions" on the open round: the component, the file, "Continue", "Continue", "Complete". */
async function uploadRevision(page, fileName, component = 'Book Manuscript') {
    const btn = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Upload revisions', exact: true});
    await btn.first().waitFor({state: 'visible', timeout: 10_000}).catch(() => {});
    if (!(await btn.count())) return {offered: false};
    await btn.first().click();
    const w = page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')}).last();
    await w.locator('input[type="file"]').waitFor({state: 'attached', timeout: T});
    await idle(page);
    const g = w.locator('select[id^="genreId"]');
    if (await g.count()) await g.selectOption({label: component}).catch(() => {});
    await w.locator('input[type="file"]').setInputFiles(pdfNamed(fileName));
    const cont = w.getByRole('button', {name: 'Continue', exact: true});
    for (let i = 0; i < 100 && !(await cont.isEnabled().catch(() => false)); i++) await page.waitForTimeout(200);
    await cont.click();
    await idle(page);
    await w.getByRole('tab', {name: /^2\./}).and(page.locator('[aria-selected="true"]')).waitFor({timeout: T}).catch(() => {});
    await page.waitForTimeout(500);
    await cont.click();
    await idle(page);
    await w.getByRole('button', {name: 'Complete', exact: true}).waitFor({timeout: T}).catch(() => {});
    await w.getByRole('button', {name: 'Complete', exact: true}).click();
    await w.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    await page.waitForTimeout(600);
    await idle(page);
    return {offered: true};
}

/** The submission's stored files: id, file stage, the round it hangs on, name. */
function storedFiles(app, submissionId) {
    const rows = sql(app, `select sf.submission_file_id, sf.file_stage, coalesce((select string_agg(rf.review_round_id::text, ',') from review_round_files rf where rf.submission_file_id = sf.submission_file_id), ''),
        (select string_agg(distinct setting_value, '/') from submission_file_settings s where s.submission_file_id = sf.submission_file_id and s.setting_name = 'name' and s.locale = 'en')
        from submission_files sf where sf.submission_id = ${Number(submissionId)} order by 1`);
    return rows ? rows.split('\n').map((l) => { const [id, stage, round, name] = l.split('|'); return {id: Number(id), fileStage: Number(stage), round, name}; }) : [];
}

/**
 * The way round by hand: "Upload/Select Files" above the table `table`, the window's list before
 * and after "Show files from all accessible workflow stages." is ticked, the row naming `fileName`
 * ticked, "OK". Every step is recorded, none throws: {offered: false} when the list has no such
 * button, `picked: false` when no row names the file.
 */
async function selectByHand(page, table, fileName) {
    const container = page.locator('[role="dialog"]:visible').first().locator('div').filter({has: page.getByRole('table', {name: table, exact: true})}).last();
    const btn = container.getByRole('button', {name: 'Upload/Select Files', exact: true});
    if (!(await btn.count())) return {offered: false};
    await btn.first().click();
    const w = page.getByRole('dialog').filter({has: page.locator('input[name="allStages"]')}).last();
    await w.waitFor({timeout: T}).catch(() => {});
    await idle(page);
    await page.waitForTimeout(500);
    const read = () => w.evaluate((d) => ({
        title: ((d.querySelector('h1, h2') || {}).innerText || '').trim(),
        boxes: [...d.querySelectorAll('input[type=checkbox]')].filter((i) => !i.closest('tr')).map((i) => ({label: ((i.closest('label') || i.parentElement || {}).innerText || '').replace(/\s+/g, ' ').trim().slice(0, 120), ticked: i.checked})),
        rows: [...d.querySelectorAll('tbody tr')].filter((r) => r.getClientRects().length).map((tr) => ({text: tr.innerText.trim().replace(/\s+/g, ' ').slice(0, 160), ticked: tr.querySelector('input[type=checkbox]') ? tr.querySelector('input[type=checkbox]').checked : null})),
        buttons: [...d.querySelectorAll('button, a.cancelButton')].filter((b) => b.getClientRects().length).map((b) => b.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
    })).catch((e) => ({error: String(e.message).slice(0, 200)}));
    const out = {offered: true, before: await read()};
    await w.locator('input[name="allStages"]').check({force: true}).catch(() => {});
    await page.waitForTimeout(800);
    await idle(page);
    await page.waitForTimeout(800);
    out.allStages = await read();
    const row = w.locator('tbody tr').filter({hasText: fileName}).first();
    out.picked = (await row.count()) > 0;
    if (out.picked) {
        await row.locator('input[type=checkbox]').first().check({force: true}).catch((e) => { out.tickError = String(e.message).slice(0, 160); });
        out.ticked = await read();
        const ok = w.getByRole('button', {name: 'OK', exact: true}).first();
        out.okOffered = (await ok.count()) > 0;
        if (out.okOffered) {
            await ok.click();
            await w.waitFor({state: 'hidden', timeout: T}).catch(() => {});
            await idle(page);
            await page.waitForTimeout(600);
            await idle(page);
            out.closed = !(await w.isVisible().catch(() => false));
        }
    } else {
        const c = w.getByRole('link', {name: 'Cancel', exact: true}).or(w.getByRole('button', {name: 'Cancel', exact: true})).first();
        await c.click().catch(() => {});
        await idle(page);
    }
    return out;
}

module.exports = {selectByHand, T, flat, rounds, roundKey, openWorkflow, tableRows, roundState, pressDecision, wizardPage, throughWizard, selectFiles, uploadRevision, storedFiles};
