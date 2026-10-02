// Issue report docs/issues/U18-A2-unknown-feed-name-blank-page.md (U18 A2):
// the report's Steps to reproduce, walked on PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"), context `publicknowledge`,
// signed out: a feed address is public, and the address bar sends what a
// feed reader sends.
//
// The kit builds nothing and the walk changes nothing.
//   1. the Atom feed (control)
//   2. the feed name in capitals, "ATOM"
//   3. the feed name with an extension, "atom.xml"
//   4. a feed name the plugin does not have, "json"
//   5. no feed name
//   6. an unknown plugin name (control: "404 Not Found")
// Neighbour (`neighbour` as the script's argument, with the fix in and out):
//   what the fix must leave alone: the three feeds with their content types
//   and items, "atom/extra", the gateway address alone and the unknown
//   plugin name.
//
// Reset first:  npm run fleet-prep -- --feature issues-u18a2 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u18a2 PROBE_AGENT=u18a2 node bin/probe.js all shared/playwright/checks/issues/unknown-feed-name-blank-page/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u18a2-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u18a2-3_5 PROBE_AGENT=u18a2 node bin/probe.js all shared/playwright/checks/issues/unknown-feed-name-blank-page/walk.js
// Neighbour:    PROBE_RUN=nb-out … walk.js neighbour   (nb-in with the fix applied)
// Facts: .reports/<feature>/u18a2/facts[-<run>]-<app>.json
const {forEachApp, launch, screen, shot, record, serverLog} = require('../../../probe');

const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NEIGHBOUR = process.argv.includes('neighbour');

/** Type one address as a visitor does; read the raw answer and the server log beside it. */
async function ask(page, app, name, path) {
    const out = {step: name, path};
    const log = serverLog(app);
    const from = log.mark();
    // A feed Chromium saves rather than shows (RSS 1.0) aborts the navigation: the raw read below still answers.
    const response = await page.goto(app.url(path), {waitUntil: 'load'}).catch((e) => ({error: e.message}));
    out.status = response && response.status ? response.status() : null;
    if (response && response.error) out.gotoError = flat(response.error, 160);
    else {
        out.landed = page.url().replace(app.baseURL, '');
        const s = await screen(page).catch(() => null);
        const body = await page.locator('body').innerText().catch(() => '');
        out.shown = s ? {title: s.title, text: flat(s.text.main || body, 200), bodyLength: body.length} : null;
    }
    const raw = await page.request.get(app.url(path));
    const text = await raw.text();
    out.rawStatus = raw.status();
    out.rawLanded = raw.url().replace(app.baseURL, '');
    out.contentType = raw.headers()['content-type'] || null;
    out.length = text.length;
    out.items = (text.match(/<entry>|<item[ >]/g) || []).length;
    out.root = (text.match(/<(feed|rss|rdf:RDF)[\s>]/) || [])[1] || null;
    out.head = flat(text, 160);
    out.log = log.since(from).map((l) => flat(l, 300)).slice(0, 6);
    return out;
}

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const gateway = `/index.php/${app.contextPath}/gateway`;
    const feed = `${gateway}/plugin/WebFeedGatewayPlugin`;
    const facts = {line: app.line, dataset: app.dataset, neighbour: NEIGHBOUR, results: []};
    const step = async (name, path) => {
        const r = await ask(page, app, name, path).catch((e) => ({step: name, path, failed: flat(e.message, 300)}));
        facts.results.push(r);
        return r;
    };
    try {
        if (NEIGHBOUR) {
            await step('n1 atom', `${feed}/atom`);
            await step('n2 rss2', `${feed}/rss2`);
            await step('n3 rss', `${feed}/rss`);
            await step('n4 atom/extra', `${feed}/atom/extra`);
            await step('n5 gateway alone', gateway);
            await step('n6 unknown plugin', `${gateway}/plugin/NoSuchPlugin/atom`);
        } else {
            await step('1 atom', `${feed}/atom`);
            await step('2 ATOM', `${feed}/ATOM`);
            await shot(page, 'feed-name-capitals').catch(() => {});
            await step('3 atom.xml', `${feed}/atom.xml`);
            await step('4 json', `${feed}/json`);
            await step('5 no feed name', feed);
            await step('6 unknown plugin', `${gateway}/plugin/NoSuchPlugin/atom`);
            await shot(page, 'unknown-plugin').catch(() => {});
        }
    } finally {
        record(NEIGHBOUR ? 'neighbour' : 'facts', facts);
        for (const r of facts.results) {
            console.log(
                `[fact] ${app.name} ${String(r.step).padEnd(18)} ${r.status}/${r.rawStatus} ${r.contentType || '-'} root ${r.root || '-'} items ${r.items}` +
                    ` raw ${r.length} bytes landed ${r.rawLanded} | title "${r.shown ? r.shown.title : ''}" shown "${flat(r.shown && r.shown.text, 80)}"` +
                    `${r.gotoError ? ` | goto: ${r.gotoError}` : ''}${r.failed ? ` | FAILED ${r.failed}` : ''}${r.log && r.log.length ? `\n        log: ${r.log.join('\n        log: ')}` : ''}`
            );
        }
        await close();
    }
});
