// U18 A8: on a press and a preprint server, publishing does not move an item up the web
// feeds, so with more items than "Number of publications to display" it stays out of them.
// The Steps to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"), context `publicknowledge`, as `dbarnes`. The kit builds nothing;
// everything goes through the screens, and each feed is read without a session, as a feed
// reader reads it.
//   1. the three feeds (atom, rss2, rss): the items' order
//   2. sign in as dbarnes, open the item, "Unpublish" ("Unpost"), confirmed
//   3. "Publish" ("Post"), confirmed
//      [a journal: instead of 2 and 3, the waiting version 1.1 of submission 1 is published]
//   4. the three feeds again
//   5. Settings › Website › "Plugins" › "Web Feed Plugin" › "Settings": 1 in "Number of
//      publications to display", "OK"
//   6. the three feeds again
// OMP: submission 5 (the second of two published books). OPS: submission 2 (the last of 17
// posted preprints). OJS: submission 1 (the second of two published articles).
// At every read the script also records `submissions.last_modified` of every published item.
//
// Neighbour (`neighbour` as the script's argument, run alone, with the fix in and out): the
// feeds' first item (OMP 14, OPS 19, OJS 17) is unpublished; the feeds lose it and the other
// items keep their order and their stored dates.
//
// A first publication (`first` as the script's argument, run alone, OPS): submission 1, "The
// influence of lactation…", submitted before all 17 posted preprints and never posted, is
// posted as dbarnes ("Preprint" › "Title & Abstract", "Post", confirmed); the feeds before
// and after.   PROBE_RUN=first … node bin/probe.js ops …/walk.js first
//
// Reset first:  npm run fleet-prep -- --feature issues-u18a8 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u18a8 PROBE_AGENT=u18a8 node bin/probe.js all shared/playwright/checks/issues/published-item-not-moved-up-feeds/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u18a8-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u18a8-3_5 PROBE_AGENT=u18a8 node bin/probe.js all shared/playwright/checks/issues/published-item-not-moved-up-feeds/walk.js
// Neighbour:    PROBE_RUN=nb-out … walk.js neighbour   (nb-in with the fix applied)
// Facts: .reports/<feature>/u18a8/facts[-<run>]-<app>.json. No assertions: the script records.
const {forEachApp, launch, signIn, signOut, screen, shot, record, sql} = require('../../../probe');
const {sleep, flat, readFeeds, saveNumber, openWorkflow} = require('./lib');
const {unpublish} = require('../oai-own-address-loses-deleted-records/lib');
const {openTitleAbstract} = require('../native-import-doubles-title-prefix/lib');
const {publishShownVersion} = require('../older-version-tab-current-title/lib');
const {openFeedWindow} = require('../web-feed-identifiers-label-names-isbn/lib');

const NEIGHBOUR = process.argv.includes('neighbour');
const FIRST = process.argv.includes('first');
const FIRST_ITEMS = {ops: {id: 1, word: 'influence of lactation', first: 19}};
const ITEMS = {
    omp: {id: 5, word: 'Bomb Canada', first: 14},
    ops: {id: 2, word: 'Facets Of Job Satisfaction', first: 19},
    ojs: {id: 1, word: 'Signalling Theory Dividends', first: 17, waitingVersion: true},
};

