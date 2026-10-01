// Neighbour check for U13 OJS6's fix: an ISSUE galley's PDF reader must keep
// reading "Return to Issue Details" and open the issue, with the fix out and in.
// The dataset has no issue galley, so the editor makes one on screen:
//   sign in as dbarnes; "Issues" > "Back Issues" > "Vol. 1 No. 2 (2014)" > "Edit" >
//   "Issue Galleys" > "Create Issue Galley": label "PDF u13ir21", a PDF file, "Save".
// Then, signed out: the issue's page, "PDF u13ir21" under "Full Issue", the arrow.
// It changes the dataset: reset the fleet before and after.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs shared/playwright/checks/issues/pdf-reader-return-arrow-names-issue/neighbour.js
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const {readArrowAndPress, rel, flat} = require('./lib');

const ISSUE = 'Vol. 1 No. 2 (2014)';
const LABEL = 'PDF u13ir21';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet');
    const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        const issues = new IssuesAdmin(page, app.contextPath);
        await issues.goto('Back Issues');
        const win = await issues.openManagement('Back Issues', ISSUE);
        await win.openTab('Issue Galleys');
        const galley = await win.openCreateGalley();
        await galley.labelBox().fill(LABEL);
        const up = await galley.upload(path.join(app.suiteDir, 'fixtures', 'files', 'article.pdf'));
        facts.upload = up.status();
        const saved = await galley.save();
        facts.save = saved.status();
        record('n-1-issue-galleys', await screen(page));
        await signOut(page);

        await page.goto(app.url(`/index.php/${app.contextPath}/issue/view/1`));
        await idle(page);
        record('n-2-issue', await screen(page));
        facts.issuePage = {url: rel(page.url()), heading: flat(await page.locator('h1').first().textContent())};
        // under "Full Issue" (the link's accessible name is that heading, its text the label)
        await page.locator('a.obj_galley_link').filter({hasText: LABEL}).first().click();
        await page.waitForLoadState('domcontentloaded');
        await idle(page);
        facts.issueGalley = await readArrowAndPress(page, 'n-3');
        console.log(`[fact] ojs issue galley: ${JSON.stringify(facts.issueGalley)}`);
    } finally {
        record('neighbour-facts', facts);
        await close();
    }
});
