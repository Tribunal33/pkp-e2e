// Issue report docs/issues/U48-A15-body-text-leaving-loses-text-unasked.md (U48 A15): text typed on
// "Body Text" is lost without a question when the editor chooses another side-menu entry, reloads
// the page or closes the workflow. Walked through the screens on PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"), OJS only. The kit builds nothing.
//
// MODE=walk (default), submission 5 "Genetic transformation of forest trees" (Production):
//   1. sign in as dbarnes; 2. open the workflow; 3. side menu "Body Text";
//   4. type "Typed but not saved u48r4"; 5. side menu "Galleys" (a question is answered "Cancel"
//      the first time, then "OK" on a second press); 6. "Body Text" again: read the text;
//   7. type "Typed before reload u48r4", reload the page (a "Leave site?" question is accepted);
//   8. type "Typed before close u48r4", the workflow's "Close" (a question is answered "Yes").
// MODE=nb, the neighbour alone (with the fix in and out): nothing may ask when nothing is unsaved
//   or the target is the page itself: (a) the never-saved page left untouched › "Galleys";
//   (b) text saved with "Save" › "Galleys"; (c) typed text › "Body Text" itself (kept, no question);
//   (d) with no changes, reload and "Close".
// MODE=cv (with the fix): typed text, then the side menu's "Create New Version": its question
//   answered "Cancel" (no window, text kept), then "OK" (the "Create New Version" window opens;
//   closed with "Cancel"). Creating a version moves to the new version's pages, so asking first is
//   intended.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --apps ojs --reset
// Run (main):   PROBE_FEATURE=issues-u48r4 PROBE_AGENT=u48r4 node bin/probe.js ojs shared/playwright/checks/issues/body-text-leaving-loses-text-unasked/walk.js
// Facts: .reports/<feature>/u48r4/a15-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('../body-text-opens-with-unsaved-changes/lib');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const fact = (k, v) => { record('a15-facts', {[k]: v}, {merge: true}); console.log('[a15]', MODE, k, JSON.stringify(v).slice(0, 1500)); };
    const {page, close} = await launch(app);
    const dialogs = [];
    let answer = 'accept';
    page.on('dialog', async (d) => {
        const a = d.type() === 'beforeunload' ? 'accept' : answer;
        dialogs.push({at: Date.now(), type: d.type(), message: d.message(), answered: a});
        try { if (a === 'accept') await d.accept(); else await d.dismiss(); } catch (e) { /* gone */ }
    });
    const since = (t) => dialogs.filter((d) => d.at >= t).map((d) => `${d.type}: "${d.message}" [${d.answered}]`);
    const where = () => (page.url().match(/workflowMenuKey=([^&]+)/) || [])[1] || page.url().replace(/^.*index\.php/, '');
    // the in-app question of the workflow window's close (a dialog over the workflow), if any
    const appQuestion = async () => {
        const q = page.getByRole('dialog').filter({hasText: /data on this form has changed/});
        return (await q.count()) ? L.flat(await q.last().innerText(), 300) : null;
    };
    await L.watchPanel(page);
    try {
        await signIn(page, 'dbarnes');
        await L.openWorkflow(page, app);
        await L.openBodyText(page);
        fact(`${MODE}.arrive`, await L.bodyText(page));
        if (MODE === 'cv') {
            await L.typeInEditor(page, 'Typed before a new version');
            const versionWindow = page.getByRole('dialog').filter({hasText: /Create New Version/}).filter({has: page.getByRole('button', {name: 'Cancel'})});
            let t = Date.now();
            answer = 'dismiss';
            await L.sideMenu(page, 'Create New Version');
            fact('cv.cancel', {dialogs: since(t), at: where(), window: await versionWindow.count(), bodyText: await L.bodyText(page)});
            answer = 'accept'; t = Date.now();
            await L.sideMenu(page, 'Create New Version');
            const opened = await versionWindow.count();
            fact('cv.ok', {dialogs: since(t), at: where(), window: opened, windowText: opened ? L.flat(await versionWindow.last().innerText(), 200) : null});
            await shot(page, 'a15-cv-01-window');
            if (opened) { await versionWindow.last().getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {}); await L.sleep(1000); }
            fact('cv.afterWindow', {at: where(), bodyText: await L.bodyText(page)});
        } else if (MODE === 'walk') {
            await L.typeInEditor(page, 'Typed but not saved u48r4');
            fact('walk.typed', await L.bodyText(page));
            // 5. "Galleys": Cancel on a question, then OK
            let t = Date.now();
            answer = 'dismiss';
            await L.sideMenu(page, 'Galleys');
            const first = {dialogs: since(t), at: where(), bodyText: await L.bodyText(page)};
            fact('walk.galleys1', first);
            await shot(page, 'a15-walk-01-galleys');
            if (first.dialogs.length) {
                answer = 'accept'; t = Date.now();
                await L.sideMenu(page, 'Galleys');
                fact('walk.galleys2', {dialogs: since(t), at: where()});
            }
            record('a15-walk-01-galleys', await screen(page));
            // 6. back on "Body Text"
            await L.openBodyText(page);
            fact('walk.back', await L.bodyText(page));
            await shot(page, 'a15-walk-02-back');
            // 7. reload with typed text
            await L.typeInEditor(page, 'Typed before reload u48r4');
            t = Date.now();
            await page.reload().catch((e) => fact('walk.reloadError', L.flat(e.message, 200)));
            await idle(page).catch(() => {});
            await page.locator('sciflow-editor [contenteditable]').first().waitFor({state: 'visible', timeout: L.T}).catch(() => {});
            await L.sleep(3000);
            fact('walk.reload', {dialogs: since(t), bodyText: await L.bodyText(page)});
            await shot(page, 'a15-walk-03-reloaded');
            // 8. close the workflow with typed text
            await L.typeInEditor(page, 'Typed before close u48r4');
            t = Date.now();
            await page.getByRole('button', {name: /^Close/}).first().click();
            await L.sleep(1500);
            const q = await appQuestion();
            const closed = {dialogs: since(t), question: q, workflowOpen: await page.locator('.sciflow-body-text').count()};
            await shot(page, 'a15-walk-04-close');
            if (q) {
                record('a15-walk-04-close-question', await screen(page));
                await page.getByRole('dialog').filter({hasText: /data on this form has changed/}).last().getByRole('button', {name: 'Yes', exact: true}).click().catch(() => {});
                await L.sleep(1500);
                closed.afterYes = {workflowOpen: await page.locator('.sciflow-body-text').count()};
            }
            fact('walk.close', closed);
            // the text stored after all this
            await L.openWorkflow(page, app);
            await L.openBodyText(page);
            fact('walk.stored', await L.bodyText(page));
        } else {
            // (a) never saved, untouched
            let t = Date.now();
            answer = 'accept';
            await L.sideMenu(page, 'Galleys');
            fact('nb.untouchedNeverSaved', {dialogs: since(t), at: where()});
            // (b) saved, no changes
            await L.openBodyText(page);
            await L.typeInEditor(page, 'Saved nb u48r4');
            fact('nb.saveStatus', await L.pressSave(page));
            t = Date.now();
            await L.sideMenu(page, 'Galleys');
            fact('nb.savedNoChanges', {dialogs: since(t), at: where()});
            // (c) typed text, "Body Text" itself
            await L.openBodyText(page);
            await L.typeInEditor(page, ' typed nb');
            t = Date.now();
            await L.sideMenu(page, 'Body Text');
            fact('nb.self', {dialogs: since(t), at: where(), bodyText: await L.bodyText(page)});
            // undo the change: back to the saved text
            for (let i = 0; i < ' typed nb'.length; i++) await page.keyboard.press('Backspace');
            await L.sleep(800);
            fact('nb.undone', await L.bodyText(page));
            // (d) reload and close with nothing unsaved
            t = Date.now();
            await page.reload().catch((e) => fact('nb.reloadError', L.flat(e.message, 200)));
            await idle(page).catch(() => {}); await L.sleep(3000);
            fact('nb.reload', {dialogs: since(t), bodyText: await L.bodyText(page)});
            t = Date.now();
            await page.getByRole('button', {name: /^Close/}).first().click();
            await L.sleep(1500);
            fact('nb.close', {dialogs: since(t), question: await appQuestion(), workflowOpen: await page.locator('.sciflow-body-text').count()});
            record('a15-nb-01-closed', await screen(page));
        }
    } finally {
        await close();
    }
});
