// Issue report docs/issues/U08-OPS3-ops-french-developed-by-heading-raw-key.md (U08 OPS3): on a
// preprint server's French pages a screen reader hears the "Developed By" block's heading as
// "##plugins.block.developedBy.blockTitle##"; a journal and a press read "Développé par".
// Takes the report's Steps on PKP's default test dataset, all three apps (a journal and a press
// are the controls):
//   1. dbarnes signs in
//   2. Settings › Website › "Plugins": tick "\"Developed By\" Block"
//   3. "Appearance" › "Setup": tick it under "Sidebar", "Save"
//   4. the home page in French (/index.php/publicknowledge/fr_CA)
//   5. the block's heading as a screen reader meets it (aria snapshot), its markup, every code
//      in the sidebar
// NB=1 is the neighbour check for a fix trial, alone: steps 1–3, then step 4 in English, which
// the fix must leave as it is.
// Reset first: npm run fleet-prep -- --feature <feature> --dataset 1 --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/ops-french-developed-by-heading-raw-key/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, screen, record, idle, rawKeys} = require('../../../probe');
const L = require('../browse-block-sidebar/lib');

const PLUGIN = 'developedbyblockplugin';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const lang = nb ? 'en' : 'fr_CA';
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour (en)' : 'steps (fr_CA)'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2000)}`);
    };
    const step = async (k, fn) => { try { fact(k, await fn()); } catch (e) { fact(k, {error: L.flat(e.message, 400)}); } };
    const {page, close} = await launch(app);
    const errs = L.scriptErrors(page);
    const fails = [];
    page.on('response', (r) => { if (r.status() >= 500) fails.push(`${r.status()} ${r.url()}`); });
    try {
        // 1
        await signIn(page, 'dbarnes');
        // 2
        await step('2 plugin ticked', async () => {
            await L.openPlugins(app, page);
            const row = page.locator(`tr.gridRow[id$="-row-${PLUGIN}"]`).first();
            const name = L.flat(await row.locator('td').first().innerText().catch(() => null), 120);
            return {row: name, ...(await L.setPluginEnabled(page, PLUGIN, true))};
        });
        // 3
        await step('3 placed in sidebar', async () => {
            const before = await L.openSidebarList(app, page, app.contextPath);
            const offered = before.filter((b) => b.value === PLUGIN).map((b) => b.label);
            return {offered, save: await L.placeAndRead(page, [PLUGIN])};
        });
        // 4
        await step('4 home page', async () => {
            const retried = await L.openPublic(page, app.url(`/index.php/${app.contextPath}/${lang}`));
            return {retried, url: page.url().replace(/^https?:\/\/[^/]+/, ''), htmlLang: await page.locator('html').getAttribute('lang')};
        });
        record(`${lang}-4-home`, await screen(page));
        // 5
        await step('5 block', async () => {
            const block = page.locator('.pkp_structure_sidebar .block_developed_by').first();
            if (!(await block.count())) return {present: false};
            const h2 = block.locator('h2').first();
            return {
                present: true,
                aria: await block.ariaSnapshot(),
                heading: L.flat(await h2.textContent()),
                headingClass: await h2.getAttribute('class'),
                headingVisible: await h2.isVisible(),
                link: {text: L.flat(await block.locator('a').first().textContent()), href: await block.locator('a').first().getAttribute('href')},
            };
        });
        await step('5 sidebar headings', () => L.sidebarHeadings(page));
        await step('5 raw keys (sidebar)', async () => {
            const all = await rawKeys(page, {scope: '.pkp_structure_sidebar'});
            return [...new Set(all.map((k) => (typeof k === 'string' ? k : JSON.stringify(k))))];
        });
        await idle(page).catch(() => {});
        fact('errors', {script: errs, server: fails});
    } finally {
        record(`${lang}-facts`, facts);
        await close();
    }
});
