// Issue report docs/issues/U15-OJS2-by-journal-choice-lost-after-search.md (U15 OJS2) {OJS}:
// on the site-wide Search page, "By Journal" limits the first page only and never shows as chosen.
// Takes the report's Steps on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"). OJS only: a press or server site-wide page offers no such select (U15 A10).
//
// Preconditions, as the report gives them:
//   config.inc.php [interface] items_per_page = 1 (the fleet's config file, written here);
//   as admin: Administration › Hosted Journals › "Create Journal" "Second Journal u15e" (path u15e,
//   enabled); publicknowledge › Tools › "Native XML Plugin" › "Export Issues": export "Vol. 1 No. 2
//   (2014)" (its two published articles); u15e › the same plugin › "Import" that file; then
//   `php tools/rebuildSearchIndex.php` and `php lib/pkp/tools/jobs.php run` (an import reaches the
//   index on main only that way; 3.5's import indexes, and its rebuild runs at once).
// Steps, as a visitor:
//   1. /index.php/index/search
//   2. "By Journal": "Journal of Public Knowledge", empty box (QUERY=<word> types it), "Search"
//   3. read the count line and the select; 4. press "2"; 5. read the count line and the journals
//   6. (control) a fresh form, no journal chosen, "Search"
// NB=1 is the neighbour check for a fix trial, alone (same preconditions): the site-wide page with
// no journal chosen still pages through the whole site; the second journal chosen shows only its
// article; publicknowledge's own Search page (no select) still lists only its articles.
// The kit builds nothing; the second journal and its article are made on screen.
//
// Reset first:  npm run fleet-prep -- --feature issues-u15e --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u15e PROBE_AGENT=u15e node bin/probe.js ojs shared/playwright/checks/issues/by-journal-choice-lost-after-search/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u15e-3_5 --dataset 1 --reset
//               QUERY=potential PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u15e-3_5 PROBE_AGENT=u15e node bin/probe.js ojs shared/playwright/checks/issues/by-journal-choice-lost-after-search/walk.js
// (PROBE_RUN=fix | nb-in | nb-out for the fix trial)
const fs = require('fs');
const {forEachApp, launch, signIn, signOut, screen, shot, record, outFile} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const doaj = require('../doaj-deposit-takes-other-journals-articles/lib');
const L = require('./lib');

