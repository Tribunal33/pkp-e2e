// Neighbour check for fix.diff (U50 A17, A18), main, run with the fix in and
// out: a newer version SCHEDULED into a later issue must still show in that
// issue's "Table of Contents" and "Items", and the earlier version must stay
// listed in its own issue. dbarnes schedules submission 1's version 1.1 with
// "Assign To Future Issue and Schedule Only" into "Vol. 2 No. 1 (2015)".
// Reset first; run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/issue-lists-version-published-outside-it/neighbour.js
const path = require('path');
const {expect} = require('@playwright/test');
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const facts = {line: app.line || 'main'};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        await L.openNewestVersion(page, app, 1);
        const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
        const pub = new PublicationScreen(page, app.contextPath);
        const panel = await pub.pressPublish();
        await panel.getByRole('radio', {name: 'Assign To Future Issue and Schedule Only', exact: true}).check();
        await pub.selectIssueOption(panel, /Vol\. 2 No\. 1 \(2015\)/);
        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
        const question = page.getByRole('dialog').filter({hasText: 'Are you sure you want to schedule this for publication?'});
        await expect(question).toBeVisible({timeout: L.T});
        facts.question = L.flat(await question.innerText(), 300);
        const done = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: 60_000});
        await question.getByRole('button', {name: 'Schedule For Publication', exact: true}).click();
        facts.schedule = (await done).status();
        await idle(page);
        facts.status = L.flat(await pub.leftControls().innerText().catch(() => null), 120);
        const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
        const admin = new IssuesAdmin(page, app.contextPath);
        await admin.goto('Future Issues');
        facts.futureItems = L.flat(await admin.items('Future Issues', L.FUTURE).innerText());
        const win = await admin.openManagement('Future Issues', L.FUTURE);
        await win.openTab('Table of Contents');
        facts.futureToc = await win.tocOutline();
        record('neighbour-future-toc', await screen(page));
        const back = await L.openToc(page, app);
        facts.backItems = back.items;
        facts.backToc = back.outline;
    } finally {
        record('neighbour-scheduled', facts);
        console.log(`[fact] ${JSON.stringify(facts)}`);
        await close();
    }
});
