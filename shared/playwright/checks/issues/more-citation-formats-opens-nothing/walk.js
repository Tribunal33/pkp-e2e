// Issue report docs/issues/U13-A9-more-citation-formats-opens-nothing.md (U13 A9):
// the report's Steps to reproduce, walked through the screens on PKP's default
// test dataset (a dataset fleet, harness.md "Dataset fleets"), context
// `publicknowledge`, as the dataset's own users. The kit builds nothing.
//
//   precondition: `rvaca` ticks "Citation Style Language" (Settings › Website
//      › Plugins)
//   control (signed out, the settings as the dataset has them): the published
//      item's page (OJS article 17, OPS preprint 2, OMP book 5), "More
//      Citation Formats": the list opens; a format is chosen and the RIS file
//      downloaded
//   steps: `rvaca` opens the plugin's "Settings", unticks every "Additional
//      Citation Formats" box, "OK", signs out; the same page, "More Citation
//      Formats" pressed (and pressed again)
//   neighbour (every run, so a run with the fix in and one with it out
//      compare): the control above, and the same page after `rvaca` also
//      unticks both "Downloadable Formats" boxes (nothing left to offer).
//
// Reset first:  npm run fleet-prep -- --feature issues-ir26 --dataset 7 --reset
// Run (main):   PROBE_FEATURE=issues-ir26 PROBE_AGENT=ir26 node bin/probe.js all shared/playwright/checks/issues/more-citation-formats-opens-nothing/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir26-3_5 --dataset 7 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir26-3_5 PROBE_AGENT=ir26 node bin/probe.js all shared/playwright/checks/issues/more-citation-formats-opens-nothing/walk.js
// The fix: fix.diff is the plugin's part (OJS, OMP); fix-ops.diff is the same plus OPS's own template, applied to OPS alone.
// Facts: .reports/<feature>/ir26/facts[-<run>]-<app>.json
const fs = require('fs');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const {CitationStyleSettings} = require('../../../pages/ArticleLandingPages');
const {captureDownload} = require('../../../pages/SubmissionFilesPages.js');

const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim());
const RIS = 'Endnote/Zotero/Mendeley (RIS)';

// The published item the steps open, per app.
const ITEM = {
    ojs: {path: 'article/view/17', what: 'article 17'},
    ops: {path: 'preprint/view/2', what: 'preprint 2'},
    omp: {path: 'catalog/book/5', what: 'book 5'},
};

/** Open the item's page signed out and read the "How to Cite" block, pressing the button `presses` times. */
async function readBlock(page, app, item, name, {choose = null, download = false} = {}) {
    const out = {};
    const errors = [];
    const onError = (e) => errors.push(e.message || String(e));
    page.on('pageerror', onError);
    const response = await page.goto(app.url(`/index.php/${app.contextPath}/${item.path}`));
    await idle(page);
    out.pageStatus = response ? response.status() : null;
    const output = page.locator('#citationOutput');
    await output.waitFor({state: 'visible', timeout: T});
    out.citation = flat(await output.innerText());
    const button = page.locator('button[aria-controls="cslCitationFormats"]');
    const list = page.locator('#cslCitationFormats');
    out.buttonShown = (await button.count()) > 0 && (await button.isVisible());
    out.buttonText = out.buttonShown ? flat(await button.innerText()) : null;
    out.listInPage = await list.count();
    // What the page's markup holds, shown or not (the list keeps its links while hidden).
    out.formatLinksInPage = (await list.locator('a[data-load-citation]').allTextContents()).map(flat);
    out.downloadLinksInPage = (await list.locator('a:not([data-load-citation])').allTextContents()).map(flat);
    const state = async () => ({
        ariaExpanded: await button.getAttribute('aria-expanded'),
        ariaHidden: await list.getAttribute('aria-hidden'),
        listVisible: await list.isVisible(),
        listText: (await list.isVisible()) ? flat(await list.innerText()) : null,
        // An empty formats list before "Download Citation" makes the stylesheet draw a rule above that label.
        emptyLists: await list.locator('ul:not(:has(li))').count(),
        downloadLabelRule: await list.locator('.label').first().evaluate((el) => getComputedStyle(el).borderTopWidth).catch(() => null),
    });
    if (out.buttonShown) {
        out.beforePress = await state();
        await button.click();
        await sleep(500);
        out.afterFirstPress = await state();
        record(`${name}-screen`, await screen(page));
        await shot(page, name).catch(() => {});
        if (out.afterFirstPress.listVisible && choose) {
            // The list keeps aria-hidden while open, so its links are found by CSS, not by role.
            const answered = page.waitForResponse((r) => /citationstylelanguage\/get/.test(r.url()), {timeout: T});
            await list.locator('a[data-load-citation]').filter({hasText: new RegExp(`^\\s*${choose}\\s*$`)}).click();
            out.chosen = {format: choose, status: (await answered).status()};
            await sleep(800);
            out.chosen.citation = flat(await output.innerText());
            out.chosen.after = await state();
            await button.click();
            await sleep(300);
        }
        if ((await list.isVisible()) && download) {
            const link = list.locator('a').filter({hasText: RIS});
            const {download: d} = await captureDownload(page, () => link.click());
            const file = await d.path();
            out.download = {name: d.suggestedFilename(), bytes: file ? fs.statSync(file).size : 0};
            await sleep(300);
            out.afterDownload = await state();
        } else {
            await button.click();
            await sleep(500);
            out.afterSecondPress = await state();
        }
    } else {
        record(`${name}-screen`, await screen(page));
        await shot(page, name).catch(() => {});
    }
    page.off('pageerror', onError);
    out.pageErrors = errors;
    return out;
}

