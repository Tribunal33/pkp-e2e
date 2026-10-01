// Issue report docs/issues/U19-A1-oai-own-address-loses-deleted-records.md (U19 A1) {OJS OMP}:
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"), as the dataset's `admin`. The kit builds nothing.
//
//   1. sign in as admin
//   2. Administration › Hosted Journals (Presses) › "Create Journal" ("Create Press"): path u19a1,
//      "Enable this journal to appear publicly on the site" ticked
//   3. publicknowledge › Tools › "Native XML Plugin", export tab: tick the published submission
//      (OJS 17, OMP 5, OPS 19), export, "Download Exported File"
//   4. u19a1 › Tools › "Native XML Plugin" › "Import": upload the file, "Import"
//   5. /index.php/u19a1/oai?verb=ListRecords&metadataPrefix=oai_dc: the copy's record
//   6. u19a1: the copy's workflow › "Unpublish", confirmed
//   7. the same list, GetRecord of the copy's identifier, the site-wide list, the site-wide list
//      with set=u19a1
//   8. publicknowledge: the submission's workflow › "Unpublish", confirmed
//   9. u19a1's list again, GetRecord of publicknowledge's identifier there, Identify
// OPS takes the same steps as the control (a preprint server is not affected).
// OMP, after step 9: the dataset's book 14 (series "psy") is copied and unpublished in u19a1 the same
// way, and the lists are read with the series' set and the press's set.
// Neighbour reads, for the fix (taken on every run): publicknowledge's own list, the site-wide
// list, u19a1's list with its own set and its section's set, an unknown set, a from/until window.
//
// Reset first:  npm run fleet-prep -- --feature issues-a1 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-a1 PROBE_AGENT=a1 node bin/probe.js all shared/playwright/checks/issues/oai-own-address-loses-deleted-records/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-a1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-a1-3_5 PROBE_AGENT=a1 node bin/probe.js all shared/playwright/checks/issues/oai-own-address-loses-deleted-records/walk.js
// Facts: .reports/<feature>/a1/facts[-<run>]-<app>.json
const fs = require('fs');
const {forEachApp, launch, signIn, screen, shot, record, outFile, idle} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const L = require('./lib');

