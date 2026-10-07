// U39 claim check, chunk I07 (housekeeping incidentals 2026-10-07, row 35): register A2, "OK" in a
// library's "Add a file" window before a file has uploaded (Fields "File" row, Rule 3a, notes i, td4,
// f-a2). Both ends of "before a file has uploaded": no file chosen at all, and a file still uploading
// (the upload request held back for a few seconds by the browser, nothing else changed); the
// neighbour, "OK" once the file has uploaded. For every "OK": the page notices (the kit's
// `notices`, and a 250 ms poll of the refusal's sentence: onset and how long it stays), the
// window's own message area, whether the window stays open, the save's answer, and the list right
// after and again after a reload.
//
// Seeds its own scratch context per app (nothing on publicknowledge): a manager `mg` and an author
// `au`, one submission by `au` (Submission stage). Screens, per app:
//   P  `mg`, Settings › Workflow › the library tab ("Publisher Library", "Press Library",
//      "Preprint Server Library"): no-file "OK"; Cancel; uploading "OK"; uploaded "OK"; reload;
//      then "Add a file" filled and the page left by a typed address (the sweep's leave-page read)
//   S  `mg`, the submission's workflow, "Library": no-file "OK"; Cancel; reload and reopen
//   X  `mg`, both libraries: the close button of a filled window before any "OK" (control), and
//      after a refused no-file "OK" (register A11)
//   A  `au`, the same submission from "My Submissions", "Library": no-file "OK"; Cancel; reload
//
//   PROBE_FEATURE=U39 PROBE_AGENT=ccI07 PROBE_RUN=r1 node bin/probe.js all shared/playwright/checks/U39/I07/i07.js
//   PHASES=P,S,X,A (default all). No assertions: facts-<run>-<app>.json and the screen-*.json snapshots.
const fs = require('fs');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, idle, tag, outFile} = require('../../../probe');
const L = require('../../issues/library-add-file-refused-closes-unasked/lib.js');

const PHASES = (process.env.PHASES || 'P,S,X,A').split(',');
const UPLOAD_HOLD_MS = 6000;

