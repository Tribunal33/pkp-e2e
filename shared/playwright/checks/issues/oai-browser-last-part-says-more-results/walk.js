// Issue report docs/issues/U19-A4-oai-browser-last-part-says-more-results.md (U19 A4): the
// report's Steps to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"), context `publicknowledge`, signed out: the OAI-PMH address is public.
//
// Precondition the screens do not offer: `[oai] oai_max_records = 1` in config.inc.php, so the
// dataset's two records (17 on OPS) come in parts. The fleet's config is not edited: lib.js
// `startPagedServer()` serves the same checkout and database through a copy of it with that one
// value changed, on base port + 72, for the length of the walk. The walk changes nothing.
//   1. ListRecords in oai_dc: one record, "There are more results.", "Resume"
//   2. "Resume" until "cursor" is one less than "completeListSize": the last part
//   3. the foot of the last part
//   4. "Resume" on the last part
//   5. ListSets, "Resume" to the last part, its foot, "Resume" there
//   control: the fleet's own server (oai_max_records = 100): one part, no such block
// Neighbour (in the same walk, with the fix in and out): every part before the last keeps
//   "There are more results." and a "Resume" that answers the next part (steps 1, 2 and 5), and
//   the one-part list shows no block (the control).
//
// Reset first:  npm run fleet-prep -- --feature issues-a4 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-a4 PROBE_AGENT=a4 node bin/probe.js all shared/playwright/checks/issues/oai-browser-last-part-says-more-results/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-a4-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-a4-3_5 PROBE_AGENT=a4 node bin/probe.js all shared/playwright/checks/issues/oai-browser-last-part-says-more-results/walk.js
// Facts: .reports/<feature>/a4/paging-facts[-<run>]-<app>.json
const {forEachApp, launch, record, shot, outDir} = require('../../../probe');
const {startPagedServer, openView, pressLink} = require('./lib');

const brief = (v) =>
    `${v.status} records ${v.records.length} sets ${v.sets.length} token ${v.tokenXml === null ? 'none' : JSON.stringify(v.tokenValue)}` +
    ` | "There are more results." ${v.moreResults} | Resume ${v.resumeLinks}${v.resumeHref ? ` (${v.resumeHref})` : ''}` +
    `${v.noMoreResults ? ` | "There are no more results." ${v.noMoreResults}` : ''}${v.errorShown ? ` | error "${v.errorShown}"` : ''}`;

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const ctx = app.contextPath;
    const facts = {line: app.line, dataset: app.dataset, lists: {}};
    const say = (name, v) => console.log(`[fact] ${app.name} ${name.padEnd(28)} ${brief(v)}`);
    let server = null;
    try {
        server = await startPagedServer(app, outDir(), 1);
        facts.server = {origin: server.origin, configFile: server.configFile, oaiMaxRecords: 1};

        // Steps 1 to 4 (ListRecords), then step 5 (ListSets) the same way.
        for (const [key, params] of [['records', 'verb=ListRecords&metadataPrefix=oai_dc'], ['sets', 'verb=ListSets']]) {
            const parts = [];
            let v = await openView(page, `${server.origin}/index.php/${ctx}/oai?${params}`);
            parts.push(v);
            say(`${key} part 1`, v);
            await shot(page, `${key}-first-part`);
            // "Resume" while the answer carries a token to resume with (at most 40 parts).
            while (v.tokenValue && parts.length < 40) {
                v = await pressLink(page, 'Resume');
                parts.push(v);
                say(`${key} part ${parts.length}`, v);
            }
            await shot(page, `${key}-last-part`);
            const last = parts[parts.length - 1];
            let afterLast = null;
            if (last.resumeLinks) {
                afterLast = await pressLink(page, 'Resume');
                say(`${key} Resume on the last`, afterLast);
                await shot(page, `${key}-resume-on-last`);
            }
            facts.lists[key] = {parts, afterLast};
        }

        // Control: the fleet's own server, where the whole list is one answer.
        const whole = await openView(page, app.url(`/index.php/${ctx}/oai?verb=ListRecords&metadataPrefix=oai_dc`));
        say('control one part', whole);
        await shot(page, 'control-one-part');
        facts.control = whole;
    } finally {
        if (server) server.stop();
        record('paging-facts', facts);
        await close();
    }
});
