// Issue report docs/issues/U19-OPS4-removed-preprint-server-no-deleted-records.md (U19 OPS4) {OPS}:
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"), as the dataset's `admin`. The kit builds nothing.
// OJS and OMP take the same steps as the control (a removed journal or press leaves deleted records).
//
//   1. sign in as admin
//   2. Administration › Hosted Servers (Journals, Presses) › "Create Server": path u19ops4,
//      "Enable this server to appear publicly on the site" ticked
//   3. publicknowledge › Tools › "Native XML Plugin", export tab: tick the published submission
//      (OPS 19, OJS 17, OMP 5), export, "Download Exported File"
//   4. u19ops4 › Tools › "Native XML Plugin" › "Import": upload the file, "Import"
//   5. the site-wide /index.php/index/oai?verb=ListIdentifiers&metadataPrefix=oai_dc and GetRecord
//      of the copy's identifier: live
//   6. Administration › Hosted Servers › the arrow beside the second server › "Remove" › "OK"
//   7. the same GetRecord
//   8. the same ListIdentifiers, and Identify ("Deleted Record Policy")
// Neighbour reads, for the fix (taken on every run): a submission that was never published
// (OPS 1, OJS 2, OMP 3) is copied into u19ops4 the same way before step 5, and after the removal
// its identifier must still answer "No matching identifier"; publicknowledge's own list must be
// the same before and after; the removal answers 200 and the row is gone.
//
// Way round:   the same command with `disable` after the script's path: before step 6, Hosted Servers ›
//               "Edit" on the second server, the "appear publicly" box unticked, "Save".
// Reset first:  npm run fleet-prep -- --feature issues-ops4 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-ops4 PROBE_AGENT=ops4 node bin/probe.js all shared/playwright/checks/issues/removed-preprint-server-no-deleted-records/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ops4-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ops4-3_5 PROBE_AGENT=ops4 node bin/probe.js all shared/playwright/checks/issues/removed-preprint-server-no-deleted-records/walk.js
// Facts: .reports/<feature>/ops4/facts[-<run>]-<app>.json
const fs = require('fs');
const {forEachApp, launch, signIn, screen, shot, record, outFile, idle, sql} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const A1 = require('../oai-own-address-loses-deleted-records/lib');

