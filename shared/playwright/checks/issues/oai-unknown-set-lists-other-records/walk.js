// Issue report docs/issues/U19-OMP3-oai-unknown-set-lists-other-records.md (U19 OMP3) {OMP}:
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"). The kit builds nothing.
//
//   One press (no sign-in):
//   1. /index.php/publicknowledge/oai?verb=ListSets
//   2. …?verb=ListRecords&metadataPrefix=oai_dc
//   3. the same with &set=publicknowledge:nosuchseries
//   4. the same with &set=nosuchset
//   5. ListIdentifiers with &set=nosuchset
//   A second press:
//   6. sign in as admin; Administration › Hosted Presses › "Create Press": path u19omp3, public
//   7. publicknowledge › Tools › "Native XML Plugin", export tab: tick the published submission
//      (OMP 5, OJS 17, OPS 19), export, "Download Exported File"
//   8. u19omp3 › Tools › "Native XML Plugin" › "Import": upload the file, "Import"
//   9. /index.php/u19omp3/oai?verb=ListRecords&metadataPrefix=oai_dc
//  10. the same with &set=nosuchset, &set=publicknowledge, &set=<a series' set of publicknowledge>
//  11. /index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc&set=u19omp3
// OJS and OPS take the same steps as the control (a journal and a preprint server answer
// "No matching records in this repository").
// Neighbour reads, for the fix (taken on every run): each press's list without a set, with its own
// set and with each set its ListSets names; the site-wide list without a set and with each press's
// set; a from/until window; Identify.
//
// Reset first:  npm run fleet-prep -- --feature issues-omp3 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-omp3 PROBE_AGENT=omp3 node bin/probe.js all shared/playwright/checks/issues/oai-unknown-set-lists-other-records/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-omp3-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-omp3-3_5 PROBE_AGENT=omp3 node bin/probe.js all shared/playwright/checks/issues/oai-unknown-set-lists-other-records/walk.js
// Facts: .reports/<feature>/omp3/facts[-<run>]-<app>.json
const fs = require('fs');
const {forEachApp, launch, signIn, screen, shot, record, outFile, idle} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const L = require('../oai-own-address-loses-deleted-records/lib');