/** As `rvaca`: the plugin's "Settings", untick what `untick` names, "OK"; then reopen and read the boxes. */
async function saveSettings(page, app, name, {formats = false, downloads = false}) {
    const out = {};
    await signIn(page, 'rvaca');
    const settings = new CitationStyleSettings(page, app.contextPath);
    await settings.openPlugins();
    await settings.openSettings();
    out.before = {
        additional: await settings.checkedAdditionalBoxes().count(),
        of: await settings.additionalBoxes().count(),
        downloads: await settings.checkedDownloadBoxes().count(),
    };
    const untick = async (boxes) => {
        for (let i = 0, n = await boxes.count(); i < n; i++) {
            if (await boxes.nth(i).isChecked()) await boxes.nth(i).uncheck();
        }
    };
    if (formats) await untick(settings.additionalBoxes());
    if (downloads) await untick(settings.downloadBoxes());
    record(`${name}-screen`, await screen(page));
    await shot(page, name).catch(() => {});
    const response = await settings.save();
    out.saveStatus = response.status();
    await settings.openSettings();
    out.after = {
        additional: await settings.checkedAdditionalBoxes().count(),
        downloads: await settings.checkedDownloadBoxes().count(),
    };
    await signOut(page);
    return out;
}

forEachApp(async (app) => {
    const item = ITEM[app.name];
    const {page, close} = await launch(app);
    const facts = {line: app.line, dataset: app.dataset, item: item.what};
    try {
        await signIn(page, 'rvaca');
        const settings = new CitationStyleSettings(page, app.contextPath);
        await settings.openPlugins();
        const was = await settings.enabledBox().isChecked();
        if (!was) await settings.setEnabled(true);
        facts.plugin = {wasEnabled: was, enabled: await settings.enabledBox().isChecked()};
        await signOut(page);

        // Control and neighbour: the settings as the dataset has them.
        facts.control = await readBlock(page, app, item, 'control', {choose: 'ACM', download: true});
        // Steps 1-2: no additional format ticked.
        facts.settings = await saveSettings(page, app, 'settings-no-formats', {formats: true});
        // Steps 3-4.
        facts.noFormats = await readBlock(page, app, item, 'no-formats', {download: true});
        // Neighbour: no download ticked either.
        facts.settingsNothing = await saveSettings(page, app, 'settings-nothing', {downloads: true});
        facts.nothing = await readBlock(page, app, item, 'nothing');
    } finally {
        record('facts', facts);
        const line = (k) => {
            const b = facts[k];
            if (!b) return `  ${k}: -`;
            const s = b.afterFirstPress;
            return `  ${k}: button ${b.buttonShown ? `"${b.buttonText}"` : 'not shown'}; formats in page ${b.formatLinksInPage.length}, downloads in page ${JSON.stringify(b.downloadLinksInPage)}; after press: ${s ? `aria-expanded=${s.ariaExpanded} list ${s.listVisible ? `shown "${s.listText}"` : 'not shown'}` : '-'}; download ${b.download ? b.download.name : '-'}; page errors ${JSON.stringify(b.pageErrors)}`;
        };
        console.log(`${app.name} ${item.what} (${app.line || 'main'})`);
        console.log(`  settings: ${JSON.stringify(facts.settings)} / ${JSON.stringify(facts.settingsNothing)}`);
        for (const k of ['control', 'noFormats', 'nothing']) console.log(line(k));
        if (facts.control && facts.control.chosen) console.log(`  control ACM: ${JSON.stringify(facts.control.chosen).slice(0, 300)}`);
        await close();
    }
});
