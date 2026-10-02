// Issue report docs/issues/U36-A25-cancel-upload-after-sent-keeps-file.md (U36 A25): in the
// submission wizard's "Files" panel, "Cancel upload" pressed once the whole file has been sent, but
// before the server's answer, removes the row and keeps the file. Walked through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), context
// `publicknowledge`, OJS and OMP (a preprint server's wizard has no "Files" panel). The kit builds
// nothing. The developer tools' throttling profile of the steps (Download 1 kbit/s, Upload not
// throttled) is set through the DevTools protocol: 125 bytes a second on what the server sends.
//
//   1. sign in as zzedd
//   2. "Make a Submission" "u36b cancel upload", "Begin Submission" (3.5: "Continue" from "Details")
//   3. the throttling profile on
//   4. "Add File": article.pdf; the row with its bar full and "Cancel upload"
//   5. "Cancel upload"
//   6. throttling off
//   7. "Continue" up to "Review": the "Files" block
//   8. "Upload Files" in the step list, "Add File": manuscript.pdf, "Article Text" ("Book Manuscript")
//   9. "Details" in the step list: an abstract
//  10. "Continue" up to "Review": the "Files" block; the confirmations, "Submit" › "Submit"
//  11. sign in as dbarnes, the submission's workflow: the files it lists
//
// MODE=plain (no throttling, a submission of its own) times the window and presses in it:
//   p1. article.pdf left alone: how long its row offers "Cancel upload"
//   p2. quick.pdf: "Cancel upload" pressed as soon as the row offers it
//   p3. large.pdf (90 MiB) left alone: from the full bar to the name link
//   p4. large-cancelled.pdf (90 MiB): "Cancel upload" pressed on the full bar
//   then a reload: the panel
//
// MODE=nb runs the neighbour alone (with the fix in and out), on a submission of its own:
//   n1. under the same profile, article.pdf left alone ends as a stored row (and how long the answer took)
//   n2. with the upload itself held back (Upload 64 bytes/s, kept until after the reload),
//       "Cancel upload" on cancelled.pdf stores nothing
//   n3. "Remove" › "Yes" on article.pdf removes it
//   n4. a file over the size limit is refused in its row, and "Cancel upload" clears the row
//
// Reset first:  npm run fleet-prep -- --feature issues-u36b --dataset <n> --reset
// Run (main):   PROBE_FEATURE=issues-u36b PROBE_AGENT=u36b node bin/probe.js ojs,omp shared/playwright/checks/issues/cancel-upload-after-sent-keeps-file/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u36b-3_5 --dataset <n> --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u36b-3_5 PROBE_AGENT=u36b node bin/probe.js ojs,omp shared/playwright/checks/issues/cancel-upload-after-sent-keeps-file/walk.js
// Facts: .reports/<feature>/u36b/a25-facts[-<run>]-<app>.json
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, screen, shot, record, outDir, idle, signIn} = require('../../../probe');
const A8 = require('../section-editors-not-assigned-second-journal/lib');
const D = require('../double-submit-empty-problems-banner/lib');
const W = require('../file-over-request-limit-server-error/lib');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const UPLOAD_CALL = /^POST \/[^ ]*\/files$/;
const DELETE_CALL = /^DELETE /;

