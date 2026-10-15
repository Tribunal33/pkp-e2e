// Helpers of walk.js beside this file (the submission wizard's "Files" panel). Copied from the issue
// walks file-over-request-limit-server-error and cancel-upload-after-sent-keeps-file so this folder
// stands alone. Requiring this file runs nothing.
const fs = require('fs');
const path = require('path');
const {idle, signIn, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The suites' small PDF, "article.pdf" (243 bytes). */
const articlePdf = () => path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ojs', 'playwright', 'fixtures', 'files', 'article.pdf');

/** A file of `bytes` named `name` under <dir>/files that takes no disk (the browser's size check never reads it). */
function sparse(dir, name, bytes) {
    const d = path.join(dir, 'files');
    fs.mkdirSync(d, {recursive: true});
    const f = path.join(d, name);
    const fd = fs.openSync(f, 'w');
    fs.ftruncateSync(fd, bytes);
    fs.closeSync(fd);
    return f;
}

/** A file of `bytes` of real data named `name` under <dir>/files (a PDF header, then filler). */
function dense(dir, name, bytes) {
    const d = path.join(dir, 'files');
    fs.mkdirSync(d, {recursive: true});
    const f = path.join(d, name);
    if (!fs.existsSync(f) || fs.statSync(f).size !== bytes) {
        const b = Buffer.alloc(bytes, 0x20);
        b.write('%PDF-1.4\n%hkk28\n', 0);
        fs.writeFileSync(f, b);
    }
    return f;
}

/**
 * The developer tools' network throttling, for this page: `down` and `up` in bytes a second
 * (-1: not throttled). Returns the session, to change or lift it with `throttle(page, {...}, cdp)`.
 */
async function throttle(page, {down = -1, up = -1}, cdp = null) {
    const s = cdp || (await page.context().newCDPSession(page));
    if (!cdp) await s.send('Network.enable');
    await s.send('Network.emulateNetworkConditions', {offline: false, latency: 0, downloadThroughput: down, uploadThroughput: up});
    return s;
}

const panel = (page) => page.locator('.submissionFilesListPanel');
const row = (page, name) => panel(page).locator('li.listPanel__item').filter({hasText: name}).first();

/** The "Files" panel as data: each row's text, name link, buttons and progress; the empty text; the status. */
async function panelState(page) {
    return panel(page).evaluate((p) => {
        const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const status = p.querySelector('.fileUploader [role=status]');
        const empty = p.querySelector('.listPanel__empty');
        return {
            rows: [...p.querySelectorAll('li.listPanel__item')].map((li) => {
                const bar = li.querySelector('[role=progressbar]');
                const link = li.querySelector('a.listPanel__item--submissionFile__link');
                return {
                    text: clean(li.innerText).slice(0, 300),
                    link: link ? clean(link.innerText) : null,
                    buttons: [...li.querySelectorAll('button')].map((b) => clean(b.innerText)).filter(Boolean),
                    progress: bar ? Number(bar.getAttribute('aria-valuenow')) : null,
                };
            }),
            empty: empty ? clean(empty.innerText) : null,
            status: status ? clean(status.innerText) : null,
        };
    }).catch((e) => ({error: String(e.message).slice(0, 200)}));
}

/** "Add File" with `file` (one path or several) in the computer's file picker. */
async function pick(page, file) {
    const add = panel(page).getByRole('button', {name: 'Add File', exact: true}).first();
    const [chooser] = await Promise.all([page.waitForEvent('filechooser', {timeout: T}), add.click()]);
    await chooser.setFiles(file);
}

/**
 * Wait until the row of `name` satisfies `test(rowState)`; returns the row's state and how long it
 * took, or `{timedOut: true, …}` with the last state seen.
 */
async function waitRow(page, name, test, timeout = T, every = 25) {
    const t0 = Date.now();
    let last = null;
    while (Date.now() - t0 < timeout) {
        const st = await panelState(page);
        last = (st.rows || []).find((r) => r.text.includes(name)) || null;
        if (last && test(last)) return {...last, ms: Date.now() - t0};
        await sleep(every);
    }
    return {...(last || {}), timedOut: true, ms: Date.now() - t0};
}

/** How many files the submission holds on the server (the `submission_files` rows). */
const stored = (app, submissionId) => Number(sql(app, `select count(*) from submission_files where submission_id = ${Number(submissionId)}`));

/**
 * Bring `pg` to the wizard's "Upload Files" step: main reopens a draft on the step it was left on,
 * with "Upload Files" a button in the step list; 3.5 reopens it on "Details", from where the
 * footer's "Continue" goes on.
 */
async function toUploadFiles(pg) {
    const current = pg.locator('.pkpSteps__step__label--current');
    await current.waitFor({timeout: T});
    await idle(pg);
    if (!/Upload Files/.test(await current.innerText())) {
        const inList = pg.locator('.pkpSteps').getByRole('button', {name: /Upload Files/}).first();
        if (await inList.count()) await inList.click();
        else await pg.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true}).click();
        await current.filter({hasText: 'Upload Files'}).waitFor({timeout: T});
        await idle(pg);
    }
    await panel(pg).waitFor({timeout: T});
}

/** Open the wizard's address `url` in `pg` (a fresh page) and go to "Upload Files". */
async function openUploadFiles(pg, url) {
    await pg.goto(url);
    await toUploadFiles(pg);
}

/** Reload the wizard and go back to "Upload Files". */
async function reloadToUploadFiles(page) {
    await page.reload();
    await toUploadFiles(page);
}

/**
 * Steps 1–2: sign in as `user`, "Make a Submission" with `title`, the required boxes ticked and
 * every radio group left unanswered given its first choice (OJS's "Section"; OMP's work type keeps
 * its default), "Begin Submission"; on 3.5 "Continue" from "Details". Returns the submission's id.
 */
async function startSubmission(page, app, origin, user, title) {
    await signIn(page, user, {origin});
    const lang = /3_[34]/.test(app.line || '') ? '' : '/en';
    await page.goto(`${origin}/index.php/${app.contextPath}${lang}/submission`);
    await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: T});
    await idle(page);
    const body = page.frameLocator('iframe.tox-edit-area__iframe').first().locator('body');
    await body.click();
    await body.fill(title);
    for (const box of [page.getByRole('checkbox', {name: /meets all of these requirements/}), page.getByRole('checkbox', {name: /agree to have my data collected/})]) {
        if (await box.count()) await box.check();
    }
    const radios = await page.getByRole('radio').evaluateAll((els) => els.map((e) => ({name: e.name, checked: e.checked})));
    const groups = {};
    for (const x of radios) (groups[x.name] ||= []).push(x);
    for (const [g, list] of Object.entries(groups)) if (!list.some((x) => x.checked)) await page.locator(`input[type=radio][name="${g}"]`).first().check();
    await page.getByRole('button', {name: 'Begin Submission'}).click();
    await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
    await toUploadFiles(page);
    return Number(new URL(page.url()).searchParams.get('id'));
}

module.exports = {T, sleep, flat, articlePdf, sparse, dense, throttle, panel, row, panelState, pick, waitRow, stored, toUploadFiles, openUploadFiles, reloadToUploadFiles, startSubmission};
