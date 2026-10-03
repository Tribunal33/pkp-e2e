// Issue report docs/issues/U10-OJS6-latest-publications-titles-same-heading-level.md
// (U10 OJS6): on a journal's home page each article title under "Latest
// Publications" is a heading of the same level as "Latest Publications"
// itself, while the current issue's article titles sit below their own
// headings. Takes the report's Steps through the screens on a dataset fleet
// freshly reset to PKP's default test dataset, as `dbarnes`.
//
// OJS only (OMP and OPS have no "Latest Publications"; on 3.5 OJS has none
// either, and the walk only confirms that):
//   1.   sign in as dbarnes
//   2.   Settings › Website › Appearance › Theme › "Journal Content
//        Organization": tick "Include recent most published articles", "Save"
//   3-4. submission 5 "Genetic transformation of forest trees", Publication ›
//        "Title & Abstract", "Publish" with "Don't Assign To An Issue"
//   5-6. signed out: the home page's heading outline
//
// MODE=nb (the fix's neighbour, on a freshly reset fleet, run with the fix
// in and out): signed out, the home page as the dataset leaves it (no
// "Latest Publications"): the current issue's table of contents keeps its
// levels ("Current Issue" 2, "Articles" 3, the article titles 4).
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u10k --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-u10k PROBE_AGENT=u10k node bin/probe.js ojs shared/playwright/checks/issues/latest-publications-titles-same-heading-level/walk.js
// Neighbour:    MODE=nb PROBE_RUN=nb-in|nb-out in front of the same command.
// On 3.5: PKP_E2E_LINE=stable-3_5_0 in front of both (and PROBE_RUN=r35), feature issues-u10k-3_5.
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib');

const ID = 5;
const RECENT = 'Include recent most published articles';

forEachApp(async (app) => {
    if (app.name !== 'ojs') {
        console.log(`[fact] ${app.name}: no "Latest Publications" on a press or a preprint server; skipped`);
        return;
    }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const ctx = app.contextPath;
    const mode = process.env.MODE || 'steps';
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null, mode};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 2000)}`);
    };
    const home = async (tag) => {
        await page.goto(app.url(`/index.php/${ctx}`));
        await idle(page);
        record(`${tag}-home`, await screen(page));
        await shot(page, `${tag}-home`).catch(() => {});
        const items = await L.outline(page);
        fact(`${tag} home outline`, L.outlineLines(items));
        return items;
    };
    const {page, close} = await launch(app);
    try {
        if (app.line === 'stable-3_5_0') {
            await signIn(page, 'dbarnes');
            await page.goto(app.url(`/index.php/${ctx}/management/settings/website`));
            await idle(page);
            const s = await screen(page);
            record('02-website-35', s);
            await page.getByRole('tab', {name: 'Theme', exact: true}).first().click().catch(() => {});
            await idle(page);
            const t = await screen(page);
            record('02-theme-35', t);
            fact('2 theme tab has "Journal Content Organization"', /Journal Content Organization/.test(t.text.main || ''));
            fact('2 theme tab has the recent articles box', /recent most published/.test(t.text.main || ''));
            await signOut(page);
            await home('05');
            fact('5 home has "Latest Publications"', await page.locator('.latest_articles').count());
            return;
        }
        if (mode === 'nb') {
            await home('nb');
            return;
        }
        await signIn(page, 'dbarnes');
        fact('2 content organization', await L.setContentOrganization(page, app, {[RECENT]: true}));
        const {PublicationScreen} = require(require('path').join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
        const pub = new PublicationScreen(page, ctx);
        await pub.gotoWorkflow(ID);
        await pub.openEntry('Title & Abstract');
        await pub.publish();
        record('04-published', await screen(page));
        fact('4 published', L.flat(await pub.leftControls().innerText().catch(() => '')));
        await signOut(page);
        const items = await home('05');
        const latest = items.filter((h) => h.part === 'latest');
        const issue = items.filter((h) => h.part === 'issue');
        fact('6 latest publications', latest);
        fact('6 current issue', issue);
        // The aria snapshot is what a screen reader reads: pull the heading lines of the two parts.
        const a = (await screen(page)).aria;
        const aria = typeof a === 'string' ? a : Object.values(a || {}).join('\n');
        fact('6 aria headings', aria.split('\n').filter((l) => /heading/.test(l)).map((l) => l.trim()));
    } finally {
        record('facts', facts);
        await close();
    }
});
