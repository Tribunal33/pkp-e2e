// Issue report walk: docs/issues/U19-A11-oai-driver-set-misses-withdrawn-articles.md
// (spec U19 register A11). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// OJS only (DRIVER is an OJS plugin): its `dbarnes`, `publicknowledge`,
// submissions 17, 1 (in "Vol. 1 No. 2 (2014)") and 5 (Production). Nothing is
// created beyond what the steps say; the kit builds nothing. Step numbers are
// the report's:
//   1   dbarnes: Settings › Website › Plugins › tick "DRIVER"
//   2   signed out: ListIdentifiers set=driver
//   3   dbarnes: submission 17 › "Unpublish" (control: an article in an issue)
//   4   signed out: set=driver; GetRecord article/17
//   5   dbarnes: Issues › Back Issues › "Vol. 1 No. 2 (2014)" › "Delete" › "OK"
//   6   signed out: set=driver; GetRecord article/1; the journal's whole list
//   7   (main only) dbarnes: submission 5 › Galleys › "Add galley" "PDF"
//       (the dataset gives it none), "Article Text", article.pdf
//   8   dbarnes: submission 5 › "Schedule For Publication" ›
//       "Don't Assign To An Issue" › "Confirm" › "Publish"
//   9   signed out: set=driver
//   10  dbarnes: submission 5 › "Unpublish"
//   11  signed out: set=driver; GetRecord article/5
// Each OAI read records the browser view (screen()) and the raw answer's
// headers; each action records the server log lines it added that name
// DRIVERPlugin or a TypeError; beside it (Evidence only) the tombstones'
// stored `driver` settings.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w13 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-w13 PROBE_AGENT=w13 node bin/probe.js ojs shared/playwright/checks/issues/oai-driver-set-misses-withdrawn-articles/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w13-3_5 PROBE_AGENT=w13 node bin/probe.js ojs <this file>
// Facts: .reports/<feature>/w13/facts[-<run>]-ojs.json
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const REPO = path.resolve(__dirname, '../../../../..');
const ISSUE = 'Vol. 1 No. 2 (2014)';
const PDF = path.join(REPO, 'apps/ojs/playwright/fixtures/files/article.pdf');

