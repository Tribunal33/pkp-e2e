// Issue report docs/issues/U59-A2-hosted-journals-list-keeps-old-name-after-edit.md (U59 A2):
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets").
//   (default)  as `admin`, Hosted Journals › the dataset journal's "Edit": a new "Journal title"
//              and "Path", "Save"; the row read once the window has closed, the stale row's
//              "Remove" question (cancelled), its "Edit" again (closed) and its "Settings wizard"
//              followed; then Hosted Journals opened again and the row read.
//   neighbour  (the fix's): "Edit", a title typed, "Close" without saving: no refetch, the row
//              unchanged; "Create Journal" (u59c, Iceland) still leads on to the Settings Wizard.
//              Nothing is built by the kit in either mode.
//
// Reset first:  npm run fleet-prep -- --feature issues-u59c --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u59c PROBE_AGENT=u59c node bin/probe.js all shared/playwright/checks/issues/hosted-journals-list-keeps-old-name-after-edit/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u59c-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u59c-3_5 PROBE_AGENT=u59c node bin/probe.js all shared/playwright/checks/issues/hosted-journals-list-keeps-old-name-after-edit/walk.js
// Facts: .reports/<feature>/u59c/a2-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');
const L = require('./lib');

const MODE = process.argv[2] || 'steps';

forEachApp(async (app) => {
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const W = L.WORDS[app.name];
    const fact = (k, v) => {
        record('a2-facts', {[k]: v}, {merge: true});
        console.log('[a2]', app.name, k, JSON.stringify(v).slice(0, 900));
    };
    const snap = async (page, name) => {
        record(name, await screen(page));
        await shot(page, name).catch(() => {});
    };
    const {table, id: idCol} = app.contextTables;
    const ctxId = sql(app, `SELECT ${idCol} FROM ${table} WHERE path = '${app.contextPath}'`).split('\n')[0];
    const {page} = await launch(app);
    const hosted = new HostedJournalsPage(page, W);

    // 1–2: sign in as admin, Hosted Journals.
    await signIn(page, 'admin');
    await hosted.goto();
    const before = await L.readRow(page, ctxId);
    fact('step2-row', before);

    if (MODE === 'neighbour') {
        // "Edit", a title typed, "Close" without saving.
        let win = await hosted.openEdit(before.path);
        await win.type(win.title('en'), `${before.name} Unsaved`);
        const fetches = L.gridFetches(page);
        const asked = await win.close().catch((e) => [`close failed: ${L.flat(e.message, 120)}`]);
        await L.windowGone(page, win.root);
        fetches.stop();
        fact('nb-close', {asked, gridFetches: fetches.list(), row: await L.readRow(page, ctxId)});
        await hosted.reload();
        fact('nb-close-reload', {row: await L.readRow(page, ctxId)});

        // "Create Journal": u59c, Iceland, "Save".
        win = await hosted.openCreate();
        await win.type(win.title('en'), `u59c ${W.noun}`);
        await win.type(win.initials('en'), 'U59C');
        await win.type(win.contactName, 'u59c Contact');
        await win.type(win.contactEmail, 'u59c@mailinator.com');
        await win.country.selectOption({label: 'Iceland'});
        await win.type(win.path, 'u59c');
        if (await win.languageBox('en').count()) {
            await win.setBox(win.languageBox('en'), true);
            await win.setBox(win.primaryChoice('en'), true);
        }
        const created = L.gridFetches(page);
        const res = await win.pressSave().catch((e) => ({status: () => `no answer: ${L.flat(e.message, 120)}`}));
        const landed = await page
            .waitForURL(/\/admin\/wizard\/\d+/, {timeout: L.T, waitUntil: 'commit'})
            .then(() => true)
            .catch(() => false);
        await idle(page).catch(() => {});
        created.stop();
        fact('nb-create', {status: res.status(), landedOnWizard: landed, url: page.url().replace(/^https?:\/\/[^/]+/, ''), gridFetches: created.list()});
        await snap(page, 'a2-nb-create');
        return;
    }

    // 3: the row's arrow, "Edit".
    const win = await hosted.openEdit(before.path);
    // 4–5: a new title and path.
    const newName = `${before.name} Renamed`;
    const newPath = `${before.path}2`;
    await win.type(win.title('en'), newName);
    await win.type(win.path, newPath);
    // 6: "Save"; "Saved", the window closes by itself.
    const fetches = L.gridFetches(page);
    const res = await win.pressSave();
    const saved = await win.savedStatus.waitFor({timeout: 5_000}).then(() => true).catch(() => false);
    await L.windowGone(page, win.root);
    await idle(page).catch(() => {});
    fetches.stop();
    // 7: the row.
    const after = await L.readRow(page, ctxId);
    fact('step6-save', {status: res.status(), saved, gridFetches: fetches.list()});
    fact('step7-row', {...after, stored: sql(app, `SELECT path FROM ${table} WHERE ${idCol} = ${ctxId}`)});
    await snap(page, 'a2-step7');
    // 8: the row's "Remove": the confirmation's words, then "Cancel".
    try {
        const dialog = await hosted.openRemove(after.path);
        fact('step8-remove-question', L.flat(await dialog.root.innerText()));
        await hosted.cancelRemove(dialog);
    } catch (e) {
        fact('step8-remove-question', {error: L.flat(e.message, 200)});
    }
    // 9–10: the stale row's "Edit" again: the values it opens with, then "Close".
    try {
        const again = await hosted.openEdit(after.path);
        fact('step9-edit-again', {title: await again.title('en').inputValue(), path: await again.path.inputValue()});
        await again.close().catch(() => {});
    } catch (e) {
        fact('step9-edit-again', {error: L.flat(e.message, 200)});
    }
    // 11: the stale row's "Settings wizard": where it leads.
    try {
        const controls = await hosted.rowControls(after.path);
        const wizardLink = controls.getByRole('link', {name: 'Settings wizard', exact: true});
        const nav = page.waitForResponse((r) => /\/admin\/wizard\/\d+/.test(r.url()) && r.request().isNavigationRequest(), {timeout: L.T});
        await wizardLink.click();
        const resp = await nav;
        await idle(page).catch(() => {});
        const titleBox = page.locator('[id^="context-name-control-en"], [id$="-name-control-en"]').first();
        await titleBox.waitFor({timeout: 10_000}).catch(() => {});
        fact('step11-wizard', {
            status: resp.status(),
            url: page.url().replace(/^https?:\/\/[^/]+/, ''),
            heading: L.flat(await page.locator('main h1').first().innerText().catch(() => null)),
            journalTitle: await titleBox.inputValue().catch(() => null),
        });
        await snap(page, 'a2-step11');
    } catch (e) {
        fact('step11-wizard', {error: L.flat(e.message, 200)});
    }
    // 12: Hosted Journals opened again, the row.
    await hosted.goto();
    fact('step12-row', await L.readRow(page, ctxId));
    await snap(page, 'a2-step12');
    await signOut(page).catch(() => {});
});