forEachApp(async (app) => {
    const fact = (k, v) => { record('a25-facts', {[k]: v}, {merge: true}); console.log('[a25]', app.name, k, JSON.stringify(v).slice(0, 900)); };
    const step = async (k, fn) => {
        try { return await fn(); } catch (e) {
            fact(`${k}-FAILED`, String(e.stack || e).split('\n').slice(0, 5).join(' | '));
            return null;
        }
    };
    if (app.name === 'ops') { fact('surface', 'none: a preprint server\'s wizard has no "Files" panel'); return; }
    const pdf = L.articlePdf();
    const {page} = await launch(app);
    const dialogs = [];
    page.on('dialog', (d) => { dialogs.push(`${d.type()}: ${d.message()}`); d.accept().catch(() => {}); });

    if (MODE === 'walk') {
        const id = await W.startSubmission(page, app, app.baseURL, 'zzedd', 'u36b cancel upload');              // 1–2
        fact('submission', id);
        record('a25-1-upload-files', await screen(page));
        fact('panel-before', await L.panelState(page));
        const cdp = await L.throttle(page, {down: 125});                                                         // 3
        const watch = L.watchFiles(page);
        await L.pick(page, pdf);                                                                                 // 4
        const sent = await L.waitRow(page, 'article.pdf', L.sentNotAnswered, 20_000);
        fact('row-sent', sent);
        await shot(page, 'a25-2-row-sent');
        const pressedAt = Date.now();
        await step('cancel', () => L.row(page, 'article.pdf').getByRole('button', {name: 'Cancel upload'}).click({timeout: 5000}));   // 5
        await L.sleep(300);
        fact('panel-after-cancel', await L.panelState(page));
        await shot(page, 'a25-3-after-cancel');
        await L.throttle(page, {}, cdp);                                                                         // 6
        // how the upload's request ended, and (with the fix) the removal that follows its answer
        const t0 = Date.now();
        while (Date.now() - t0 < 30_000 && !watch.ended(UPLOAD_CALL)) await L.sleep(100);
        const answered = watch.events.some((e) => e.event === 'answered' && UPLOAD_CALL.test(e.call));
        if (answered) { const t1 = Date.now(); while (Date.now() - t1 < 10_000 && !watch.ended(DELETE_CALL)) await L.sleep(100); }
        await L.sleep(500);
        fact('requests', watch.events);
        fact('stored-after-cancel', {files: L.stored(app, id), msAfterPress: Date.now() - pressedAt});
        fact('dialogs-on-cancel', dialogs.slice());
        record('a25-3-after-cancel', await screen(page));
        const passed = await step('to-review', () => L.continueToReview(page));                                  // 7
        fact('review', {passed, files: await step('review-files', () => L.reviewFiles(page))});
        record('a25-4-review', await screen(page));
        await shot(page, 'a25-4-review');
        watch.stop();
        const main = app.name === 'omp' ? 'Book Manuscript' : 'Article Text';
        const second = path.join(outDir(), 'files', 'manuscript.pdf');
        fs.mkdirSync(path.dirname(second), {recursive: true});
        fs.copyFileSync(pdf, second);
        await step('second-file', async () => {                                                                  // 8
            await L.openStep(page, 'Upload Files');
            await L.pick(page, second);
            await L.waitRow(page, 'manuscript.pdf', (r) => !!r.link, 30_000, 100);
            await L.chooseComponent(page, 'manuscript.pdf', main);
        });
        fact('panel-second-file', await L.panelState(page));
        await step('abstract', async () => {                                                                     // 9
            await L.openStep(page, 'Details');
            await A8.typeAbstract(page, 'An abstract for the u36b walk.');
        });
        const passed2 = await step('to-review-2', () => L.continueToReview(page));                               // 10
        await step('review-checked', () => D.reviewChecked(page));
        fact('review-before-submit', {passed: passed2, files: await step('review-files-2', () => L.reviewFiles(page)), review: await step('read-review', () => D.readReview(page))});
        record('a25-5-review-before-submit', await screen(page));
        await shot(page, 'a25-5-review-before-submit');
        const submitted = await step('submit', async () => { await D.tickConfirmations(page); return D.pressSubmit(page); });
        fact('submit', submitted);
        fact('stored-after-submit', L.stored(app, id));
        const seen = await step('editor', async () => {                                                          // 11
            await signIn(page, 'dbarnes', {origin: app.baseURL});
            return L.workflowFiles(page, app, app.baseURL, id, ['article.pdf', 'manuscript.pdf']);
        });
        fact('editor-workflow-files', seen);
        record('a25-6-editor-workflow', await screen(page));
        await shot(page, 'a25-6-editor-workflow');
    }

    if (MODE === 'plain') {
        const id = await W.startSubmission(page, app, app.baseURL, 'zzedd', 'u36b cancel upload unthrottled');
        fact('plain-submission', id);
        const dir = path.join(outDir(), 'files');
        fs.mkdirSync(dir, {recursive: true});
        const quick = path.join(dir, 'quick.pdf');
        fs.copyFileSync(pdf, quick);
        const large = L.dense(outDir(), 'large.pdf', 90 * 1024 * 1024);
        const large2 = path.join(dir, 'large-cancelled.pdf');
        if (!fs.existsSync(large2)) fs.copyFileSync(large, large2);
        const settle = async (watch) => {
            const t0 = Date.now();
            while (Date.now() - t0 < 60_000 && !watch.ended(UPLOAD_CALL)) await L.sleep(50);
            if (watch.events.some((e) => e.event === 'answered' && UPLOAD_CALL.test(e.call))) { const t1 = Date.now(); while (Date.now() - t1 < 5000 && !watch.ended(DELETE_CALL)) await L.sleep(50); }
            await L.sleep(1000);
        };
        // p1, p3: left alone
        for (const [k, f, name] of [['plain1-small-left-alone', pdf, 'article.pdf'], ['plain3-large-left-alone', large, 'large.pdf']]) {
            await step(k, async () => {
                const clock = await L.timeRow(page, name);
                const watch = L.watchFiles(page);
                await L.pick(page, f);
                const done = await L.waitRow(page, name, (r) => !!r.link || /error|too big/i.test(r.text.replace(name, '')), 120_000, 50);
                await L.sleep(200);
                fact(k, {times: await clock.read(), row: done, requests: watch.events.slice(), stored: L.stored(app, id)});
                watch.stop();
            });
        }
        // p2: the press as soon as the row offers the button; p4: the press on the full bar
        for (const [k, f, name, when] of [['plain2-small-press', quick, 'quick.pdf', (r) => r.buttons.includes('Cancel upload')], ['plain4-large-press-full-bar', large2, 'large-cancelled.pdf', L.sentNotAnswered]]) {
            await step(k, async () => {
                const before = L.stored(app, id);
                const clock = await L.timeRow(page, name);
                const watch = L.watchFiles(page);
                await L.pick(page, f);
                const at = await L.waitRow(page, name, when, 120_000, 5);
                const pressed = await L.row(page, name).getByRole('button', {name: 'Cancel upload'}).click({timeout: 2000}).then(() => true).catch((e) => String(e.message).split('\n')[0].slice(0, 160));
                await settle(watch);
                fact(k, {rowAtPress: at, pressed, times: await clock.read(), requests: watch.events.slice(), storedBefore: before, stored: L.stored(app, id), panel: await L.panelState(page)});
                watch.stop();
            });
        }
        record('a25-plain-before-reload', await screen(page));
        await step('plain-reload', () => L.reloadToUploadFiles(page));
        fact('plain-after-reload', {panel: await L.panelState(page), stored: L.stored(app, id)});
        record('a25-plain-after-reload', await screen(page));
        await shot(page, 'a25-plain-after-reload');
    }

    if (MODE === 'nb') {
        const id = await W.startSubmission(page, app, app.baseURL, 'zzedd', 'u36b cancel upload neighbour');
        fact('nb-submission', id);
        const dir = path.join(outDir(), 'files');
        fs.mkdirSync(dir, {recursive: true});
        const second = path.join(dir, 'cancelled.pdf');
        fs.copyFileSync(pdf, second);
        const big = L.sparse(outDir(), 'too-big.pdf', 300 * 1024 * 1024);

        // n1: the same profile, the upload left alone
        let cdp = await L.throttle(page, {down: 125});
        let watch = L.watchFiles(page);
        await L.pick(page, pdf);
        const full = await L.waitRow(page, 'article.pdf', L.sentNotAnswered, 20_000);
        const done = await L.waitRow(page, 'article.pdf', (r) => !!r.link, 120_000, 250);
        await L.throttle(page, {}, cdp);
        await idle(page);
        fact('nb1-left-alone', {full, done, requests: watch.events.slice(), stored: L.stored(app, id), panel: await L.panelState(page)});
        record('a25-nb1-left-alone', await screen(page));
        watch.stop();

        // n2: the upload itself held back; the throttle stays until the reloaded panel is read
        cdp = await L.throttle(page, {up: 64}, cdp);
        watch = L.watchFiles(page);
        await L.pick(page, second);
        const onItsWay = await L.waitRow(page, 'cancelled.pdf', (r) => r.buttons.includes('Cancel upload'), 20_000);
        const before = L.stored(app, id);
        await step('nb2-cancel', () => L.row(page, 'cancelled.pdf').getByRole('button', {name: 'Cancel upload'}).click({timeout: 5000}));
        await L.sleep(300);
        const afterCancel = await L.panelState(page);
        await L.sleep(1500);
        const requests = watch.events.slice();
        watch.stop();
        await step('nb2-reload', () => L.reloadToUploadFiles(page));
        const afterReload = await L.panelState(page);
        await L.throttle(page, {}, cdp);
        await L.sleep(3000);
        fact('nb2-cancel-on-its-way', {row: onItsWay, storedBefore: before, afterCancel, requests, afterReload, stored: L.stored(app, id)});
        record('a25-nb2-cancel-on-its-way', await screen(page));

        // n3: "Remove" › "Yes" on the stored file
        watch = L.watchFiles(page);
        await step('nb3-remove', async () => {
            await L.row(page, 'article.pdf').getByRole('button', {name: 'Remove', exact: true}).click({timeout: 5000});
            const ask = page.getByRole('dialog').filter({hasText: 'Remove'}).last();
            await ask.getByRole('button', {name: 'Yes', exact: true}).click({timeout: 10_000});
            await ask.waitFor({state: 'hidden', timeout: 15_000});
            await idle(page);
        });
        fact('nb3-remove', {requests: watch.events.slice(), panel: await L.panelState(page), stored: L.stored(app, id)});
        record('a25-nb3-remove', await screen(page));

        // n4: a file over the size limit, refused in its row; "Cancel upload" clears it
        await L.pick(page, big);
        const refused = await L.waitRow(page, 'too-big.pdf', (r) => /too big/i.test(r.text), 15_000);
        await step('nb4-cancel', () => L.row(page, 'too-big.pdf').getByRole('button', {name: 'Cancel upload'}).click({timeout: 5000}));
        await L.sleep(500);
        fact('nb4-refused-row', {refused, requests: watch.events.slice(), panel: await L.panelState(page), stored: L.stored(app, id)});
        record('a25-nb4-refused-row', await screen(page));
        watch.stop();
        fs.unlinkSync(big);
    }
    fact(`${MODE}-dialogs`, dialogs);
    await page.close();
});
