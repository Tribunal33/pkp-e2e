// Issue report docs/issues/U09-A18-picture-over-request-limit-server-error.md, the part U47 A4 and
// U36 A21 add: a file over PHP's request limit (post_max_size) on "Upload Media File", and a file of
// exactly the upload limit in the submission wizard's "Upload Files" panel when post_max_size equals
// upload_max_filesize (MODE=exact and MODE=nbexact also serve docs/issues/U36-A21-exact-limit-file-passes-size-check-then-refused.md). Walked through the screens on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"), context `publicknowledge`. The kit builds nothing; the files are
// made on disk.
//
// Media part (OJS, OMP, OPS; main only, 3.5 has no "Media" page), on the fleet's own server, whose
// PHP runs php.ini-production's limits (2M per file, 8M per request, display_errors Off):
//   1. sign in as dbarnes
//   2–3. submission 5 (OMP 4, OPS 1), side menu › the version › "Media"
//   4. "Add Media File"
//   5–6. "Click to upload files": u47r3-figure-9mb.png; the card
// Files part (OJS, OMP), on a second `php -S` of the same install with upload_max_filesize and
// post_max_size both 8M, display_errors Off (base port + 77):
//   1–2. sign in as zzedd, "Make a Submission" "u47r3 exact limit", "Begin Submission" (3.5: "Continue" from "Details")
//   3–4. "Upload Files" › "Add File": u47r3-manuscript-8mib.pdf (8388608 bytes); the row
// Register view (both parts, OJS OMP OPS as each has them): the same two uploads on a server with
// display_errors On (php.ini-development; base port + 78), which is how the register saw them.
//
// MODE=nb runs the neighbour alone (with the fix in and out): on the media window a 1 MB PNG is
// stored and a 3 MB PNG (over the per-file limit only) keeps "Files larger than 2MB can not be
// uploaded."; in the panel a 9 MiB file is refused in the browser and a 1 MiB file is stored.
//
// Reset first:  npm run fleet-prep -- --feature issues-u47r3 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u47r3 PROBE_AGENT=u47r3 node bin/probe.js all shared/playwright/checks/issues/file-over-request-limit-server-error/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u47r3-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u47r3-3_5 PROBE_AGENT=u47r3 node bin/probe.js ojs,omp shared/playwright/checks/issues/file-over-request-limit-server-error/walk.js
// Facts: .reports/<feature>/u47r3/reqlimit-facts[-<run>]-<app>.json
const {forEachApp, launch, screen, shot, record, outDir, serverLog} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const MEDIA_SUBMISSION = {ojs: 5, omp: 4, ops: 1};
const LOGRE = /PHP (Fatal|Warning)|ERROR|Exception|too large|Content-Length/i;

