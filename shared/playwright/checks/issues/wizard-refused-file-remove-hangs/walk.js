// Issue report docs/issues/U36-A28-wizard-refused-file-remove-hangs.md (U36 A28): in the submission
// wizard's "Files" panel, a "Remove" the server refuses leaves the "Remove" window open with a spinner
// and no message, and a refused component choice says nothing. Walked through the screens on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"), context `publicknowledge`,
// OJS and OMP (a preprint server's wizard has no "Files" panel; OPS records that). The kit builds
// nothing.
//
// Removed in another tab:
//   1. sign in as zzedd
//   2. "Make a Submission" "hkk28 refused remove", "Begin Submission" (3.5: "Continue" from "Details")
//   3. "Add File": article.pdf, "Add File": notes.md
//   4. a second tab on the same wizard address, "Upload Files": "Remove" > "Yes" on both files
//   5. first tab: "Remove" on article.pdf, "Yes"
//   6. "Yes" again (when the window is still open)
//   7. "No" (when the window is still open; on 3.5, where "Yes" and "No" are greyed, the keyboard's Escape)
//   8. on notes.md, the component link "Article Text" ("Book Manuscript")
//   9. reload: the panel
// Signed out in another tab:
//  10. "Add File": article.pdf
//  11. second tab: the sign-out address
//  12. first tab: "Remove" on article.pdf, "Yes"; then "No" (when still open)
//  13. on article.pdf, the component link
//
// MODE=nb (the neighbour, alone; with the fix in and out): on a submission of its own, a "Remove" and
// a component link the server accepts: n1 "Add File" article.pdf and notes.md; n2 the component link
// on notes.md; n3 "Remove" > "Yes" on article.pdf; n4 reload.
//
// Reset first: npm run fleet-prep -- --feature issues-k6 --dataset 8 --reset
// Run (main):  PROBE_FEATURE=issues-k6 PROBE_AGENT=k28 node bin/probe.js ojs shared/playwright/checks/issues/wizard-refused-file-remove-hangs/walk.js
//              (omp, ops the same; MODE=nb for the neighbour; PROBE_RUN=fix|nb-in|nb-out for a trial)
// Run (3.5):   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-k6-3_5 --dataset 8 --reset
//              PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-k6-3_5 PROBE_AGENT=k28 node bin/probe.js ojs …
// Facts: .reports/<feature>/k28/a28-facts[-<run>]-<app>.json; screens a28-…-<app>.json
// No assertions: the script records, the report's Observed is read from the facts.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, screen, shot, record, outDir, idle} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const bounded = (p, ms, fallback) => Promise.race([p, sleep(ms).then(() => fallback)]);