/** The OAI answer as data: error and headers. */
function parseOai(body) {
    const records = [];
    const re = /<header( status="deleted")?>([\s\S]*?)<\/header>/g;
    let m;
    while ((m = re.exec(body))) {
        const inner = m[2];
        records.push({
            identifier: (inner.match(/<identifier>([^<]+)<\/identifier>/) || [])[1] || null,
            deleted: !!m[1],
            setSpecs: [...inner.matchAll(/<setSpec>([^<]+)<\/setSpec>/g)].map((x) => x[1]),
        });
    }
    return {error: (body.match(/<error code="([^"]+)">([^<]*)<\/error>/) || [null]).slice(1).join(': ') || null, records};
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    if (app.name !== 'ojs') return;
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    const line = app.line || 'main';
    const ctx = app.contextPath;
    const repoId = (fs.readFileSync(path.resolve(REPO, app.configFile), 'utf8').match(/^repository_id\s*=\s*"?([^"\n]+)"?/m) || [])[1];
    const LOG = path.join(REPO, `apps/ojs/playwright/.server-logs/server-${app.port}-ds${app.dataset}.log`);
    fact('fleet', {line, dataset: app.dataset, port: app.port, run: process.env.PROBE_RUN || null, repoId, log: path.relative(REPO, LOG)});
    let n = 0;
    const rec = async (page, label) => {
        const name = `${String(++n).padStart(2, '0')}-${label}`;
        try { record(name, await screen(page)); } catch (e) { record(name, {error: String(e).slice(0, 300), url: page.url()}); }
    };

    // The server log lines an action adds that name the DRIVER plugin or a TypeError.
    const logMark = () => { try { return fs.statSync(LOG).size; } catch { return 0; } };
    const logSince = (mark) => {
        try {
            const buf = fs.readFileSync(LOG);
            return buf.subarray(mark).toString('utf8').split('\n').filter((l) => /DRIVERPlugin|TypeError/.test(l)).slice(0, 6).map((l) => l.slice(0, 400));
        } catch (e) { return [`(log unreadable: ${e.message})`]; }
    };
    const tombs = () => (sql(app, "select t.oai_identifier||' driver='||coalesce(s.setting_value,'(none)') from data_object_tombstones t left join data_object_tombstone_settings s on s.tombstone_id=t.tombstone_id and s.setting_name='driver' order by t.tombstone_id") || '').trim().split('\n').filter(Boolean);

    // Signed out: a browser types the OAI address; the raw answer comes from the same context.
    const oai = async (label, q) => {
        const {page, close} = await launch(app);
        try {
            const rel = `/index.php/${ctx}/oai?${q}`;
            await page.goto(app.url(rel));
            await pause(200);
            await rec(page, `oai-${label}`);
            const res = await page.request.get(app.url(rel));
            const o = parseOai(await res.text());
            return {address: rel, status: res.status(), error: o.error,
                records: o.records.map((r) => `${r.identifier.replace(/^oai:[^:]+:/, '')}${r.deleted ? ' (deleted)' : ''} [${r.setSpecs.join(', ')}]`)};
        } finally { await close(); }
    };
    const driverSet = (label) => oai(label, 'verb=ListIdentifiers&metadataPrefix=oai_dc&set=driver');
    const getRecord = (label, id) => oai(label, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(`oai:${repoId}:article/${id}`)}`);

    // ---- workflow helpers (from the U19 A1 and A7 walks) ----
    const right = (page) => page.locator('[data-cy="workflow-controls-right"]');
    const status = async (page) => flat(await page.locator('[data-cy="workflow-controls-left"]').innerText().catch(() => ''));
    const openTitleAbstract = async (page, id) => {
        await page.goto(app.url(`/index.php/${ctx}/en/dashboard/editorial?workflowSubmissionId=${id}`));
        await idle(page); await pause(1000);
        const link = page.getByRole('link', {name: 'Title & Abstract', exact: true}).first();
        if (!(await link.isVisible().catch(() => false))) {
            await page.getByRole('link', {name: 'Publication', exact: true}).first().click().catch(() => {});
        }
        await link.click();
        await page.locator('h2', {hasText: 'Title & Abstract'}).first().waitFor({timeout: T});
        await idle(page); await pause(1000);
        await rec(page, `workflow-${id}`);
    };
    const unpublish = async (page) => {
        const button = right(page).getByRole('button', {name: 'Unpublish', exact: true});
        await button.first().waitFor({timeout: T});
        await button.first().click();
        const dialog = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Unpublish', exact: true})}).last();
        await dialog.waitFor({timeout: T});
        await rec(page, 'unpublish-confirm');
        const question = flat(await dialog.innerText()).slice(0, 200);
        const done = page.waitForResponse((r) => /\/unpublish(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
        await dialog.getByRole('button', {name: 'Unpublish', exact: true}).last().click();
        const r = await done;
        await idle(page); await pause(500);
        await rec(page, 'unpublished');
        return {question, answer: r.status(), status: await status(page)};
    };
    const publishNoIssue = async (page) => {
        const button = right(page).getByRole('button', {name: /^(Schedule For Publication|Publish)$/});
        await button.first().waitFor({timeout: T});
        const out = {pressed: flat(await button.first().innerText())};
        await button.first().click();
        const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
        const panelConfirm = panel.getByRole('button', {name: 'Confirm', exact: true});
        const confirm = page.getByRole('dialog')
            .filter({hasText: /requirements have been met|Are you sure you want to/})
            .filter({has: page.getByRole('button', {name: /^(Publish|Schedule For Publication)$/})}).last();
        await panelConfirm.waitFor({timeout: T});
        const stage = panel.locator('select[name="versionStage"]');
        if ((await stage.isVisible().catch(() => false)) && !(await stage.inputValue())) await stage.selectOption('VoR');
        const minor = panel.locator('select[name="versionIsMinor"]');
        if ((await minor.isVisible().catch(() => false)) && !(await minor.inputValue())) await minor.selectOption('false');
        await panel.getByRole('radio', {name: "Don't Assign To An Issue"}).check();
        await rec(page, 'publish-panel');
        await panelConfirm.click();
        await confirm.waitFor({timeout: T});
        await rec(page, 'publish-confirm');
        out.question = flat(await confirm.innerText()).slice(0, 200);
        const done = page.waitForResponse((r) => /\/publish(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
        await confirm.getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).last().click();
        out.answer = (await done).status();
        await idle(page); await pause(500);
        out.status = await status(page);
        await rec(page, 'published');
        return out;
    };
    // An editor's action, signed in as dbarnes in a browser of its own; returns its result and the log lines it added.
    const asEditor = async (label, fn) => {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'dbarnes');
            const mark = logMark();
            const result = await fn(page);
            await pause(300);
            fact(label, {...result, serverLog: logSince(mark)});
            await signOut(page);
        } finally { await close(); }
    };

    // Step 1: dbarnes ticks "DRIVER".
    await asEditor('step 1 tick DRIVER', async (page) => {
        const {WebsitePluginsPage} = require('../../../pages/PluginsPages.js');
        const plugins = new WebsitePluginsPage(page, ctx);
        await plugins.goto();
        const r = await plugins.list.tick('driverplugin');
        await rec(page, 'driver-ticked');
        const notice = flat(await page.locator('.pkp_notification, [role="status"], [role="alert"]').allInnerTexts().catch(() => [])).slice(0, 200);
        return {answer: r.status(), notice};
    });
    // Step 2
    fact('step 2 set=driver', await driverSet('s2-set'));

    // Step 3 (control): submission 17, in the issue, unpublished.
    await asEditor('step 3 unpublish 17', async (page) => { await openTitleAbstract(page, 17); return unpublish(page); });
    // Step 4
    fact('step 4 set=driver', await driverSet('s4-set'));
    fact('step 4 GetRecord 17', await getRecord('s4-get17', 17));

    // Step 5: delete the issue.
    await asEditor('step 5 delete issue', async (page) => {
        const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
        const issues = new IssuesAdmin(page, ctx);
        await issues.goto('Back Issues');
        await rec(page, 'back-issues');
        const dialog = await issues.openQuestion('Back Issues', ISSUE, 'Delete', 'Are you sure you wish to delete this item?');
        await rec(page, 'delete-question');
        const question = flat(await dialog.innerText()).slice(0, 200);
        const r = await issues.answer(dialog, 'OK', /delete-issue|deleteIssue/);
        await pause(500);
        await rec(page, 'issue-deleted');
        return {question, answer: r ? r.status() : null, backIssuesLeft: await issues.names('Back Issues').allInnerTexts().catch(() => null)};
    });
    // Step 6
    fact('step 6 set=driver', await driverSet('s6-set'));
    fact('step 6 GetRecord 1', await getRecord('s6-get1', 1));
    fact('step 6 whole list', await oai('s6-all', 'verb=ListIdentifiers&metadataPrefix=oai_dc'));

    if (line === 'main') {
        // Step 7: submission 5 gets a PDF galley (the dataset gives it none).
        await asEditor('step 7 add galley to 5', async (page) => {
            const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
            const {GalleyManager} = require('../../../pages/GalleysPages.js');
            const pubId = Number((sql(app, 'select current_publication_id from submissions where submission_id=5') || '').trim());
            const galleys = new GalleyManager(page, new WorkflowPage(page, ctx));
            await galleys.open(5, pubId);
            await galleys.addGalley({label: 'PDF', component: 'Article Text', file: PDF, name: 'article.pdf'});
            await rec(page, 'galley-added');
            return {publicationId: pubId, labels: await galleys.labels()};
        });
        // Step 8: submission 5 published in no issue.
        await asEditor('step 8 publish 5 in no issue', async (page) => { await openTitleAbstract(page, 5); return publishNoIssue(page); });
        // Step 9
        fact('step 9 set=driver', await driverSet('s9-set'));
        // Step 10
        await asEditor('step 10 unpublish 5', async (page) => { await openTitleAbstract(page, 5); return unpublish(page); });
        // Step 11
        fact('step 11 set=driver', await driverSet('s11-set'));
        fact('step 11 GetRecord 5', await getRecord('s11-get5', 5));
    }

    fact('tombstones (stored driver setting)', tombs());
    record('facts', facts);
});
