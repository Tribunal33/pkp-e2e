// Issue report walk: docs/issues/U13-A9-citation-formats-list-opens-nothing.md
// (spec U13 register A9). Takes the report's Steps on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"):
//   1-2  rvaca ticks "Citation Style Language" on Settings › Website › "Plugins"
//        (off in the dataset).
//   3    the row's "Settings": every "Additional Citation Formats" box unticked,
//        both "Downloadable Formats" left ticked, "OK".
//   4    signs out.
//   5-6  on the published item's page (OJS article 17, OMP book 14, OPS preprint 2),
//        "How to Cite" › "More Citation Formats", pressed twice; then "BibTeX"
//        when it can be reached.
// The kit builds nothing; step 2 changes the dataset, so reset the fleet
// before each walk.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir2 PROBE_AGENT=u13a9 node bin/probe.js all shared/playwright/checks/issues/citation-formats-list-opens-nothing/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=u13a9 node bin/probe.js all <this file>
// An optional first argument tags the record: `fix` (the same walk with
// fix.diff applied), or `neighbour` (step 3 leaves "APA" ticked among the
// additional formats: the list must open and "APA" must swap the citation,
// with the fix in and out).
// Facts: .reports/<feature>/u13a9/walk[-<tag>][-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, record, idle, loc} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 800) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const mode = process.argv[2] || '';
const tagArg = mode ? `-${mode}` : '';
const keepStyles = mode === 'neighbour' ? ['apa'] : [];

const ITEM = {
    ojs: {id: 17, path: 'article/view/17'},
    omp: {id: 14, path: 'catalog/book/14'},
    ops: {id: 2, path: 'preprint/view/2'},
};

const cslRow = (page) => page.locator('#pluginGridContainer tr.gridRow[id$="-row-citationstylelanguageplugin"]').first();

