// Issue report walk: docs/issues/U21-A18-wizard-autosave-cuts-title-mid-typing.md
// (spec U21 register A18). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"):
//   1-2  the Author (ccorino; OMP aclark) starts "u21w37 Autosave Draft"
//   3-4  "Continue" to "Details" at once (3.5 opens there); wait for "Last saved 1 minute ago"
//   5-6  Title: select all, type "u21w37 Autosave cut check" a key every 250 ms, wait 5 s
//   7-8  reload (main reopens on "Upload Files": "Continue"; 3.5 on "Details"), read Title
// Then the neighbour (the fix must leave it alone): on the reloaded "Details",
// a new Title typed and "Continue" pressed at once: the step change must send
// the whole Title within a second.
// The kit builds nothing; every change is made on screen. Writes (and the
// title each carried) are read from the browser's own requests, the stored
// title from the database.
//
// Reset first:  npm run fleet-prep -- --feature issues-w37 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-w37 PROBE_AGENT=w37 node bin/probe.js all shared/playwright/checks/issues/wizard-autosave-cuts-title-mid-typing/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w37-3_5 PROBE_AGENT=w37 node bin/probe.js all <this file>
// Facts: .reports/<feature>/w37/a18-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, record, idle, sql} = require('../../../probe');
const L = require('../wizard-footer-last-saved-without-save/lib.js');

const NEW_TITLE = 'u21w37 Autosave cut check';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const save = () => record('a18-facts', facts);
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${L.flat(JSON.stringify(v), 900)}`); save(); };
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    const {writes, errors} = L.watchWrites(page);
    const snap = L.snapper(page, 'a18-');
    const wz = L.wizard(page);
    const pubWrites = (from) => writes.filter((w) => w.at >= from && /\/publications\/\d+$/.test(w.url));
    try {
        // Steps 1-2
        await signIn(page, L.AUTHOR[app.name]);
        const id = await L.startDraft(page, app, 'u21w37 Autosave Draft', snap);
        const tLoad = Date.now();
        // Step 3 (3.5 opens on "Details": nothing to press)
        await wz.continueToDetails();
        const ed = await L.titleEditor(page);
        fact('details', {id, step: await wz.step(), footer: await wz.lastSaved(), title: await ed.text()});
        // Step 4
        const minute = await wz.waitFooter(/1 minute/, 90_000);
        const tMinute = Date.now();
        fact('step 4', {footer: minute, secondsAfterOpen: Math.round((tMinute - tLoad) / 1000), writesSoFar: pubWrites(tLoad).length});
        await snap('details-one-minute');
        // Step 5
        await ed.body.click();
        await page.keyboard.press('ControlOrMeta+a');
        const tFirstKey = Date.now();
        const footerSeen = new Set();
        const poll = setInterval(async () => { const f = await wz.lastSaved().catch(() => null); if (f) footerSeen.add(f); }, 150);
        await page.keyboard.type(NEW_TITLE, {delay: 250});
        const tLastKey = Date.now();
        // Step 6
        await L.pause(5000);
        clearInterval(poll);
        await snap('details-typed');
        const saves = pubWrites(tFirstKey).map((w) => ({op: w.op, status: w.status, title: w.title,
            secondsAfterFirstKey: Math.round((w.at - tFirstKey) / 10) / 100, secondsAfterLastKey: Math.round((w.at - tLastKey) / 10) / 100}));
        fact('typed', {typingSeconds: Math.round((tLastKey - tFirstKey) / 100) / 10, onScreen: await ed.text(), saves,
            footerWhileTyping: [...footerSeen], footerAfter: await wz.lastSaved(), storedBeforeReload: L.storedTitle(app, sql, id)});
        // Step 7
        await page.reload();
        await page.locator('.pkpSteps').waitFor({timeout: L.T});
        await idle(page);
        await L.pause(1500);
        const unsaved = page.getByRole('dialog').filter({hasText: /Unsaved Changes/});
        const unsavedDialog = (await unsaved.isVisible().catch(() => false)) ? L.flat(await unsaved.innerText(), 300) : null;
        await snap('reloaded');
        // Step 8: the reopened wizard is on "Upload Files" (the draft's saved progress); "Continue"
        const reopenedOn = await wz.step();
        await wz.continueToDetails();
        const ed2 = await L.titleEditor(page);
        fact('after reload', {reopenedOn, step: await wz.step(), title: await ed2.text(), unsavedDialog, stored: L.storedTitle(app, sql, id), errors});
        await snap('details-after-reload');

        // Neighbour: a Title typed and "Continue" pressed at once.
        await ed2.body.click();
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.type('u21w37 Continue saves', {delay: 60});
        const tPress = Date.now();
        await wz.footer.getByRole('button', {name: 'Continue', exact: true}).click();
        await idle(page);
        await L.pause(1500);
        fact('neighbour', {
            saves: pubWrites(tPress - 10_000).map((w) => ({op: w.op, status: w.status, title: w.title, secondsAfterContinue: Math.round((w.at - tPress) / 10) / 100})),
            step: await wz.step(),
            stored: L.storedTitle(app, sql, id),
            errors,
        });
        await snap('neighbour-continue');
        await signOut(page);
    } finally {
        save();
        await close();
    }
});