/** The visible windows (role="dialog"): title, text, buttons, spinners on show. */
const windows = (page) => page.locator('[role="dialog"]:visible').evaluateAll((els) => els.map((d) => ({
    name: (d.getAttribute('aria-labelledby') && document.getElementById(d.getAttribute('aria-labelledby'))?.innerText.trim()) || d.getAttribute('aria-label') || null,
    text: d.innerText.replace(/\s+/g, ' ').trim().slice(0, 400),
    buttons: [...d.querySelectorAll('button')].filter((b) => b.getClientRects().length).map((b) => (b.innerText || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim() + (b.disabled ? ' [disabled]' : '')).filter(Boolean),
    spinners: [...d.querySelectorAll('.pkpSpinner')].filter((e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').length,
}))).catch(() => []);

forEachApp(async (app) => {
    const tagRun = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const fact = (k, v) => { record('a28-facts', {[k]: v}, {merge: true}); console.log('[a28]', app.name, k, JSON.stringify(v).slice(0, 900)); };
    const step = async (k, fn) => {
        try { return await fn(); } catch (e) {
            fact(`${k}-FAILED`, String(e.stack || e).split('\n').slice(0, 5).join(' | '));
            return null;
        }
    };
    const MAIN = app.name === 'omp' ? 'Book Manuscript' : 'Article Text';
    const {page, context} = await launch(app);

    if (app.name === 'ops') {
        await L.startSubmission(page, app, app.baseURL, 'zzedd', 'hkk28 refused remove').catch((e) => fact('ops-start', String(e.message).split('\n')[0]));
        fact('ops-surface', {filesPanels: await page.locator('.submissionFilesListPanel').count(), url: page.url()});
        record('a28-ops-upload-files', await screen(page));
        return;
    }

    // the browser's own traffic to the files endpoint, both tabs; dialogs and console of both
    const t00 = Date.now();
    const traffic = [], jsDialogs = [], consoleErr = [];
    const tabOf = (q) => { try { return q.frame().page() === page ? 'A' : 'B'; } catch (e) { return '?'; } };
    const what = (q) => `${q.headers()['x-http-method-override'] || q.method()} ${q.url().replace(/^.*\/api\/v1/, '').replace(/\?.*$/, '')}`;
    const mine = (q) => /\/submissions\/\d+\/files/.test(q.url()) && q.method() !== 'GET';
    context.on('request', (q) => { if (mine(q)) traffic.push({ms: Date.now() - t00, tab: tabOf(q), event: 'sent', call: what(q)}); });
    context.on('requestfailed', (q) => { if (mine(q)) traffic.push({ms: Date.now() - t00, tab: tabOf(q), event: 'failed', call: what(q), why: q.failure() && q.failure().errorText}); });
    context.on('response', async (r) => {
        const q = r.request();
        if (!mine(q)) return;
        const e = {ms: Date.now() - t00, tab: tabOf(q), event: 'answered', call: what(q), status: r.status()};
        traffic.push(e);
        if (r.status() >= 400) e.body = flat(await r.text().catch(() => null), 300);
    });
    const hear = (pg, who) => {
        pg.on('dialog', (d) => { jsDialogs.push({tab: who, type: d.type(), message: d.message().slice(0, 300)}); d.accept().catch(() => {}); });
        pg.on('console', (m) => { if (m.type() === 'error' && consoleErr.length < 100) consoleErr.push({tab: who, text: m.text().slice(0, 300)}); });
        pg.on('pageerror', (e) => consoleErr.push({tab: who, pageerror: String(e.message || e).slice(0, 300)}));
    };
    hear(page, 'A');
    const mark = () => ({r: traffic.length, d: jsDialogs.length, c: consoleErr.length});
    const since = (m) => ({requests: traffic.slice(m.r), browserDialogs: jsDialogs.slice(m.d), consoleErrors: consoleErr.slice(m.c)});
    const snap = async (pg, name) => {
        const s = await bounded(screen(pg), 45_000, null) || {url: pg.url(), error: 'screen() did not settle'};
        record(name, s);
        await shot(pg, name).catch(() => {});
        return s;
    };
    /** What the page shows after a press: at once (after idle) and 2 s on. */
    const after = async (pg, m, name) => {
        await bounded(idle(pg), 35_000);
        await sleep(300);
        const first = {windows: await windows(pg), panel: await L.panelState(pg)};
        const s = await snap(pg, name);
        await sleep(2000);
        return {...since(m), atOnce: first, notices: s.notices || null, twoSecondsOn: {windows: await windows(pg), panel: await L.panelState(pg)}};
    };
    const removeAsk = (pg) => pg.getByRole('dialog').filter({hasText: 'Are you sure you want to remove this file?'}).last();
    const errorWin = (pg) => pg.getByRole('dialog').filter({has: pg.getByRole('button', {name: 'OK', exact: true})}).last();
    /** With the fix an "Error" window may stand: record it and press its "OK". */
    const okError = async (pg, k) => {
        if (await errorWin(pg).isVisible().catch(() => false)) {
            fact(`${k}-error-window`, await windows(pg));
            await errorWin(pg).getByRole('button', {name: 'OK', exact: true}).click({timeout: 5000}).catch((e) => fact(`${k}-ok-click`, String(e.message).split('\n')[0]));
            await sleep(300);
            fact(`${k}-after-ok`, {windows: await windows(pg), panel: await L.panelState(pg)});
        }
    };
    const genreLink = (pg, name) => L.row(pg, name).locator('.listPanel--submissionFiles__setGenreButton').filter({hasText: new RegExp(`^\\s*${MAIN}\\s*$`)}).first();
    const files = path.join(outDir(), 'files');
    fs.mkdirSync(files, {recursive: true});
    const pdf = L.articlePdf();
    const notes = path.join(files, 'notes.md');
    fs.writeFileSync(notes, '# Notes\n\nNotes for the hkk28 walk.\n');
    const upload = async (pg, file, name) => {
        await L.pick(pg, file);
        return L.waitRow(pg, name, (r) => !!r.link, 30_000, 100);
    };

    if (MODE === 'walk') {
        const id = await L.startSubmission(page, app, app.baseURL, 'zzedd', 'hkk28 refused remove');                 // 1–2
        const url = page.url();
        fact('submission', {id, url, run: tagRun});
        fact('3-upload', {article: await upload(page, pdf, 'article.pdf'), notes: await upload(page, notes, 'notes.md')});   // 3
        await snap(page, 'a28-3-two-rows');

        const tabB = await context.newPage();                                                                       // 4
        hear(tabB, 'B');
        await step('4-tabB', async () => {
            await L.openUploadFiles(tabB, url);
            const control = {};
            for (const name of ['article.pdf', 'notes.md']) {
                const m = mark();
                await L.row(tabB, name).getByRole('button', {name: 'Remove', exact: true}).click();
                const ask = removeAsk(tabB);
                await ask.waitFor({timeout: 30_000});
                if (name === 'article.pdf') await snap(tabB, 'a28-4-tabB-remove-window');
                await ask.getByRole('button', {name: 'Yes', exact: true}).click();
                const closed = await ask.waitFor({state: 'hidden', timeout: 15_000}).then(() => true).catch(() => false);
                await idle(tabB);
                control[name] = {windowClosed: closed, ...since(m), panel: await L.panelState(tabB)};
            }
            fact('4-tabB-control-remove', control);
            await snap(tabB, 'a28-4-tabB-after-remove');
        });

        await page.bringToFront();
        await step('5-remove-yes', async () => {                                                                     // 5
            const m = mark();
            await L.row(page, 'article.pdf').getByRole('button', {name: 'Remove', exact: true}).click();
            const ask = removeAsk(page);
            await ask.waitFor({timeout: 30_000});
            await ask.getByRole('button', {name: 'Yes', exact: true}).click();
            fact('5-remove-yes', await after(page, m, 'a28-5-remove-yes'));
            await okError(page, '5');
            if (await ask.isVisible().catch(() => false)) {                                                          // 6
                const m2 = mark();
                await ask.getByRole('button', {name: 'Yes', exact: true}).click({timeout: 5000}).catch((e) => fact('6-click', String(e.message).split('\n')[0]));
                fact('6-yes-again', await after(page, m2, 'a28-6-yes-again'));
                const m3 = mark();                                                                                   // 7
                await ask.getByRole('button', {name: 'No', exact: true}).click({timeout: 5000}).catch((e) => fact('7-click', String(e.message).split('\n')[0]));
                await ask.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
                fact('7-no', await after(page, m3, 'a28-7-no'));
                // 3.5 greys "Yes" and "No" while the request runs: the keyboard's Escape
                if (await ask.isVisible().catch(() => false)) {
                    await page.keyboard.press('Escape');
                    await ask.waitFor({state: 'hidden', timeout: 5000}).catch(() => {});
                    fact('7-escape', {windowOpen: await ask.isVisible().catch(() => false), windows: await windows(page)});
                }
            } else fact('6-7', 'the "Remove" window closed after the first "Yes"');
        });
        await step('8-genre-link', async () => {                                                                     // 8
            const m = mark();
            const link = genreLink(page, 'notes.md');
            fact('8-link-present', await link.count());
            await link.click({timeout: 10_000});
            const early = {ms300: null};
            await sleep(300);
            early.ms300 = {panel: await L.panelState(page), windows: await windows(page)};
            fact('8-genre-link', {...await after(page, m, 'a28-8-genre-link'), early});
            await okError(page, '8');
        });
        await step('9-reload', async () => {                                                                         // 9
            await L.reloadToUploadFiles(page);
            fact('9-reload', await L.panelState(page));
            await snap(page, 'a28-9-reload');
        });

        // signed out in another tab
        await step('10-upload', async () => fact('10-upload', await upload(page, pdf, 'article.pdf')));             // 10
        await step('11-tabB-signout', async () => {                                                                  // 11
            await tabB.bringToFront();
            await tabB.goto(app.url(`/index.php/${app.contextPath}${/3_[34]/.test(app.line || '') ? '' : '/en'}/login/signOut`));
            await idle(tabB);
            fact('11-tabB', {url: tabB.url(), title: await tabB.title()});
        });
        await page.bringToFront();
        await step('12-remove-yes', async () => {                                                                    // 12
            const m = mark();
            await L.row(page, 'article.pdf').getByRole('button', {name: 'Remove', exact: true}).click();
            const ask = removeAsk(page);
            await ask.waitFor({timeout: 30_000});
            await ask.getByRole('button', {name: 'Yes', exact: true}).click();
            const r = await after(page, m, 'a28-12-remove-yes-signed-out');
            await sleep(2000);
            r.fiveSecondsOn = {windows: await windows(page), panel: await L.panelState(page)};
            fact('12-remove-yes-signed-out', r);
            await okError(page, '12');
            if (await ask.isVisible().catch(() => false)) {
                await ask.getByRole('button', {name: 'No', exact: true}).click({timeout: 5000}).catch((e) => fact('12-no-click', String(e.message).split('\n')[0]));
                await ask.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
                fact('12-no', {windows: await windows(page), panel: await L.panelState(page)});
            }
            // 3.5 greys "Yes" and "No" while the request runs: the keyboard's Escape, then a reload
            if (await ask.isVisible().catch(() => false)) {
                await page.keyboard.press('Escape');
                await ask.waitFor({state: 'hidden', timeout: 5000}).catch(() => {});
                fact('12-escape', {windowOpen: await ask.isVisible().catch(() => false), windows: await windows(page)});
            }
            if (await ask.isVisible().catch(() => false)) {
                await page.reload();
                await idle(page);
                fact('12-reload', {url: page.url(), title: await page.title()});
            }
        });
        await step('13-genre-link-signed-out', async () => {                                                         // 13
            const m = mark();
            const link = genreLink(page, 'article.pdf');
            await link.click({timeout: 10_000});
            await sleep(300);
            const early = {panel: await L.panelState(page), windows: await windows(page)};
            fact('13-genre-link-signed-out', {...await after(page, m, 'a28-13-genre-link-signed-out'), early});
            await okError(page, '13');
        });
        fact('all-browser-dialogs', jsDialogs);
        fact('all-console-errors', consoleErr);
        await tabB.close().catch(() => {});
    }

    if (MODE === 'nb') {
        const id = await L.startSubmission(page, app, app.baseURL, 'zzedd', 'hkk28 neighbour remove');
        const url = page.url();
        fact('nb-submission', {id, run: tagRun});
        fact('n1-upload', {article: await upload(page, pdf, 'article.pdf'), notes: await upload(page, notes, 'notes.md')});
        await step('n2-genre', async () => {
            const m = mark();
            await genreLink(page, 'notes.md').click({timeout: 10_000});
            await L.row(page, 'notes.md').locator('.listPanel--submissionFiles__itemGenre').waitFor({timeout: 15_000}).catch(() => {});
            fact('n2-genre-link-accepted', await after(page, m, 'a28-n2-genre'));
            await okError(page, 'n2');
        });
        await step('n3-remove', async () => {
            const m = mark();
            await L.row(page, 'article.pdf').getByRole('button', {name: 'Remove', exact: true}).click();
            const ask = removeAsk(page);
            await ask.waitFor({timeout: 30_000});
            await ask.getByRole('button', {name: 'Yes', exact: true}).click();
            const closed = await ask.waitFor({state: 'hidden', timeout: 15_000}).then(() => true).catch(() => false);
            fact('n3-remove-accepted', {windowClosed: closed, ...await after(page, m, 'a28-n3-remove')});
            await okError(page, 'n3');
        });
        await step('n4-reload', async () => {
            await L.reloadToUploadFiles(page);
            fact('n4-reload', await L.panelState(page));
        });
        fact('nb-browser-dialogs', jsDialogs);
        fact('nb-console-errors', consoleErr);
    }
});
