// Reach of U13 A6 (walk.js beside it), OJS only: the HTML galley's reader
// page of an older version. Its tab and its bar's title read the current
// version's title, as the article page's tab does. Steps on PKP's default
// test dataset:
//   dbarnes adds an "HTML" galley (article.html beside this file) to
//   submission 1's version 1.1, publishes 1.1, creates version 1.2, retitles
//   it "Signalling Theory Dividends Revisited u13ir15" and publishes it;
//   signed out: the article page › "Versions" › 1.1 › "HTML".
// Control: the 1.1 page's own tab, and the current version's page.
// Reset the dataset fleet first; this changes the dataset.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/older-version-tab-current-title/reach-html.js
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const {flat, rel, workflowFrame, createNewVersion, retitleVersion, publishShownVersion, readVersionPage} = require('./lib');

const SID = 1;
const NEW_TITLE = 'Signalling Theory Dividends Revisited u13ir15';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('reach-html.js runs on a dataset fleet');
    const facts = {app: app.name, line: app.line || 'main'};
    {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'dbarnes');
            const {addGalleyToLatestVersion} = require('../lens-formulas-not-typeset/lib');
            const {publishLatestVersion} = require('../older-version-pdf-reader-empty/lib');
            facts.galleys = await addGalleyToLatestVersion(page, app, SID, {
                label: 'HTML', component: 'Article Text', file: path.join(__dirname, 'article.html'), name: 'article.html',
            });
            const p11 = await publishLatestVersion(page, app, SID);
            facts.publish11 = {button: p11.button, publish: p11.publish};
            const frame = workflowFrame(page, app);
            await frame.gotoEditorial(SID);
            await idle(page);
            facts.newVersion = await createNewVersion(page, app);
            facts.retitle = await retitleVersion(page, app, SID, facts.newVersion.id, NEW_TITLE);
            const p12 = await publishShownVersion(page);
            facts.publish12 = {button: p12.button, publish: p12.publish};
            console.log(`[fact] setup: ${JSON.stringify({galleys: facts.galleys, publish11: facts.publish11, newVersion: facts.newVersion.id, retitle: facts.retitle.save, publish12: facts.publish12})}`);
            await signOut(page);
        } finally {
            await close();
        }
    }
    const {page, close} = await launch(app);
    try {
        await page.goto(app.url(`/index.php/${app.contextPath}/article/view/mwandenga`));
        await idle(page);
        facts.current = await readVersionPage(page);
        const v11 = facts.current.versionLinks.find((v) => /1\.1\)/.test(v.text));
        await page.locator(`a[href$="${v11.href}"]`).first().click();
        await idle(page);
        facts.older = await readVersionPage(page);
        await page.locator('a.obj_galley_link').filter({hasText: /^\s*HTML\s*$/}).first().click();
        await idle(page);
        await page.locator('header a.title').first().waitFor({state: 'visible', timeout: 30_000}).catch(() => {});
        record('reach-html-reader', await screen(page));
        await shot(page, 'reach-html-reader');
        facts.htmlReader = {
            url: rel(page.url()),
            tab: await page.title(),
            barTitle: flat(await page.locator('header a.title').first().innerText().catch(() => null)),
            notice: flat(await page.locator('.galley_view_notice').first().innerText().catch(() => null)),
        };
        console.log(`[fact] current: ${JSON.stringify({tab: facts.current.tab, heading: facts.current.heading})}`);
        console.log(`[fact] older 1.1 page: ${JSON.stringify({tab: facts.older.tab, heading: facts.older.heading})}`);
        console.log(`[fact] older 1.1 HTML reader: ${JSON.stringify(facts.htmlReader)}`);
    } finally {
        await close();
    }
    record('reach-html', facts);
});
