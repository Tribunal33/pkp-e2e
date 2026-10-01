// Issue report walk: docs/issues/U61-A1-check-for-updates-empty-page.md
// (spec U61 register A1). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
//   1 sign in as `admin`; 2 "Administration"; 3 "View System Information";
//   4 "Check for updates".
// Precondition, not built by this script: the server cannot reach
// pkp.sfu.ca. A dataset fleet's config sets `[proxy]` `http_proxy` and
// `https_proxy` to "http://127.0.0.1:9", where nothing answers; the script
// reads both from the fleet's config and records them.
// Control: steps 2 and 3 open although the page's notice check asks the
// same site first. Neighbour (with the fix in and out): the System
// Information page of step 3 shows no failure message and keeps its parts.
// Each press records the document's status, the screen, the tab title, and
// the lines the press added to the server's log and the installation log.
// The kit builds nothing.
//
// Run (main, then stable-3_5_0); reset the fleet first:
//   PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w54 --dataset 1 --reset
//   PROBE_FEATURE=issues-w54 PROBE_AGENT=w54 node bin/probe.js all shared/playwright/checks/issues/check-for-updates-empty-page/walk.js
//   PATH=… PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w54-3_5 --dataset 1 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w54-3_5 PROBE_AGENT=w54 node bin/probe.js all shared/playwright/checks/issues/check-for-updates-empty-page/walk.js
// With the fix applied (node bin/try-fix.js apply …/fix.diff ojs omp ops), run with PROBE_RUN=fix.
// Facts: .reports/<feature>/w54/facts[-<run>]-<app>.json
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');

const T = 30_000;
const REPO = path.resolve(__dirname, '../../../../..');

function tail(file) {
    const size = () => { try { return fs.statSync(file).size; } catch { return 0; } };
    const from = size();
    return () => {
        try {
            return fs.readFileSync(file).slice(from).toString('utf8').split('\n')
                .filter((l) => /PHP|ERROR|Error|Exception|Failed|\[5\d\d\]/.test(l) && !/Accepted|Closing/.test(l))
                .map((l) => l.replace(/^\[[^\]]+\] /, '').slice(0, 400)).slice(0, 12);
        } catch { return []; }
    };
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const facts = {line: app.line || 'main', baseURL: app.baseURL};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const conf = fs.readFileSync(path.resolve(REPO, app.configFile), 'utf8');
    const confVar = (k) => (conf.match(new RegExp(`^${k}\\s*=\\s*(.*)$`, 'm')) || [])[1] || null;
    fact('config', {http_proxy: confVar('http_proxy'), https_proxy: confVar('https_proxy'), show_upgrade_warning: confVar('show_upgrade_warning'), files_dir: confVar('files_dir')});
    const serverLog = path.join(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const filesDir = (confVar('files_dir') || '').replace(/^"|"$/g, '');
    const appLog = () => {
        const dir = path.join(filesDir, 'logs');
        try { return fs.readdirSync(dir).filter((f) => /\.log$/.test(f)).sort().map((f) => path.join(dir, f)).pop() || path.join(dir, 'app.log'); } catch { return path.join(dir, 'app.log'); }
    };
    let n = 0;
    const snap = async (page, name, extra = {}) => {
        const s = await screen(page);
        const title = await page.title().catch(() => null);
        const h1 = await page.locator('h1').allInnerTexts().catch(() => []);
        const bodyText = ((await page.locator('body').innerText().catch(() => '')) || '').trim();
        record(`${String(++n).padStart(2, '0')}-${name}`, {...s, title, h1, bodyLength: bodyText.length, ...extra});
        await shot(page, `${String(n).padStart(2, '0')}-${name}`);
        return {title, h1, bodyLength: bodyText.length, bodyHead: bodyText.slice(0, 300), url: page.url().replace(app.baseURL, '')};
    };
    const press = async (page, name, locator) => {
        const sl = tail(serverLog); const al = tail(appLog());
        const [resp] = await Promise.all([page.waitForNavigation({timeout: T}), locator.click()]);
        await idle(page).catch(() => {});
        const view = await snap(page, name);
        const out = {status: resp ? resp.status() : null, ...view, serverLog: sl(), appLog: al()};
        fact(name, out);
        return out;
    };

    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');                                                          // 1
        await idle(page);
        // 2: "Administration" in the side menu, else the address
        const nav = page.getByRole('navigation', {name: 'Site Navigation'});
        const adminLink = nav.getByRole('link', {name: 'Administration', exact: true});
        if (await adminLink.count()) {
            fact('step2-via', 'side menu');
            await press(page, 'step2-administration', adminLink.first());
        } else {
            fact('step2-via', 'address');
            const sl = tail(serverLog);
            const r = await page.goto(app.url(app.line && /3_[34]/.test(app.line) ? '/index.php/index/admin' : '/index.php/index/en/admin'));
            await idle(page);
            fact('step2-administration', {status: r && r.status(), ...(await snap(page, 'step2-administration')), serverLog: sl()});
        }
        const step3 = await press(page, 'step3-system-information',                          // 3
            page.getByRole('link', {name: 'View System Information', exact: true}));
        // Neighbour: the page's parts, and no failure message, before the check
        fact('neighbour-system-information', {
            headings: await page.locator('h1, h2').allInnerTexts().catch(() => []),
            checkForUpdates: await page.getByRole('link', {name: 'Check for updates', exact: true}).count(),
            warnings: await page.locator('.pkpNotification, [role="alert"]').allInnerTexts().catch(() => []),
        });
        if (!step3.status || step3.status >= 400) throw new Error('System Information did not open');
        await press(page, 'step4-check-for-updates',                                         // 4
            page.getByRole('link', {name: 'Check for updates', exact: true}));
        fact('step4-page', {
            headings: await page.locator('h1, h2').allInnerTexts().catch(() => []),
            checkForUpdates: await page.getByRole('link', {name: 'Check for updates', exact: true}).count(),
            warnings: await page.locator('.pkpNotification, [role="alert"]').allInnerTexts().catch(() => []),
        });
    } finally {
        record('facts', facts);
        await close();
    }
});
