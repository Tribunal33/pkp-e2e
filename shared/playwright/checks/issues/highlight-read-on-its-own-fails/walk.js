// Issue report walk: spec U11 register A10 (a journal's highlight cannot be read on its own through
// the programming interface: its `_href` names the site, and the journal's address for it fails).
// No screen reads one highlight on its own, so after the highlight is added through the journal's
// Highlights panel the Steps type the interface's addresses into the same browser. Runs on a dataset
// fleet (PKP's default test dataset, harness.md "Dataset fleets"); the kit builds nothing. Fact
// labels carry the Steps' numbers; every step records what it finds and never throws. Reset the
// fleet before each walk: the walk adds a highlight.
//
// Modes (first argument):
//   (none)      the Steps 1-6: `rvaca` adds "h15i Call for papers" on the journal's panel, reads the
//               journal's list, opens the highlight's `_href` and the journal's address for it;
//               then `admin` reads the list again and opens the `_href` it gives and the
//               journal's address.
//   neighbour   what a fix must leave alone (runs alone, on a fresh dataset): `rvaca` adds and edits a
//               highlight on the panel; an unknown id at the journal's address; the `_href`s of the
//               journal's announcements, institutions and submission 1's publications lists;
//               `dbuskins` (section editor) and a signed-out browser on the journal's address;
//               `admin` on the site's highlights list (U11 A5's failure, which this fix leaves).
//
// Reset:  npm run fleet-prep -- --feature issues-h15i --dataset 3 --reset
// Run:    PROBE_FEATURE=issues-h15i PROBE_AGENT=h15i node bin/probe.js all shared/playwright/checks/issues/highlight-read-on-its-own-fails/walk.js [neighbour]
// 3.5:    PKP_E2E_LINE=stable-3_5_0 (reset with --feature issues-h15i-3_5) and PROBE_RUN=r35 PROBE_FEATURE=issues-h15i-3_5 in front.
// Fix:    node bin/try-fix.js apply shared/playwright/checks/issues/highlight-read-on-its-own-fails/fix.diff ojs omp ops
// Facts:  .reports/<feature>/h15i/a10-facts-<mode>-<app>.json (PROBE_RUN adds its tag)
const {forEachApp, launch, signIn, signOut, screen, shot, record, serverLog} = require('../../../probe');
const H = require('../site-highlights-cannot-be-saved/lib');
const L = require('./lib');

const MODE = process.argv.slice(2).includes('neighbour') ? 'neighbour' : 'steps';
const STEP_H = {title: 'h15i Call for papers', url: 'https://example.org/h15i', label: 'Read more'};
const NB_H = {title: 'h15i Neighbour highlight', url: 'https://example.org/h15i-nb', label: 'Read more'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet only (fleet-prep --dataset)');
    const ctx = app.contextPath;
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[a10] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 900)}`);
    };
    let n = 0;
    const snap = async (page, name) => {
        record(`a10-${MODE}-${String(++n).padStart(2, '0')}-${name}`, await screen(page).catch((e) => ({error: e.message})));
        await shot(page, `a10-${MODE}-${name}`).catch(() => {});
    };
    const log = serverLog(app);
    // Open an address and add the server log lines it wrote (errors, exceptions, 5xx).
    const open = async (page, address) => {
        const from = log.mark();
        const a = await L.openApi(page, app, address);
        await L.pause(300);
        const lines = log.since(from);
        if (lines && lines.length) a.log = lines.map((x) => L.flat(x, 500));
        if (a.json && !Array.isArray(a.json) && !a.json.items) {
            const j = a.json;
            a.summary = j.error ? {error: j.error} : {id: j.id, contextId: j.contextId, _href: L.rel(j._href), keys: Object.keys(j).length};
            delete a.json;
        }
        return a;
    };
    const listJournal = async (page) => {
        const a = await open(page, `/index.php/${ctx}/api/v1/highlights`);
        return {status: a.status, items: L.hrefs(a), error: a.json ? undefined : (a.body || a.error), log: a.log};
    };
    const {page, close} = await launch(app);

    try {
        if (MODE === 'steps') {
            // 1
            await signIn(page, 'rvaca');
            // 2
            fact('2 journal highlights tab', await H.openContextHighlights(page, app, ctx));
            fact('2 add highlight', await H.addHighlight(page, STEP_H));
            await snap(page, 'step2-added');
            // 3
            const list = await listJournal(page);
            fact('3 journal list', list);
            const item = (list.items || []).find((i) => /h15i/.test(i.title)) || (list.items || [])[0] || {};
            const own = `/index.php/${ctx}/api/v1/highlights/${item.id}`;
            // 4
            fact('4 rvaca _href', await open(page, item._href || '/missing-href'));
            // 5
            fact('5 rvaca journal address', await open(page, own));
            // 6
            await signOut(page);
            await signIn(page, 'admin');
            const list6 = await listJournal(page);
            fact('6 admin journal list', list6);
            const item6 = (list6.items || []).find((i) => /h15i/.test(i.title)) || {};
            fact('6 admin _href', await open(page, item6._href || '/missing-href'));
            fact('6 admin journal address', await open(page, own));
        } else {
            await signIn(page, 'rvaca');
            fact('n journal highlights tab', await H.openContextHighlights(page, app, ctx));
            fact('n add highlight', await H.addHighlight(page, NB_H));
            fact('n edit on panel', await L.editHighlightUrl(page, NB_H.title, 'https://example.org/h15i-nb-edited'));
            fact('n panel after reload', await H.openContextHighlights(page, app, ctx));
            await snap(page, 'neighbour-panel');
            const list = await listJournal(page);
            fact('n journal list', list);
            const item = (list.items || []).find((i) => /h15i/.test(i.title)) || {};
            const own = `/index.php/${ctx}/api/v1/highlights/${item.id}`;
            const after = await open(page, own);
            fact('n rvaca journal address', after);
            fact('n rvaca unknown id', await open(page, `/index.php/${ctx}/api/v1/highlights/999999`));
            for (const [k, p] of [['announcements', `/index.php/${ctx}/api/v1/announcements`], ['institutions', `/index.php/${ctx}/api/v1/institutions`], ['publications of submission 1', `/index.php/${ctx}/api/v1/submissions/1/publications`]]) {
                const a = await open(page, p);
                fact(`n ${k} _href`, {status: a.status, items: L.hrefs(a), error: a.json ? undefined : (a.body || a.error), log: a.log});
            }
            await signOut(page);
            await signIn(page, 'dbuskins');
            fact('n dbuskins journal address', await open(page, own));
            await signOut(page);
            fact('n signed out journal address', await open(page, own));
            await signIn(page, 'admin');
            fact('n admin site list', await open(page, '/index.php/index/api/v1/highlights'));
            await snap(page, 'neighbour-end');
        }
    } catch (e) {
        fact('error', L.flat(e.stack || e.message, 900));
    } finally {
        record(`a10-facts-${MODE}`, facts);
        await close();
    }
});
