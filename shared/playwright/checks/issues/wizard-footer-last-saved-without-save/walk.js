// Issue report walk: docs/issues/U21-A4-wizard-footer-last-saved-without-save.md
// (spec U21 register A4). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"):
//   1-3  the Author (ccorino; OMP aclark) starts "u21w37 Footer Check"
//   4-5  "My Submissions", two minutes with nothing changed
//   6-7  "Complete submission" on the draft's row; the footer, at once and 30 s on
// Then the neighbour (the fix must leave it alone): "Continue" to "Details" (3.5: already there),
// the Title typed at once; the timer's save must still come about a minute
// after the wizard opened (not at once), and the footer then says "Last saved".
// The kit builds nothing; every change is made on screen. Writes are read
// from the browser's own requests, the stored title from the database.
//
// Reset first:  npm run fleet-prep -- --feature issues-w37 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-w37 PROBE_AGENT=w37 node bin/probe.js all shared/playwright/checks/issues/wizard-footer-last-saved-without-save/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w37-3_5 PROBE_AGENT=w37 node bin/probe.js all <this file>
// WAIT_MS=120000 (default) is step 5's wait.
// EDIT=1 (Impact, instead of the neighbour): after step 7, "Continue" to
// "Details" (3.5: already there), " edited" typed at the end of Title at once,
// the footer read 15 s later, then "My Submissions" opened (leaving the
// wizard) and the draft reopened: is the edit there?
// Facts: .reports/<feature>/w37/a4-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, record, idle, sql} = require('../../../probe');
const L = require('./lib.js');

const WAIT_MS = Number(process.env.WAIT_MS || 120_000);

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const save = () => record('a4-facts', facts);
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${L.flat(JSON.stringify(v), 800)}`); save(); };
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    const {writes, errors} = L.watchWrites(page);
    const snap = L.snapper(page, 'a4-');
    const wz = L.wizard(page);
    const title = 'u21w37 Footer Check';
    try {
        // Steps 1-3
        await signIn(page, L.AUTHOR[app.name]);
        const id = await L.startDraft(page, app, title, snap);
        const tCreated = Date.now();
        fact('draft', {id, step: await wz.step(), footer: await wz.lastSaved()});
        await snap('wizard-opened');

        // Steps 4-5
        await page.goto(app.url(`/index.php/${app.contextPath}${L.localeSeg(app)}/dashboard/mySubmissions`));
        await idle(page);
        const row = page.getByRole('row').filter({hasText: title}).first();
        await row.waitFor({timeout: L.T});
        await snap('my-submissions');
        await L.pause(Math.max(0, WAIT_MS - (Date.now() - tCreated)));

        // Step 6
        const action = row.getByRole('button', {name: 'Complete submission'}).or(row.getByRole('link', {name: 'Complete submission'})).first();
        fact('row actions', L.flat(await row.innerText(), 300));
        const tClick = Date.now();
        await action.click();
        await page.locator('.pkpSteps').waitFor({timeout: L.T});
        await idle(page);
        // Step 7
        const footerAtOnce = await wz.waitFooter(/\S/, 5000);
        const tRead = Date.now();
        await snap('wizard-reopened');
        await L.pause(30_000);
        fact('reopened', {
            url: page.url().replace(/^https?:\/\/[^/]+/, ''),
            step: await wz.step(),
            secondsSinceCreated: Math.round((tRead - tCreated) / 1000),
            secondsSinceReopen: Math.round((tRead - tClick) / 1000),
            footerAtOnce,
            footer30sLater: await wz.lastSaved(),
            writesSinceCreated: writes.filter((w) => w.at >= tCreated).map(({op, url, status}) => ({op, url, status})),
            errors,
        });
        await snap('wizard-30s-later');

        if (process.env.EDIT) {
            await wz.continueToDetails();
            const e = await L.titleEditor(page);
            await e.body.click();
            await page.keyboard.press('End');
            const tEdit = Date.now();
            await page.keyboard.type(' edited', {delay: 100});
            await L.pause(15_000);
            const footerAfterEdit = await wz.lastSaved();
            await snap('edit-typed');
            await page.goto(app.url(`/index.php/${app.contextPath}${L.localeSeg(app)}/dashboard/mySubmissions`));
            await idle(page);
            await snap('edit-left');
            await page.getByRole('row').filter({hasText: title}).first()
                .getByRole('button', {name: 'Complete submission'}).or(page.getByRole('row').filter({hasText: title}).first().getByRole('link', {name: 'Complete submission'})).first().click();
            await page.locator('.pkpSteps').waitFor({timeout: L.T});
            await idle(page);
            await wz.continueToDetails();
            const e2 = await L.titleEditor(page);
            fact('edit', {
                typedSecondsAfterOpen: Math.round((tEdit - tClick) / 1000),
                footerAfterEdit,
                writesAfterEdit: writes.filter((w) => w.at >= tEdit).map(({op, url, status, title: t}) => ({op, url, status, title: t})),
                titleOnReopen: await e2.text(),
                stored: L.storedTitle(app, sql, id),
                errors,
            });
            await snap('edit-reopened');
            await signOut(page);
            return;
        }

        // Neighbour: "Continue" to Details, the Title typed at once.
        const tLoad = tClick;
        await wz.continueToDetails(); // 3.5 opens on "Details" already
        const ed = await L.titleEditor(page);
        await ed.body.click();
        await page.keyboard.press('End');
        const tTyped = Date.now();
        await page.keyboard.type(' neighbour', {delay: 100});
        const deadline = Date.now() + 80_000;
        while (Date.now() < deadline && !writes.some((w) => w.at >= tTyped && /\/publications\/\d+$/.test(w.url))) await L.pause(250);
        const w = writes.find((x) => x.at >= tTyped && /\/publications\/\d+$/.test(x.url));
        await L.pause(1500);
        fact('neighbour', {
            typedSecondsAfterOpen: Math.round((tTyped - tLoad) / 1000),
            save: w ? {op: w.op, status: w.status, title: w.title, secondsAfterOpen: Math.round((w.at - tLoad) / 10) / 100, secondsAfterTyping: Math.round((w.at - tTyped) / 10) / 100} : null,
            footerAfterSave: await wz.lastSaved(),
            stored: L.storedTitle(app, sql, id),
            errors,
        });
        await snap('neighbour-saved');
        await signOut(page);
    } finally {
        save();
        await close();
    }
});
