// Helpers of walk.js (U36 A25: "Cancel upload" pressed after the whole file has been sent keeps the
// file; docs/issues/U36-A25-cancel-upload-after-sent-keeps-file.md). Requiring this file runs nothing.
const fs = require('fs');
const path = require('path');
const {idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const UPLOAD = /\/submissions\/\d+\/files(\?|$)/;
const ONE_FILE = /\/submissions\/\d+\/files\/\d+/;

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

/**
 * What the browser's own traffic to the files endpoint did from now on: each upload (POST …/files)
 * and each single-file call (…/files/{id}), with how it ended. `stop()` detaches.
 */
function watchFiles(page) {
    const t0 = Date.now();
    const events = [];
    const what = (q) => {
        const override = q.headers()['x-http-method-override'];
        return `${override || q.method()} ${q.url().replace(/^.*\/api\/v1/, '').replace(/\?.*$/, '')}`;
    };
    const mine = (q) => (UPLOAD.test(q.url()) && q.method() === 'POST') || ONE_FILE.test(q.url());
    const onReq = (q) => { if (mine(q)) events.push({ms: Date.now() - t0, event: 'sent', call: what(q)}); };
    const onFail = (q) => { if (mine(q)) events.push({ms: Date.now() - t0, event: 'failed', call: what(q), why: q.failure() && q.failure().errorText}); };
    const onRes = (r) => { if (mine(r.request())) events.push({ms: Date.now() - t0, event: 'answered', call: what(r.request()), status: r.status()}); };
    page.on('request', onReq);
    page.on('requestfailed', onFail);
    page.on('response', onRes);
    return {
        events,
        ended: (re) => events.some((e) => (e.event === 'failed' || e.event === 'answered') && re.test(e.call)),
        stop: () => { page.off('request', onReq); page.off('requestfailed', onFail); page.off('response', onRes); },
    };
}

const panel = (page) => page.locator('.submissionFilesListPanel');
const row = (page, name) => panel(page).locator('li.listPanel__item').filter({hasText: name}).first();

/** The "Files" panel as data: each row's text, name link, buttons and progress; the empty text. Waits for nothing. */
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

/** "Add File" (or the empty panel's "Upload File") with `file` in the computer's file picker. */
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

/** A row still uploading with its bar full: the whole request has been sent, the answer has not come. */
const sentNotAnswered = (r) => r.buttons.includes('Cancel upload') && r.progress === 100 && !r.link;

/** How many files the submission holds on the server (the `submission_files` rows). */
const stored = (app, submissionId) => Number(sql(app, `select count(*) from submission_files where submission_id = ${Number(submissionId)}`));

/** Reload the wizard and, when it opens on another step, press "Upload Files" in the step list. */
async function reloadToUploadFiles(page) {
    await page.reload();
    const current = page.locator('.pkpSteps__step__label--current');
    await current.waitFor({timeout: T});
    await idle(page);
    if (!/Upload Files/.test(await current.innerText())) {
        // main reopens on the step it was reloaded on, with "Upload Files" a button in the step list;
        // 3.5 reopens on "Details", where "Upload Files" is not started yet: the footer's "Continue"
        const inList = page.locator('.pkpSteps').getByRole('button', {name: /Upload Files/}).first();
        if (await inList.count()) await inList.click();
        else await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true}).click();
        await current.filter({hasText: 'Upload Files'}).waitFor({timeout: T});
        await idle(page);
    }
    await panel(page).waitFor({timeout: T});
}

/** Press the footer's "Continue" until "Review" is the current step; returns the steps passed. */
async function continueToReview(page) {
    const current = page.locator('.pkpSteps__step__label--current');
    const passed = [];
    for (let i = 0; i < 6; i++) {
        const label = flat(await current.innerText(), 60);
        passed.push(label);
        if (/Review/.test(label)) break;
        await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true}).click();
        await current.filter({hasNotText: label.replace(/^\d+\s*/, '')}).waitFor({timeout: T});
        await idle(page);
    }
    return passed;
}

/** The "Review" step's "Files" block: its text (warnings and the listed files). */
async function reviewFiles(page) {
    const block = page.locator('.submissionWizard__reviewPanel__body--files').first();
    await block.waitFor({timeout: T});
    return flat(await block.innerText(), 500);
}

/** A file of `bytes` of real data named `name` under <dir>/files (a PDF header, then filler). */
function dense(dir, name, bytes) {
    const d = path.join(dir, 'files');
    fs.mkdirSync(d, {recursive: true});
    const f = path.join(d, name);
    if (!fs.existsSync(f) || fs.statSync(f).size !== bytes) {
        const b = Buffer.alloc(bytes, 0x20);
        b.write('%PDF-1.4\n%u36b\n', 0);
        fs.writeFileSync(f, b);
    }
    return f;
}

/**
 * Time the row of `name` in the page itself (every 4 ms): when it first offered "Cancel upload",
 * when its bar first read 100 and when its name became a link. `read()` returns the three, in ms
 * from the start, and stops the clock.
 */
async function timeRow(page, name) {
    await page.evaluate((n) => {
        const t0 = performance.now();
        const t = {name: n};
        const tick = () => {
            const li = [...document.querySelectorAll('.submissionFilesListPanel li.listPanel__item')].find((x) => x.innerText.includes(n));
            if (!li) return;
            const now = Math.round(performance.now() - t0);
            const bar = li.querySelector('[role=progressbar]');
            if (t.offered == null && [...li.querySelectorAll('button')].some((b) => /Cancel upload/.test(b.innerText))) t.offered = now;
            if (t.full == null && bar && Number(bar.getAttribute('aria-valuenow')) === 100) t.full = now;
            if (t.link == null && li.querySelector('a.listPanel__item--submissionFile__link')) t.link = now;
        };
        window.__a25 = {t, timer: setInterval(tick, 4)};
    }, name);
    return {
        read: () => page.evaluate(() => { clearInterval(window.__a25.timer); return window.__a25.t; }),
    };
}

/** On the row of `name`, answer "What kind of file is this?" with the link `label`; waits for the badge. */
async function chooseComponent(page, name, label) {
    const r = row(page, name);
    await r.locator('.listPanel--submissionFiles__setGenreButton').filter({hasText: label}).first().click();
    await r.locator('.listPanel--submissionFiles__itemGenre').waitFor({timeout: T});
    await idle(page);
}

/** In the step list, press the started step `label` and wait until it is the current one. */
async function openStep(page, label) {
    const current = page.locator('.pkpSteps__step__label--current');
    await page.locator('.pkpSteps').getByRole('button', {name: new RegExp(label)}).first().click();
    await current.filter({hasText: label}).waitFor({timeout: T});
    await idle(page);
}

/**
 * The editor's view: the submission's workflow, opened by its address; returns which of `names`
 * the page shows once the first of them has appeared (the files list loads after the page).
 */
async function workflowFiles(page, app, origin, submissionId, names) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const wf = new WorkflowPage(page, app.contextPath);
    await page.goto(`${origin}${wf.editorialUrl(submissionId)}`);
    await wf.expectOpen(submissionId);
    await idle(page);
    await page.getByText(names[names.length - 1], {exact: false}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    const text = await page.locator('body').innerText();
    return Object.fromEntries(names.map((n) => [n, text.split(n).length - 1]));
}

module.exports = {dense, timeRow, chooseComponent, openStep, workflowFiles, T, sleep, flat, articlePdf, sparse, throttle, watchFiles, panel, row, panelState, pick, waitRow, sentNotAnswered, stored, reloadToUploadFiles, continueToReview, reviewFiles};
