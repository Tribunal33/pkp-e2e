// Issue report docs/issues/U19-A18-oai-datestamp-stays-after-edit-republish.md (U19 A18):
// the report's Steps to reproduce, walked on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"), context `publicknowledge`, as `dbarnes`. The kit builds
// nothing; everything goes through the screens, and each OAI address is read as a
// harvester reads it (no session) and recorded as the browser shows it.
//   1. ListIdentifiers at the context, plain and with from=<today>
//   2. sign in as dbarnes, open the item, "Title & Abstract": "Prefix" typed, "Save"
//   3. both lists again
//   4. "Unpublish" ("Unpost"), confirmed
//   5. both lists again
//   6. "Publish" ("Post"), confirmed
//   7. both lists again
// OMP: submission 14 (publicationFormat/3); OPS: submission 2 (preprint/2).
// OJS (the control): submission 17 (article/17), steps 1 to 3 only.
// Neighbour, on every run: the other records of the list keep their datestamps from
// step 1 to step 7, and the list with until=<the day the dataset was built> is read at
// every step (compare with the fix in and out; on OPS that list fails without the fix,
// which is report U19-OPS1-preprint-server-oai-until-fails.md).
//
// Reset first:  npm run fleet-prep -- --feature issues-a18 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-a18 PROBE_AGENT=a18 node bin/probe.js omp,ops shared/playwright/checks/issues/oai-datestamp-stays-after-edit-republish/walk.js   (ojs for the control)
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-a18-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-a18-3_5 PROBE_AGENT=a18 node bin/probe.js omp,ops shared/playwright/checks/issues/oai-datestamp-stays-after-edit-republish/walk.js
// Facts: .reports/<feature>/a18/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, sql} = require('../../../probe');
const {savePrefix, sleep} = require('./lib');
const {unpublish, oai} = require('../oai-own-address-loses-deleted-records/lib');
const {openTitleAbstract} = require('../native-import-doubles-title-prefix/lib');
const {publishShownVersion} = require('../older-version-tab-current-title/lib');

const ITEMS = {
    omp: {id: 14, record: 'publicationFormat/3'},
    ops: {id: 2, record: 'preprint/2'},
    ojs: {id: 17, record: 'article/17', control: true},
};
const LIST = 'verb=ListIdentifiers&metadataPrefix=oai_dc';

forEachApp(async (app) => {
    const item = ITEMS[app.name];
    const ctx = app.contextPath;
    const {page, close} = await launch(app);
    const reader = await launch(app, {record: false}); // the signed-out view of each address
    const facts = {line: app.line, dataset: app.dataset, item, steps: []};
    const read = async (step) => {
        const all = await oai(app, ctx, LIST);
        const today = (all.responseDate || new Date().toISOString()).slice(0, 10);
        const since = await oai(app, ctx, `${LIST}&from=${today}`);
        const own = all.headers.find((h) => h.includes(`:${item.record} `)) || null;
        await reader.page.goto(app.url(`/index.php/${ctx}/oai?${LIST}&from=${today}`)).catch(() => {});
        record(`${step}-from-list`, await screen(reader.page).catch(() => null));
        await shot(reader.page, `${step}-from-list`).catch(() => {});
        const stored = sql(app, `select s.last_modified, p.last_modified from submissions s join publications p on p.publication_id = s.current_publication_id where s.submission_id = ${item.id}`);
        // Neighbour: the list up to the day the dataset was built (the record's first datestamp).
        facts.builtDay = facts.builtDay || (own && (own.match(/ (\d{4}-\d{2}-\d{2})T/) || [])[1]);
        const before = await oai(app, ctx, `${LIST}&until=${facts.builtDay}`);
        const untilList = before.error || (before.status >= 400 ? `HTTP ${before.status}` : `${before.headers.length} records, this one ${before.headers.some((h) => h.includes(`:${item.record} `)) ? 'in' : 'not in'}`);
        const data = {step, at: all.responseDate, own, others: all.headers.filter((h) => h !== own), from: today, fromList: since.error || since.headers, until: facts.builtDay, untilList, stored};
        facts.steps.push(data);
        console.log(`[fact] ${step.padEnd(22)} at ${data.at} own "${own}" from=${today}: ${JSON.stringify(data.fromList)} until=${facts.builtDay}: ${untilList} stored(submission|publication) ${stored}`);
        return data;
    };
    try {
        const first = await read('1 before');
        await signIn(page, 'dbarnes');
        await openTitleAbstract(app, page, item.id);
        await sleep(1500);
        const saved = await savePrefix(page, 'u19a18');
        record('2-prefix-saved', await screen(page));
        facts.steps.push({step: '2 prefix saved', ...saved});
        console.log(`[fact] 2 prefix saved         ${JSON.stringify(saved)}`);
        await read('3 after edit');
        if (!item.control) {
            await sleep(1500); // a later second than the edit
            const un = await unpublish(page, app, ctx, item.id);
            facts.steps.push({step: '4 unpublish', ...un});
            console.log(`[fact] 4 unpublish            ${JSON.stringify(un)}`);
            await read('5 after unpublish');
            await openTitleAbstract(app, page, item.id); // the publication pages carry "Publish" ("Post")
            await sleep(1500);
            const pub = await publishShownVersion(page);
            facts.steps.push({step: '6 publish', ...pub});
            console.log(`[fact] 6 publish              ${pub.publish} via "${pub.button}"`);
            const last = await read('7 after publish');
            facts.neighboursUnchanged = JSON.stringify(first.others) === JSON.stringify(last.others);
            console.log(`[fact] neighbours unchanged   ${facts.neighboursUnchanged} ${JSON.stringify(last.others)}`);
        }
        await signOut(page).catch(() => {});
    } finally {
        record('facts', facts);
        await reader.close();
        await close();
    }
});