const SUBS = {
    ojs: {id: 17, title: 'Antimicrobial, heavy metal resistance and plasmid profile of coliforms isolated from nosocomial infections in a hospital in Isfahan, Iran'},
    omp: {id: 5, title: 'Bomb Canada and Other Unkind Remarks in the American Media'},
    ops: {id: 19, title: 'Finocchiaro: Arguments About Arguments'},
};
// The neighbour: a submission the dataset holds unpublished.
const DRAFTS = {
    ojs: {id: 2, title: 'The influence of lactation on the quantity and quality of cashmere production'},
    omp: {id: 3, title: 'The Political Economy of Workplace Injury in Canada'},
    ops: {id: 1, title: 'The influence of lactation on the quantity and quality of cashmere production'},
};
const KIND = {ojs: 'article', omp: 'publicationFormat', ops: 'preprint'};
const SECOND = 'u19ops4';
const IDS = 'verb=ListIdentifiers&metadataPrefix=oai_dc';
// `disable` as the script's argument walks the way round: the second server is made not public before step 6.
const MODE = process.argv.slice(2).find((x) => x === 'disable') || null;
const get = (id) => `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(id)}`;

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const S = SUBS[app.name];
    const D = DRAFTS[app.name];
    const W = A1.WORDS[app.name];
    const name = `Second ${W.noun} ${SECOND}`;
    const f = {app: app.name, line: app.line || 'main', second: SECOND, submission: S.id};
    const fact = (k, v) => {
        f[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${A1.flat(JSON.stringify(v), 1500)}`);
    };
    let n = 0;
    const view = async (page, label0, ctx, params) => {
        const label = `${String(++n).padStart(2, '0')}-${label0}`;
        const r = await page.goto(app.url(`/index.php/${ctx}/oai?${params}`));
        await idle(page).catch(() => {});
        const s = await screen(page);
        record(label, s);
        await shot(page, label).catch(() => {});
        return {snap: label, status: r ? r.status() : null, text: A1.flat((s.text && (s.text.main || s.text.body)) || '', 400)};
    };
    const tombstones = () => sql(app, 'SELECT tombstone_id, data_object_id, set_spec, oai_identifier FROM data_object_tombstones ORDER BY tombstone_id');
    const {page, close} = await launch(app);
    page.setDefaultTimeout(A1.T);
    try {
        // 1-2
        await signIn(page, 'admin');
        fact('2 create', {status: await A1.createPublicContext(page, app, {name, initials: 'U19OPS4', path: SECOND, email: `${SECOND}@mailinator.com`})});
        const firstBefore = await A1.oai(app, 'publicknowledge', IDS);
        fact('before: publicknowledge list', firstBefore);

        // 3-4
        await native.openNative(app, page);
        const out = await native.exportOne(app, page, S.title);
        const file = outFile(`sub${S.id}.xml`);
        fs.writeFileSync(file, out.xml);
        await native.openNative({...app, contextPath: SECOND}, page);
        const res = await native.importFile(page, file);
        const copy = Number((/"(\d+)" - "/.exec(res.panel || '') || [])[1]) || null;
        fact('4 import', {tabs: res.tabs, results: res.panel, copy});
        if (!copy) throw new Error('the import named no copy');

        // neighbour: an unpublished submission copied the same way
        let draftCopy = null;
        try {
            await native.openNative(app, page);
            const out2 = await native.exportOne(app, page, D.title);
            const file2 = outFile(`sub${D.id}.xml`);
            fs.writeFileSync(file2, out2.xml);
            await native.openNative({...app, contextPath: SECOND}, page);
            const res2 = await native.importFile(page, file2);
            draftCopy = Number((/"(\d+)" - "/.exec(res2.panel || '') || [])[1]) || null;
            fact('neighbour: import of the unpublished submission', {results: res2.panel, copy: draftCopy});
        } catch (e) {
            fact('neighbour: import of the unpublished submission', {error: String(e.message).slice(0, 300)});
        }

        // 5
        const before = await A1.oai(app, 'index', IDS);
        fact('5 site-wide list', {...before, ...(await view(page, 'site-list-before', 'index', IDS))});
        const own = before.headers.filter((h) => h.includes(`[${SECOND}`)).map((h) => h.split(' ').filter((p) => p !== 'DELETED')[0]);
        fact('5 identifiers of the second', own);
        const gets5 = [];
        for (const id of own) gets5.push(await A1.oai(app, 'index', get(id)));
        fact('5 site-wide GetRecord', gets5);
        if (own[0]) fact('5 GetRecord screen', await view(page, 'getrecord-before', 'index', get(own[0])));
        fact('5 tombstone rows', tombstones());

        // 6
        const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
        const hosted = new HostedJournalsPage(page, W);
        if (MODE === 'disable') {
            // The way round: Hosted Servers › "Edit" › untick "Enable this preprint server to appear
            // publicly on the site" › "Save", before the removal.
            await page.goto(app.url('/index.php/index/en/admin/contexts'));
            await hosted.expectOpen();
            const win = await hosted.openEdit(SECOND);
            await win.setBox(win.enableBox, false);
            const saved = await win.pressSave();
            await idle(page).catch(() => {});
            record('05-after-disable', await screen(page));
            const gets = [];
            for (const id of own) gets.push(await A1.oai(app, 'index', get(id)));
            fact('way round: disable', {status: saved.status(), getRecord: gets, tombstones: tombstones()});
        }
        await page.goto(app.url('/index.php/index/en/admin/contexts'));
        await hosted.expectOpen();
        const dialog = await hosted.openRemove(SECOND);
        const question = A1.flat(await dialog.root.innerText(), 300);
        record('06-remove-question', await screen(page));
        const r = await hosted.confirmRemove(dialog);
        await idle(page).catch(() => {});
        record('06-after-remove', await screen(page));
        await shot(page, '06-after-remove').catch(() => {});
        fact('6 remove', {question, status: r.status(), rowsLeft: await hosted.paths()});

        // 7. OJS 3.5 lists no article that is in no issue, so step 5 named no identifier there:
        // take it from the site-wide list's deleted records of the second journal.
        const after = await A1.oai(app, 'index', IDS);
        if (!own.length) own.push(...after.headers.filter((h) => h.startsWith('DELETED ') && h.includes(`[${SECOND}`)).map((h) => h.split(' ')[1]));
        const gets7 = [];
        for (const id of own) gets7.push(await A1.oai(app, 'index', get(id)));
        fact('7 site-wide GetRecord', gets7);
        if (own[0]) fact('7 GetRecord screen', await view(page, 'getrecord-after', 'index', get(own[0])));

        // 8
        fact('8 site-wide list', {...after, ...(await view(page, 'site-list-after', 'index', IDS))});
        fact('8 site-wide list, set of the second', await A1.oai(app, 'index', `${IDS}&set=${SECOND}`));
        const identify = await readIdentify(app);
        fact('8 Identify', {...identify, ...(await view(page, 'identify', 'index', 'verb=Identify'))});
        fact('8 site-wide ListSets', await A1.oai(app, 'index', 'verb=ListSets'));
        fact('8 tombstone rows', tombstones());
        fact('8 the removed address', await A1.oai(app, SECOND, IDS));

        // neighbours
        if (draftCopy) {
            const repo = (own[0] || firstBefore.headers[0] || '').split(':')[1];
            // OMP's identifier is a publication format's, which the import result does not name:
            // the unpublished book's formats are read from the list instead (none may be listed).
            const draftId = `oai:${repo}:${KIND[app.name]}/${draftCopy}`;
            fact('neighbour: GetRecord of the unpublished copy', app.name === 'omp' ? {skipped: 'a press\'s identifier names a publication format; see the tombstone rows and the list'} : await A1.oai(app, 'index', get(draftId)));
        }
        const firstAfter = await A1.oai(app, 'publicknowledge', IDS);
        fact('neighbour: publicknowledge list', firstAfter);
        fact('neighbour: publicknowledge list unchanged', JSON.stringify(firstAfter.headers) === JSON.stringify(firstBefore.headers));
        fact('neighbour: deleted records site-wide', after.headers.filter((h) => h.startsWith('DELETED ')));
        fact('neighbour: genres rows by context', sql(app, 'SELECT context_id, count(*) FROM genres GROUP BY context_id ORDER BY context_id'));
        fact('neighbour: contexts', sql(app, `SELECT ${app.contextTables.id}, path FROM ${app.contextTables.table} ORDER BY 1`));
    } catch (e) {
        f.error = String(e.stack || e.message).slice(0, 800);
        console.log(`[walk] ${app.name} ERROR ${f.error}`);
    } finally {
        record('facts', f);
        await close();
    }
});

/** Identify's "Deleted Record Policy" as the harvester reads it. */
async function readIdentify(app) {
    const {readOai} = require('../../../pages/OaiPages.js');
    const a = await readOai(app.baseURL, 'index', 'verb=Identify');
    return {status: a.status, deletedRecord: a.identify ? a.identify.deletedRecord : null};
}
