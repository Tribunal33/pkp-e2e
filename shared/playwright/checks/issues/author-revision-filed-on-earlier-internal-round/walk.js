// U71 OMP8: while External Review asks for revisions, the author's "Upload" above the earlier
// internal round's "Revisions Uploaded" files the revision on that round
// (docs/issues/U71-OMP8-author-revision-filed-on-earlier-internal-round.md).
//
// On PKP's default test dataset for OMP (press `publicknowledge`), through the screens:
//   submission 6 "The Information Literacy User's Guide" (Internal Review Round 1, author dbernnard)
//   1-2  dbarnes: "Request Revisions" on Internal Review Round 1, "Record Decision"
//   3    dbarnes: "Send to External Review", "Record Decision"
//   4    dbarnes: "Request Revisions" on External Review Round 1 (first option), "Record Decision"
//   5    dbernnard: the submission from "My Submissions" (External Review Round 1)
//   6    side menu "Internal Review" > round 1; "Upload" above "Revisions Uploaded": the component,
//        u71d-revision.pdf, "Continue", "Continue", "Complete"
//   7    "Revisions Uploaded" on the internal round, then on External Review Round 1
//   8    dbarnes: External Review Round 1's status box and "Revisions Uploaded"
//   9    dbernnard: "Upload revisions" on External Review Round 1 takes u71d-revision-2.pdf
//   control: submission 11 "Dreamwork" as jlockehart, the internal round sent on with no revisions
//        request: what "Upload" opens.
// MODE=nb, the neighbour alone (with a fix in and out), every step recorded, none throwing:
//   submission 17 (Internal Review Round 1, author msmith): dbarnes "Request Revisions"; msmith's
//     "Upload" above "Revisions Uploaded" takes a file while the monograph is on Internal Review.
//   submission 16 (External Review Round 1, author mpower): the same on External Review.
//   submission 11 as jlockehart: the control again.
//
// Run (the fleet freshly reset to the dataset):
//   PROBE_FEATURE=<dataset fleet's feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/author-revision-filed-on-earlier-internal-round/walk.js
//   MODE=nb PROBE_RUN=nb-out … the same command
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<the 3.5 fleet's feature> … the same command
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('../internal-round-revised-files-not-carried/lib.js');
const A = require('../author-revisions-upload-offered-then-refused/lib.js');
const D = require('./lib.js');

const NB = process.env.MODE === 'nb';
const LIST = 'Revisions Uploaded';
const COMPONENT = 'Book Manuscript';
const INTERNAL = 2, EXTERNAL = 3;

