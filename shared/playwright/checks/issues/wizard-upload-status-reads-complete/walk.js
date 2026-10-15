// Issue report docs/issues/U36-A29-wizard-upload-status-reads-complete.md (U36 A29): the submission
// wizard's "Files" panel tells screen readers "Uploading 100% complete" after "Cancel upload" and
// on an emptied panel. Walked through the screens on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"), context `publicknowledge`, OJS and OMP (a preprint server's wizard
// has no "Files" panel; OPS records that). The kit builds nothing. The status is the panel's
// `role="status"` element (what a screen reader is given), read as text; an in-page clock (every
// 5 ms) keeps each change of it. The developer tools' throttling profile of step 7 (Upload 1 kbit/s)
// is set through the DevTools protocol: 128 bytes a second on what the browser sends.
//
//   1. sign in as zzedd; "Make a Submission" "hkk28 upload status", "Begin Submission" (3.5: "Continue")
//   2. the status
//   3. "Add File": large.pdf (300 MiB): the row refuses it; the status
//   4. "Cancel upload" on that row: the status at once, 1 s and 5 s on
//   5. "Add File": article.pdf, until its row asks "What kind of file is this?": the status
//   6. "Remove" > "Yes" on article.pdf: the empty panel; the status
//   7. reload: the status; the throttling profile on
//   8. "Add File": manuscript.pdf (48 KiB); "Cancel upload" while its row offers it: the status at
//      once, 1 s and 5 s on
//
// MODE=nb (the neighbour, alone; with the fix in and out), on a submission of its own: what the
// status reads while an upload is on its way and once it has ended:
//   n1. throttling Upload 1 kbit/s; "Add File": slow.pdf (2 KiB), left alone until its row is stored
//   n2. no throttling; "Add File": article.pdf and notes.md at once, left alone
//
// MODE=removal (with the fix in and out), on a submission of its own: what the status reads after removals:
//   r1–r2. "Add File": article.pdf, left alone; "Remove" > "Yes" on it (the panel empty)
//   r3–r5. "Add File": notes.md, then "Add File": manuscript.pdf; "Remove" on manuscript.pdf while
//          notes.md stays; then "Remove" on notes.md
//
// Reset first: npm run fleet-prep -- --feature issues-k6 --dataset 8 --reset
// Run (main):  PROBE_FEATURE=issues-k6 PROBE_AGENT=k28 node bin/probe.js ojs shared/playwright/checks/issues/wizard-upload-status-reads-complete/walk.js
//              (omp, ops the same; MODE=removal and MODE=nb as above; PROBE_RUN=fix|removal-in|removal-out|nb-in|nb-out for a trial)
// Run (3.5):   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-k6-3_5 --dataset 8 --reset
//              PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-k6-3_5 PROBE_AGENT=k28 node bin/probe.js ojs …
// Facts: .reports/<feature>/k28/a29-facts[-<run>]-<app>.json; screens a29-…-<app>.json
// No assertions: the script records, the report's Observed is read from the facts.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, screen, shot, record, outDir, idle} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The panel's role="status" elements, as text (null when there is none). */
const status = (page) => L.panel(page).evaluate((p) => {
    const s = [...p.querySelectorAll('[role=status]')].map((e) => e.textContent.replace(/\s+/g, ' ').trim());
    return s.length ? s.join(' | ') : null;
}).catch((e) => `ERROR ${String(e.message).slice(0, 100)}`);

/** An in-page clock (every 5 ms) keeping each change of the status text and the rows. */
async function startClock(page) {
    await page.evaluate(() => {
        if (window.__k28) clearInterval(window.__k28.timer);
        const t0 = performance.now();
        const log = [];
        let last = null;
        const tick = () => {
            const p = document.querySelector('.submissionFilesListPanel');
            if (!p) return;
            const status = [...p.querySelectorAll('[role=status]')].map((s) => s.textContent.replace(/\s+/g, ' ').trim()).join(' | ') || null;
            const rows = [...p.querySelectorAll('li.listPanel__item')].map((li) => {
                const bar = li.querySelector('[role=progressbar]');
                const name = li.innerText.replace(/\s+/g, ' ').trim().slice(0, 50);
                return `${name}${bar ? ` [${bar.getAttribute('aria-valuenow')}]` : ''}`;
            });
            const v = JSON.stringify({status, rows});
            if (v !== last && log.length < 300) { last = v; log.push({ms: Math.round(performance.now() - t0), status, rows}); }
        };
        window.__k28 = {log, timer: setInterval(tick, 5)};
        tick();
    });
    return {read: () => page.evaluate(() => window.__k28.log.slice()).catch((e) => [{error: String(e.message).slice(0, 120)}])};
}

