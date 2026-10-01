// Issue report docs/issues/U13-A7-abnt-citation-runs-text-together.md (U13 A7):
// the report's Steps to reproduce, walked through the screens on PKP's default
// test dataset (a dataset fleet, harness.md "Dataset fleets"), context
// `publicknowledge`, as the dataset's own users. The kit builds nothing.
//
//   precondition: `rvaca` ticks "Citation Style Language" (Settings › Website
//      › Plugins), then signs out
//   steps (signed out): open the published item's page (OPS preprint 2, OJS
//      article 17; OMP book 5 as the control), "More Citation Formats" ›
//      "ABNT"; the citation's text and markup are recorded
//   neighbour (every run, so a run with the fix in and one with it out
//      compare): each of the other formats the list offers is chosen in turn
//      on the same page and its citation recorded; the fix must leave them,
//      and the book's "ABNT", as they are.
//   `place` as the script's argument (a second check, with the fix in and
//      out): before signing out, `rvaca` opens the plugin's "Settings",
//      types "London, U.K." into "Publisher Location" and presses "OK"; the
//      same pages' "ABNT" then carries the place.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir22 --dataset 7 --reset
// Run (main):   PROBE_FEATURE=issues-ir22 PROBE_AGENT=ir22 node bin/probe.js all shared/playwright/checks/issues/abnt-citation-runs-text-together/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir22-3_5 --dataset 7 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir22-3_5 PROBE_AGENT=ir22 node bin/probe.js all shared/playwright/checks/issues/abnt-citation-runs-text-together/walk.js
// Facts: .reports/<feature>/ir22/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');

const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim());
const PLACE = process.argv.includes('place');

// The published item the steps open, per app.
const ITEM = {
    ojs: {path: 'article/view/17', what: 'article 17'},
    ops: {path: 'preprint/view/2', what: 'preprint 2'},
    omp: {path: 'catalog/book/5', what: 'book 5 (control)'},
};

async function enablePlugin(page, app) {
    const {CitationStyleSettings} = require('../../../pages/ArticleLandingPages');
    await signIn(page, 'rvaca');
    const settings = new CitationStyleSettings(page, app.contextPath);
    await settings.openPlugins();
    const was = await settings.enabledBox().isChecked();
    if (!was) await settings.setEnabled(true);
    const now = await settings.enabledBox().isChecked();
    const out = {wasEnabled: was, enabled: now};
    if (PLACE) {
        await settings.openSettings();
        await settings.publisherLocationBox().fill('London, U.K.');
        await settings.okButton().click();
        await settings.expectClosed();
        await settings.openSettings();
        out.publisherLocation = await settings.publisherLocationBox().inputValue();
    }
    await signOut(page);
    return out;
}

forEachApp(async (app) => {
    const item = ITEM[app.name];
    const {page, close} = await launch(app);
    const facts = {line: app.line, dataset: app.dataset, item: item.what, formats: {}};
    try {
        facts.plugin = await enablePlugin(page, app);
        const response = await page.goto(app.url(`/index.php/${app.contextPath}/${item.path}`));
        await idle(page);
        facts.pageStatus = response ? response.status() : null;
        const output = page.locator('#citationOutput');
        await output.waitFor({state: 'visible', timeout: T});
        facts.primary = flat(await output.innerText());
        const button = page.locator('button[aria-controls="cslCitationFormats"]');
        const list = page.locator('#cslCitationFormats');
        const links = list.locator('a[data-json-href]');
        const names = (await links.allTextContents()).map(flat);
        facts.offered = names;
        // "ABNT" first (the steps), then every other format (the neighbour).
        const order = PLACE ? ['ABNT'] : ['ABNT', ...names.filter((n) => n !== 'ABNT')];
        for (const name of order) {
            if (!(await list.isVisible())) await button.click();
            await list.waitFor({state: 'visible', timeout: T});
            const link = links.filter({hasText: new RegExp(`^\\s*${name}\\s*$`)});
            const href = await link.getAttribute('data-json-href');
            const answered = page.waitForResponse((r) => r.url() === href, {timeout: T}).catch(() => null);
            await link.click();
            const answer = await answered;
            await sleep(800);
            await idle(page);
            facts.formats[name] = {
                status: answer ? answer.status() : null,
                text: flat(await output.innerText()),
                html: flat(await output.innerHTML()),
            };
            if (name === 'ABNT') {
                record(PLACE ? 'abnt-place-screen' : 'abnt-screen', await screen(page));
                await shot(page, PLACE ? 'abnt-place' : 'abnt').catch(() => {});
            }
        }
    } finally {
        record(PLACE ? 'facts-place' : 'facts', facts);
        const abnt = facts.formats.ABNT;
        console.log(`${app.name} ${item.what}: ABNT ${abnt ? abnt.status : '-'}\n  text: ${abnt ? abnt.text : '(none)'}\n  html: ${abnt ? abnt.html : ''}`);
        await close();
    }
});
