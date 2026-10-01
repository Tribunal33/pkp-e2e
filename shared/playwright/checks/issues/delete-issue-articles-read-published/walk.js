// Issue report walk: docs/issues/U50-A12-delete-issue-articles-read-published.md
// (spec U50 register A12). Takes the report's Steps on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"), through the screens, OJS only
// (OMP and OPS have no issues). The kit builds nothing.
//   The dataset's "Vol. 1 No. 2 (2014)" (published, current) holds submission 17
//   (published) and submission 1 (version 1 published, version 2 not).
//   1    sign in as dbarnes.
//   2    submission 17's workflow: header, production status, "Activity Log" › History (before).
//   3    Issues › Back Issues › "Vol. 1 No. 2 (2014)" › "Delete", "OK".
//   4    signed out: the article's page /article/view/17; then dbarnes again.
//   5    submission 17's workflow again: header, status, buttons, the "Issue" section.
//   6    "Activity Log" › History.
//   7    the editorial dashboard's "Published" view.
//   8    submission 17's header "Return to Workflow" › "Confirm": header and History
//        (only where the header offers it).
// Pass `unpublish` as the script's argument for the neighbour check: step 3 is
// "Unpublish Issue" on the same issue instead (it must log "The submission was
// unpublished." and leave the article scheduled, fix in or out).
// Database reads (submissions.status, publications) are evidence only.
//
// Reset first:  npm run fleet-prep -- --feature issues-w24 --dataset 7 --reset
// Run (main):   PROBE_FEATURE=issues-w24 PROBE_AGENT=w24 node bin/probe.js ojs shared/playwright/checks/issues/delete-issue-articles-read-published/walk.js
// Neighbour:    PROBE_RUN=nb PROBE_FEATURE=issues-w24 PROBE_AGENT=w24 node bin/probe.js ojs <this file> unpublish
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w24-3_5 --dataset 7 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w24-3_5 PROBE_AGENT=w24 node bin/probe.js ojs <this file>
// Facts: .reports/<feature>/w24/facts[-<run>]-ojs.json
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const REPO = path.resolve(__dirname, '../../../../..');
const SUB = 17;
const ISSUE = 'Vol. 1 No. 2 (2014)';
const MODE = process.argv.slice(2).includes('unpublish') ? 'unpublish' : 'delete';

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`[${app.name}] no issues in this app: nothing to walk`); return; }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const q = (s) => (sql(app, s) || '').trim();
    const db = () => ({
        submissions: q(`select submission_id||' status '||status||' current '||coalesce(current_publication_id::text,'-') from submissions where submission_id in (1,${SUB}) order by 1`).split('\n'),
        publications: q(`select publication_id||' sub '||submission_id||' status '||status||' issue '||coalesce(issue_id::text,'-') from publications where submission_id in (1,${SUB}) order by 1`).split('\n'),
        log: q(`select assoc_id||' '||message from event_log where assoc_type=1048585 and assoc_id in (1,${SUB}) order by log_id desc limit 6`).split('\n'),
    });
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null, mode: MODE, db: db()});

    const logFile = path.join(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logFrom = logSize();
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n')
                .filter((l) => /PHP|Error|Exception|SQLSTATE/.test(l) && !/Accepted|Closing/.test(l))
                .map((l) => l.replace(/^\[[^\]]+\] /, '').slice(0, 400)).slice(0, 10);
        } catch { return []; }
    };

    const {page, close} = await launch(app);
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(flat(e.message, 200)));
    const failed = [];
    page.on('response', (r) => { if (r.status() >= 500) failed.push(`${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`); });
    const cu = (p = '') => app.url(`/index.php/${app.contextPath}${p}`);
    const go = async (u) => { const r = await page.goto(u).catch((e) => ({err: flat(e.message, 200)})); await idle(page).catch(() => {}); return r && typeof r.status === 'function' ? r.status() : r; };
    const wf = () => page.getByRole('dialog').filter({has: page.locator('[data-cy="sidemodal-header"]')}).first();
    const pre = MODE === 'unpublish' ? 'nb-' : '';
    const snap = async (label, extra) => {
        let s; try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: flat(e.message, 200)}; }
        if (extra) s.facts = extra;
        record(`${pre}${label}`, s); await shot(page, `${pre}${label}`).catch(() => {});
        return s;
    };

    async function readWorkflow(label, key) {
        await go(cu(`/dashboard/editorial?workflowSubmissionId=${SUB}${key ? `&workflowMenuKey=${key}` : ''}`));
        await wf().waitFor({timeout: T});
        await wf().locator('[data-cy="sidemodal-header"]').waitFor({timeout: T});
        await idle(page); await pause(2000);
        const s = await snap(label);
        const r = await wf().evaluate((d) => {
            const f = (x) => (x || '').replace(/\s+/g, ' ').trim();
            return {
                header: f(d.querySelector('[data-cy="sidemodal-header"]')?.innerText).slice(0, 400),
                buttons: [...d.querySelectorAll('button')].filter((b) => b.getClientRects().length).map((b) => f(b.innerText)).filter(Boolean).slice(0, 40),
                text: f(d.innerText).slice(0, 1500),
            };
        }).catch((e) => ({error: flat(e.message, 200)}));
        return {url: s.url, ...r};
    }
    async function readHistory(label) {
        const btn = wf().locator('[data-cy="sidemodal-header"]').getByRole('button', {name: 'Activity Log', exact: true}).first();
        if (!(await btn.count())) return {absent: true};
        await btn.click();
        const d = page.getByRole('dialog').filter({hasText: 'Activity Log & Notes'}).last();
        await d.locator('tr.gridRow, td:has-text("No Items")').first().waitFor({timeout: 45000}).catch(() => {});
        await idle(page); await pause(500);
        const rows = await d.locator('tr.gridRow').evaluateAll((trs) => trs.map((tr) => {
            const tds = [...tr.querySelectorAll('td')];
            const t = (td) => (td ? td.innerText.replace(/\s+/g, ' ').trim() : '');
            return `${t(tds[0])} | ${t(tds[1])} | ${t(tds[2])}`;
        })).catch(() => []);
        await snap(label, {rows});
        await d.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await d.waitFor({state: 'detached', timeout: 10000}).catch(() => {});
        await pause(500);
        return {rows};
    }
    async function issueAction(action, label) {
        await go(cu('/manageIssues'));
        await page.getByRole('tab', {name: 'Back Issues', exact: true}).click(); await idle(page);
        const panel = page.getByRole('tabpanel', {name: 'Back Issues'});
        await panel.locator('table').first().waitFor({timeout: T});
        await idle(page); await pause(500);
        const row = panel.locator('tr.gridRow').filter({has: page.getByRole('link', {name: ISSUE, exact: true})}).first();
        await row.locator('a.show_extras').click();
        const ctl = row.locator('xpath=following-sibling::tr[contains(@class,"row_controls")][1]');
        await ctl.waitFor({timeout: T});
        const actions = await ctl.locator('a:visible').allInnerTexts().then((a) => a.map((x) => flat(x, 60)).filter(Boolean));
        await ctl.getByRole('link', {name: action, exact: true}).click();
        const d = page.locator('[role="dialog"]:visible').filter({hasText: /Are you sure/}).last();
        await d.waitFor({timeout: T}); await idle(page); await pause(500);
        const question = flat(await d.innerText(), 300);
        await snap(`${label}-confirm`);
        const w = page.waitForResponse((r) => r.request().method() === 'POST' && /delete-issue|deleteIssue|unpublish-issue|unpublishIssue/.test(r.url()), {timeout: T}).catch(() => null);
        await d.getByRole('button', {name: 'OK', exact: true}).click();
        const r = await w;
        await idle(page); await pause(1500);
        const rows = await panel.locator('tr.gridRow').allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => []);
        await snap(`${label}-done`);
        return {actions, question, status: r ? r.status() : null, backIssueRows: rows, db: db()};
    }
    async function readPublished(label) {
        await go(cu('/dashboard/editorial'));
        await idle(page); await pause(1500);
        const views = await page.getByRole('link').or(page.getByRole('button')).allInnerTexts().then((a) => a.map((x) => flat(x, 60)).filter((x) => /Published/.test(x))).catch(() => []);
        const pub = page.getByRole('link', {name: /^(\d+ )?Published$/}).or(page.getByRole('button', {name: /^(\d+ )?Published$/})).first();
        if (await pub.count()) { await pub.click(); await idle(page); await pause(2000); }
        const s = await snap(label);
        const rows = await page.locator('table tbody tr').allInnerTexts().then((a) => a.map((x) => flat(x, 160))).catch(() => []);
        return {views, url: s.url, rows};
    }

    try {
        // 1. dbarnes.
        await signIn(page, 'dbarnes');
        // 2. Before.
        fact('2-workflow-before', await readWorkflow('02-workflow-before'));
        fact('2-history-before', await readHistory('02-history-before'));
        // 3. Delete (neighbour: Unpublish Issue).
        fact('3-issue-action', await issueAction(MODE === 'unpublish' ? 'Unpublish Issue' : 'Delete', `03-${MODE}`));
        // 4. Signed out: the article's page; then dbarnes again.
        await signOut(page); await idle(page).catch(() => {});
        const st4 = await go(cu(`/article/view/${SUB}`));
        const s4 = await snap('04-article-page-signed-out');
        fact('4-article-page-signed-out', {status: st4, title: await page.title().catch(() => null), text: flat(s4.text && s4.text.main, 300)});
        await signIn(page, 'dbarnes');
        // 5. The workflow again, then its Issue section.
        fact('5-workflow-after', await readWorkflow('05-workflow-after'));
        const pubId = q(`select current_publication_id from submissions where submission_id=${SUB}`);
        fact('5-issue-section', await readWorkflow('05-issue-section', app.line === 'stable-3_5_0' ? 'publication_issue' : `publication_${pubId}_issue`));
        // 6. History.
        fact('6-history-after', await readHistory('06-history-after'));
        // 7. Dashboard "Published".
        fact('7-dashboard-published', await readPublished('07-dashboard-published'));
        // 8. "Return to Workflow" › "Confirm", where offered.
        await readWorkflow('08-workflow-before-return');
        const rtw = wf().locator('[data-cy="sidemodal-header"]').getByRole('button', {name: 'Return to Workflow', exact: true}).first();
        if (await rtw.count()) {
            await rtw.click();
            const d = page.getByRole('dialog').filter({hasText: 'Return this submission to the workflow stage'}).last();
            await d.waitFor({timeout: T}); await idle(page); await pause(500);
            const question = flat(await d.innerText(), 300);
            await snap('08-return-confirm');
            const w = page.waitForResponse((r) => r.request().method() === 'POST' && /\/decisions/.test(r.url()), {timeout: T}).catch(() => null);
            await d.getByRole('button', {name: 'Confirm', exact: true}).click();
            const r = await w;
            await idle(page); await pause(1500);
            const after = await readWorkflow('08-workflow-after-return');
            fact('8-return-to-workflow', {question, status: r ? r.status() : null, header: after.header, buttons: after.buttons, history: await readHistory('08-history-after-return'), stage: q(`select stage_id||' status '||status from submissions where submission_id=${SUB}`)});
        } else fact('8-return-to-workflow', {offered: false});
        fact('end', {db: db()});
    } finally {
        fact('failedRequests', failed);
        fact('pageErrors', pageErrors);
        fact('serverLog', logSince(logFrom));
        record('facts', facts);
        await close();
    }
});