forEachApp(async (app) => {
    const fact = (k, v) => { record('reqlimit-facts', {[k]: v}, {merge: true}); console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 700)); };
    const step = async (k, fn) => {
        try { return await fn(); } catch (e) {
            fact(`${k}-FAILED`, String(e.stack || e).split('\n').slice(0, 5).join(' | '));
            return null;
        }
    };
    const files = L.makeFiles(outDir());
    const hasMedia = app.line === 'main' || !app.line;
    const hasPanel = app.name !== 'ops';
    const log = serverLog(app);
    fact(`${MODE}-files`, Object.fromEntries(Object.entries(files).map(([k, f]) => [k, `${f.name} ${f.bytes}`])));

    // ---- media part, on the fleet's own server (php.ini-production limits) --------------------
    const mediaPart = async (origin, keyPrefix, list, logOf) => {
        const {page} = await launch(app);
        const {signIn} = require('../../../probe');
        await signIn(page, 'dbarnes', {origin});                                                    // 1
        const out = {};
        for (const k of list) {
            const win = await L.openMediaUpload(page, app, MEDIA_SUBMISSION[app.name], origin);     // 2–4
            const from = logOf.mark();
            const r = await L.mediaUpload(page, win, files[k]);                                      // 5–6
            record(`${keyPrefix}-${k}`, await screen(page));
            await shot(page, `${keyPrefix}-${k}`);
            out[k] = {...r, serverLog: logOf.since(from).slice(0, 6)};
            fact(`${keyPrefix}-${k}`, out[k]);
        }
        await page.close();
        return out;
    };
    const logOfServer = (srv) => ({mark: () => srv.logSize(), since: (from) => srv.logSince(from, LOGRE)});
    const fleetLog = {mark: () => log.mark(), since: (from) => [].concat(log.since(from) || []).map((l) => L.flat(typeof l === 'string' ? l : JSON.stringify(l), 400))};

    // ---- files part, on a second server with both limits at 8M ----------------------------------
    const panelPart = async (srv, keyPrefix, list) => {
        const {page} = await launch(app);
        const id = await L.startSubmission(page, app, srv.origin, 'zzedd', `u47r3 exact limit ${keyPrefix}`);   // 1–2
        fact(`${keyPrefix}-submission`, id);
        for (const k of list) {
            const from = srv.logSize();
            const r = await L.panelUpload(page, files[k]);                                           // 3–4
            record(`${keyPrefix}-${k}`, await screen(page));
            await shot(page, `${keyPrefix}-${k}`);
            fact(`${keyPrefix}-${k}`, {...r, serverLog: srv.logSince(from, LOGRE).slice(0, 6)});
            const cleared = await L.clearRow(page, files[k].name);
            if (cleared) fact(`${keyPrefix}-${k}-cleared`, cleared);
        }
        await page.close();
    };

    if (MODE === 'walk') {
        if (hasMedia) await step('media', () => mediaPart(app.baseURL, 'media', ['png9'], fleetLog));
        if (hasPanel) {
            const srv = await L.startServer(app, outDir(), {portOffset: 77, ini: ['upload_max_filesize=8M', 'post_max_size=8M', 'display_errors=Off']});
            try {
                fact('panel-server', {origin: srv.origin, limits: 'upload_max_filesize 8M, post_max_size 8M, display_errors Off'});
                await step('panel', () => panelPart(srv, 'panel', ['exact8']));
            } finally { srv.stop(); }
        }
        // The register's view: display_errors On (php.ini-development), output_buffering 4096.
        const on = await L.startServer(app, outDir(), {portOffset: 78, ini: ['upload_max_filesize=8M', 'post_max_size=8M', 'display_errors=On', 'output_buffering=4096']});
        try {
            fact('devini-server', {origin: on.origin, limits: 'upload_max_filesize 8M, post_max_size 8M, display_errors On'});
            if (hasMedia) await step('devini-media', () => mediaPart(on.origin, 'devini-media', ['png9'], logOfServer(on)));
            if (hasPanel) await step('devini-panel', () => panelPart(on, 'devini-panel', ['exact8']));
        } finally { on.stop(); }
    } else if (MODE === 'exact' || MODE === 'nbexact') {
        // docs/issues/U36-A21-exact-limit-file-passes-size-check-then-refused.md. MODE=exact: with both
        // limits at 8M, a file of exactly 8 MiB in the wizard's files list (OJS, OMP; as zzedd) and in
        // Settings › Website › "Appearance" › "Setup" › "Logo" (all three apps; as rvaca). PARTS=panel or
        // PARTS=logo narrows. MODE=nbexact, the neighbour: on php.ini-production's limits the list
        // still refuses a 3 MB file in the browser against 2 MiB and stores a 1 MiB file, and the media
        // window still answers a 3 MB file with "Files larger than 2MB can not be uploaded."; with both
        // limits at 8M a 1 MiB file is still stored in the list and a 1 MiB logo still uploads; with
        // upload_max_filesize 2M and post_max_size 1M (a request limit under 1 MiB + the margin) the
        // list's check stays on: 1.5 MiB refused or sent, 0.5 MiB stored.
        const PARTS = (process.env.PARTS || 'panel,logo').split(',');
        const exactSrv = () => L.startServer(app, outDir(), {portOffset: 77, ini: ['upload_max_filesize=8M', 'post_max_size=8M', 'display_errors=Off']});
        const logoPart = async (srv, keyPrefix, list) => {
            const {page} = await launch(app);
            const {signIn} = require('../../../probe');
            await signIn(page, 'rvaca', {origin: srv.origin});
            for (const k of list) {
                const from = srv.logSize();
                const r = await L.logoUpload(page, app, srv.origin, files[k]);
                record(`${keyPrefix}-${k}`, await screen(page));
                await shot(page, `${keyPrefix}-${k}`);
                fact(`${keyPrefix}-${k}`, {...r, serverLog: srv.logSince(from, LOGRE).slice(0, 6)});
            }
            await page.close();
        };
        if (MODE === 'exact') {
            const srv = await exactSrv();
            try {
                if (hasPanel && PARTS.includes('panel')) await step('exact-panel', () => panelPart(srv, 'exact-panel', ['exact8']));
                if (PARTS.includes('logo')) await step('exact-logo', () => logoPart(srv, 'exact-logo', ['logo8']));
            } finally { srv.stop(); }
        }
        if (MODE === 'nbexact') {
            if (hasMedia) await step('nbx-media', () => mediaPart(app.baseURL, 'nbx-media', ['png3'], fleetLog));
            if (hasPanel) {
                const fleet = {origin: app.baseURL, logSize: () => log.mark(), logSince: (from) => fleetLog.since(from)};
                await step('nbx-panel-default', () => panelPart(fleet, 'nbx-panel-default', ['png3', 'small1']));
            }
            const srv = await exactSrv();
            try {
                if (hasPanel) await step('nbx-panel-8m', () => panelPart(srv, 'nbx-panel-8m', ['small1']));
                await step('nbx-logo-8m', () => logoPart(srv, 'nbx-logo-8m', ['logo1']));
            } finally { srv.stop(); }
            if (hasPanel) {
                const low = await L.startServer(app, outDir(), {portOffset: 79, ini: ['upload_max_filesize=2M', 'post_max_size=1M', 'display_errors=Off']});
                try { await step('nbx-panel-1m', () => panelPart(low, 'nbx-panel-1m', ['mid15', 'half'])); } finally { low.stop(); }
            }
        }
    } else if (MODE === 'startup') {
        // Reach check for the report's display_errors bullet: display_errors and display_startup_errors On.
        const on = await L.startServer(app, outDir(), {portOffset: 78, ini: ['upload_max_filesize=8M', 'post_max_size=8M', 'display_errors=On', 'display_startup_errors=On', 'output_buffering=4096']});
        try {
            fact('startup-server', {origin: on.origin, limits: 'upload_max_filesize 8M, post_max_size 8M, display_errors On, display_startup_errors On'});
            if (hasMedia) await step('startup-media', () => mediaPart(on.origin, 'startup-media', ['png9'], logOfServer(on)));
            if (hasPanel) await step('startup-panel', () => panelPart(on, 'startup-panel', ['exact8']));
        } finally { on.stop(); }
    } else if (MODE === 'nb') {
        if (hasMedia) await step('nb-media', () => mediaPart(app.baseURL, 'nb-media', ['png1', 'png3'], fleetLog));
        if (hasPanel) {
            const srv = await L.startServer(app, outDir(), {portOffset: 77, ini: ['upload_max_filesize=8M', 'post_max_size=8M', 'display_errors=Off']});
            try { await step('nb-panel', () => panelPart(srv, 'nb-panel', ['over9', 'small1'])); } finally { srv.stop(); }
        }
    }
});