const SUBS = {
    ojs: {id: 17, title: 'Antimicrobial, heavy metal resistance and plasmid profile of coliforms isolated from nosocomial infections in a hospital in Isfahan, Iran'},
    omp: {id: 5, title: 'Bomb Canada and Other Unkind Remarks in the American Media'},
    ops: {id: 19, title: 'Finocchiaro: Arguments About Arguments'},
};
const FIRST = 'publicknowledge';
const SECOND = 'u19omp3';
const LIST = 'verb=ListRecords&metadataPrefix=oai_dc';
const IDS = 'verb=ListIdentifiers&metadataPrefix=oai_dc';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const S = SUBS[app.name];
    const f = {app: app.name, line: app.line || 'main', second: SECOND, submission: S.id};
    const fact = (k, v) => {
        f[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1500)}`);
    };
    const read = async (k, ctx, params) => fact(k, await L.oai(app, ctx, params));
    let n = 0;
    const view = async (page, name, ctx, params) => {
        const label = `${String(++n).padStart(2, '0')}-${name}`;
        const r = await page.goto(app.url(`/index.php/${ctx}/oai?${params}`));
        await idle(page).catch(() => {});
        record(label, await screen(page));
        await shot(page, label).catch(() => {});
        return {snap: label, status: r ? r.status() : null};
    };
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    try {
        // 1-5: one press, no session
        const sets = await L.oai(app, FIRST, 'verb=ListSets');
        fact('1 ListSets', sets);
        fact('2 list', {...(await L.oai(app, FIRST, LIST)), ...(await view(page, 'first-list', FIRST, LIST))});
        fact('3 list, set publicknowledge:nosuchseries', {...(await L.oai(app, FIRST, `${LIST}&set=${FIRST}:nosuchseries`)), ...(await view(page, 'first-unknown-series', FIRST, `${LIST}&set=${FIRST}:nosuchseries`))});
        fact('4 list, set nosuchset', {...(await L.oai(app, FIRST, `${LIST}&set=nosuchset`)), ...(await view(page, 'first-unknown-set', FIRST, `${LIST}&set=nosuchset`))});
        await read('5 ListIdentifiers, set nosuchset', FIRST, `${IDS}&set=nosuchset`);
        await read('5 ListIdentifiers, set publicknowledge:nosuchseries', FIRST, `${IDS}&set=${FIRST}:nosuchseries`);
        // neighbours on the one press
        await read('neighbour: first list, its own set', FIRST, `${LIST}&set=${FIRST}`);
        const subsets = (sets.sets || []).filter((s) => s.includes(':'));
        for (const spec of subsets) await read(`neighbour: first list, set ${spec}`, FIRST, `${LIST}&set=${encodeURIComponent(spec)}`);
        await read('neighbour: first ListIdentifiers, its own set', FIRST, `${IDS}&set=${FIRST}`);
        await read('neighbour: first list, until 2000-01-01', FIRST, `${LIST}&until=2000-01-01`);
        await read('neighbour: first list, its own set, from 2000-01-01', FIRST, `${LIST}&set=${FIRST}&from=2000-01-01`);
        await read('neighbour: first Identify', FIRST, 'verb=Identify');
        await read('neighbour: site-wide list', 'index', LIST);
        await read('site-wide list, set nosuchset', 'index', `${LIST}&set=nosuchset`);
        await read('site-wide list, set publicknowledge:nosuchseries', 'index', `${LIST}&set=${FIRST}:nosuchseries`);
        await read('first list, set a:b:c', FIRST, `${LIST}&set=a:b:c`);

        // 6
        await signIn(page, 'admin');
        fact('6 create', {status: await L.createPublicContext(page, app, {name: `Second ${L.WORDS[app.name].noun} ${SECOND}`, initials: 'U19OMP3', path: SECOND, email: `${SECOND}@mailinator.com`})});

        // 7-8
        await native.openNative(app, page);
        const out = await native.exportOne(app, page, S.title);
        const file = outFile(`sub${S.id}.xml`);
        fs.writeFileSync(file, out.xml);
        await native.openNative({...app, contextPath: SECOND}, page);
        const res = await native.importFile(page, file);
        const copy = Number((/"(\d+)" - "/.exec(res.panel || '') || [])[1]) || null;
        fact('8 import', {results: res.panel, copy});
        if (!copy) throw new Error('the import named no copy');

        // 9
        fact('9 second list', {...(await L.oai(app, SECOND, LIST)), ...(await view(page, 'second-list', SECOND, LIST))});
        // OJS 3.5 lists no article that is in no issue: the site-wide list tells what the second holds.
        await read('9 second ListSets', SECOND, 'verb=ListSets');

        // 10
        fact('10 second list, set nosuchset', {...(await L.oai(app, SECOND, `${LIST}&set=nosuchset`)), ...(await view(page, 'second-unknown-set', SECOND, `${LIST}&set=nosuchset`))});
        fact('10 second list, set publicknowledge', {...(await L.oai(app, SECOND, `${LIST}&set=${FIRST}`)), ...(await view(page, 'second-other-press-set', SECOND, `${LIST}&set=${FIRST}`))});
        if (subsets[0]) await read(`10 second list, set ${subsets[subsets.length - 1]}`, SECOND, `${LIST}&set=${encodeURIComponent(subsets[subsets.length - 1])}`);
        await read('10 second list, set u19omp3:nosuchseries', SECOND, `${LIST}&set=${SECOND}:nosuchseries`);

        // 11
        fact('11 first list, set u19omp3', {...(await L.oai(app, FIRST, `${LIST}&set=${SECOND}`)), ...(await view(page, 'first-other-press-set', FIRST, `${LIST}&set=${SECOND}`))});
        await read('11 first list, set nosuchset', FIRST, `${LIST}&set=nosuchset`);

        // controls and neighbours with two presses
        await read('neighbour: second list, its own set', SECOND, `${LIST}&set=${SECOND}`);
        await read('neighbour: first list', FIRST, LIST);
        await read('neighbour: first list, its own set (two presses)', FIRST, `${LIST}&set=${FIRST}`);
        await read('neighbour: site-wide list (two presses)', 'index', LIST);
        await read('control: site-wide list, set u19omp3', 'index', `${LIST}&set=${SECOND}`);
        await read('control: site-wide list, set publicknowledge', 'index', `${LIST}&set=${FIRST}`);
        if (subsets[0]) await read(`control: site-wide list, set ${subsets[subsets.length - 1]}`, 'index', `${LIST}&set=${encodeURIComponent(subsets[subsets.length - 1])}`);
        await read('site-wide list, set nosuchset (two presses)', 'index', `${LIST}&set=nosuchset`);
        await read('site-wide list, set u19omp3:nosuchseries', 'index', `${LIST}&set=${SECOND}:nosuchseries`);
        await read('neighbour: second Identify', SECOND, 'verb=Identify');
    } catch (e) {
        f.error = String(e.stack || e.message).slice(0, 800);
        console.log(`[walk] ${app.name} ERROR ${f.error}`);
    } finally {
        record('facts', f);
        await close();
    }
});
