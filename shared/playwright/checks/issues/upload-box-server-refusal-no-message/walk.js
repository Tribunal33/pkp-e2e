// Issue report docs/issues/U10-A16-upload-box-server-refusal-no-message.md (spec U10 A16): a picture
// the server refuses leaves the settings upload box with a warning sign and no message. Walked through
// the screens on PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), context
// `publicknowledge`, on a second `php -S` of the same install with upload_max_filesize and
// post_max_size both 8M and display_errors Off (base port + 77). The kit builds nothing; the files
// are made on disk.
//
//   1. sign in as rvaca
//   2. Settings › Website › "Appearance" › "Setup"
//   3. "Logo" › "Upload File": u10r10-logo-8mib.png (a PNG of exactly 8388608 bytes)
//   4. the box and the form's foot
//
// MODE=nb runs the neighbour alone (with the fix in and out), on the same server: a ".pdf" chosen
// for "Logo" (refused in the browser, Dropzone's own message) and a 1 MiB PNG (uploads).
//
// Reset first:  npm run fleet-prep -- --feature issues-r10 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-r10 PROBE_AGENT=r10 node bin/probe.js all shared/playwright/checks/issues/upload-box-server-refusal-no-message/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-r10-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r10-3_5 PROBE_AGENT=r10 node bin/probe.js all shared/playwright/checks/issues/upload-box-server-refusal-no-message/walk.js
// Facts: .reports/<feature>/r10/a16-facts[-<run>]-<app>.json
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, screen, shot, record, outDir, signIn} = require('../../../probe');
const R = require('../file-over-request-limit-server-error/lib');
const P = require('../picture-over-upload-limit-server-error/lib');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const LOGRE = /PHP (Fatal|Warning)|ERROR|Exception|too large|Content-Length/i;

/** The walk's files under <dir>/files: a PNG of exactly 8 MiB and of 1 MiB, and a PDF. */
function makeFiles(dir) {
    const d = path.join(dir, 'files');
    fs.mkdirSync(d, {recursive: true});
    const png = (name, bytes) => {
        const f = path.join(d, name);
        if (!fs.existsSync(f) || fs.statSync(f).size !== bytes) {
            const head = P.png(40, 30, false);
            fs.writeFileSync(f, Buffer.concat([head, Buffer.alloc(bytes - head.length, 0)]));
        }
        return f;
    };
    const pdf = path.join(d, 'u10r10-logo.pdf');
    fs.writeFileSync(pdf, '%PDF-1.4\n%u10r10\n');
    return {logo8: png('u10r10-logo-8mib.png', 8 * R.MIB), logo1: png('u10r10-logo-1mib.png', 1 * R.MIB), pdf};
}

forEachApp(async (app) => {
    const fact = (k, v) => { record('a16-facts', {[k]: v}, {merge: true}); console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 900)); };
    const files = makeFiles(outDir());
    fact(`${MODE}-files`, Object.fromEntries(Object.entries(files).map(([k, f]) => [k, `${path.basename(f)} ${fs.statSync(f).size}`])));
    const srv = await R.startServer(app, outDir(), {portOffset: 77, ini: ['upload_max_filesize=8M', 'post_max_size=8M', 'display_errors=Off']});
    try {
        fact(`${MODE}-server`, {origin: srv.origin, limits: 'upload_max_filesize 8M, post_max_size 8M, display_errors Off'});
        const list = MODE === 'nb' ? ['pdf', 'logo1'] : ['logo8'];
        const {page} = await launch(app);
        const pageErrors = [];
        page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)));
        page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(`console: ${m.text().slice(0, 300)}`); });
        await signIn(page, 'rvaca', {origin: srv.origin});                                     // 1
        for (const k of list) {
            try {
                await L.openSetup(page, app, srv.origin);                                      // 2
                const b = L.logoBox(page);
                const from = srv.logSize();
                const r = await L.uploadAndRead(page, b, files[k]);                            // 3–4
                record(`${MODE}-${k}`, await screen(page));
                await shot(page, `${MODE}-${k}`);
                fact(`${MODE}-${k}`, {...r, serverLog: srv.logSince(from, LOGRE).slice(0, 6), pageErrors: pageErrors.splice(0)});
            } catch (e) {
                fact(`${MODE}-${k}-FAILED`, String(e.stack || e).split('\n').slice(0, 5).join(' | '));
            }
        }
        await page.close();
    } finally { srv.stop(); }
});