const SUBS = {
    ojs: {id: 17, title: 'Antimicrobial, heavy metal resistance and plasmid profile of coliforms isolated from nosocomial infections in a hospital in Isfahan, Iran'},
    omp: {id: 5, title: 'Bomb Canada and Other Unkind Remarks in the American Media'},
    ops: {id: 19, title: 'Finocchiaro: Arguments About Arguments'},
};
// OMP only, after the steps: a book in a series (the dataset's 14, series "psy") copied and unpublished
// the same way, for the series' set (the fix's second closure).
const SERIES_BOOK = {id: 14, title: 'From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots'};
const SECOND = 'u19a1';
const LIST = 'verb=ListRecords&metadataPrefix=oai_dc';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const S = SUBS[app.name];
    const f = {app: app.name, line: app.line || 'main', second: SECOND, submission: S.id};
    const fact = (k, v) => {
        f[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1500)}`);
    };
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
        // 1-2
        await signIn(page, 'admin');
        fact('2 create', {status: await L.createPublicContext(page, app, {name: `Second ${L.WORDS[app.name].noun} ${SECOND}`, initials: 'U19A1', path: SECOND, email: `${SECOND}@mailinator.com`})});
        fact('before: publicknowledge list', await L.oai(app, 'publicknowledge', LIST));
        fact('before: second list', await L.oai(app, SECOND, LIST));
        fact('before: second Identify', await L.oai(app, SECOND, 'verb=Identify'));

        // 3-4
        await native.openNative(app, page);
        const out = await native.exportOne(app, page, S.title);
        const file = outFile(`sub${S.id}.xml`);
        fs.writeFileSync(file, out.xml);
        await native.openNative({...app, contextPath: SECOND}, page);
        const res = await native.importFile(page, file);
        const m = /"(\d+)" - "/.exec(res.panel || '');
        const copy = m ? Number(m[1]) : null;
        fact('4 import', {tabs: res.tabs, results: res.panel, copy, snap: (await native.snap(page, 'import-results')).name});
        if (!copy) throw new Error('the import named no copy');

        // 5
        const listed = await L.oai(app, SECOND, LIST);
        fact('5 second list, copy published', {...listed, ...(await view(page, 'second-list-published', SECOND, LIST))});
        const own = listed.headers.map((h) => h.split(' ')[0]);
        const sets = await L.oai(app, SECOND, 'verb=ListSets');
        fact('5 second ListSets', sets);

        // 6
        fact('6 unpublish the copy', await L.unpublish(page, app, SECOND, copy));

        // 7
        fact('7 second list', {...(await L.oai(app, SECOND, LIST)), ...(await view(page, 'second-list-after-unpublish', SECOND, LIST))});
        const siteWide = await L.oai(app, 'index', LIST);
        // OJS 3.5 lists no article that is in no issue, so step 5 named no identifier: take it from the
        // site-wide list's deleted record of the second journal.
        if (!own.length) own.push(...siteWide.headers.filter((h) => h.startsWith('DELETED ') && h.includes(`[${SECOND}`)).map((h) => h.split(' ')[1]));
        const gets = [];
        for (const id of own) gets.push(await L.oai(app, SECOND, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(id)}`));
        fact('7 second GetRecord of its own identifier', gets);
        if (own[0]) fact('7 GetRecord screen', await view(page, 'second-getrecord-own', SECOND, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(own[0])}`));
        fact('7 second ListIdentifiers', await L.oai(app, SECOND, 'verb=ListIdentifiers&metadataPrefix=oai_dc'));
        fact('7 site-wide list', siteWide);
        fact('7 site-wide list, set of the second', await L.oai(app, 'index', `${LIST}&set=${SECOND}`));
        fact('7 second list, its own set', await L.oai(app, SECOND, `${LIST}&set=${SECOND}`));
        for (const spec of (sets.sets || []).filter((s) => s.includes(':'))) fact(`7 second list, set ${spec}`, await L.oai(app, SECOND, `${LIST}&set=${encodeURIComponent(spec)}`));
        fact('7 second list, unknown set', await L.oai(app, SECOND, `${LIST}&set=nosuchset`));
        const today = new Date().toISOString().slice(0, 10);
        fact('7 second list, from today', await L.oai(app, SECOND, `${LIST}&from=${today}`));
        fact('7 second list, until 2020-01-01', await L.oai(app, SECOND, `${LIST}&until=2020-01-01`));
        fact('7 second Identify', await L.oai(app, SECOND, 'verb=Identify'));

        // 8
        const first = (f['before: publicknowledge list'].headers.find((h) => new RegExp(`/${S.id} `).test(h)) || '').split(' ')[0];
        fact('8 unpublish in publicknowledge', await L.unpublish(page, app, 'publicknowledge', S.id));

        // 9
        fact('9 second list', {...(await L.oai(app, SECOND, LIST)), ...(await view(page, 'second-list-after-first-unpublish', SECOND, LIST))});
        const firstDeleted = (await L.oai(app, 'publicknowledge', LIST)).headers.filter((h) => h.startsWith('DELETED ')).map((h) => h.split(' ')[1]);
        fact('9 publicknowledge deleted identifiers', {dataset: first, deleted: firstDeleted});
        if (firstDeleted[0]) fact('9 second GetRecord of publicknowledge\'s identifier', await L.oai(app, SECOND, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(firstDeleted[0])}`));
        fact('9 second Identify', {...(await L.oai(app, SECOND, 'verb=Identify')), ...(await view(page, 'second-identify', SECOND, 'verb=Identify'))});
        fact('9 second ListSets', await L.oai(app, SECOND, 'verb=ListSets'));
        // control and neighbours
        fact('control: publicknowledge list', await L.oai(app, 'publicknowledge', LIST));
        fact('control: publicknowledge list, its own set', await L.oai(app, 'publicknowledge', `${LIST}&set=publicknowledge`));
        fact('neighbour: site-wide list', await L.oai(app, 'index', LIST));
        fact('neighbour: site-wide list, set of the second', await L.oai(app, 'index', `${LIST}&set=${SECOND}`));
        fact('neighbour: site-wide list, set publicknowledge', await L.oai(app, 'index', `${LIST}&set=publicknowledge`));
        fact('neighbour: second list, its own set', await L.oai(app, SECOND, `${LIST}&set=${SECOND}`));

        if (app.name === 'omp') {
            await native.openNative(app, page);
            const out2 = await native.exportOne(app, page, SERIES_BOOK.title);
            const file2 = outFile(`sub${SERIES_BOOK.id}.xml`);
            fs.writeFileSync(file2, out2.xml);
            await native.openNative({...app, contextPath: SECOND}, page);
            const res2 = await native.importFile(page, file2);
            const copy2 = Number((/"(\d+)" - "/.exec(res2.panel || '') || [])[1]) || null;
            fact('series: import', {results: res2.panel, copy: copy2});
            const sets2 = (await L.oai(app, SECOND, 'verb=ListSets')).sets || [];
            fact('series: second list, copy published', await L.oai(app, SECOND, LIST));
            fact('series: unpublish the copy', await L.unpublish(page, app, SECOND, copy2));
            fact('series: second list', await L.oai(app, SECOND, LIST));
            for (const spec of sets2.filter((s) => s.includes(':'))) {
                fact(`series: second list, set ${spec}`, await L.oai(app, SECOND, `${LIST}&set=${encodeURIComponent(spec)}`));
                fact(`series: site-wide list, set ${spec}`, await L.oai(app, 'index', `${LIST}&set=${encodeURIComponent(spec)}`));
            }
            fact('series: second list, its own set', await L.oai(app, SECOND, `${LIST}&set=${SECOND}`));
            fact('series: site-wide list, set of the second', await L.oai(app, 'index', `${LIST}&set=${SECOND}`));
        }
    } catch (e) {
        f.error = String(e.stack || e.message).slice(0, 800);
        console.log(`[walk] ${app.name} ERROR ${f.error}`);
    } finally {
        record('facts', f);
        await close();
    }
});
