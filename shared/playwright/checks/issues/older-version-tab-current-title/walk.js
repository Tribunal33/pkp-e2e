// Issue report docs/issues/U13-A6-older-version-tab-current-title.md
// (U13 A6, U69 A5): an older version's page is headed with that version's
// title, but the browser tab (the document title a bookmark takes) reads
// the current version's. Takes the report's Steps on PKP's default test
// dataset:
//   OJS: dbarnes publishes submission 1's version 1.1 (its title differs).
//   OPS: dbarnes creates a new version of submission 3, retitles it, posts it.
//   OMP: dbarnes creates a new version of submission 14, retitles it, publishes it.
//   Then, signed out: the current page, "Versions" › the newest older entry.
// Neighbour check (fix in and out): the current version's page keeps its
// own title in the tab and heading.
// Reset the dataset fleet first; the walk changes the dataset.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/older-version-tab-current-title/walk.js
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const {sleep, rel, workflowFrame, createNewVersion, retitleVersion, publishShownVersion, readVersionPage} = require('./lib');

const SUBMISSION = {ojs: 1, ops: 3, omp: 14};
const LANDING = {ojs: 'article/view/mwandenga', ops: 'preprint/view/3', omp: 'catalog/book/14'};
const NEW_TITLE = {ops: 'Computer Skill Requirements Revisited u13ir15', omp: 'From Bricks to Brains Revised u13ir15'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const ctx = app.contextPath;
    const sid = SUBMISSION[app.name];
    const facts = {app: app.name, line: app.line || 'main', submission: sid};

    // Steps 1-5: dbarnes makes the newer version current.
    {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'dbarnes');
            if (app.name === 'ojs') {
                const {publishLatestVersion} = require('../older-version-pdf-reader-empty/lib');
                facts.publish = await publishLatestVersion(page, app, sid);
            } else {
                const frame = workflowFrame(page, app);
                await frame.gotoEditorial(sid);
                await idle(page);
                record('step1-workflow', await screen(page));
                facts.newVersion = await createNewVersion(page, app);
                console.log(`[fact] ${app.name} new version: ${JSON.stringify(facts.newVersion)}`);
                facts.retitle = await retitleVersion(page, app, sid, facts.newVersion.id, NEW_TITLE[app.name]);
                console.log(`[fact] ${app.name} retitle: ${JSON.stringify(facts.retitle)}`);
                facts.publish = await publishShownVersion(page);
            }
            console.log(`[fact] ${app.name} publish: ${JSON.stringify(facts.publish)}`);
            await signOut(page);
        } finally {
            await close();
        }
    }

    // Steps 6-8, signed out.
    const {page, close} = await launch(app);
    try {
        await page.goto(app.url(`/index.php/${ctx}/${LANDING[app.name]}`));
        await idle(page);
        record('step6-current-page', await screen(page));
        facts.current = await readVersionPage(page);
        console.log(`[fact] ${app.name} current: ${JSON.stringify(facts.current)}`);

        const older = facts.current.versionLinks[0];
        if (!older) throw new Error('no older version link on the current page');
        await page.locator(`a[href$="${older.href}"]`).first().click();
        await idle(page);
        record('step7-older-page', await screen(page));
        await shot(page, 'step8-older-page');
        facts.older = await readVersionPage(page);
        facts.olderEntry = older;
        console.log(`[fact] ${app.name} older: ${JSON.stringify(facts.older)}`);
        facts.verdict = {
            headingInTab: !!facts.older.heading && facts.older.tab.startsWith(facts.older.heading),
            tabIsCurrentTitle: facts.older.tab === facts.current.tab,
        };
        console.log(`[fact] ${app.name} verdict: ${JSON.stringify(facts.verdict)}`);

        // Neighbour: the current version's page again, after the older one.
        await page.goto(app.url(`/index.php/${ctx}/${LANDING[app.name]}`));
        await idle(page);
        facts.neighbourCurrent = await readVersionPage(page);
        facts.neighbourOk = facts.neighbourCurrent.tab === facts.current.tab && !!facts.neighbourCurrent.heading
            && facts.neighbourCurrent.tab.startsWith(facts.neighbourCurrent.heading);
        console.log(`[fact] ${app.name} neighbour current: ${JSON.stringify({tab: facts.neighbourCurrent.tab, heading: facts.neighbourCurrent.heading, ok: facts.neighbourOk})}`);
    } finally {
        await close();
    }
    await sleep(100);
    record('facts', facts);
    console.log(`[fact] ${app.name} done ${rel(app.baseURL)}`);
});
