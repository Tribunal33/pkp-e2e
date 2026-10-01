// Issue report docs/issues/U13-A4-listing-offers-galley-without-file.md (U13 A4):
// a preprint server's lists, and a journal's "Latest Publications" when the
// home page does not also show the current issue, offer every galley of an
// item: one with no file (its link answers "404 Not Found") and the
// additional files, both of which the item's own page and an issue's table
// of contents leave out or set apart. Takes the report's Steps through the
// screens on a dataset fleet freshly reset to PKP's default test dataset,
// as `dbarnes`.
//
// OPS (main, stable-3_5_0), preprint 1 "The influence of lactation on the
// quantity and quality of cashmere production" (Production, one galley "PDF"):
//   2-3. Preprint › "Galleys": "Add galley" "Data u13ir19" (component "Data
//        Set", a CSV)
//   4.   "Add galley" "Draft u13ir19", "Save", "Cancel" in the upload window
//   5.   "Post", "Post"
//   6.   signed out: the preprint's page
//   7-8. "Archives": the preprint's entry; press "Draft u13ir19"
// OJS (main; 3.5 has no "Latest Publications"), submission 5 "Genetic
// transformation of forest trees" (Production, no galleys):
//   2.   Settings › Website › Appearance › Theme › "Journal Content
//        Organization": tick "Include recent most published articles"
//   3.   Publication › "Galleys": "PDF" (Article Text), "Data u13ir19" (Data
//        Set), "Draft u13ir19" (no file)
//   4.   "Publish" with "Don't Assign To An Issue"
//   5.   signed out: the home page's "Latest Publications" (the control: the
//        current issue is shown too)
//   6-8. untick "Include the current issue's table of contents"; the home
//        page again; press "Draft u13ir19"
// Beyond the Steps, as the fix's neighbours (read with the fix in and out):
// a galley "Remote u13ir19" at a separate website is added with the others
// (a galley with no file that must stay listed), and the entry of another
// item (OPS preprint 2; OJS article 17 in the current issue's table of
// contents) and the item's own page are read.
// OMP has no galleys and its book summary lists no files: skipped.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir19 --dataset 8 --reset
// Run (main):   PROBE_FEATURE=issues-ir19 PROBE_AGENT=ir19 node bin/probe.js all shared/playwright/checks/issues/listing-offers-galley-without-file/walk.js
// On 3.5: PKP_E2E_LINE=stable-3_5_0 in front of both (and PROBE_RUN=r35), feature issues-ir19-3_5.
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib');

const DATA = 'Data u13ir19';
const DRAFT = 'Draft u13ir19';
const REMOTE = 'Remote u13ir19';

