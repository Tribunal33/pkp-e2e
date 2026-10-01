// Issue report walk: docs/issues/U50-A17-A18-issue-lists-article-published-outside-it.md
// (spec U50 register A17, A18). Takes the report's Steps on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), through the screens,
// OJS only (OMP and OPS have no issues). The kit builds nothing.
//   "Signalling Theory Dividends" (submission 1): version 1 published in the
//   current issue "Vol. 1 No. 2 (2014)", version 2 ("The Signalling Theory
//   Dividends Version 2") unpublished.
//   1–4  dbarnes: version 2's "Publication Settings", "Don't Assign To An Issue",
//        "Save", "Publish" (the window's text read).
//        [3.5, which has no "Don't Assign To An Issue": version 2's "Issue",
//        "Change Issue", "Vol. 2 No. 1 (2015)", "Save", "Publish" › "Publish";
//        then Issues › "Future Issues" › "Vol. 2 No. 1 (2015)" › "Publish Issue",
//        the email box unticked, "OK".]
//   5–6  signed out: the issue's page, the article's link, the article's page.
//   7    dbarnes: Issues › Back Issues "Items", the issue's "Table of Contents" tab.
//   8    the row's "Remove", "OK".
//   9    the tab reopened, "Items", the issue's page, the article's page and
//        version 1's page, the workflow's status.
//   10   (RECOVER=1) dbarnes opens version 1 in the workflow (3.5: "All Versions" ›
//        "Version 1: Unpublished") and publishes it again; its page read signed out.
// Database reads (publications of submission 1) are evidence only.
//
// Reset first:  npm run fleet-prep -- --feature issues-w22 --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-w22 PROBE_AGENT=w22 node bin/probe.js ojs shared/playwright/checks/issues/issue-lists-article-published-outside-it/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w22-3_5 --dataset 4 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w22-3_5 PROBE_AGENT=w22 node bin/probe.js ojs <this file>
// Facts: .reports/<feature>/w22/facts[-<run>]-ojs.json
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const REPO = path.resolve(__dirname, '../../../../..');
const SUB = 1;
const ISSUE = 'Vol. 1 No. 2 (2014)';
const OTHER = 'Vol. 2 No. 1 (2015)';   // 3.5 only

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`[${app.name}] no issues in this app: nothing to walk`); return; }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const q = (s) => (sql(app, s) || '').trim();
    const pubs = () => q(`select publication_id||' status '||status||' issue '||coalesce(issue_id::text,'-')||' seq '||seq from publications where submission_id=${SUB} order by publication_id`).split('\n');
    const current = () => q(`select current_publication_id from submissions where submission_id=${SUB}`);
    const issueId = q(`select issue_id from issues i where volume=1 and number='2' and year=2014`);
    const v1 = q(`select min(publication_id) from publications where submission_id=${SUB}`);
    const v2 = q(`select max(publication_id) from publications where submission_id=${SUB}`);
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null, issueId, v1, v2, pubs: pubs(), current: current()});

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
    const cu = (p = '') => app.url(`/index.php/${app.contextPath}${p}`);
    const go = async (u) => { const r = await page.goto(u).catch((e) => ({err: flat(e.message, 200)})); await idle(page).catch(() => {}); return r && typeof r.status === 'function' ? r.status() : r; };
    const wf = () => page.locator('[role="dialog"]:visible').first();
    const controls = () => page.locator('[data-cy="workflow-controls-right"]');
    // main names the version in the menu key (publication_<id>_issue); 3.5 does not.
    const menuKey = (key) => (app.line === 'stable-3_5_0' ? `publication_${key}` : `publication_${v2}_${key}`);
    const wfUrl = (key) => cu(`/dashboard/editorial?workflowSubmissionId=${SUB}${key ? `&workflowMenuKey=${menuKey(key)}` : ''}`);
    let n = 0;
    const snap = async (label, extra) => {
        let s; try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: flat(e.message, 200)}; }
        if (extra) s.facts = extra;
        const name = `${String(++n).padStart(2, '0')}-${label}`;
        record(name, s); await shot(page, name).catch(() => {});
        return s;
    };

    async function readIssuePage(label) {
        const status = await go(cu(`/issue/view/${issueId}`));
        await snap(label);
        const toc = await page.evaluate(() => {
            const f = (x) => (x || '').replace(/\s+/g, ' ').trim();
            return [...document.querySelectorAll('.obj_issue_toc .sections .section')].map((sec) => ({
                heading: f(sec.querySelector('h2')?.innerText) || null,
                articles: [...sec.querySelectorAll('.obj_article_summary')].map((a) => ({title: f(a.querySelector('.title')?.innerText), href: a.querySelector('.title a')?.getAttribute('href') || null})),
            }));
        }).catch((e) => ({error: flat(e.message, 200)}));
        return {status, toc};
    }
    async function readArticlePage(url, label) {
        const status = await go(url);
        await snap(label);
        const page_ = await page.evaluate(() => {
            const f = (x) => (x || '').replace(/\s+/g, ' ').trim();
            return {
                h1: f(document.querySelector('h1')?.innerText),
                breadcrumb: f(document.querySelector('.cmp_breadcrumbs')?.innerText),
                issueLine: f(document.querySelector('.item.issue')?.innerText) || null,
                published: f(document.querySelector('.item.published')?.innerText) || null,
                versions: [...document.querySelectorAll('.versions li')].map((li) => f(li.innerText)),
            };
        }).catch((e) => ({error: flat(e.message, 200)}));
        return {status, url: page.url().replace(/^https?:\/\/[^/]+/, ''), ...page_};
    }
    async function backIssues() {
        await go(cu('/manageIssues'));
        await page.getByRole('tab', {name: 'Back Issues', exact: true}).click(); await idle(page);
        const panel = page.getByRole('tabpanel', {name: 'Back Issues'});
        await panel.locator('table').first().waitFor({timeout: T});
        await idle(page); await pause(500);
        const rows = await panel.locator('tr.gridRow').allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => []);
        return {panel, rows};
    }
    async function openToc(label) {
        const {panel, rows} = await backIssues();
        await panel.getByRole('link', {name: ISSUE, exact: true}).first().click();
        const dlg = page.getByRole('dialog', {name: /^Issue Management/});
        await dlg.waitFor({timeout: T}); await idle(page); await pause(500);
        await dlg.getByRole('tab', {name: 'Table of Contents', exact: true}).click(); await idle(page);
        const tp = dlg.getByRole('tabpanel', {name: 'Table of Contents'});
        await tp.locator('table').first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await pause(800);
        const toc = await tp.locator('tbody tr').evaluateAll((trs) => trs.filter((tr) => tr.getClientRects().length && !tr.classList.contains('row_controls'))
            .map((tr) => tr.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch((e) => [`err ${String(e.message).slice(0, 100)}`]);
        await snap(label, {backIssueRows: rows, toc});
        return {dlg, tp, rows, toc};
    }

    try {
        // 1–3. dbarnes: version 2's Publication Settings, "Don't Assign To An Issue", Save.
        await signIn(page, 'dbarnes');
        await go(wfUrl('issue'));
        await wf().waitFor({timeout: T});
        await wf().locator('input[name="assignment"]').or(wf().getByRole('button', {name: 'Change Issue', exact: true})).first().waitFor({state: 'visible', timeout: T});
        await idle(page); await pause(800);
        const radios = await wf().locator('input[name="assignment"]').evaluateAll((els) => els.map((r) => ({value: r.value, checked: r.checked, label: (r.closest('label')?.innerText || '').replace(/\s+/g, ' ').trim()})));
        // main: "Don't Assign To An Issue". 3.5 has no such choice (only an "Issue" select):
        // there version 2 goes to "Vol. 2 No. 1 (2015)", is scheduled, and that issue is published.
        const issueless = radios.some((r) => /Don't Assign/.test(r.label));
        await snap('02-publication-settings', {radios, issueless});
        if (issueless) {
            await wf().getByRole('radio', {name: "Don't Assign To An Issue"}).check();
        }
        let saveIn = wf();
        if (!issueless) {
            // 3.5: the "Issue" line's "Change Issue" opens a window with the "Issue" select.
            await wf().getByRole('button', {name: 'Change Issue', exact: true}).click();
            saveIn = page.locator('[role="dialog"]:visible').filter({has: page.locator('select[name="issueId"]')}).last();
            await saveIn.locator('select[name="issueId"]').waitFor({state: 'visible', timeout: T});
            await idle(page); await pause(500);
            await saveIn.locator('select[name="issueId"]').selectOption({label: OTHER});
            await snap('02b-change-issue');
        }
        const sv = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await saveIn.getByRole('button', {name: 'Save', exact: true}).last().click();
        const svr = await sv;
        await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 6000}).catch(() => {});
        await idle(page); await pause(500);
        await snap('03-saved');
        fact('3-save', {radios, issueless, status: svr ? svr.status() : null, pubs: pubs()});

        // 4. Publish (3.5: "Schedule For Publication").
        const pbName = /^(Schedule For Publication|Publish)$/;
        const right = controls().getByRole('button', {name: pbName}).filter({visible: true});
        const pb = (await right.count()) ? right.first() : wf().getByRole('button', {name: pbName}).filter({visible: true}).last();
        await pb.waitFor({state: 'visible', timeout: T});
        const pbLabel = flat(await pb.innerText(), 60);
        await pause(800);
        await pb.click();
        const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
        const win = page.getByRole('dialog').filter({hasText: /Are you sure you want to (publish|schedule)|requirements have been met/}).last();
        await panel.or(win).first().waitFor({state: 'visible', timeout: T});
        await idle(page); await pause(1000);
        let panelText = null;
        if (await panel.isVisible().catch(() => false)) {
            panelText = flat(await panel.innerText().catch(() => null), 1200);
            await snap('04a-review-publishing-details');
            await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
            await win.waitFor({timeout: T});
            await idle(page); await pause(800);
        }
        const winText = flat(await win.innerText().catch(() => null), 900);
        await snap('04-publish-window');
        const pr = page.waitForResponse((r) => /\/publish(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await win.getByRole('button', {name: /^(Publish|Schedule For Publication|Schedule)$/}).last().click();
        const p = await pr;
        await page.getByRole('button', {name: /^(Unpublish|Unschedule)$/}).first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await pause(800);
        await snap('04-published');
        fact('4-publish', {button: pbLabel, panel: panelText, window: winText, status: p ? p.status() : null, pubs: pubs(), current: current()});

        if (!issueless) {
            // 4a (3.5). Issues › Future Issues › "Vol. 2 No. 1 (2015)" › "Publish Issue", the mail box unticked, "OK".
            await go(cu('/manageIssues'));
            await page.getByRole('tab', {name: 'Future Issues', exact: true}).click(); await idle(page);
            const fp = page.getByRole('tabpanel', {name: 'Future Issues'});
            await fp.locator('table').first().waitFor({timeout: T});
            const frow = fp.locator('tr.gridRow').filter({has: page.getByRole('link', {name: OTHER, exact: true})}).first();
            await frow.locator('a.show_extras').click();
            const fctl = frow.locator('xpath=following-sibling::tr[contains(@class,"row_controls")][1]');
            await fctl.getByRole('link', {name: 'Publish Issue', exact: true}).click();
            const pd = page.getByRole('dialog', {name: 'Publish Issue', exact: true});
            await pd.locator('input[name="sendIssueNotification"]').waitFor({timeout: T});
            await idle(page); await pause(500);
            await pd.locator('input[name="sendIssueNotification"]').uncheck();
            await snap('04b-publish-issue');
            const ir = page.waitForResponse((r) => /publish-issue|publishIssue/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
            await pd.getByRole('button', {name: 'OK', exact: true}).click();
            const irr = await ir;
            await pd.waitFor({state: 'detached', timeout: T}).catch(() => {});
            await idle(page); await pause(800);
            await snap('04b-issue-published');
            fact('4b-publish-issue', {status: irr ? irr.status() : null, pubs: pubs(), current: current()});
        }

        // 5–6. Signed out: the issue's page, the article's link, its page.
        await signOut(page); await idle(page).catch(() => {});
        const issue1 = await readIssuePage('05-issue-page');
        fact('5-issue-page', issue1);
        const link = (Array.isArray(issue1.toc) ? issue1.toc.flatMap((s) => s.articles) : []).find((a) => a.href && /Signalling Theory Dividends/.test(a.title));
        fact('6-article-page', link ? await readArticlePage(link.href, '06-article-page') : {noLink: true});
        fact('6-version-1-page', await readArticlePage(cu(`/article/view/${SUB}/version/${v1}`), '06-version-1-page'));

        // 7. dbarnes: Items and the Table of Contents tab.
        await signIn(page, 'dbarnes');
        const t7 = await openToc('07-toc-tab');
        fact('7-back-issues-and-toc', {backIssueRows: t7.rows, toc: t7.toc});

        // 8. Remove on the row.
        const row = t7.tp.locator('tr.gridRow').filter({hasText: 'The Signalling Theory Dividends Version 2'}).first();
        let remove = {row: false};
        if (await row.count()) {
            const arrow = row.locator('a.show_extras');
            if (await arrow.count()) await arrow.click();
            const ctl = row.locator('xpath=following-sibling::tr[1]');
            await ctl.getByRole('link').first().waitFor({timeout: 10000}).catch(() => {});
            const links = (await ctl.getByRole('link').allInnerTexts()).map((x) => flat(x, 60)).filter(Boolean);
            await ctl.getByRole('link', {name: 'Remove', exact: true}).click();
            const d = page.locator('[role="dialog"]:visible').filter({hasText: /remove this article/}).last();
            await d.waitFor({timeout: T}); await idle(page); await pause(500);
            const confirmText = flat(await d.innerText().catch(() => null), 500);
            await snap('08-remove-confirm');
            const w = page.waitForResponse((r) => r.request().method() === 'POST' && /remove-article|removeArticle/.test(r.url()), {timeout: T}).catch(() => null);
            await d.getByRole('button', {name: 'OK', exact: true}).click();
            const r = await w;
            await idle(page); await pause(1200);
            const tocSame = await t7.tp.locator('tbody tr').evaluateAll((trs) => trs.filter((tr) => tr.getClientRects().length && !tr.classList.contains('row_controls'))
                .map((tr) => tr.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch((e) => [`err ${String(e.message).slice(0, 100)}`]);
            await snap('08-after-remove');
            remove = {row: true, links, confirmText, status: r ? r.status() : null, body: r ? flat(await r.text().catch(() => null), 300) : null, tocSameWindow: tocSame, pubs: pubs(), current: current()};
        }
        fact('8-remove', remove);

        // 9. After: the tab reopened, Items, the workflow; signed out the pages.
        const t9 = await openToc('09-toc-tab-reopened');
        await go(wfUrl('issue'));
        await wf().waitFor({timeout: T}).catch(() => {});
        await idle(page); await pause(1500);
        const wfs = await snap('09-workflow');
        const wfHead = flat((wfs.text && wfs.text.dialog) || '', 500);
        const wfControls = await controls().getByRole('button').allInnerTexts().catch(() => []);
        await signOut(page); await idle(page).catch(() => {});
        const issue9 = await readIssuePage('09-issue-page');
        const art9 = await readArticlePage(cu(`/article/view/${SUB}`), '09-article-page');
        const v1p = await readArticlePage(cu(`/article/view/${SUB}/version/${v1}`), '09-version-1-page');
        fact('9-after', {backIssueRows: t9.rows, toc: t9.toc, workflowHead: wfHead, workflowControls: wfControls, issuePage: issue9, articlePage: art9, version1Page: v1p, pubs: pubs(), current: current()});

        // 10 (RECOVER=1). Can the editor bring version 1 back? dbarnes opens version 1
        // in the workflow, reads what it offers and presses "Publish" when offered.
        if (process.env.RECOVER) {
            await signIn(page, 'dbarnes');
            if (app.line === 'stable-3_5_0') {
                await go(wfUrl('titleAbstract'));
                await wf().waitFor({timeout: T}); await idle(page); await pause(1500);
                await wf().getByRole('button', {name: 'All Versions', exact: true}).click();
                await pause(800);
                const items = await page.getByRole('menuitem').allInnerTexts().catch(() => []);
                record('10-versions-menu', {items});
                await page.getByRole('menuitem').filter({hasText: /^\s*1\s*$|Version 1\b|\(1\)/}).first().click()
                    .catch(async () => { await page.getByRole('menuitem').last().click(); });
            } else {
                await go(cu(`/dashboard/editorial?workflowSubmissionId=${SUB}&workflowMenuKey=publication_${v1}_titleAbstract`));
            }
            await wf().waitFor({timeout: T}); await idle(page); await pause(1500);
            const s10 = await snap('10-version-1-workflow');
            const head10 = flat((s10.text && s10.text.dialog) || '', 600);
            const offered = (await page.locator('[role="dialog"]:visible').getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x, 40)).filter(Boolean);
            const rec = {head: head10, buttons: offered};
            const pbName = /^(Schedule For Publication|Publish)$/;
            const right = controls().getByRole('button', {name: pbName}).filter({visible: true});
            const pb10 = (await right.count()) ? right.first() : wf().getByRole('button', {name: pbName}).filter({visible: true}).last();
            if (await pb10.count()) {
                rec.button = flat(await pb10.innerText(), 60);
                await pb10.click();
                const panel10 = page.getByRole('dialog', {name: 'Review Publishing Details'});
                const win10 = page.getByRole('dialog').filter({hasText: /Are you sure you want to (publish|schedule)|requirements have been met|following requirements/}).last();
                await panel10.or(win10).first().waitFor({state: 'visible', timeout: T}).catch(() => {});
                await idle(page); await pause(1000);
                if (await panel10.isVisible().catch(() => false)) {
                    await pause(1500);
                    rec.panelSelects = await panel10.locator('select').evaluateAll((els) => els.map((e) => ({name: e.name, value: e.value, chosen: e.selectedOptions[0]?.innerText.trim() || null})));
                    rec.panelRadios = await panel10.locator('input[type="radio"]:checked').evaluateAll((els) => els.map((e) => (e.closest('label')?.innerText || e.value).trim()));
                    // Required and arriving empty: the stage the version had (VoR) and "Minor Revision".
                    for (const [sel, val] of [['select[name="versionStage"]', 'VoR'], ['select[name="versionIsMinor"]', 'true']]) {
                        const el = panel10.locator(sel);
                        if ((await el.count()) && !(await el.inputValue().catch(() => ''))) await el.selectOption(val).catch(() => {});
                    }
                    await snap('10-review-publishing-details');
                    await panel10.getByRole('button', {name: 'Confirm', exact: true}).click();
                    await win10.waitFor({timeout: T}).catch(() => {}); await idle(page); await pause(800);
                }
                rec.window = flat(await win10.innerText().catch(() => null), 700);
                await snap('10-publish-window');
                const pr10 = page.waitForResponse((r) => /\/publish(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await win10.getByRole('button', {name: /^(Publish|Schedule For Publication|Schedule)$/}).last().click().catch((e) => { rec.clickError = flat(e.message, 200); });
                const r10 = await pr10;
                rec.status = r10 ? r10.status() : null;
                if (r10 && r10.status() >= 400) rec.body = flat(await r10.text().catch(() => null), 400);
                await idle(page); await pause(1000);
                await snap('10-after-publish');
            }
            rec.pubs = pubs(); rec.current = current();
            await signOut(page); await idle(page).catch(() => {});
            rec.version1Page = await readArticlePage(cu(`/article/view/${SUB}/version/${v1}`), '10-version-1-page');
            rec.articlePage = await readArticlePage(cu(`/article/view/${SUB}`), '10-article-page');
            fact('10-recover', rec);
        }
    } finally {
        fact('serverLog', logSince(logFrom));
        record('facts', facts);
        await close();
    }
});
