// Issue report walk: docs/issues/U13-OJS5-publication-facts-panel-never-shown.md
// (spec U13 register OJS5). Takes the report's Steps on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), through the screens:
//   control. signed out, opens submission 1's article page with the plugin off;
//   1–2. `dbarnes` ticks "Publication Facts Label plugin" (Settings › Website › Plugins);
//   3.   signs out;
//   4–5. opens the article pages of submission 1 ("Signalling Theory Dividends")
//        and submission 17 ("Antimicrobial, heavy metal resistance …"), reading
//        the side column's "Publication Facts" panel, the plugin's own requests
//        (pfl.js, the label file) and the server log.
// The kit builds nothing. OJS only (the plugin is OJS's).
//
// Reset first:  npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset --apps ojs
// Run (main):   PROBE_FEATURE=issues-ir1 PROBE_AGENT=u13ojs5 node bin/probe.js ojs shared/playwright/checks/issues/publication-facts-panel-never-shown/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset --apps ojs
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=u13ojs5 node bin/probe.js ojs <this file>
// Fix trial:    trial.sh beside this file.
// Facts: .reports/<feature>/u13ojs5/facts[-<run>]-ojs.json
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const REPO = path.resolve(__dirname, '../../../../..');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null});

    const logFile = path.join(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n')
                .filter((l) => /PHP|Error|Exception|Plugin |SQLSTATE|cURL/.test(l) && !/Accepted|Closing/.test(l))
                .map((l) => l.replace(/^\[[^\]]+\] /, '').slice(0, 400)).slice(0, 10);
        } catch { return []; }
    };

    const {page, close} = await launch(app);
    const pflRequests = [];
    page.on('response', (r) => { if (/pflPlugin\//.test(r.url())) pflRequests.push(`${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`); });

    const readArticle = async (key, sid) => {
        pflRequests.length = 0;
        const from = logSize();
        const r = await page.goto(app.url(`/index.php/${app.contextPath}/article/view/${sid}`));
        await idle(page);
        await pause(1500);
        const s = await screen(page); record(key, s); await shot(page, key);
        const panel = await page.evaluate(() => {
            const el = document.querySelector('publication-facts-label');
            if (!el) return null;
            const root = el.shadowRoot || el;
            const box = root.querySelector('.publication-facts-label') || root;
            return {defined: !!customElements.get('publication-facts-label'), text: (box.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 900)};
        });
        return {
            status: r ? r.status() : null, title: await page.title(),
            pflSection: await page.locator('section.pflPlugin').count(),
            panel,
            pflScriptTag: await page.locator('script[src*="pflPlugin/pfl/js/pfl.js"]').count(),
            authorListId: await page.locator('ul#author-list').count(),
            pflRequests: [...pflRequests],
            serverLog: logSince(from),
        };
    };

    try {
        // Control: plugin off, signed out.
        fact('0-control-article-1', await readArticle('00-control-article-1', 1));

        // 1. Sign in as dbarnes.
        await signIn(page, 'dbarnes');

        // 2. Settings › Website › Plugins: tick "Publication Facts Label plugin".
        await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/website`)); await idle(page);
        await page.getByRole('tab', {name: 'Plugins', exact: true}).first().click(); await idle(page);
        const row = page.locator('tr.gridRow[id$="-row-pflplugin"]').first();
        await row.waitFor({state: 'visible', timeout: T});
        const box = row.locator('input[type=checkbox]');
        const wasTicked = await box.isChecked();
        let enableStatus = null;
        if (!wasTicked) {
            const en = page.waitForResponse((r) => /enable/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
            await box.click();
            const r = await en; enableStatus = r ? r.status() : null;
            await idle(page); await pause(500);
        }
        const s2 = await screen(page); record('02-plugin-enabled', s2); await shot(page, '02-plugin-enabled');
        fact('2-enable', {row: (await row.innerText()).replace(/\s+/g, ' ').trim().slice(0, 300), wasTicked, status: enableStatus,
            ticked: await box.isChecked(), notices: s2.notices || null});

        // 3. Sign out.
        await signOut(page);

        // 4–5. The two article pages.
        fact('4-article-1', await readArticle('04-article-1', 1));
        fact('5-article-17', await readArticle('05-article-17', 17));
    } finally {
        record('facts', facts);
        await close();
    }
});
