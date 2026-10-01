// Issue report walk: docs/issues/U50-A2-unpublish-back-issue-clears-current.md
// (spec U50 register A2). Takes the report's Steps on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"), through the screens, OJS only
// (OMP and OPS have no issues). The kit builds nothing.
//   The dataset holds "Vol. 1 No. 2 (2014)" (published, current) and
//   "Vol. 2 No. 1 (2015)" (unpublished, "Future Issues").
//   1    sign in as dbarnes.
//   2    Issues › Future Issues › "Vol. 2 No. 1 (2015)" › "Publish Issue", the mail box unticked, "OK".
//   3    "Current" (control: the new issue is current).
//   4    Issues › Back Issues › "Vol. 1 No. 2 (2014)" › "Unpublish Issue", "OK".
//   5    "Current", the home page, "Archives" (still signed in).
//   6    Issues › Back Issues: the "Vol. 2 No. 1 (2015)" row's actions.
// Pass `current` as the script's argument for the neighbour
// check instead of step 4: "Unpublish Issue" on the current "Vol. 2 No. 1 (2015)"
// itself, which must leave the journal with no current issue, fix in or out.
// Database reads (journals.current_issue_id) are evidence only.
//
// Reset first:  npm run fleet-prep -- --feature issues-w23 --dataset 5 --reset
// Run (main):   PROBE_FEATURE=issues-w23 PROBE_AGENT=w23 node bin/probe.js ojs shared/playwright/checks/issues/unpublish-back-issue-clears-current/walk.js
// Neighbour:    PROBE_RUN=nb PROBE_FEATURE=issues-w23 PROBE_AGENT=w23 node bin/probe.js ojs <this file> current
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w23-3_5 --dataset 5 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w23-3_5 PROBE_AGENT=w23 node bin/probe.js ojs <this file>
// Facts: .reports/<feature>/w23/facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const BACK = 'Vol. 1 No. 2 (2014)';
const NEW = 'Vol. 2 No. 1 (2015)';
const MODE = process.argv.slice(2).includes('current') ? 'current' : 'back';

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`[${app.name}] no issues in this app: nothing to walk`); return; }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const q = (s) => (sql(app, s) || '').trim();
    const currentId = () => q(`select coalesce(current_issue_id::text,'null') from journals where path='${app.contextPath}'`);
    const issues = () => q(`select issue_id||' v'||volume||' n'||number||' '||year||' published '||published from issues order by issue_id`).split('\n');
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null, mode: MODE, issues: issues(), currentIssueId: currentId()});

    const {page, close} = await launch(app);
    const cu = (p = '') => app.url(`/index.php/${app.contextPath}${p}`);
    const go = async (u) => { const r = await page.goto(u).catch((e) => ({err: flat(e.message, 200)})); await idle(page).catch(() => {}); return r && typeof r.status === 'function' ? r.status() : r; };
    let n = 0;
    const snap = async (label, extra) => {
        let s; try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: flat(e.message, 200)}; }
        if (extra) s.facts = extra;
        const name = `${MODE === 'current' ? 'nb-' : ''}${label}`;
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
    async function rowActions(panel, issue) {
        const row = panel.locator('tr.gridRow').filter({has: page.getByRole('link', {name: issue, exact: true})}).first();
        await row.locator('a.show_extras').click();
        const ctl = row.locator('xpath=following-sibling::tr[contains(@class,"row_controls")][1]');
        await ctl.waitFor({timeout: T});
        const actions = await ctl.locator('a:visible').allInnerTexts().then((a) => a.map((x) => flat(x, 60)).filter(Boolean));
        return {ctl, actions};
    }
    async function readCurrent(label) {
        const status = await go(cu('/issue/current'));
        const s = await snap(label);
        const r = await page.evaluate(() => {
            const f = (x) => (x || '').replace(/\s+/g, ' ').trim();
            return {title: document.title, h1: f(document.querySelector('h1')?.innerText), heading: f(document.querySelector('.page_issue h2, .page h2')?.innerText) || null, body: f(document.querySelector('.page')?.innerText).slice(0, 300)};
        }).catch((e) => ({error: flat(e.message, 200)}));
        return {status, ...r, crumbs: flat(s.text?.main || '', 0)};
    }
    async function readHome(label) {
        const status = await go(cu(''));
        await snap(label);
        return {status, ...(await page.evaluate(() => {
            const f = (x) => (x || '').replace(/\s+/g, ' ').trim();
            const sec = document.querySelector('.current_issue');
            return {currentIssuePart: sec ? f(sec.querySelector('h2')?.innerText) : null, currentIssueTitle: sec ? f(sec.querySelector('.current_issue_title')?.innerText) : null};
        }).catch((e) => ({error: flat(e.message, 200)})))};
    }
    async function readArchive(label) {
        const status = await go(cu('/issue/archive'));
        await snap(label);
        return {status, issues: await page.locator('.obj_issue_summary .title').allInnerTexts().then((a) => a.map((x) => flat(x, 120))).catch(() => [])};
    }
    async function unpublish(tabName, issue, label) {
        const panel = await tab(tabName);
        const {ctl, actions} = await rowActions(panel, issue);
        await ctl.getByRole('link', {name: 'Unpublish Issue', exact: true}).click();
        const d = page.locator('[role="dialog"]:visible').filter({hasText: /unpublish this published issue/}).last();
        await d.waitFor({timeout: T}); await idle(page); await pause(500);
        const question = flat(await d.innerText(), 300);
        await snap(`${label}-confirm`);
        const w = page.waitForResponse((r) => r.request().method() === 'POST' && /unpublish-issue|unpublishIssue/.test(r.url()), {timeout: T}).catch(() => null);
        await d.getByRole('button', {name: 'OK', exact: true}).click();
        const r = await w;
        await idle(page); await pause(1200);
        await snap(`${label}-done`);
        return {actionsBefore: actions, question, status: r ? r.status() : null, currentIssueId: currentId(), issues: issues()};
    }

    try {
        // 1. dbarnes.
        await signIn(page, 'dbarnes');

        // 2. Publish "Vol. 2 No. 1 (2015)".
        const fp = await tab('Future Issues');
        const {ctl: fctl} = await rowActions(fp, NEW);
        await fctl.getByRole('link', {name: 'Publish Issue', exact: true}).click();
        const pd = page.getByRole('dialog', {name: 'Publish Issue', exact: true});
        await pd.locator('input[name="sendIssueNotification"]').waitFor({timeout: T});
        await idle(page); await pause(500);
        await pd.locator('input[name="sendIssueNotification"]').uncheck();
        await snap('02-publish-issue');
        const ir = page.waitForResponse((r) => /publish-issue|publishIssue/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await pd.getByRole('button', {name: 'OK', exact: true}).click();
        const irr = await ir;
        await pd.waitFor({state: 'detached', timeout: T}).catch(() => {});
        await idle(page); await pause(800);
        await snap('02-issue-published');
        fact('2-publish', {status: irr ? irr.status() : null, currentIssueId: currentId(), issues: issues()});

        // 3. "Current" (control).
        fact('3-current-before', await readCurrent('03-current-before'));

        // 4. Unpublish the back issue (or, neighbour, the current one).
        fact('4-unpublish', MODE === 'current'
            ? {target: NEW, ...(await unpublish('Back Issues', NEW, '04-unpublish-current'))}
            : {target: BACK, ...(await unpublish('Back Issues', BACK, '04-unpublish-back'))});

        // 5. "Current", home, "Archives".
        fact('5-current-after', await readCurrent('05-current-after'));
        fact('5-home', await readHome('05-home'));
        fact('5-archive', await readArchive('05-archive'));
        // 6. Back Issues: the remaining rows' actions.
        const bp = await tab('Back Issues');
        const rows = await bp.locator('tr.gridRow').allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => []);
        const remaining = MODE === 'current' ? BACK : NEW;
        const {actions} = await rowActions(bp, remaining);
        await snap('06-back-issues');
        fact('6-back-issues', {rows, row: remaining, actions});

        fact('end', {currentIssueId: currentId(), issues: issues()});
    } finally {
        record('facts', facts);
        await close();
    }
});
