// Kept walk for docs/issues/U63-A5-doaj-daily-deposit-takes-other-journals-articles.md
// (spec U63 register A5). Takes the report's Steps on a fresh load of PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// through the screens, OJS only (OMP and OPS have no DOAJ tool):
//   1. admin: Administration › "Hosted Journals" › "Create Journal": a second
//      journal "u63a5 Journal", path u63a5, Country "Canada", "Enable…" ticked
//      (the dataset has one journal).
//   2. admin, that journal: Tools › "DOAJ Export Plugin" › "Settings": "DOAJ
//      API Key" u63a5-key, the automatic-deposit box ticked, "Save".
//   3. rvaca, publicknowledge: "Articles": tick submission 17, "Mark Registered".
//   4. rvaca: submission 17 › Publication: "Unpublish", then "Publish".
//   5. rvaca: "Articles": 17 reads "Needs Sync", submission 1 "Not Deposited".
//   6. the day's "DOAJ automatic registration task", run at once with pkp's
//      own `php lib/pkp/tools/scheduler.php test --name=<task class>`.
//   7. rvaca: "Articles" again.
// MODE=neighbour (walked with the fix in and out): no second journal;
//   publicknowledge itself saves an API key and ticks automatic deposit after
//   step 5, so its own "Needs Sync" (17) and "Not Deposited" (1) articles must
//   both turn "Submitted".
// On stable-3_5_0 there is no "Needs Sync" status (no stale marking): the
// script records the status filter's choices after step 3, skips steps 4–5
// and still runs 6–7.
// Read beside the screens, for the record only (sql()): the stored DOAJ
// statuses and the queued deposit jobs (which journal's name and link each
// carries). The kit builds nothing.
//
// Reset first:  flock -s .reports/issues/main-code.lock npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset --apps ojs
// Run (main):   flock -s .reports/issues/main-code.lock env PROBE_FEATURE=issues-ir2 PROBE_AGENT=u63a5 node bin/probe.js ojs shared/playwright/checks/issues/doaj-daily-deposit-takes-other-journals-articles/walk.js
// Neighbour:    … MODE=neighbour PROBE_RUN=nb … (same command)
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset --apps ojs
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=u63a5 node bin/probe.js ojs <this file>
// Fix trial:    trial.sh beside this file.
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const MODE = process.env.MODE || 'walk';
const SUB17 = 'Antimicrobial, heavy metal resistance';
const SUB1 = 'Signalling Theory Dividends';
const X = {path: 'u63a5', name: 'u63a5 Journal', initials: 'U5J', contact: 'u63a5 Contact', email: 'u63a5@mailinator.com', key: 'u63a5-key'};

