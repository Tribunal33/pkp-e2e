// Issue report docs/issues/U48-A14-body-text-opens-with-unsaved-changes.md (U48 A14, first symptom):
// a version whose Body Text was never saved opens "Body Text" with "Unsaved Changes" already showing.
// Walked through the screens on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"), OJS only (OMP and OPS have no Body Text page). The kit builds nothing.
//
// MODE=walk (default), submission 5 "Genetic transformation of forest trees" (Production):
//   1. sign in as dbarnes; 2. open the submission's workflow;
//   3. side menu "Body Text" (the version's): read the badge and "Save" before anything is typed;
//   control: type "Saved once u48r4", "Save", "Galleys", "Body Text" again: the badge is gone.
// MODE=nb, the neighbour alone (with the fix in and out): on the never-saved page, typing "x" shows
//   the badge and Backspace hides it again; after "Save", typing shows it. The fix must leave every
//   real change marked.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --apps ojs --reset
// Run (main):   PROBE_FEATURE=issues-u48r4 PROBE_AGENT=u48r4 node bin/probe.js ojs shared/playwright/checks/issues/body-text-opens-with-unsaved-changes/walk.js
// Facts: .reports/<feature>/u48r4/a14a-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const fact = (k, v) => { record('a14a-facts', {[k]: v}, {merge: true}); console.log('[a14a]', MODE, k, JSON.stringify(v).slice(0, 1500)); };
    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => { dialogs.push(`${d.type()}: ${d.message()}`); try { await d.accept(); } catch (e) { /* gone */ } });
    await L.watchPanel(page);
    try {
        await signIn(page, 'dbarnes');
        await L.openWorkflow(page, app);
        const t0 = Date.now();
        await L.openBodyText(page);
        const arrive = await L.bodyText(page);
        fact(`${MODE}.arrive`, {...arrive, log: await L.panelLog(page, t0)});
        record(`a14a-${MODE}-01-arrive`, await screen(page));
        await shot(page, `a14a-${MODE}-01-arrive`);
        if (MODE === 'walk') {
            await L.typeInEditor(page, 'Saved once u48r4');
            fact('walk.typed', await L.bodyText(page));
            fact('walk.saveStatus', await L.pressSave(page));
            await L.sideMenu(page, 'Galleys');
            const t1 = Date.now();
            await L.openBodyText(page);
            fact('walk.reopenSaved', {...(await L.bodyText(page)), log: await L.panelLog(page, t1)});
            record('a14a-walk-02-reopen-saved', await screen(page));
            await shot(page, 'a14a-walk-02-reopen-saved');
        } else {
            await L.typeInEditor(page, 'x');
            fact('nb.typedX', await L.bodyText(page));
            await page.keyboard.press('Backspace'); await L.sleep(800);
            fact('nb.backspace', await L.bodyText(page));
            await L.typeInEditor(page, 'Saved nb u48r4');
            fact('nb.saveStatus', await L.pressSave(page));
            fact('nb.afterSave', await L.bodyText(page));
            const t2 = Date.now();
            await L.typeInEditor(page, ' more');
            fact('nb.typedAfterSave', {...(await L.bodyText(page)), changes: ((await L.panelLog(page, t2)).changes || []).map((c) => c.ops)});
            record('a14a-nb-02-typed-after-save', await screen(page));
        }
        fact(`${MODE}.dialogs`, dialogs);
    } finally {
        await close();
    }
});
