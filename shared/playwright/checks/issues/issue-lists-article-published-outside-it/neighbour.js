// Neighbour check for docs/issues/U50-A17-A18-issue-lists-article-published-outside-it.md:
// what the fix must leave alone, walked with the fix in and out (OJS main, the
// default dataset, a freshly reset dataset fleet). The kit builds nothing.
//   N1  dbarnes schedules version 2 of "Signalling Theory Dividends" (submission 1)
//       into the future issue "Vol. 2 No. 1 (2015)" ("Assign To Future Issue and
//       Schedule Only"): that issue's "Table of Contents" tab and "Items" must list
//       the article, and "Vol. 1 No. 2 (2014)", which holds its published version 1,
//       must keep listing it (tab, "Items", the issue's page).
//   N2  "Remove" on "Antimicrobial, heavy metal resistance …" (submission 17, whose
//       only version is in "Vol. 1 No. 2 (2014)"): the row leaves the tab, "Items"
//       drops by one and the article's page goes offline (spec U50 Rule 12).
//
//   N3  (PHASE=section, on its own fresh load) version 2 moved to "Reviews" and published
//       with "Don't Assign To An Issue": the superseded article is then the only one of its
//       section; the tab's sections and the issue's page.
//
// Reset first:  npm run fleet-prep -- --feature issues-w22 --dataset 4 --reset
// Run:          PROBE_RUN=<nofix|fix> PROBE_FEATURE=issues-w22 PROBE_AGENT=w22 node bin/probe.js ojs shared/playwright/checks/issues/issue-lists-article-published-outside-it/neighbour.js
// Facts: .reports/<feature>/w22/neighbour-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const BACK = 'Vol. 1 No. 2 (2014)';
const FUTURE = 'Vol. 2 No. 1 (2015)';

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`[${app.name}] no issues in this app: nothing to walk`); return; }
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const q = (s) => (sql(app, s) || '').trim();
    const pubs = (sid) => q(`select publication_id||' status '||status||' issue '||coalesce(issue_id::text,'-') from publications where submission_id=${sid} order by publication_id`).split('\n');
    const v2 = q('select max(publication_id) from publications where submission_id=1');
    const backId = q(`select issue_id from issues where volume=1 and number='2' and year=2014`);

    const {page, close} = await launch(app);
    const cu = (p = '') => app.url(`/index.php/${app.contextPath}${p}`);
    const go = async (u) => { const r = await page.goto(u).catch((e) => ({err: flat(e.message, 200)})); await idle(page).catch(() => {}); return r && typeof r.status === 'function' ? r.status() : r; };
    const wf = () => page.locator('[role="dialog"]:visible').first();
    const controls = () => page.locator('[data-cy="workflow-controls-right"]');
    let n = 0;
    const snap = async (label, extra) => {
        let s; try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: flat(e.message, 200)}; }
        if (extra) s.facts = extra;
        const name = `neighbour-${String(++n).padStart(2, '0')}-${label}`;
        record(name, s); await shot(page, name).catch(() => {});
    };
    async function openToc(tab, issue, label) {
        await go(cu('/manageIssues'));
        await page.getByRole('tab', {name: tab, exact: true}).click(); await idle(page);
        const panel = page.getByRole('tabpanel', {name: tab});
        await panel.locator('table').first().waitFor({timeout: T});
        await idle(page); await pause(500);
        const rows = await panel.locator('tr.gridRow').allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => []);
        await panel.getByRole('link', {name: issue, exact: true}).first().click();
        const dlg = page.getByRole('dialog', {name: /^Issue Management/});
        await dlg.waitFor({timeout: T}); await idle(page); await pause(500);
        await dlg.getByRole('tab', {name: 'Table of Contents', exact: true}).click(); await idle(page);
        const tp = dlg.getByRole('tabpanel', {name: 'Table of Contents'});
        await tp.locator('table').first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await pause(800);
        const toc = await tp.locator('tbody tr').evaluateAll((trs) => trs.filter((tr) => tr.getClientRects().length && !tr.classList.contains('row_controls'))
            .map((tr) => tr.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch((e) => [`err ${String(e.message).slice(0, 100)}`]);
        await snap(label, {rows, toc});
        return {tp, rows, toc};
    }
    async function issuePageTitles(label) {
        const status = await go(cu(`/issue/view/${backId}`));
        await snap(label);
        return {status, titles: await page.locator('.obj_article_summary .title').allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => [])};
    }

    if (process.env.PHASE === 'section') {
        // N3 (PHASE=section, on its own fresh load). Version 2 moved to "Reviews" and
        // published with "Don't Assign To An Issue", so the superseded article is the only
        // one of its section in "Vol. 1 No. 2 (2014)". The tab's sections and the issue
        // page's must agree with the articles listed, with no warning in the server log.
        // (The PubMed export of an issue fails in this test environment for any issue:
        // its DTD check fetches https://dtd.nlm.nih.gov, which the install cannot reach.)
        const fs = require('fs');
        const path = require('path');
        const REPO = path.resolve(__dirname, '../../../../..');
        const logFile = path.join(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${app.port}-ds${app.dataset}.log`);
        const logFrom = (() => { try { return fs.statSync(logFile).size; } catch { return 0; } })();
        try {
            await signIn(page, 'dbarnes');
            await go(cu(`/dashboard/editorial?workflowSubmissionId=1&workflowMenuKey=publication_${v2}_issue`));
            await wf().locator('input[name="assignment"]').first().waitFor({state: 'visible', timeout: T});
            await idle(page); await pause(800);
            await wf().locator('select[name="sectionId"]').selectOption({label: 'Reviews'});
            await wf().getByRole('radio', {name: "Don't Assign To An Issue"}).check();
            const sv = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await wf().getByRole('button', {name: 'Save', exact: true}).last().click();
            const svr = await sv;
            await idle(page); await pause(800);
            const pb = controls().getByRole('button', {name: /^(Schedule For Publication|Publish)$/}).first();
            await pb.waitFor({state: 'visible', timeout: T});
            await pause(800);
            await pb.click();
            const win = page.getByRole('dialog').filter({hasText: /Are you sure you want to publish|requirements have been met/}).last();
            await win.waitFor({timeout: T}); await idle(page); await pause(800);
            const pr = page.waitForResponse((r) => /\/publish(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await win.getByRole('button', {name: 'Publish', exact: true}).last().click();
            const p = await pr;
            await idle(page); await pause(1000);
            await snap('n3-published');
            fact('n3-publish', {save: svr ? svr.status() : null, status: p ? p.status() : null, pubs: pubs(1),
                section: q(`select p.section_id from publications p where p.publication_id=${v2}`)});
            const t = await openToc('Back Issues', BACK, 'n3-back-toc');
            const log = (() => { try { return fs.readFileSync(logFile).slice(logFrom).toString('utf8').split('\n').filter((l) => /PHP|Error|Exception|Warning|Undefined/.test(l) && !/Accepted|Closing|Deprecated/.test(l)).map((l) => l.replace(/^\[[^\]]+\] /, '').slice(0, 300)).slice(0, 8); } catch { return []; } })();
            await signOut(page); await idle(page).catch(() => {});
            await go(cu(`/issue/view/${backId}`));
            const sections = await page.evaluate(() => [...document.querySelectorAll('.obj_issue_toc .sections .section')].map((sec) => ({heading: (sec.querySelector('h2')?.innerText || '').trim(), n: sec.querySelectorAll('.obj_article_summary').length})));
            await snap('n3-issue-page');
            fact('n3-lists', {rows: t.rows, toc: t.toc, issuePageSections: sections, serverLog: log});
        } finally {
            record('neighbour-facts', facts);
            await close();
        }
        return;
    }

    try {
        // N1. Version 2 scheduled into the future issue.
        await signIn(page, 'dbarnes');
        await go(cu(`/dashboard/editorial?workflowSubmissionId=1&workflowMenuKey=publication_${v2}_issue`));
        await wf().locator('input[name="assignment"]').first().waitFor({state: 'visible', timeout: T});
        await idle(page); await pause(800);
        await wf().getByRole('radio', {name: 'Assign To Future Issue and Schedule Only'}).check();
        const sel = wf().locator('select[name="issueId"]').filter({visible: true}).first();
        await sel.waitFor({timeout: T});
        await sel.selectOption({label: FUTURE});
        const sv = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await wf().getByRole('button', {name: 'Save', exact: true}).last().click();
        const svr = await sv;
        await idle(page); await pause(800);
        await snap('n1-settings-saved');
        const pb = controls().getByRole('button', {name: /^(Schedule For Publication|Publish)$/}).first();
        await pb.waitFor({state: 'visible', timeout: T});
        const pbLabel = flat(await pb.innerText(), 60);
        await pause(800);
        await pb.click();
        const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
        const win = page.getByRole('dialog').filter({hasText: /Are you sure you want to (publish|schedule)|requirements have been met/}).last();
        await panel.or(win).first().waitFor({state: 'visible', timeout: T});
        await idle(page); await pause(1000);
        if (await panel.isVisible().catch(() => false)) {
            await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
            await win.waitFor({timeout: T}); await idle(page); await pause(800);
        }
        const winText = flat(await win.innerText().catch(() => null), 600);
        const pr = page.waitForResponse((r) => /\/publish(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await win.getByRole('button', {name: /^(Publish|Schedule For Publication|Schedule)$/}).last().click();
        const p = await pr;
        await idle(page); await pause(1000);
        await snap('n1-scheduled');
        fact('n1-schedule', {save: svr ? svr.status() : null, button: pbLabel, window: winText, status: p ? p.status() : null, pubs: pubs(1)});
        const fut = await openToc('Future Issues', FUTURE, 'n1-future-toc');
        const back = await openToc('Back Issues', BACK, 'n1-back-toc');
        await signOut(page); await idle(page).catch(() => {});
        fact('n1-lists', {futureRows: fut.rows, futureToc: fut.toc, backRows: back.rows, backToc: back.toc, backIssuePage: await issuePageTitles('n1-back-issue-page')});

        // N2. Remove on an article whose only version is in the issue.
        await signIn(page, 'dbarnes');
        const t = await openToc('Back Issues', BACK, 'n2-back-toc');
        const row = t.tp.locator('tr.gridRow').filter({hasText: 'Antimicrobial, heavy metal resistance'}).first();
        await row.locator('a.show_extras').click();
        const ctl = row.locator('xpath=following-sibling::tr[1]');
        await ctl.getByRole('link', {name: 'Remove', exact: true}).click();
        const d = page.locator('[role="dialog"]:visible').filter({hasText: /remove this article/}).last();
        await d.waitFor({timeout: T}); await idle(page); await pause(500);
        const w = page.waitForResponse((r) => r.request().method() === 'POST' && /remove-article|removeArticle/.test(r.url()), {timeout: T}).catch(() => null);
        await d.getByRole('button', {name: 'OK', exact: true}).click();
        const r = await w;
        await idle(page); await pause(1200);
        const after = await openToc('Back Issues', BACK, 'n2-back-toc-after');
        await signOut(page); await idle(page).catch(() => {});
        const st = await go(cu('/article/view/17'));
        await snap('n2-article-17');
        fact('n2-remove', {status: r ? r.status() : null, body: r ? flat(await r.text().catch(() => null), 200) : null, rows: after.rows, toc: after.toc, article17: st, pubs17: pubs(17), backIssuePage: await issuePageTitles('n2-back-issue-page')});
    } finally {
        record('neighbour-facts', facts);
        await close();
    }
});