const QUERY = process.env.QUERY || '';
const SECOND = {name: 'Second Journal u15e', initials: 'SJ', path: 'u15e', email: 'u15e@mailinator.com'};
const FIRST_NAME = 'Journal of Public Knowledge';
const ISSUE = 'Vol. 1 No. 2 (2014)';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    if (app.name !== 'ojs') {
        if (!nb) {
            console.log(`[fact] ${app.name}: no "By Journal" select on a press or server site (U15 A10); steps skipped`);
            return;
        }
        // The fix is in the shared handler: a press's or server's own Search page and its site-wide
        // page must answer as before (no select, the context's results), nothing else built.
        const {page, close} = await launch(app);
        const out = {app: app.name, line: app.line || 'main', mode: 'neighbour'};
        try {
            await page.goto(app.url(`/index.php/${app.contextPath}/search/search?query=${encodeURIComponent(QUERY)}`));
            out.ownSearch = await L.readResults(page);
            record(`nb-${app.name}-own-search`, await screen(page));
            await L.openSiteSearch(app, page);
            out.siteSearch = await L.searchWith(page, {query: QUERY});
            record(`nb-${app.name}-site-search`, await screen(page));
            console.log(`[fact] ${app.name} neighbour: ${L.flat(JSON.stringify(out), 2500)}`);
        } catch (e) {
            out.error = L.flat(e.message, 400);
            console.log(`[fact] ${app.name} neighbour error: ${out.error}`);
        } finally {
            record('neighbour', out);
            await close();
        }
        return;
    }
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour' : 'steps', query: QUERY};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${L.flat(JSON.stringify(v), 2500)}`);
    };
    const step = async (k, fn) => { try { fact(k, await fn()); } catch (e) { fact(k, {error: L.flat(e.message, 400)}); } };
    let n = 0;
    const snap = async (page, name) => {
        const label = `${nb ? 'nb' : 'w'}-${String(++n).padStart(2, '0')}-${name}`;
        record(label, await screen(page));
        await shot(page, label).catch(() => {});
        return label;
    };

    const {page, close} = await launch(app);
    try {
        // Preconditions
        fact('pre config items_per_page', L.setItemsPerPage(app, 1));
        await signIn(page, 'admin');
        await step('pre create journal', async () => ({status: await doaj.createJournal(page, app, SECOND)}));
        await step('pre export issue', async () => {
            await native.openNative(app, page);
            const out = await L.exportIssue(page, ISSUE);
            const file = outFile(`export-issue${app.line ? '-' + app.line : ''}.xml`);
            fs.writeFileSync(file, out.text);
            facts.exportFile = file;
            return {rows: out.rows, file: out.name, bytes: out.text.length, articles: [...out.text.matchAll(/<title locale="en">([^<]{0,60})/g)].map((m) => m[1])};
        });
        await step('pre import into u15e', async () => {
            await native.openNative({...app, contextPath: SECOND.path}, page);
            const r = await native.importFile(page, facts.exportFile);
            return {uploaded: r.uploaded.status, tabs: r.tabs, panel: L.flat(r.panel, 400), snap: await snap(page, 'import-results')};
        });
        fact('pre rebuild search index', L.rebuildIndex(app));
        await signOut(page);

        if (!nb) {
            await step('1 open site-wide search', async () => ({...(await L.openSiteSearch(app, page)), select: await L.readJournalSelect(page), snap: await snap(page, 'site-search')}));
            await step('2-3 search with By Journal = publicknowledge', async () => ({...(await L.searchWith(page, {query: QUERY, journal: FIRST_NAME})), snap: await snap(page, 'chosen-page1')}));
            await step('4-5 press page 2', async () => ({...(await L.pressPageLink(page, '2')), snap: await snap(page, 'chosen-page2')}));
            await step('4-5 then page 3 (when offered)', async () => {
                const has3 = await page.locator('.page_search .cmp_pagination a').filter({hasText: /^\s*3\s*$/}).count();
                return has3 ? {...(await L.pressPageLink(page, '3')), snap: await snap(page, 'chosen-page3')} : {offered: false};
            });
            await step('6 control: no journal chosen', async () => {
                await L.openSiteSearch(app, page);
                return {...(await L.searchWith(page, {query: QUERY})), snap: await snap(page, 'control-all')};
            });
        } else {
            await step('nb1 site-wide, no journal, page 1', async () => {
                await L.openSiteSearch(app, page);
                return {...(await L.searchWith(page, {query: QUERY})), snap: await snap(page, 'all-page1')};
            });
            await step('nb2 site-wide, no journal, page 2', async () => ({...(await L.pressPageLink(page, '2')), snap: await snap(page, 'all-page2')}));
            await step('nb3 site-wide, second journal chosen', async () => {
                await L.openSiteSearch(app, page);
                return {...(await L.searchWith(page, {query: QUERY, journal: SECOND.name})), snap: await snap(page, 'second-chosen')};
            });
            await step('nb4 publicknowledge own Search page', async () => {
                await page.goto(app.url(`/index.php/${app.contextPath}/search/search?query=${encodeURIComponent(QUERY)}`));
                return {...(await L.readResults(page)), snap: await snap(page, 'journal-search')};
            });
            await step('nb5 publicknowledge own Search page, page 2', async () => {
                const has2 = await page.locator('.page_search .cmp_pagination a').filter({hasText: /^\s*2\s*$/}).count();
                return has2 ? {...(await L.pressPageLink(page, '2')), snap: await snap(page, 'journal-search-2')} : {offered: false};
            });
        }
    } catch (e) {
        fact('error', L.flat(e.message, 500));
    } finally {
        record(nb ? 'neighbour' : 'walk', facts);
        await close();
    }
});
