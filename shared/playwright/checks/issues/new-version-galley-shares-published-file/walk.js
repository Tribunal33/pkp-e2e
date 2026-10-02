// Issue report docs/issues/U46-A4-OJS1-new-version-galley-shares-published-file.md (spec U46, A4 and OJS1).
// Walks the report's Steps on PKP's default dataset as `dbarnes`, OJS and OPS (a press has no "Galleys" page).
// Report step → record key:
//   1   a reader (fresh browser) opens the work's page, "PDF", "Download"            → 1-reader-before
//   2-3 sign in; open OJS submission 17 / OPS submission 2 (published, one version, one galley "PDF")
//   4   "Create New Version" ("Minor Revision"; 3.5: the header's button, "Yes")      → 3-new-version
//   5-6 the new version's "Galleys": "PDF" › "Change File", replacement.pdf, …        → 4-5-change-file-on-copy
//   7   the reader again                                                              → 6-reader-after-change
//   8   version 1.0's "Galleys": the "PDF" label pressed                              → 6b-published-row
//   9   that row's "Delete" › "OK"                                                    → 7-8-delete-published
//   10  the new version's "Galleys": "PDF" pressed                                    → 9-copy-after-delete
// WALK=neighbour runs alone on a fresh reset (fix in and out), OJS and OPS:
//   n1  "Create New Version"; n2 version 1.0's "PDF" › "Change File" (a deliberate change of the published
//   file must still reach readers); n3 the new version's copy pressed; n4 the copy deleted (the published
//   galley keeps its file); n5 the dataset's own earlier pair (OJS submission 1, OPS submission 3, whose
//   versions were made before any fix): version 1.0's "PDF" deleted, the later version's "PDF" pressed
//   and, on OPS, the reader's page of the current version read.
//
// Reset first:  npm run fleet-prep -- --feature issues-w1 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-w1 PROBE_AGENT=w1 node bin/probe.js all shared/playwright/checks/issues/new-version-galley-shares-published-file/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w1-3_5 PROBE_AGENT=w1 node bin/probe.js all shared/playwright/checks/issues/new-version-galley-shares-published-file/walk.js
// Facts: .reports/<feature>/w1/{walk,nb}-facts[-<run>]-<app>.json
const path = require('path');
const {forEachApp, launch, signIn, screen, record, serverLog} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.WALK || 'walk';
const REPO = path.resolve(__dirname, '../../../../..');
const ITEMS = {
    ojs: {sid: 17, pair: 1},
    ops: {sid: 2, pair: 3},
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const it = ITEMS[app.name];
    if (!it) {
        console.log(`[${app.name}] no "Galleys" page on this app`);
        return;
    }
    const factsName = MODE === 'neighbour' ? 'nb-facts' : 'walk-facts';
    const fact = (k, v) => {
        record(factsName, {[k]: v}, {merge: true});
        console.log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 900));
    };
    const REPL = path.join(REPO, `apps/${app.name}/playwright/fixtures/files/replacement.pdf`);
    fact('replacementSha', L.sha(REPL));
    const log = serverLog(app);
    const step = async (k, fn) => {
        try {
            fact(k, await fn());
        } catch (e) {
            fact(k, {error: L.flat(e.message, 600)});
        }
    };

    const {page} = await launch(app);
    await signIn(page, 'dbarnes');
    const sid = it.sid;
    fact('stored-before', L.stored(app, sid));

    if (MODE === 'walk') {
        await step('1-reader-before', () => L.readerDownload(app, sid));
        await step('3-new-version', () => L.newVersion(page, app, sid));
        fact('stored-after-version', L.stored(app, sid));
        await step('4-5-change-file-on-copy', async () => {
            const {gm, version} = await L.openGalleys(page, app, sid, 'latest');
            const before = await L.readRow(page, gm, 'PDF');
            await L.changeFile(page, gm, 'PDF', REPL, 'replacement.pdf');
            const copy = await L.pressLabel(page, gm, 'PDF');
            record('5-after-change', await screen(page));
            return {version, before, copy};
        });
        fact('stored-after-change', L.stored(app, sid));
        await step('6-reader-after-change', () => L.readerDownload(app, sid));
        await step('6b-published-row', async () => {
            const {gm, version} = await L.openGalleys(page, app, sid, 'first');
            return {version, row: await L.readRow(page, gm, 'PDF'), press: await L.pressLabel(page, gm, 'PDF')};
        });
        await step('7-8-delete-published', async () => {
            const {gm, frame, version} = await L.openGalleys(page, app, sid, 'first');
            const from = log.mark();
            const out = await L.deleteRow(page, gm, frame, 'PDF');
            out.version = version;
            out.serverLog = log.since(from).slice(0, 8).map((l) => L.flat(l, 400));
            record('8-after-delete', await screen(page));
            return out;
        });
        fact('stored-after-delete', L.stored(app, sid));
        await step('8b-reader-after-delete', () => L.readerDownload(app, sid));
        await step('9-copy-after-delete', async () => {
            const {gm, version} = await L.openGalleys(page, app, sid, 'latest');
            const row = await L.readRow(page, gm, 'PDF');
            const from = log.mark();
            const press = await L.pressLabel(page, gm, 'PDF');
            press.serverLog = log.since(from).slice(0, 6).map((l) => L.flat(l, 400));
            record('9-copy', await screen(page));
            return {version, row, press};
        });
    } else {
        await step('n1-new-version', () => L.newVersion(page, app, sid));
        await step('n2-change-file-on-published', async () => {
            const {gm, version} = await L.openGalleys(page, app, sid, 'first');
            await L.changeFile(page, gm, 'PDF', REPL, 'replacement.pdf');
            return {version, press: await L.pressLabel(page, gm, 'PDF')};
        });
        await step('n2-reader', () => L.readerDownload(app, sid));
        await step('n3-n4-copy', async () => {
            const {gm, frame, version} = await L.openGalleys(page, app, sid, 'latest');
            const press = await L.pressLabel(page, gm, 'PDF');
            const del = await L.deleteRow(page, gm, frame, 'PDF');
            return {version, press, del};
        });
        await step('n4-reader', () => L.readerDownload(app, sid));
        fact('stored-after-nb', L.stored(app, sid));
        const pair = it.pair;
        fact('pair-stored-before', L.stored(app, pair));
        await step('n5-pair-delete-first', async () => {
            const {gm, frame, version} = await L.openGalleys(page, app, pair, 'first');
            const from = log.mark();
            const out = await L.deleteRow(page, gm, frame, 'PDF');
            out.version = version;
            out.serverLog = log.since(from).slice(0, 6).map((l) => L.flat(l, 400));
            return out;
        });
        await step('n5-pair-latest', async () => {
            const {gm, version} = await L.openGalleys(page, app, pair, 'latest');
            const labels = await gm.labels();
            const label = labels[0];
            return {version, labels, row: label ? await L.readRow(page, gm, label) : null, press: label ? await L.pressLabel(page, gm, label) : null};
        });
        if (app.name === 'ops') await step('n5-pair-reader', () => L.readerDownload(app, pair));
        fact('pair-stored-after', L.stored(app, pair));
    }
});
