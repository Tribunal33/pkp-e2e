// Neighbour check for the fix of docs/issues/U45-A20-doi-agency-tool-page-empty-heading.md (OJS, OPS, default
// dataset): what the fix must leave alone, walked with the fix in and out.
//  - The notice's two links still open the DOIs page and Settings › Distribution › "DOIs".
//  - A Section editor / Moderator (dbuskins) opening the tool's address is still refused.
//  - "Native XML Plugin" keeps its heading, trail and tab title.
//
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs,ops shared/playwright/checks/issues/doi-agency-tool-page-empty-heading/neighbour.js
const {forEachApp, launch, signIn, signOut, record, idle} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const tools = require('../command-line-tool-link-blank-page/lib');
const L = require('./lib');

const ADDRESS = '/management/importexport/plugin/CrossrefExportPlugin';

forEachApp(async (app) => {
    if (app.name === 'omp') return;
    const f = {app: app.name, line: app.line || 'main', links: []};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    try {
        await signIn(page, 'dbarnes');
        await tools.openTools(app, page);
        await tools.pressTool(page, 'Crossref XML Export Plugin');
        const tool = await L.readToolPage(page);
        for (const l of tool.noticeLinks) {
            await page.goto(app.url(`/index.php/${app.contextPath}/en${ADDRESS}`));
            await idle(page).catch(() => {});
            await page.getByRole('link', {name: l.text, exact: true}).click();
            await page.waitForLoadState('load').catch(() => {});
            await idle(page).catch(() => {});
            f.links.push({text: l.text, url: native.rel(page.url()), heading: native.flat(await page.locator('h1').first().innerText().catch(() => null), 80)});
        }
        await tools.openTools(app, page);
        const c = await tools.pressTool(page, 'Native XML Plugin');
        f.native = {status: c.status, ...(await L.readToolPage(page))};
        await signOut(page);
        await signIn(page, 'dbuskins');
        const r = await page.goto(app.url(`/index.php/${app.contextPath}/en${ADDRESS}`));
        await idle(page).catch(() => {});
        const body = await page.locator('body').innerText().catch(() => '');
        f.sectionEditor = {status: r && r.status(), denied: /does not have access to this operation/.test(body), body: native.flat(body, 200)};
    } catch (e) {
        f.error = native.flat(e.stack, 900);
    } finally {
        record('neighbour', f);
        console.log(`[neighbour] ${app.name}`, JSON.stringify(f));
        await close();
    }
});