forEachApp(async (app) => {
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    if (app.name !== 'ojs') { fact('surface', 'no DOAJ tool on this app'); record('facts', facts); return; }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const line = app.line || 'main';
    const is35 = line === 'stable-3_5_0';
    const TASK = is35 ? 'APP\\plugins\\importexport\\doaj\\DOAJInfoSender' : 'APP\\plugins\\generic\\doaj\\DOAJInfoSender';
    const {DoajPage} = require('../../../pages/ImportExportPages.js');
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const q = (s) => { try { return sql(app, s); } catch (e) { return `sql error: ${flat(e.message, 200)}`; } };
    const stored = () => q("select s.submission_id || ' ' || s.setting_name || '=' || coalesce(s.setting_value, '') from submission_settings s where s.setting_name like 'doaj::%' order by 1");
    const jobs = () => q(`select id || ' ' || coalesce(substring(payload from 'DOAJ(Register|Delete)'), '?') || ' journal=' || coalesce(substring(replace(payload, E'\\\\', '') from '"journal":[{]"title":"([^"]*)"'), '?') || ' link=' || coalesce(substring(replace(payload, E'\\\\', '') from 'index[.]php/[a-z0-9_]+/article/view/[0-9]+'), '?') from jobs where payload like '%DOAJ%' order by id`);
    const cu = (ctx, p) => app.url(`/index.php/${ctx}/en${p}`);

    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}`, s); return s; };
    const controls = () => page.locator('[data-cy="workflow-controls-right"]');
    const statusLine = async () => flat(await page.locator('[data-cy="workflow-controls-left"]').innerText().catch(() => ''), 150);

    async function openDoaj(ctx) {
        await page.goto(cu(ctx, '/management/tools'));
        await idle(page);
        const link = page.getByRole('link', {name: 'DOAJ Export Plugin', exact: true}).first();
        await link.waitFor({timeout: T});
        await Promise.all([page.waitForURL(/importexport\/plugin/, {timeout: T}), link.click()]);
        await idle(page); await pause(500);
        const doaj = new DoajPage(page, ctx);
        await doaj.expectSettingsLoaded();
        return doaj;
    }
    async function listTab(doaj) {
        const tabs = (await page.locator('#importExportTabs .ui-tabs-nav li').allInnerTexts()).map((t) => t.trim());
        await doaj.openListTab(tabs.includes('Publications') ? 'Publications' : 'Articles');
        await pause(300);
    }
    const statusOf = async (doaj, text) => ((await doaj.row(text).count()) ? flat(await doaj.row(text).first().locator('td').last().innerText(), 60) : null);
    const rowsNow = async (doaj) => doaj.rows().evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => (td.innerText || '').replace(/\s+/g, ' ').trim()).join(' | ')));
    async function saveSettings(doaj, key, label) {
        await doaj.apiKeyBox().fill(key);
        if (!(await doaj.autoBox().isChecked())) await doaj.autoBox().check();
        fact(`${label} automatic box label`, flat(await page.locator('#doajSettingsForm').innerText().catch(() => ''), 600));
        await doaj.save();
        await pause(500);
        await page.reload(); await idle(page);
        await doaj.expectSettingsLoaded();
        fact(`${label} settings after reload`, {apiKey: await doaj.apiKeyBox().inputValue(), automatic: await doaj.autoBox().isChecked()});
        await snap(`${label}-settings-saved`);
    }

    try {
        if (MODE === 'walk') {
            // 1. admin: Administration › "Hosted Journals" › "Create Journal".
            await signIn(page, 'admin', {contextPath: 'index'});
            const hosted = new HostedJournalsPage(page, {hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal'});
            await page.goto(app.url('/index.php/index/en/admin'));
            await idle(page);
            await page.getByRole('main').getByRole('link', {name: 'Hosted Journals', exact: true}).click();
            await page.waitForURL(/\/admin\/contexts/, {timeout: T, waitUntil: 'commit'});
            await hosted.expectOpen();
            const win = await hosted.openCreate();
            await win.type(win.title('en'), X.name);
            await win.type(win.initials('en'), X.initials);
            if (await win.abbreviation('en').isVisible().catch(() => false)) await win.type(win.abbreviation('en'), X.initials);
            await win.type(win.contactName, X.contact);
            await win.type(win.contactEmail, X.email);
            await win.country.selectOption({label: 'Canada'});
            await win.type(win.path, X.path);
            await win.setBox(win.languageBox('en'), true);
            await win.setBox(win.primaryChoice('en'), true);
            await win.setBox(win.enableBox, true);
            await snap('1-create-journal-filled');
            const r = await win.pressSave();
            fact('1 create journal', {status: r.status()});
            await page.waitForLoadState('load').catch(() => {});
            await idle(page); await pause(1500);
            fact('1 landed', page.url().replace(/^https?:\/\/[^/]+/, ''));
            await snap('1-after-create');
            fact('1 journals', q("select journal_id || ' ' || path || ' enabled=' || enabled from journals order by journal_id"));

            // 2. The new journal's Tools › "DOAJ Export Plugin" › Settings.
            const dx = await openDoaj(X.path);
            await saveSettings(dx, X.key, '2-u63a5');
            await listTab(dx);
            fact('2 u63a5 articles', await rowsNow(dx));
            fact('2 u63a5 empty line', (await dx.grid.locator('tbody.empty td').filter({visible: true}).allInnerTexts().catch(() => [])).map((t) => t.trim()));
            await snap('2-u63a5-articles');
            await signOut(page);
        }

        // 3. rvaca, publicknowledge: "Articles", tick 17, "Mark Registered".
        await signIn(page, 'rvaca', {contextPath: app.contextPath});
        let d = await openDoaj(app.contextPath);
        await listTab(d);
        fact('3 rows before', await rowsNow(d));
        await d.rowBox(SUB17).first().check();
        await d.pressAndLand('markRegistered');
        await listTab(d);
        fact('3 status 17 after Mark Registered', await statusOf(d, SUB17));
        await snap('3-marked-registered');
        await d.openFilter();
        const statuses = (await d.filterSelect('statusId').locator('option').allInnerTexts()).map((t) => t.trim());
        fact('3 status filter choices', statuses);

        if (statuses.includes('Needs Sync')) {
            // 4. Submission 17 › Publication: "Unpublish", then "Publish".
            const pub = q('select current_publication_id from submissions where submission_id = 17');
            const wfUrl = cu(app.contextPath, `/dashboard/editorial?workflowSubmissionId=17&workflowMenuKey=publication_${pub}_titleAbstract`);
            await page.goto(wfUrl);
            await idle(page);
            await controls().waitFor({timeout: T});
            await pause(800);
            fact('4 status line before', await statusLine());
            await controls().getByRole('button', {name: 'Unpublish', exact: true}).click();
            const unwin = page.getByRole('dialog').filter({hasText: /Are you sure you don't want this to be/}).last();
            await unwin.waitFor({timeout: T});
            fact('4 unpublish window', flat(await unwin.innerText(), 300));
            const uw = page.waitForResponse((x) => /\/unpublish/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await unwin.getByRole('button', {name: 'Unpublish', exact: true}).click();
            const ur = await uw;
            fact('4 unpublish answered', ur ? ur.status() : null);
            await pause(1500); await idle(page);
            fact('4 status line after unpublish', await statusLine());
            await snap('4-unpublished');

            const button = controls().getByRole('button', {name: /^(Schedule For Publication|Publish)$/}).first();
            await button.waitFor({state: 'visible', timeout: T});
            fact('4 publish button', flat(await button.innerText(), 60));
            await pause(800);
            await button.click();
            const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
            const confirm = page.getByRole('dialog').filter({hasText: /Are you sure you want to/}).last();
            const which = () => Promise.race([
                panel.getByRole('button', {name: 'Confirm', exact: true}).waitFor({state: 'visible', timeout: 15_000}).then(() => 'panel'),
                confirm.waitFor({state: 'visible', timeout: 15_000}).then(() => 'confirm'),
            ]).catch(() => null);
            let opened = await which();
            if (!opened) { await button.click({timeout: 5_000}).catch(() => {}); opened = await which(); }
            fact('4 publish opened', opened);
            await idle(page); await pause(600);
            if (opened === 'panel') {
                fact('4 publish panel', flat(await panel.innerText(), 700));
                await snap('4-publish-panel');
                await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
                await confirm.waitFor({state: 'visible', timeout: T});
                await idle(page); await pause(600);
            }
            fact('4 publish confirm', flat(await confirm.innerText(), 400));
            const pw = page.waitForResponse((x) => /\/publications\/\d+\/publish/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await confirm.getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).last().click();
            const pr = await pw;
            fact('4 publish answered', pr ? pr.status() : null);
            await pause(1500); await idle(page);
            fact('4 status line after publish', await statusLine());
            await snap('4-published-again');

            // 5. "Articles": 17 "Needs Sync", 1 "Not Deposited".
            d = await openDoaj(app.contextPath);
            await listTab(d);
            fact('5 status 17', await statusOf(d, SUB17));
            fact('5 status 1', await statusOf(d, SUB1));
            await snap('5-needs-sync');
        } else {
            fact('4-5 skipped', 'no "Needs Sync" status on this line: the state the steps need cannot be reached');
            d = await openDoaj(app.contextPath);
            await listTab(d);
        }
        if (MODE === 'neighbour') {
            // Neighbour: publicknowledge deposits automatically itself
            // (the tool page opens on "Settings").
            d = await openDoaj(app.contextPath);
            await saveSettings(d, 'u63a5-pk-key', 'nb-publicknowledge');
        }
        fact('5 stored', stored());
        fact('5 jobs', jobs());

        // 6. The day's "DOAJ automatic registration task", run at once.
        let out;
        try {
            out = execFileSync('php', ['lib/pkp/tools/scheduler.php', 'test', `--name=${TASK}`], {cwd: app.root, env: {...process.env, PKP_CONFIG_FILE: app.configFile}, encoding: 'utf8', timeout: 180_000});
        } catch (e) {
            out = `exit ${e.status}: ${e.stdout || ''}${e.stderr || ''}`;
        }
        fact('6 scheduler output', flat(out, 600));
        fact('6 stored', stored());
        fact('6 jobs', jobs());

        // 7. rvaca: "Articles" again.
        d = await openDoaj(app.contextPath);
        await listTab(d);
        fact('7 status 17', await statusOf(d, SUB17));
        fact('7 status 1', await statusOf(d, SUB1));
        fact('7 rows', await rowsNow(d));
        await snap('7-after-daily-run');
        await shot(page, '7-after-daily-run');
        fact('7 stored', stored());
        const j7 = jobs();
        fact('7 jobs', j7);
        // The link the queued deposit carries, as a reader's browser answers it.
        const link = (String(j7).match(/index\.php\/[a-z0-9_]+\/article\/view\/[0-9]+/) || [])[0];
        if (link) {
            const r = await page.request.get(app.url(`/${link}`), {failOnStatusCode: false});
            fact('7 deposited link answers', {link, status: r.status()});
        }
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