forEachApp(async (app) => {
    const tagRun = process.env.PROBE_RUN || '';
    const fact = (k, v) => { record('a29-facts', {[k]: v}, {merge: true}); console.log('[a29]', app.name, k, JSON.stringify(v).slice(0, 900)); };
    const step = async (k, fn) => {
        try { return await fn(); } catch (e) {
            fact(`${k}-FAILED`, String(e.stack || e).split('\n').slice(0, 5).join(' | '));
            return null;
        }
    };
    const {page} = await launch(app);
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message || e).slice(0, 300)));
    page.on('console', (m) => { if (m.type() === 'error' && errs.length < 50) errs.push(m.text().slice(0, 300)); });

    if (app.name === 'ops') {
        await L.startSubmission(page, app, app.baseURL, 'zzedd', 'hkk28 upload status').catch((e) => fact('ops-start', String(e.message).split('\n')[0]));
        fact('ops-surface', {filesPanels: await page.locator('.submissionFilesListPanel').count(), url: page.url()});
        record('a29-ops-upload-files', await screen(page));
        return;
    }
    const dir = outDir();
    const pdf = L.articlePdf();
    const three = async (k) => {                       // the status at once, 1 s and 5 s on
        const r = {atOnce: await status(page)};
        await sleep(1000); r.oneSecondOn = await status(page);
        await sleep(4000); r.fiveSecondsOn = await status(page);
        fact(k, {...r, panel: await L.panelState(page)});
    };

    if (MODE === 'walk') {
        const id = await L.startSubmission(page, app, app.baseURL, 'zzedd', 'hkk28 upload status');                  // 1
        const url = page.url();
        fact('submission', {id, url, run: tagRun});
        let clock = await startClock(page);
        fact('2-status', await status(page));                                                                       // 2
        await step('3-large', async () => {                                                                         // 3
            await L.pick(page, L.sparse(dir, 'large.pdf', 300 * 1024 * 1024));
            const r = await L.waitRow(page, 'large.pdf', (x) => /File is too big/.test(x.text), 15_000, 50);
            fact('3-large-refused', {row: r, status: await status(page)});
            record('a29-3-large-refused', await screen(page));
        });
        await step('4-cancel-refused', async () => {                                                                // 4
            await L.row(page, 'large.pdf').getByRole('button', {name: 'Cancel upload'}).click({timeout: 5000});
            await three('4-after-cancel-refused');
            await shot(page, 'a29-4-after-cancel-refused');
        });
        await step('5-upload', async () => {                                                                        // 5
            await L.pick(page, pdf);
            const r = await L.waitRow(page, 'article.pdf', (x) => /What kind of file is this/.test(x.text), 30_000, 50);
            await idle(page);
            await sleep(1000);
            fact('5-after-upload', {row: r, status: await status(page)});
        });
        await step('6-remove', async () => {                                                                        // 6
            await L.row(page, 'article.pdf').getByRole('button', {name: 'Remove', exact: true}).click();
            const ask = page.getByRole('dialog').filter({hasText: 'Are you sure you want to remove this file?'}).last();
            await ask.waitFor({timeout: 30_000});
            await ask.getByRole('button', {name: 'Yes', exact: true}).click();
            await ask.waitFor({state: 'hidden', timeout: 15_000}).catch(() => {});
            await idle(page);
            await three('6-after-remove-all');
            record('a29-6-empty-panel', await screen(page));
            await shot(page, 'a29-6-empty-panel');
        });
        fact('1-6-clock', await clock.read());
        await step('7-reload', async () => {                                                                        // 7
            await L.reloadToUploadFiles(page);
            fact('7-after-reload', await status(page));
        });
        const cdp = await L.throttle(page, {up: 128});
        clock = await startClock(page);
        await step('8-cancel-uploading', async () => {                                                              // 8
            await L.pick(page, L.dense(dir, 'manuscript.pdf', 48 * 1024));
            const r = await L.waitRow(page, 'manuscript.pdf', (x) => x.buttons.includes('Cancel upload'), 15_000, 20);
            const before = await status(page);
            await L.row(page, 'manuscript.pdf').getByRole('button', {name: 'Cancel upload'}).click({timeout: 5000});
            fact('8-row-before-cancel', {row: r, statusBefore: before});
            await three('8-after-cancel-uploading');
            await shot(page, 'a29-8-after-cancel-uploading');
        });
        await L.throttle(page, {}, cdp);
        fact('8-clock', await clock.read());
        fact('8-stored-files', L.stored(app, id));
    }

    if (MODE === 'removal') {
        const id = await L.startSubmission(page, app, app.baseURL, 'zzedd', 'hkk28 status after removal');
        fact('removal-submission', {id, run: tagRun});
        const notes = path.join(dir, 'files', 'notes.md');
        fs.mkdirSync(path.dirname(notes), {recursive: true});
        fs.writeFileSync(notes, '# Notes\n\nNotes for the hkk28 walk.\n');
        const removeRow = async (name) => {
            await L.row(page, name).getByRole('button', {name: 'Remove', exact: true}).click();
            const ask = page.getByRole('dialog').filter({hasText: 'Are you sure you want to remove this file?'}).last();
            await ask.waitFor({timeout: 30_000});
            await ask.getByRole('button', {name: 'Yes', exact: true}).click();
            await ask.waitFor({state: 'hidden', timeout: 15_000}).catch(() => {});
            await idle(page);
        };
        const up = async (file, name) => {
            await L.pick(page, file);
            await L.waitRow(page, name, (x) => !!x.link, 30_000, 50);
            await idle(page);
            await sleep(1000);
        };
        await step('r1-r2', async () => {                    // an upload left alone, then its removal: the panel empty
            await up(pdf, 'article.pdf');
            fact('r1-after-upload', await status(page));
            await removeRow('article.pdf');
            await three('r2-after-removing-the-only-file');
        });
        await step('r3-r5', async () => {                    // two uploads; the later one removed while the earlier stays
            await up(notes, 'notes.md');
            await up(L.dense(dir, 'manuscript.pdf', 48 * 1024), 'manuscript.pdf');
            fact('r3-after-two-uploads', await status(page));
            await removeRow('manuscript.pdf');
            await three('r4-after-removing-the-last-upload-notes-stays');
            await removeRow('notes.md');
            await three('r5-after-removing-the-earlier-upload');
        });
        fact('removal-stored-files', L.stored(app, id));
    }

    if (MODE === 'nb') {
        const id = await L.startSubmission(page, app, app.baseURL, 'zzedd', 'hkk28 neighbour status');
        fact('nb-submission', {id, run: tagRun});
        await step('n1-slow', async () => {
            const cdp = await L.throttle(page, {up: 128});
            const clock = await startClock(page);
            await L.pick(page, L.dense(dir, 'slow.pdf', 2 * 1024));
            const r = await L.waitRow(page, 'slow.pdf', (x) => !!x.link, 120_000, 100);
            await sleep(1500);
            await L.throttle(page, {}, cdp);
            fact('n1-slow-upload', {row: r, statusAfter: await status(page), clock: await clock.read()});
        });
        await step('n2-two', async () => {
            const notes = path.join(dir, 'files', 'notes.md');
            fs.mkdirSync(path.dirname(notes), {recursive: true});
            fs.writeFileSync(notes, '# Notes\n\nNotes for the hkk28 walk.\n');
            const clock = await startClock(page);
            const add = L.panel(page).getByRole('button', {name: 'Add File', exact: true}).first();
            const [chooser] = await Promise.all([page.waitForEvent('filechooser', {timeout: 30_000}), add.click()]);
            await chooser.setFiles([pdf, notes]);
            await L.waitRow(page, 'notes.md', (x) => !!x.link, 30_000, 100);
            await L.waitRow(page, 'article.pdf', (x) => !!x.link, 30_000, 100);
            await sleep(1500);
            fact('n2-two-uploads', {statusAfter: await status(page), panel: await L.panelState(page), clock: await clock.read()});
        });
        fact('nb-stored-files', L.stored(app, id));
    }
    fact('page-errors', errs);
});