forEachApp(async (app) => {
    if (app.name !== 'omp') return; // Internal Review is a press's stage
    const {page, close} = await launch(app);
    const o = {line: app.line || 'main', mode: NB ? 'nb' : 'walk'};
    let n = 0;
    const snap = async (name) => {
        const id = `${NB ? 'nb' : 'walk'}-${String(++n).padStart(2, '0')}-${name}`;
        record(id, await screen(page).catch((e) => ({error: String(e.message).slice(0, 200)})));
        await shot(page, id).catch(() => {});
    };
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) { o[key] = {threw: L.flat(e.stack || e.message, 500)}; await snap(`${key}-threw`).catch(() => {}); }
        console.log(`[omp8 ${key}]`, JSON.stringify(o[key]).slice(0, 2500));
        return o[key];
    };
    const round = (id, stageId) => L.rounds(app, id).filter((r) => r.stageId === stageId).pop();
    // dbarnes records `decision` on the round's page of the submission.
    const decide = (key, id, stageId, decision) => step(key, async () => {
        await signIn(page, 'dbarnes');
        await L.openWorkflow(page, app, id, {menuKey: L.roundKey(round(id, stageId))});
        const before = await L.roundState(page);
        const p = await L.pressDecision(page, decision, {choice: 0});
        if (!p.onWizard) return {before, pressed: p, recorded: false};
        const w = await L.throughWizard(page);
        return {before, windows: p.windows, pages: w.pages.map((x) => x.h1), requests: w.requests, done: w.done, recorded: true, stored: D.decisions(app, id)};
    });
    // What the round's page shows the signed-in user: heading, status box, both upload buttons, the list.
    const read = async () => ({heading: await D.workflowHeading(page), ...(await L.roundState(page)), ...(await A.offers(page))});
    // Press `button` and, when the upload window opens, take the file through it.
    const upload = async (button, fileName) => {
        const pressed = await A.press(page, button);
        await snap(`pressed-${fileName}`);
        if (pressed.kind !== 'wizard') return {pressed};
        return {pressed: {kind: pressed.kind, title: pressed.title, requests: pressed.requests.map((r) => `${r.method} ${r.url} ${r.status}`)}, through: await D.throughUpload(page, COMPONENT, D.revisionFile(fileName))};
    };
    const control = () => step('control', async () => {
        await signIn(page, 'jlockehart');
        await L.openWorkflow(page, app, 11, {author: true, menuKey: L.roundKey(round(11, INTERNAL))});
        const out = {decisions: D.decisions(app, 11), ...(await read())};
        await snap('control-round');
        if (out.upload) out.pressed = await A.press(page, A.uploadButton(page));
        await snap('control-pressed');
        return out;
    });
    // nb: dbarnes asks for revisions on the round the monograph is on, and the author's "Upload" takes the file.
    const stillTakes = async (key, id, stageId, author, fileName) => {
        await decide(`${key}Request`, id, stageId, 'Request Revisions');
        await step(`${key}Upload`, async () => {
            await signIn(page, author);
            await L.openWorkflow(page, app, id, {author: true, menuKey: L.roundKey(round(id, stageId))});
            const out = {before: await read()};
            if (out.before.upload) out.upload = await upload(A.uploadButton(page), fileName);
            await L.openWorkflow(page, app, id, {author: true, menuKey: L.roundKey(round(id, stageId))});
            out.after = await read();
            await snap(`${key}-after`);
            out.stored = L.storedFiles(app, id).filter((f) => /u71d/.test(f.name || ''));
            return out;
        });
    };
    try {
        if (NB) {
            await stillTakes('internal', 17, INTERNAL, 'msmith', 'u71d-nb-internal.pdf');
            await stillTakes('external', 16, EXTERNAL, 'mpower', 'u71d-nb-external.pdf');
            await control();
            return;
        }
        const ID = 6, AUTHOR = 'dbernnard';
        await decide('s2-internalRequest', ID, INTERNAL, 'Request Revisions');           // 1-2
        await decide('s3-sendExternal', ID, INTERNAL, 'Send to External Review');        // 3
        await decide('s4-externalRequest', ID, EXTERNAL, 'Request Revisions');           // 4
        const internal = round(ID, INTERNAL), external = round(ID, EXTERNAL);
        o.rounds = {internal, external};
        await step('s5-authorOpens', async () => {                                       // 5
            await signIn(page, AUTHOR);
            await L.openWorkflow(page, app, ID, {author: true});
            await snap('author-opens');
            return read();
        });
        const noteBefore = D.lastNotificationId(app);
        await step('s6-internalUpload', async () => {                                    // 6
            const menu = await D.chooseRound(page, 'Internal Review', 1);
            if (!/Internal Review/i.test(menu.heading || '')) {
                menu.openedByAddress = true; // the menu entry was not found: the round's own address instead
                await L.openWorkflow(page, app, ID, {author: true, menuKey: L.roundKey(internal)});
            }
            const out = {menu, before: await read()};
            await snap('author-internal-round');
            if (out.before.upload) out.upload = await upload(A.uploadButton(page), 'u71d-revision.pdf');
            return out;
        });
        await step('s7-authorReads', async () => {                                       // 7
            await L.openWorkflow(page, app, ID, {author: true, menuKey: L.roundKey(internal)});
            const onInternal = await read();
            const row = page.getByRole('table', {name: LIST, exact: true}).first().locator('tbody tr').filter({hasText: 'u71d-revision.pdf'}).first();
            let menu = null;
            if (await row.count()) {
                const b = row.locator('button[aria-haspopup="menu"]').first();
                if (await b.count()) { await b.click(); await page.getByRole('menuitem').first().waitFor({timeout: 10_000}).catch(() => {}); menu = (await page.getByRole('menuitem').allInnerTexts()).map((x) => L.flat(x, 60)); await b.click(); }
            }
            await snap('author-internal-after');
            await L.openWorkflow(page, app, ID, {author: true, menuKey: L.roundKey(external)});
            const onExternal = await read();
            await snap('author-external-after');
            return {onInternal, rowMenu: menu, onExternal, stored: L.storedFiles(app, ID).filter((f) => /u71d/.test(f.name || '')), storedRounds: A.storedRounds(app, ID), notifications: D.notificationsSince(app, noteBefore)};
        });
        await step('s8-editorReads', async () => {                                       // 8
            await signIn(page, 'dbarnes');
            await L.openWorkflow(page, app, ID, {});
            const opensOn = await read();
            await snap('editor-opens');
            await L.openWorkflow(page, app, ID, {menuKey: L.roundKey(internal)});
            const onInternal = await read();
            await snap('editor-internal');
            return {opensOn, onInternal};
        });
        await step('s9-wayRound', async () => {                                          // 9
            await signIn(page, AUTHOR);
            await L.openWorkflow(page, app, ID, {author: true, menuKey: L.roundKey(external)});
            const out = {before: await read()};
            if (out.before.uploadRevisions) out.upload = await upload(A.uploadRevisionsButton(page), 'u71d-revision-2.pdf');
            await L.openWorkflow(page, app, ID, {author: true, menuKey: L.roundKey(external)});
            out.after = await read();
            await snap('author-external-uploaded');
            out.stored = L.storedFiles(app, ID).filter((f) => /u71d/.test(f.name || ''));
            return out;
        });
        await control();
    } catch (e) {
        o.error = L.flat(e.stack || e.message, 800);
        await snap('error').catch(() => {});
    } finally {
        record(NB ? 'neighbour-summary' : 'summary', o);
        await idle(page).catch(() => {});
        await close();
    }
});
