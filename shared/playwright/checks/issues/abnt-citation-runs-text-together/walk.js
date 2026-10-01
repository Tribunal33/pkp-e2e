// Issue report walk: docs/issues/U13-A7-abnt-citation-runs-text-together.md
// (spec U13 register A7). Takes the report's Steps on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"):
//   1-2  rvaca ticks "Citation Style Language" on Settings › Website › "Plugins"
//        (off in the dataset; once on, "ABNT" is among the formats offered).
//   3    signs out.
//   4-5  on the published item's page (OJS article 17, OPS preprint 2, OMP book
//        14 as the control), "How to Cite" › "More Citation Formats" › "ABNT".
//   Neighbour: then "APA" on the same page, which a fix to the ABNT style must
//        leave unchanged; OMP's ABNT (a book prints its year alone) likewise.
// The kit builds nothing; step 2 changes the dataset, so reset the fleet
// before each walk.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir2 PROBE_AGENT=u13a7 node bin/probe.js all shared/playwright/checks/issues/abnt-citation-runs-text-together/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=u13a7 node bin/probe.js all <this file>
// An optional first argument tags the record: `fix` (the same walk with
// fix.diff applied), or `neighbour` (steps 1-4, then only what the fix must
// leave alone: "APA" on every app and OMP's "ABNT"; run with the fix out).
// Facts: .reports/<feature>/u13a7/walk[-<tag>][-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, record, idle, loc} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 800) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const mode = process.argv[2] || '';
const tagArg = mode ? `-${mode}` : '';

const ITEM = {
    ojs: {id: 17, path: 'article/view/17'},
    ops: {id: 2, path: 'preprint/view/2'},
    omp: {id: 14, path: 'catalog/book/14'},
};

async function enableCsl(app, page) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/website`));
    await idle(page);
    await page.locator('#plugins-button').first().click();
    await idle(page);
    const row = page.locator('tr.gridRow[id$="-row-citationstylelanguageplugin"]').first();
    await row.waitFor({timeout: T});
    await pause(500);
    const box = row.getByRole('checkbox').first();
    await loc(page, 'Plugins: the "Citation Style Language" row\'s checkbox', box);
    if (await box.isChecked()) return {already: true};
    const w = page.waitForResponse((r) => /plugin-grid\/enable/.test(r.url()), {timeout: T}).catch(() => null);
    await box.click();
    const r = await w;
    await pause(800);
    await idle(page);
    return {status: r ? r.status() : null, checked: await box.isChecked(), row: flat(await row.innerText(), 200)};
}

async function openFormats(page) {
    const button = page.locator('button[aria-controls="cslCitationFormats"]');
    await button.waitFor({state: 'visible', timeout: T});
    if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
    await page.locator('#cslCitationFormats[aria-hidden="false"]').waitFor({timeout: T});
}

// "More Citation Formats" › <label>; returns the citation as shown and as HTML.
async function chooseFormat(app, page, label, styleId) {
    await openFormats(page);
    const link = page.locator('#cslCitationFormats').getByRole('link', {name: new RegExp(`^\\s*${label}\\s*$`)});
    await loc(page, `"${label}" under "More Citation Formats"`, link);
    const got = page.waitForResponse((r) => r.url().includes(`/citationstylelanguage/get/${styleId}`), {timeout: T}).catch(() => null);
    await link.click();
    const r = await got;
    await pause(1500);
    const output = page.locator('#citationOutput');
    let json = null;
    if (r) json = await r.json().catch(() => null);
    return {
        status: r ? r.status() : null,
        shown: flat(await output.innerText()),
        html: flat(await output.innerHTML(), 1500),
        responseContent: json && json.content ? flat(json.content, 1500) : json,
    };
}

forEachApp(async (app) => {
    const facts = {line: app.line, dataset: app.dataset, item: ITEM[app.name]};
    const {page, close} = await launch(app);
    try {
        // 1-2
        await signIn(page, 'rvaca', {contextPath: app.contextPath});
        facts.enable = await enableCsl(app, page);
        facts.pluginsScreen = await screen(page);
        // 3
        await signOut(page);
        // 4
        const resp = await page.goto(app.url(`/index.php/${app.contextPath}/en/${ITEM[app.name].path}`));
        await idle(page);
        facts.pageStatus = resp ? resp.status() : null;
        facts.title = await page.title();
        facts.primary = flat(await page.locator('#citationOutput').innerText().catch(() => null));
        // 5 (the neighbour run takes it on OMP alone, where a book prints its year only)
        if (mode !== 'neighbour' || app.name === 'omp') {
            facts.abnt = await chooseFormat(app, page, 'ABNT', 'associacao-brasileira-de-normas-tecnicas');
            facts.abntScreen = await screen(page);
        }
        // Neighbour: APA on the same page.
        facts.apa = await chooseFormat(app, page, 'APA', 'apa');
        facts.apaScreen = await screen(page);
    } finally {
        record(`walk${tagArg}`, facts);
        await close();
    }
});