forEachApp(async (app) => {
    const item = FIRST ? FIRST_ITEMS[app.name] : ITEMS[app.name];
    if (!item) { console.log(`[${app.name}] no never-published item to walk in this mode`); return; }
    const ctx = app.contextPath;
    const {page, close} = await launch(app);
    const reader = await launch(app, {record: false}); // the signed-out reader of the feeds
    const facts = {line: app.line, dataset: app.dataset, neighbour: NEIGHBOUR, first: FIRST, item, steps: []};
    const say = (step, data) => { facts.steps.push({step, ...data}); console.log(`[${app.name}] ${step.padEnd(20)} ${JSON.stringify(data).slice(0, 1800)}`); };
    const read = async (step) => {
        const f = await readFeeds(reader.page.request, app);
        const stored = sql(app, 'select submission_id, last_modified from submissions where status = 3 order by last_modified desc, submission_id desc');
        const place = f.atom.titles.findIndex((t) => t.includes(item.word));
        const data = {status: [f.atom.status, f.rss2.status, f.rss.status], same: f.same, items: f.atom.titles.length, place: place < 0 ? 'not listed' : place + 1,
            feedDates: [f.atom.date, f.rss2.date, f.rss.date], titles: f.atom.titles.map((t) => flat(t, 34)), stored};
        if (!f.same) data.rss2 = f.rss2.titles, data.rss = f.rss.titles;
        say(step, data);
        return data;
    };
    const step = async (name, fn) => {
        try { say(name, (await fn()) || {}); } catch (e) { say(name, {failed: flat(e.message, 400)}); await shot(page, `failed-${name.split(' ')[0]}`).catch(() => {}); }
    };
    try {
        await read('1 feeds');
        await signIn(page, 'dbarnes');
        if (FIRST) {
            say('f2 before', {row: sql(app, `select s.status, s.date_submitted, s.last_modified, p.status, p.date_published from submissions s join publications p on p.publication_id = s.current_publication_id where s.submission_id = ${item.id}`)});
            await step('f3 publish', async () => {
                await openTitleAbstract(app, page, item.id);
                await sleep(1000);
                const p = await publishShownVersion(page);
                return {publish: p.publish, button: p.button, windows: (p.windows || []).map((w) => flat(w, 160))};
            });
            record('f3-published', await screen(page).catch(() => null));
            await shot(page, 'f3-published').catch(() => {});
            await read('f4 feeds');
            say('f4 after', {row: sql(app, `select s.status, s.date_submitted, s.last_modified, p.status, p.date_published, p.last_modified from submissions s join publications p on p.publication_id = s.current_publication_id where s.submission_id = ${item.id}`)});
            await signOut(page).catch(() => {});
            return;
        }
        if (NEIGHBOUR) {
            await step('n2 unpublish first', () => unpublish(page, app, ctx, item.first));
            await read('n3 feeds');
            await signOut(page).catch(() => {});
            return;
        }
        if (item.waitingVersion) {
            say('2 versions', {publications: sql(app, `select publication_id, status, date_published, last_modified from publications where submission_id = ${item.id} order by publication_id`)});
        } else {
            await step('2 unpublish', () => unpublish(page, app, ctx, item.id));
            await read('2 feeds unpublished');
        }
        await sleep(1500); // a later second than the last write
        await step('3 publish', async () => {
            await openTitleAbstract(app, page, item.id); // the publication pages carry "Publish" ("Post")
            await sleep(1000);
            const p = await publishShownVersion(page);
            return {publish: p.publish, button: p.button, windows: (p.windows || []).map((w) => flat(w, 160))};
        });
        record('3-published', await screen(page).catch(() => null));
        await shot(page, '3-published').catch(() => {});
        await read('4 feeds');
        await step('5 number 1', async () => {
            const w = await openFeedWindow(page, app);
            record('5-window', await screen(page).catch(() => null));
            const s = await saveNumber(page, 1);
            return {labels: (w.text || []).map((t) => t.label), radios: (w.radios || []).filter((r) => r.name === 'displayItems').map((r) => `${r.label}: ${r.checked}`), ...s};
        });
        await read('6 feeds');
        await reader.page.goto(app.url(`/index.php/${ctx}/gateway/plugin/WebFeedGatewayPlugin/atom`)).catch(() => {});
        record('6-atom', await screen(reader.page).catch(() => null));
        await shot(reader.page, '6-atom').catch(() => {});
        await openWorkflow(page, app, item.id).catch(() => {});
        record('6-workflow', await screen(page).catch(() => null));
        await signOut(page).catch(() => {});
    } finally {
        record('facts', facts);
        await reader.close();
        await close();
    }
});