async function gotoPlugins(app, page) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/website`));
    await idle(page);
    await page.locator('#plugins-button').first().click();
    await cslRow(page).waitFor({timeout: T});
    await idle(page);
    await pause(500);
}

// Step 2
async function enableCsl(app, page) {
    await gotoPlugins(app, page);
    const box = cslRow(page).getByRole('checkbox').first();
    await loc(page, 'Plugins: the "Citation Style Language" row\'s checkbox', box);
    if (await box.isChecked()) return {already: true};
    const w = page.waitForResponse((r) => /plugin-grid\/enable/.test(r.url()), {timeout: T}).catch(() => null);
    await box.click();
    const r = await w;
    await pause(800);
    await idle(page);
    return {status: r ? r.status() : null, checked: await box.isChecked()};
}

// Step 3
async function setFormats(app, page) {
    await gotoPlugins(app, page);
    const exp = cslRow(page).locator('a.show_extras').first();
    if (await exp.count()) { await exp.click(); await pause(500); }
    const link = page.locator('#pluginGridContainer tr[id$="-row-citationstylelanguageplugin"] + tr')
        .getByRole('link', {name: 'Settings', exact: true}).first();
    await loc(page, 'Plugins: the "Citation Style Language" row\'s "Settings" (after the row\'s arrow)', link);
    await link.click();
    const form = page.locator('#citationStyleLanguageSettingsForm');
    await form.locator('input[name="publisherLocation"]').waitFor({state: 'visible', timeout: T});
    await idle(page);
    await pause(500);
    const styles = [];
    for (const b of await form.locator('input[type=checkbox][name="enabledCitationStyles[]"]').all()) {
        const id = await b.getAttribute('value');
        const want = keepStyles.includes(id);
        if ((await b.isChecked()) !== want) await b.click();
        styles.push({id, checked: await b.isChecked()});
    }
    const downloads = [];
    for (const b of await form.locator('input[type=checkbox][name="enabledCitationDownloads[]"]').all()) {
        downloads.push({id: await b.getAttribute('value'), checked: await b.isChecked()});
    }
    const settingsScreen = await screen(page);
    const w = page.waitForResponse((r) => r.request().method() === 'POST' && /citationstylelanguageplugin/i.test(r.url()), {timeout: T}).catch(() => null);
    await form.getByRole('button', {name: /^(OK|Save)$/}).click();
    const r = await w;
    await pause(1200);
    await idle(page);
    return {status: r ? r.status() : null, styles: styles.filter((s) => s.checked).map((s) => s.id), stylesOffered: styles.length,
        downloads, stillOpen: await form.isVisible().catch(() => false), settingsScreen};
}

async function listState(page) {
    const button = page.locator('button[aria-controls="cslCitationFormats"]');
    const list = page.locator('#cslCitationFormats');
    return {
        buttonText: flat(await button.innerText().catch(() => null)),
        ariaExpanded: await button.getAttribute('aria-expanded').catch(() => null),
        ariaHidden: await list.getAttribute('aria-hidden').catch(() => null),
        listVisible: await list.isVisible().catch(() => false),
        listText: flat(await list.innerText().catch(() => null)),
        links: await list.locator('a').evaluateAll((as) => as.map((a) => ({
            text: a.innerText.replace(/\s+/g, ' ').trim(),
            visible: a.offsetParent !== null,
            download: !a.hasAttribute('data-load-citation'),
        }))).catch(() => []),
    };
}

forEachApp(async (app) => {
    const facts = {line: app.line, dataset: app.dataset, mode: mode || 'steps', item: ITEM[app.name]};
    const {page, close} = await launch(app);
    try {
        // 1-2
        await signIn(page, 'rvaca', {contextPath: app.contextPath});
        facts.enable = await enableCsl(app, page);
        // 3
        facts.settings = await setFormats(app, page);
        // 4
        await signOut(page);
        // 5
        const resp = await page.goto(app.url(`/index.php/${app.contextPath}/en/${ITEM[app.name].path}`));
        await idle(page);
        await pause(500);
        facts.pageStatus = resp ? resp.status() : null;
        facts.title = await page.title();
        facts.citation = flat(await page.locator('#citationOutput').innerText().catch(() => null));
        facts.before = await listState(page);
        // 6
        const button = page.locator('button[aria-controls="cslCitationFormats"]');
        await loc(page, 'How to Cite: the "More Citation Formats" button', button);
        await button.click();
        await pause(600);
        facts.afterFirstPress = await listState(page);
        facts.pageScreen = await screen(page);
        await button.click();
        await pause(600);
        facts.afterSecondPress = await listState(page);
        if (facts.afterSecondPress.ariaExpanded !== 'true') {
            await button.click();
            await pause(600);
            facts.afterThirdPress = await listState(page);
        }
        const opened = (await button.getAttribute('aria-expanded')) === 'true';
        // Expected: "BibTeX" downloads the .bib file once the list is open.
        const bib = page.locator('#cslCitationFormats').getByRole('link', {name: /BibTeX/});
        if (opened && await bib.isVisible().catch(() => false)) {
            const dl = page.waitForEvent('download', {timeout: T}).catch(() => null);
            await bib.click();
            const d = await dl;
            facts.bibtex = d ? {file: d.suggestedFilename()} : {file: null};
        } else {
            facts.bibtex = {reachable: false};
        }
        // Neighbour: "APA" swaps the citation shown.
        if (mode === 'neighbour') {
            if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
            await pause(400);
            const apa = page.locator('#cslCitationFormats').getByRole('link', {name: /^\s*APA\s*$/});
            if (await apa.isVisible().catch(() => false)) {
                const got = page.waitForResponse((r) => r.url().includes('/citationstylelanguage/get/apa'), {timeout: T}).catch(() => null);
                await apa.click();
                const r = await got;
                await pause(1200);
                facts.apa = {status: r ? r.status() : null, citation: flat(await page.locator('#citationOutput').innerText()), list: await listState(page)};
            } else {
                facts.apa = {reachable: false};
            }
        }
    } finally {
        record(`walk${tagArg}`, facts);
        await close();
    }
});
