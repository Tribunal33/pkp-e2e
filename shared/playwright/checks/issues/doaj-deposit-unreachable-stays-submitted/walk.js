// Issue report walk: docs/issues/U63-OJS9-doaj-deposit-unreachable-stays-submitted.md
// (spec U63 register OJS9). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// on its own journal `publicknowledge`, its manager `rvaca` and `admin`.
// OJS only: OMP and OPS have no DOAJ tool.
//
// Precondition, not built by this script: the server cannot reach DOAJ. A
// dataset fleet's config sets `[proxy]` `http_proxy` and `https_proxy` to
// "http://127.0.0.1:9", where nothing answers.
//
// The kit builds nothing. Everything goes through the screens:
//   steps: rvaca: Tools › "DOAJ Export Plugin"; Settings: "DOAJ API Key"
//      u63ojs9-key, "Save"; reload the page; "Articles": tick "Signalling Theory Dividends",
//      "Register"; reload the page about every ten seconds until the job has
//      failed, twice in all (the dataset's config runs queued jobs on web
//      requests, a retry once 5 s have passed), "Articles" again; the filter's "Error" status; the row's status link when it is
//      one. admin: Administration › "View Failed Jobs".
//   neighbour (walked with and without fix.diff): "Antimicrobial, heavy
//      metal resistance …", the journal's other published article, never
//      ticked, keeps "Not Deposited", and the "Error" filter lists only the
//      deposited article.
// Read beside the screens, for the record only: the job and failed-job rows
// and the article's stored DOAJ status (sql()).
//
// Reset first:  npm run fleet-prep -- --feature issues-ir3 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-ir3 PROBE_AGENT=u63ojs9 node bin/probe.js ojs shared/playwright/checks/issues/doaj-deposit-unreachable-stays-submitted/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=u63ojs9 node bin/probe.js ojs shared/playwright/checks/issues/doaj-deposit-unreachable-stays-submitted/walk.js
// Fix trial:    trial.sh beside this file.
// Facts: .reports/<feature>/u63ojs9/facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const ARTICLE = 'Signalling Theory Dividends';
const OTHER = 'Antimicrobial, heavy metal resistance';
const WAIT_MS = Number(process.env.WAIT_MS || 75_000);

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // the DOAJ tool is OJS's only
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const {DoajPage} = require('../../../pages/ImportExportPages.js');
    const facts = {};
    // Recorded text keeps only the first line of an error and never a query string.
    const clean = (v) => JSON.parse(JSON.stringify(v === undefined ? null : v).replace(/\?[^"\s\\]*/g, '?…'));
    const fact = (k, v) => { facts[k] = clean(v); console.log(`[${app.name}] ${k}: ${JSON.stringify(facts[k]).slice(0, 600)}`); };
    const ctx = app.contextPath;
    const cu = (p) => app.url(`/index.php/${ctx}/en${p}`);
    const q = (s) => { try { return sql(app, s); } catch (e) { return `sql error: ${String(e.message).slice(0, 200)}`; } };
    const jobsState = () => ({
        jobs: q("select count(*) from jobs where payload like '%DOAJ%'"),
        failed: q("select id || ' ' || substr(regexp_replace(exception, E'\\n.*', '', 'g'), 1, 110) from failed_jobs where payload like '%DOAJ%' order by id"),
        stored: q("select s.submission_id || ' ' || s.setting_name || '=' || coalesce(s.setting_value, '') from submission_settings s where s.setting_name like 'doaj::%' union all select p.publication_id || ' pub ' || p.setting_name || '=' || coalesce(p.setting_value, '') from publication_settings p where p.setting_name like 'doaj::%'"),
    });
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, context: ctx,
        doiVersioning: q("select setting_value from journal_settings where setting_name = 'doiVersioning'"),
        doajPlugin: q("select setting_value from plugin_settings where plugin_name = 'doajplugin' and setting_name = 'enabled'")});

    const {page, close} = await launch(app);
    const doaj = new DoajPage(page, ctx);
    let n = 0;
    const snap = async (name) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}`, s); return s; };
    const notices = async () => (await page.locator('.pkp_notification, .pkpNotification, [role="alert"], .pkp_notification_message').allInnerTexts().catch(() => [])).map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
    let listTab = 'Articles';

    async function openTool() {
        await page.goto(cu('/submissions'));
        await idle(page);
        const tools = page.getByRole('navigation', {name: 'Site Navigation'}).getByRole('link', {name: 'Tools', exact: true});
        if (await tools.count()) {
            await Promise.all([page.waitForURL(/management\/tools/, {timeout: T}), tools.first().click()]);
        } else {
            await page.goto(cu('/management/tools'));
            fact('no "Tools" in the side menu, address typed', true);
        }
        await idle(page);
        const link = page.getByRole('link', {name: 'DOAJ Export Plugin', exact: true}).first();
        await link.waitFor({timeout: T});
        await Promise.all([page.waitForURL(/importexport\/plugin/, {timeout: T}), link.click()]);
        await idle(page); await pause(500);
    }
    async function openList() {
        const tabs = (await page.locator('#importExportTabs .ui-tabs-nav li').allInnerTexts()).map((t) => t.trim());
        listTab = tabs.includes('Publications') ? 'Publications' : 'Articles';
        await doaj.openListTab(listTab);
        await pause(300);
    }
    async function rowsNow() {
        const rows = await doaj.rows().evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => (td.innerText || '').replace(/\s+/g, ' ').trim()).join(' | ')));
        return rows;
    }
    const statusOf = async (text) => ((await doaj.row(text).count()) ? (await doaj.row(text).first().locator('td').last().innerText()).trim() : null);

    try {
        // 1. Sign in as rvaca.
        await signIn(page, 'rvaca', {contextPath: ctx});
        // 2. Tools › "DOAJ Export Plugin".
        await openTool();
        fact('tabs', (await page.locator('#importExportTabs .ui-tabs-nav li').allInnerTexts()).map((t) => t.trim()));
        // 3. Settings: the API key, "Save".
        await doaj.expectSettingsLoaded();
        await doaj.apiKeyBox().fill('u63ojs9-key');
        await doaj.save();
        await pause(500);
        fact('3 save notice', await notices());
        await snap('settings-saved');
        // 4. Reload the page ("Register" is offered from the next page load on), "Articles".
        await page.reload(); await idle(page);
        await doaj.expectSettingsLoaded();
        await openList();
        fact('4 list tab', listTab);
        fact('4 buttons', (await doaj.actionButtons().allInnerTexts()).map((t) => t.trim()));
        fact('4 rows', await rowsNow());
        await snap('list-before');
        // 5. Tick the article, "Register".
        const rowCount = await doaj.row(ARTICLE).count();
        fact('5 rows matching the article', rowCount);
        await doaj.row(ARTICLE).first().locator('input[type=checkbox]').check();
        fact('5 validation box', await doaj.validationBox().isChecked());
        const t0 = Date.now();
        const landed = page.waitForResponse((r) => r.request().isNavigationRequest() && r.url().includes('DOAJExportPlugin'), {timeout: 90_000}).catch(() => null);
        const posted = page.waitForResponse((r) => r.request().method() === 'POST' && /exportSubmissions|exportPublications/.test(r.url()), {timeout: 90_000}).catch(() => null);
        await doaj.actionButton('deposit').click();
        const p = await posted; await landed;
        await idle(page); await pause(800);
        fact('5 register request', p ? {status: p.status(), url: p.url().replace(/^https?:\/\/[^/]+/, ''), ms: Date.now() - t0} : null);
        fact('5 url after', page.url().replace(/^https?:\/\/[^/]+/, ''));
        fact('5 notices', await notices());
        await snap('after-register');
        await shot(page, 'after-register');
        if (/importexport\/plugin/.test(page.url())) {
            await openList().catch((e) => fact('5 list not reopened', String(e.message).slice(0, 200)));
            fact('5 status', await statusOf(ARTICLE));
            fact('5 rows', await rowsNow());
        }
        fact('5 jobs', jobsState());

        // 6. Reload about every ten seconds until the job has failed (two reloads after "Register").
        const polls = [];
        const until = Date.now() + WAIT_MS;
        while (Date.now() < until) {
            await pause(10_000);
            await page.reload(); await idle(page);
            const s = jobsState();
            polls.push({s: Math.round((Date.now() - t0) / 1000), ...s});
            if (s.jobs === '0' && s.failed) break;
        }
        await page.reload(); await idle(page);
        fact('6 polls', polls);
        await openList();
        fact('6 status', await statusOf(ARTICLE));
        fact('6 neighbour status', await statusOf(OTHER));
        fact('6 rows', await rowsNow());
        await snap('list-after-wait');
        await shot(page, 'list-after-wait');
        // The status cell: a "Failed" link opens a window with the reason.
        const statusLink = doaj.row(ARTICLE).first().locator('td').last().locator('a');
        if (await statusLink.count()) {
            await statusLink.first().click();
            await page.locator('[data-cy="active-modal"], .pkp_modal_panel, [role="dialog"]').first().waitFor({timeout: T}).catch(() => {});
            await idle(page); await pause(1000);
            // Read, not snapshotted: the window quotes the request's address.
            const s = await screen(page);
            fact('6 status window', s.text && (s.text.dialog || '').slice(0, 600));
            await page.keyboard.press('Escape').catch(() => {});
            await pause(500);
            await page.reload(); await idle(page);
            await openList();
        } else {
            fact('6 status window', 'the status is plain text, no link');
        }
        // 7. The filter's "Error" status.
        await doaj.openFilter();
        const options = (await doaj.filterSelect('statusId').locator('option').allInnerTexts()).map((t) => t.trim());
        fact('7 status options', options);
        if (options.includes('Error')) {
            await doaj.filterByStatus('Error');
            await pause(500);
            fact('7 error rows', await rowsNow());
            fact('7 empty line', (await doaj.grid.locator('tbody.empty td').filter({visible: true}).allInnerTexts().catch(() => [])).map((t) => t.trim()));
            await snap('filter-error');
            await shot(page, 'filter-error');
        } else {
            fact('7 no "Error" status in the filter (3.5 has none)', true);
        }
        // 8. admin: Administration › "View Failed Jobs".
        await signOut(page);
        await signIn(page, 'admin', {contextPath: 'index'});
        await page.goto(app.url('/index.php/index/en/admin'));
        await idle(page);
        const fj = page.getByRole('link', {name: 'View Failed Jobs', exact: true});
        if (await fj.count()) {
            await Promise.all([page.waitForURL(/failedJobs/, {timeout: T}), fj.first().click()]);
        } else {
            fact('8 no "View Failed Jobs" link, address typed', true);
            await page.goto(app.url('/index.php/index/en/admin/failedJobs'));
        }
        await idle(page); await pause(1500);
        const fs8 = await snap('failed-jobs');
        fact('8 failed jobs page', (fs8.text && fs8.text.main || '').slice(0, 900));
        await shot(page, 'failed-jobs');
        fact('end jobs', jobsState());
    } catch (err) {
        fact('ERROR', String(err.stack || err).slice(0, 1200));
        await snap('ERROR').catch(() => {});
        await shot(page, 'ERROR').catch(() => {});
        throw err;
    } finally {
        record('facts', facts);
        await close();
    }
});
