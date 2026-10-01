// U21 OPS3: the manager's way round (issue report docs/issues/U21-OPS3-author-cancel-draft-does-nothing.md).
// The dataset's author ccorino starts a draft; the manager rvaca looks for it on the editorial
// dashboard ("All Active", then a search by its title) and reads whether "More Actions" ›
// "Delete Incomplete Submissions" offers a box on its row, then deletes it there.
//   PROBE_FEATURE=issues-ir30b PROBE_AGENT=ir30 node bin/probe.js ops shared/playwright/checks/issues/author-cancel-draft-does-nothing/wayround.js
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const title = 'u21ir30 way round';
    const facts = {app: app.name, line: app.line || 'main', title};
    const {page, close} = await launch(app);
    const deletes = H.watchDeletes(page);
    try {
        await signIn(page, H.AUTHOR[app.name]);
        facts.id = await H.beginSubmission(page, app, {title, section: H.SECTION[app.name]});
        await signIn(page, 'rvaca');
        await page.goto(app.url(`/index.php/${app.contextPath}${H.L(app)}/dashboard/editorial`));
        await idle(page);
        const s1 = await screen(page);
        record('01-editorial-dashboard', s1);
        facts.views = H.flat(s1.text && s1.text.main, 600);
        facts.listedInDefaultView = await H.listed(page, title);
        const search = page.getByRole('searchbox').first();
        if (await search.count()) {
            await search.fill(title);
            await page.keyboard.press('Enter');
            await idle(page);
            facts.listedAfterSearch = await H.listed(page, title);
            record('02-search', await screen(page));
        }
        await page.getByRole('button', {name: 'More Actions'}).first().click({timeout: H.T});
        const item = page.getByRole('menuitem', {name: 'Delete Incomplete Submissions'});
        facts.bulkOffered = (await item.count()) > 0;
        if (facts.bulkOffered) {
            await item.click();
            facts.box = (await H.rowBox(page, title).count()) > 0;
            if (facts.box) {
                await H.rowBox(page, title).check({force: true});
                await page.getByRole('button', {name: 'Delete Incomplete Submissions', exact: true}).click();
                const dlg = page.getByRole('dialog').filter({hasText: 'Confirm Delete of Incomplete Submissions'});
                await dlg.getByRole('button', {name: 'Confirm', exact: true}).click();
                await dlg.waitFor({state: 'hidden', timeout: H.T}).catch(() => {});
                await idle(page);
                // the search phrase stays on screen, so read the rows, not the page text
                facts.listedAfterDelete = (await page.getByRole('row').filter({hasText: title}).count()) > 0;
                record('03-after-delete', await screen(page));
            }
        }
    } finally {
        facts.deletes = deletes;
        record('facts-wayround', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