forEachApp(async (app) => {
    if (app.name === 'omp') {
        console.log('[fact] omp: no galleys and no file links in a book summary; skipped');
        return;
    }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const ctx = app.contextPath;
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1500)}`);
    };
    const {page, close} = await launch(app);
    try {
        if (app.name === 'ops') {
            const ID = 1;
            await signIn(page, 'dbarnes');
            const galleys = await L.openGalleys(page, app, ID);
            fact('2 galleys before', await galleys.labels());
            await L.addGalleyWithFile(galleys, {label: DATA, component: 'Data Set', file: L.CSV});
            await L.addGalleyWithoutFile(page, galleys, DRAFT);
            await L.addRemoteGalley(page, galleys, REMOTE, 'https://example.org/u13ir19');
            await idle(page);
            record('04-galleys', await screen(page));
            fact('4 galleys after', await galleys.labels());
            fact('5 post', await L.post(page));
            await signOut(page);
            const landing = await page.goto(app.url(`/index.php/${ctx}/preprint/view/${ID}`));
            await idle(page);
            record('06-preprint-page', await screen(page));
            fact('6 preprint page', {status: landing.status(), ...(await L.readLanding(page))});
            await page.getByRole('link', {name: 'Archives', exact: true}).first().click();
            await idle(page);
            record('07-archives', await screen(page));
            await shot(page, '07-archives').catch(() => {});
            fact('7 archives url', L.rel(page.url()));
            fact('7 archives preprint 1', await L.readEntry(page, 'preprint', ID));
            fact('7 archives preprint 2 (neighbour)', await L.readEntry(page, 'preprint', 2));
            const pressed = await L.pressGalley(page, 'preprint', ID, DRAFT);
            record('08-draft-pressed', await screen(page));
            fact('8 draft pressed', pressed);
            // extra: the home page's "Latest preprints" (ten, in no fixed order)
            await page.goto(app.url(`/index.php/${ctx}`));
            await idle(page);
            fact('x home preprint 1', await L.readEntry(page, 'preprint', ID));
        } else {
            const ID = 5;
            if (app.line === 'stable-3_5_0') {
                // 3.5 has no "Journal Content Organization" and no "Latest Publications".
                await signIn(page, 'dbarnes');
                await page.goto(app.url(`/index.php/${ctx}/management/settings/website`));
                await idle(page);
                const s = await screen(page);
                fact('2 theme form has "Journal Content Organization"', /Journal Content Organization/.test(s.text.main || ''));
                record('02-theme-35', s);
                await signOut(page);
                await page.goto(app.url(`/index.php/${ctx}`));
                await idle(page);
                fact('5 home has "Latest Publications"', await page.locator('.latest_articles').count());
                return;
            }
            const TOC = "Include the current issue's table of contents";
            const RECENT = 'Include recent most published articles';
            await signIn(page, 'dbarnes');
            fact('2 content organization', await L.setContentOrganization(page, app, {[RECENT]: true}));
            const galleys = await L.openGalleys(page, app, ID);
            fact('3 galleys before', await galleys.labels());
            await L.addGalleyWithFile(galleys, {label: 'PDF', component: 'Article Text', file: L.PDF});
            await L.addGalleyWithFile(galleys, {label: DATA, component: 'Data Set', file: L.CSV});
            await L.addGalleyWithoutFile(page, galleys, DRAFT);
            await L.addRemoteGalley(page, galleys, REMOTE, 'https://example.org/u13ir19');
            await idle(page);
            record('03-galleys', await screen(page));
            fact('3 galleys after', await galleys.labels());
            const {PublicationScreen} = require(require('path').join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
            const pub = new PublicationScreen(page, ctx);
            await pub.gotoWorkflow(ID);
            await pub.openEntry('Title & Abstract');
            await pub.publish();
            fact('4 published', L.flat(await pub.leftControls().innerText().catch(() => '')));
            const home = async (tag) => {
                await signOut(page);
                await page.goto(app.url(`/index.php/${ctx}`));
                await idle(page);
                record(`${tag}-home`, await screen(page));
                await shot(page, `${tag}-home`).catch(() => {});
                fact(`${tag} headings`, (await page.locator('.page_index_journal h2, .page_index_journal h3.current_issue_title, .page_index_journal .current_issue h2').allInnerTexts()).map((s) => L.flat(s, 80)));
                fact(`${tag} latest publications article 5`, await L.readEntry(page, 'article', ID, '.latest_articles'));
                fact(`${tag} article 17 entry (neighbour)`, await L.readEntry(page, 'article', 17));
            };
            await home('05');
            const landing = await page.goto(app.url(`/index.php/${ctx}/article/view/${ID}`));
            await idle(page);
            fact('5 article page', {status: landing.status(), ...(await L.readLanding(page))});
            await signIn(page, 'dbarnes');
            fact('6 content organization', await L.setContentOrganization(page, app, {[TOC]: false}));
            await home('07');
            const pressed = await L.pressGalley(page, 'article', ID, DRAFT, '.latest_articles');
            record('08-draft-pressed', await screen(page));
            fact('8 draft pressed', pressed);
        }
    } finally {
        record('facts', facts);
        await close();
    }
});
