// Issue report walk: docs/issues/U50-A8-future-issues-number-as-text.md
// (spec U50 register A8). Takes the report's Steps on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"), through the screens, OJS only
// (OMP and OPS have no issues). The kit builds nothing.
//   The dataset holds "Vol. 2 No. 1 (2015)" (unpublished, under "Future Issues").
//   1    sign in as dbarnes.
//   2    Future Issues › "Create Issue": Volume 3, Number 2, Year 2016, "Title" unticked, "Save".
//   3    "Create Issue": Volume 3, Number 10, Year 2016, "Title" unticked, "Save".
//   4    read "Future Issues".
// Pass `suppl` as the script's argument for the neighbour check: after step 3,
// "Create Issue" with Number "Suppl." (Volume 3, Year 2016); it must list after
// "Vol. 3 No. 10 (2016)" with the fix in or out, and "Back Issues" must still
// read "Vol. 1 No. 2 (2014)" alone.
// Database reads (the issues' rows) are evidence only.
//
// Reset first:  npm run fleet-prep -- --feature issues-w27 --dataset 9 --reset
// Run (main):   PROBE_FEATURE=issues-w27 PROBE_AGENT=w27 node bin/probe.js ojs shared/playwright/checks/issues/future-issues-number-as-text/walk.js
// Neighbour:    PROBE_RUN=nb PROBE_FEATURE=issues-w27 PROBE_AGENT=w27 node bin/probe.js ojs <this file> suppl
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w27-3_5 --dataset 9 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w27-3_5 PROBE_AGENT=w27 node bin/probe.js ojs <this file>
// Facts: .reports/<feature>/w27/facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const MODE = process.argv.slice(2).includes('suppl') ? 'suppl' : 'steps';

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`[${app.name}] no issues in this app: nothing to walk`); return; }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const q = (s) => (sql(app, s) || '').trim();
    const rows = () => q(`select 'id'||issue_id||' vol '||coalesce(volume::text,'-')||' no '||coalesce(number,'-')||' year '||coalesce(year::text,'-')||' published '||published from issues order by issue_id`).split('\n');
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null, mode: MODE, rows: rows()});

    const {page, close} = await launch(app);
    const cu = (p = '') => app.url(`/index.php/${app.contextPath}${p}`);
    const go = async (u) => { await page.goto(u).catch(() => {}); await idle(page).catch(() => {}); };
    const snap = async (label) => {
        let s; try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: flat(e.message, 200)}; }
        const name = `${MODE === 'suppl' ? 'nb-' : ''}${label}`;
        record(name, s); await shot(page, name).catch(() => {});
        return s;
    };

    async function tab(name) {
        await go(cu('/manageIssues'));
        await page.getByRole('tab', {name, exact: true}).click(); await idle(page);
        const panel = page.getByRole('tabpanel', {name});
        await panel.locator('table').first().waitFor({timeout: T});
        await idle(page); await pause(500);
        return panel;
    }
    async function readList(name, label) {
        const panel = await tab(name);
        await snap(label);
        return (await panel.locator('tr.gridRow').allInnerTexts()).map((x) => flat(x, 120));
    }
    async function create(volume, number, year, label) {
        await tab('Future Issues');
        await page.getByRole('link', {name: 'Create Issue', exact: true}).first().click();
        const form = page.locator('form#issueForm');
        await form.locator('input[name="volume"]').waitFor({timeout: T});
        await idle(page); await pause(300);
        await form.locator('input[name="volume"]').fill(volume);
        await form.locator('input[name="number"]').fill(number);
        await form.locator('input[name="year"]').fill(year);
        const tbox = form.locator('input[type="checkbox"][name="showTitle"]');
        if (await tbox.isChecked()) await tbox.click();
        await snap(label);
        const cw = page.waitForResponse((r) => /update-issue/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        const cr = await cw;
        await idle(page); await pause(1200);
        return {status: cr ? cr.status() : null};
    }

    try {
        // 1. dbarnes.
        await signIn(page, 'dbarnes');
        // 2, 3. Two future issues, numbered 2 and 10.
        fact('2-create', {issue: 'Vol. 3 No. 2 (2016)', ...(await create('3', '2', '2016', '02-create-no2'))});
        fact('3-create', {issue: 'Vol. 3 No. 10 (2016)', ...(await create('3', '10', '2016', '03-create-no10')), rows: rows()});
        if (MODE === 'suppl') {
            fact('nb-create', {issue: 'Vol. 3 No. Suppl. (2016)', ...(await create('3', 'Suppl.', '2016', 'create-suppl')), rows: rows()});
            fact('nb-back-issues', await readList('Back Issues', 'back-issues'));
        }
        // 4. "Future Issues".
        fact('4-future-issues', await readList('Future Issues', '04-future-issues'));
        fact('end', {rows: rows()});
    } finally {
        record('facts', facts);
        await close();
    }
});
