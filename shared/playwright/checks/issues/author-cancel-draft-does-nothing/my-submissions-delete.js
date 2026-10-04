// U22 OPS2, joined to docs/issues/U21-OPS3-author-cancel-draft-does-nothing.md (its steps 5-7):
// what a preprint author sees after "Confirm" in My Submissions' "Delete Incomplete Submissions".
// ccorino starts a draft, ticks it, deletes, confirms. A MutationObserver set before "Confirm"
// records every dialog text the page renders afterwards, so an error dialog that flashes and
// closes is told from one that stays and from none at all. Then My Submissions is reloaded.
//   PROBE_FEATURE=issues-u22a PROBE_AGENT=u22a node bin/probe.js ops shared/playwright/checks/issues/author-cancel-draft-does-nothing/my-submissions-delete.js
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const title = 'u22a delete';
    const facts = {app: app.name, line: app.line || 'main', author: H.AUTHOR[app.name], title};
    const {page, close} = await launch(app);
    const deletes = H.watchDeletes(page);
    try {
        await signIn(page, H.AUTHOR[app.name]);
        facts.id = await H.beginSubmission(page, app, {title, section: H.SECTION[app.name]});
        await H.openMySubmissions(page, app);
        facts.listedBefore = await H.listed(page, title);
        await page.getByRole('button', {name: 'More Actions'}).first().click({timeout: H.T});
        await page.getByRole('menuitem', {name: 'Delete Incomplete Submissions'}).click({timeout: H.T});
        const box = H.rowBox(page, title);
        await box.waitFor({state: 'attached', timeout: H.T});
        await box.check({timeout: H.T, force: true}); // the box sits under its drawn tick
        await page.getByRole('button', {name: 'Delete Incomplete Submissions', exact: true}).click({timeout: H.T});
        const dlg = page.getByRole('dialog').filter({hasText: 'Confirm Delete of Incomplete Submissions'});
        await dlg.waitFor({timeout: H.T});
        facts.confirmDialog = H.flat(await dlg.innerText());
        record('01-confirm-dialog', await screen(page));
        // every dialog text rendered from here on, with its time after "Confirm"
        await page.evaluate(() => {
            window.__u22aDialogs = [];
            const t0 = performance.now();
            const seen = new Set();
            new MutationObserver(() => {
                for (const d of document.querySelectorAll('[role="dialog"]')) {
                    const text = (d.innerText || '').replace(/\s+/g, ' ').trim();
                    if (text && !seen.has(text)) {
                        seen.add(text);
                        window.__u22aDialogs.push({ms: Math.round(performance.now() - t0), text: text.slice(0, 200)});
                    }
                }
            }).observe(document.body, {childList: true, subtree: true, characterData: true});
        });
        const resp = page.waitForResponse((r) => /\/_submissions/.test(r.url()), {timeout: H.T}).catch(() => null);
        await dlg.getByRole('button', {name: 'Confirm', exact: true}).click();
        await resp;
        await dlg.waitFor({state: 'hidden', timeout: H.T}).catch(() => {});
        await idle(page);
        const after = await screen(page);
        record('02-after-confirm', after);
        facts.afterConfirm = {
            dialogsRendered: await page.evaluate(() => window.__u22aDialogs),
            dialogOnScreen: after.text.dialog,
            listed: await H.listed(page, title),
        };
        await H.openMySubmissions(page, app);
        facts.listedAfterReload = await H.listed(page, title);
        record('03-after-reload', await screen(page));
    } finally {
        facts.deletes = deletes;
        record('facts', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