forEachApp(async (app) => {
    const t = tag('u39i07');
    const mg = `${t}mg`;
    const au = `${t}au`;
    const ctx = await app.api.createContext({tag: t, users: [
        {username: mg, roles: ['manager'], givenName: 'Mina', familyName: 'Manager'},
        {username: au, roles: ['author'], givenName: 'Abel', familyName: 'Author'},
    ]});
    const sub = await app.api.createSubmission({tag: `${t}s`, context: ctx.path, submitter: au, title: `I07 S ${t}`});
    const facts = {app: app.name, line: app.line, tag: t, context: ctx.path, submissionId: sub.submissionId};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}]`, k, JSON.stringify(v).slice(0, 1800)); };
    const file = outFile('i07-upload.txt');
    fs.writeFileSync(file, 'u39i07 library file\n');

    const {page, close} = await launch(app);
    const dw = L.watchDialogs(page);
    const net = L.watchSaves(page);
    const snap = async (name) => { const s = await screen(page); record(`screen-${name}`, s); return s; };
    const step = async (name, fn) => {
        try { fact(name, await fn()); } catch (e) { fact(name, {error: L.flat(e.message, 400)}); }
    };
    const edUrl = () => app.url(`/index.php/${ctx.path}/en/dashboard/editorial?workflowSubmissionId=${sub.submissionId}`);
    const auUrl = () => app.url(`/index.php/${ctx.path}/en/dashboard/mySubmissions?workflowSubmissionId=${sub.submissionId}`);

    async function openSubLib(url, label) {
        const {LibraryList, SUBMISSION_LIBRARY} = require('../../../pages/LibraryPages.js');
        await page.goto(url);
        await idle(page);
        await snap(`${label}-workflow`);
        const btn = page.getByRole('button', {name: 'Library', exact: true}).first();
        await loc(page, 'workflow header "Library"', page.getByRole('button', {name: 'Library', exact: true}));
        await btn.click({timeout: 30_000});
        const dialog = page.getByRole('dialog', {name: SUBMISSION_LIBRARY, exact: true});
        const list = new LibraryList(page, dialog);
        await list.expectLoaded();
        await idle(page);
        return list;
    }

    // "OK" with nothing uploaded, then the window's "Cancel", then the list right after.
    async function noFile(list, label) {
        const win = await L.fillAdd(list, `${t} nofile`, 'Other');
        await snap(`${label}-filled`);
        await loc(page, '"Add a file" OK', win.okButton());
        await loc(page, '"Add a file" message area (.pkp_notification in the form)', win.form().locator('.pkp_notification'));
        dw.step = `${label}-ok`;
        const before = dw.dialogs.length;
        const ok = await L.pressOk(page, win, net, `${label}-ok`, (n) => shot(page, n));
        ok.dialogs = dw.dialogs.slice(before);
        const s = await snap(`${label}-after-ok`);
        ok.settledDialogText = L.flat(s.text.dialog, 600);
        fact(`${label}-ok`, ok);
        await step(`${label}-cancel`, async () => { await win.cancelLink().click(); await win.expectClosed(); return {windowOpen: await L.windowOpen(page)}; });
        await step(`${label}-listed-after`, () => L.listed(list, 'Other'));
        await snap(`${label}-after-cancel`);
    }

    try {
        if (PHASES.includes('P')) {
            await signIn(page, mg, {contextPath: ctx.path});
            await idle(page);
            let list = await L.openPublisherLibrary(page, {...app, contextPath: ctx.path});
            await snap('P-library');
            await noFile(list, 'P-nofile');

            // The other end: "OK" while the chosen file is still uploading (its request held back).
            await step('P-uploading', async () => {
                const win = await L.fillAdd(list, `${t} uploading`, 'Other');
                let held = 0;
                await page.route(/upload-?file/i, async (route) => { held++; await L.sleep(UPLOAD_HOLD_MS); await route.continue(); });
                await screen(page);
                net.step = 'P-uploading';
                const from = net.calls.length;
                const t0 = Date.now();
                await win.uploadArea().locator('input[type="file"]').setInputFiles(file);
                await L.sleep(800);
                const out = {held};
                out.beforeOk = await L.messagesRead(page);
                out.okEnabled = await win.okButton().isEnabled().catch(() => null);
                out.uploadAreaText = L.flat(await win.uploadArea().innerText().catch(() => null), 300);
                await shot(page, 'P-uploading-before-ok');
                await win.okButton().click({timeout: 5_000}).catch((e) => { out.clickError = L.flat(e.message, 200); });
                out.okPressedAtMs = Date.now() - t0;
                await L.sleep(700);
                out.at700ms = await L.messagesRead(page);
                await shot(page, 'P-uploading-700ms');
                // Poll until the held upload has finished and a little after.
                let seen = null; let gone = null;
                while (Date.now() - t0 < UPLOAD_HOLD_MS + 6_000) {
                    await L.sleep(250);
                    const on = await page.evaluate((n) => document.body.innerText.includes(n), L.FILE_REQUIRED.slice(0, 30)).catch(() => false);
                    if (on && seen == null) seen = Date.now() - t0;
                    if (!on && seen != null && gone == null) gone = Date.now() - t0;
                }
                out.sentenceFirstSeenMs = seen; out.sentenceGoneMs = gone;
                await page.unroute(/upload-?file/i);
                const s = await snap('P-uploading-after');
                out.notices = s.notices;
                out.afterwards = await L.messagesRead(page);
                out.windowOpen = await L.windowOpen(page);
                out.calls = net.calls.slice(from).map((c) => ({kind: c.kind, status: c.status, url: c.url, body: c.body}));
                out.listed = await L.listed(list, 'Other');
                if (out.windowOpen) {
                    // The file has uploaded by now: "OK" again.
                    const again = await L.pressOk(page, win, net, 'P-uploading-ok2');
                    out.secondOk = {windowOpen: await L.windowOpen(page), notices: again.notices, calls: again.calls,
                        sentenceFirstSeenMs: again.sentenceFirstSeenMs};
                    if (await L.windowOpen(page)) { await win.cancelLink().click().catch(() => {}); await win.expectClosed().catch(() => {}); }
                    else await L.sleep(500);
                    out.listedAfterSecondOk = await L.listed(list, 'Other');
                }
                return out;
            });

            // The neighbour: "OK" once the file has uploaded.
            await step('P-uploaded', async () => {
                const {markClosed} = require('../../../pages/LibraryPages.js');
                const win = await L.fillAdd(list, `${t} uploaded`, 'Other');
                await win.upload(file);
                await snap('P-uploaded-filled');
                const ok = await L.pressOk(page, win, net, 'P-uploaded-ok');
                if (!(await L.windowOpen(page))) await markClosed(page);
                const s = await snap('P-uploaded-after');
                return {windowOpen: await L.windowOpen(page), notices: ok.notices, settledNotices: s.notices, calls: ok.calls,
                    sentenceFirstSeenMs: ok.sentenceFirstSeenMs, listed: await L.listed(list, 'Other')};
            });

            await step('P-after-reload', async () => {
                await page.reload(); await idle(page);
                list = await L.openPublisherLibrary(page, {...app, contextPath: ctx.path});
                await snap('P-after-reload');
                return L.listed(list, 'Other');
            });

            // Sweep: the Settings page left with "Add a file" filled and unsaved.
            await step('P-leave-filled', async () => {
                await L.fillAdd(list, `${t} leave`, 'Other');
                await snap('P-leave-filled');
                return L.leavePage(page, {...app, contextPath: ctx.path}, dw, 'P-leave');
            });
            await step('P-after-leave', async () => {
                list = await L.openPublisherLibrary(page, {...app, contextPath: ctx.path});
                await snap('P-after-leave');
                return L.listed(list, 'Other');
            });
            await signOut(page);
        }

        if (PHASES.includes('S')) {
            await signIn(page, mg, {contextPath: ctx.path});
            await idle(page);
            let list = await openSubLib(edUrl(), 'S');
            await snap('S-library');
            await noFile(list, 'S-nofile');
            await step('S-after-reload', async () => {
                list = await openSubLib(edUrl(), 'S-reload');
                await snap('S-after-reload');
                return L.listed(list, 'Other');
            });
            await signOut(page);
        }

        // X (register A11, which the row's note says still shows): the close button after a refused
        // "OK", with its control (the close button of a filled window before any "OK" asks).
        if (PHASES.includes('X')) {
            await signIn(page, mg, {contextPath: ctx.path});
            await idle(page);
            for (const [label, open] of [['XP', () => L.openPublisherLibrary(page, {...app, contextPath: ctx.path})], ['XS', () => openSubLib(edUrl(), 'XS')]]) {
                const list = await open();
                await step(`${label}-control-close`, async () => {
                    const win = await L.fillAdd(list, `${t} close`, 'Other');
                    return L.closeButton(page, win, dw, `${label}-control`);
                });
                await step(`${label}-refused-close`, async () => {
                    const win = await L.fillAdd(list, `${t} close`, 'Other');
                    const ok = await L.pressOk(page, win, net, `${label}-ok`);
                    const s = await snap(`${label}-after-ok`);
                    const closed = await L.closeButton(page, win, dw, `${label}-close`);
                    await snap(`${label}-after-close`);
                    return {notices: ok.notices, settledNotices: s.notices, windowOpenAfterOk: ok.afterwards.windowOpen, close: closed,
                        listed: await L.listed(list, 'Other')};
                });
            }
            await signOut(page);
        }

        if (PHASES.includes('A')) {
            await signIn(page, au, {contextPath: ctx.path});
            await idle(page);
            let list = await openSubLib(auUrl(), 'A');
            await snap('A-library');
            await noFile(list, 'A-nofile');
            await step('A-after-reload', async () => {
                list = await openSubLib(auUrl(), 'A-reload');
                await snap('A-after-reload');
                return L.listed(list, 'Other');
            });
            await signOut(page);
        }
    } finally {
        facts.dialogs = dw.dialogs;
        facts.saveCalls = net.calls;
        record('facts', facts);
        await close();
    }
});
