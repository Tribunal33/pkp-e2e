// Issue report walk: docs/issues/U19-A10-oai-jats-list-emptied-by-restricted-article.md
// (spec U19 register A10). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// OJS only (JATS and subscriptions are OJS's). The kit builds nothing; the
// dataset's `rvaca`, `publicknowledge`, issue "Vol. 2 No. 1 (2015)" and
// submission 5 are used as they are. Step numbers are the report's:
//   1  rvaca signs in
//   2  Settings › Website › Plugins: tick "JATS Metadata Format"
//   3  Settings › Distribution › Access: "The journal will require subscriptions …" › Save
//   4  Issues › Future Issues › "Vol. 2 No. 1 (2015)" › Edit › Access: "Subscription" › Save
//   5  submission 5 › Title & Abstract › "Schedule For Publication" into "Vol. 2 No. 1 (2015)"
//   6  Issues › Future Issues › "Vol. 2 No. 1 (2015)" › "Publish Issue" › OK
//   7  signed out: ListRecords in jats
// Then the controls, which are also the fix's neighbour checks (walk them
// with the fix in and out):
//   c1 signed out: ListRecords in oai_dc (all three articles)
//   c2 signed out: GetRecord jats of article 1 (served) and of article 5
//      (refused: the one answer that must stay a refusal)
//   c3 signed out: ListIdentifiers in jats
//   c4 rvaca signed in: ListRecords in jats (all three, pre-publication access)
// Each OAI read records the browser view (screen()) and the raw answer.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w12 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-w12 PROBE_AGENT=w12 node bin/probe.js ojs shared/playwright/checks/issues/oai-jats-list-emptied-by-restricted-article/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w12-3_5 PROBE_AGENT=w12 node bin/probe.js ojs <this file>
// Facts: .reports/<feature>/w12/facts[-<run>]-ojs.json
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const T = 30_000;
const CP = 'publicknowledge';
const ISSUE = 'Vol. 2 No. 1 (2015)';
const SUBMISSION = 5;
const SUB_MODE = 'The journal will require subscriptions to access some or all of its contents.';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const REPO = path.resolve(__dirname, '../../../../..');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    if (app.name !== 'ojs') { console.log(`[${app.name}] no JATS format or subscriptions; nothing to walk`); return; }
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    const line = app.line || 'main';
    const loc = line === 'main' || line === 'stable-3_5_0' ? '/en' : '';
    const repoId = (fs.readFileSync(path.resolve(REPO, app.configFile), 'utf8').match(/^repository_id\s*=\s*"?([^"\n]+)"?/m) || [])[1];
    fact('fleet', {line, dataset: app.dataset, port: app.port, run: process.env.PROBE_RUN || null, repoId});
    let n = 0;
    const rec = async (page, label) => {
        const name = `${String(++n).padStart(2, '0')}-${label}`;
        try { record(name, await screen(page)); } catch (e) { record(name, {error: String(e).slice(0, 300), url: page.url()}); }
    };
    const id = (sid) => `oai:${repoId}:article/${sid}`;

    // One OAI request typed into the browser: the browser view, then the raw answer.
    const oai = async (page, label, query) => {
        const rel = `/index.php/${CP}/oai?${query}`;
        const r = await page.goto(app.url(rel));
        await pause(200);
        await rec(page, `oai-${label}`);
        const body = await (await page.request.get(app.url(rel))).text();
        record(`${String(n).padStart(2, '0')}-oai-${label}-raw`, {address: rel, body: body.slice(0, 20000)});
        const shown = flat(await page.locator('body').innerText().catch(() => ''));
        return {
            address: rel,
            status: r ? r.status() : null,
            error: (body.match(/<error code="([^"]+)">([^<]*)<\/error>/) || [null]).slice(1).join(': ') || null,
            records: (body.match(/<record>/g) || []).length,
            identifiers: [...body.matchAll(/<identifier>([^<]+)<\/identifier>/g)].map((m) => m[1]),
            jatsArticles: (body.match(/<article[\s>]/g) || []).length,
            titles: [...body.matchAll(/<article-title[^>]*>([^<]*)</g)].map((m) => flat(m[1]).slice(0, 60)),
            token: /<resumptionToken/.test(body),
            shownHead: shown.slice(0, 400),
        };
    };

    const workflow = async (page, sid) => {
        await page.goto(app.url(`/index.php/${CP}${loc}/dashboard/editorial?workflowSubmissionId=${sid}`));
        await idle(page); await pause(1000);
        await rec(page, `workflow-${sid}`);
    };

    // ---------------------------------------------------------------- steps 1-6: rvaca
    {
        const {PluginGrid} = require('../../../pages/OaiPages.js');
        const {AccessSettings} = require('../../../pages/SubscriptionsPages.js');
        const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'rvaca');                                                        // 1

            const plugins = new PluginGrid(page, CP);                                            // 2
            await plugins.goto();
            const before = await plugins.box('JATS Metadata Format').isChecked();
            if (!before) await plugins.setEnabled('JATS Metadata Format', true);
            await rec(page, 'plugins-jats-enabled');
            fact('step 2 JATS Metadata Format', {before, after: await plugins.box('JATS Metadata Format').isChecked(),
                jatsTemplate: await plugins.box('JATS Template Plugin').isChecked().catch(() => null)});

            const access = new AccessSettings(page, CP);                                         // 3
            await access.goto();
            await access.modeRadio(SUB_MODE).check();
            fact('step 3 access save', (await access.save()).status());
            await rec(page, 'access-saved');

            const issues = new IssuesAdmin(page, CP);                                            // 4
            await issues.goto('Future Issues');
            await rec(page, 'future-issues');
            const win = await issues.openManagement('Future Issues', ISSUE);
            const form = await win.openAccess();
            await form.locator('select#accessStatus').selectOption({label: 'Subscription'});
            const rs = page.waitForResponse((x) => /update-access/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
            await rec(page, 'issue-access-form');
            await form.getByRole('button', {name: 'Save', exact: true}).click();
            const r4 = await rs; await idle(page); await pause(500);
            fact('step 4 issue access save', r4 ? r4.status() : null);
            await rec(page, 'issue-access-saved');

            // 5: "Schedule For Publication" from submission 5's Title & Abstract.
            await workflow(page, SUBMISSION);
            const ta = page.getByRole('link', {name: 'Title & Abstract', exact: true}).first();
            if (!(await ta.isVisible().catch(() => false))) await page.getByRole('link', {name: /^Publication$/}).first().click().catch(() => {});
            await ta.click();
            await page.locator('h2', {hasText: 'Title & Abstract'}).first().waitFor({timeout: T});
            await idle(page); await pause(1000);
            const right = page.locator('[data-cy="workflow-controls-right"]');
            const button = right.getByRole('button', {name: /^(Schedule For Publication|Publish)$/}).first();
            await button.waitFor({timeout: T});
            const pressed = flat(await button.innerText());
            await button.click();
            const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
            const issueWin = page.getByRole('dialog').filter({hasText: 'Select an issue to schedule for publication'}).last();
            const confirm = page.getByRole('dialog')
                .filter({hasText: /requirements have been met|Are you sure you want to/})
                .filter({has: page.getByRole('button', {name: /^(Publish|Schedule For Publication)$/})}).last();
            const panelConfirm = panel.getByRole('button', {name: 'Confirm', exact: true});
            await panelConfirm.or(issueWin).or(confirm).first().waitFor({timeout: T}).catch(async (e) => { await rec(page, 'schedule-stuck'); throw e; });
            await pause(500);
            const s5 = {pressed};
            if (await issueWin.isVisible().catch(() => false)) {
                await rec(page, 'schedule-issue-window');
                await issueWin.locator('select option', {hasText: ISSUE}).first().waitFor({state: 'attached', timeout: T});
                await issueWin.locator('select').first().selectOption({label: ISSUE});
                s5.issueWindow = true;
                await issueWin.getByRole('button', {name: 'Save', exact: true}).click();
                await confirm.waitFor({timeout: T});
            }
            if (await panelConfirm.isVisible().catch(() => false)) {
                await rec(page, 'schedule-panel');
                const stage = panel.locator('select[name="versionStage"]');
                if ((await stage.isVisible().catch(() => false)) && !(await stage.inputValue())) await stage.selectOption('VoR');
                const minor = panel.locator('select[name="versionIsMinor"]');
                if ((await minor.isVisible().catch(() => false)) && !(await minor.inputValue())) await minor.selectOption('false');
                const assign = panel.getByRole('radio', {name: 'Assign To Future Issue and Schedule Only', exact: true});
                if (await assign.isVisible().catch(() => false)) { await assign.check(); s5.assignment = 'Assign To Future Issue and Schedule Only'; await pause(500); }
                const pick = panel.locator('select').filter({has: page.locator('option', {hasText: ISSUE})}).first();
                if (await pick.isVisible().catch(() => false)) { await pick.selectOption({label: ISSUE}); s5.panelIssue = ISSUE; }
                await rec(page, 'schedule-panel-filled');
                await panelConfirm.click();
                await confirm.waitFor({timeout: T});
            }
            await rec(page, 'schedule-confirm');
            s5.question = flat(await confirm.innerText()).slice(0, 200);
            const done = page.waitForResponse((x) => /\/publish(\?|$)/.test(x.url()) && x.request().method() !== 'GET', {timeout: T});
            await confirm.getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).last().click();
            s5.answer = (await done).status();
            await idle(page); await pause(500);
            s5.status = flat(await page.locator('[data-cy="workflow-controls-left"]').innerText().catch(() => ''));
            await rec(page, 'scheduled');
            fact('step 5 schedule', s5);

            await issues.goto('Future Issues');                                                   // 6
            const pub = await issues.openPublish(ISSUE);
            await rec(page, 'publish-issue-window');
            await pub.ok();
            await idle(page); await pause(500);
            await issues.goto('Back Issues');
            await rec(page, 'back-issues');
            fact('step 6 published', sql(app, `select i.issue_id||'|'||i.published||'|'||i.access_status from issues i order by 1`).split('\n'));
            fact('state', {
                publishingMode: sql(app, `select setting_value from journal_settings where setting_name='publishingMode'`),
                jatsFormat: sql(app, `select setting_value from plugin_settings where plugin_name='oaimetadataformatplugin_jats' and setting_name='enabled'`),
                publications: sql(app, `select submission_id||'|'||status||'|'||coalesce(issue_id::text,'-') from publications where status=3 order by submission_id`).split('\n'),
            });
            await signOut(page);
        } finally { await close(); }
    }

    // ---------------------------------------------------------------- step 7 and the signed-out controls
    {
        const {page, close} = await launch(app);
        try {
            fact('step 7 ListRecords jats (signed out)', await oai(page, 's7-listrecords-jats', 'verb=ListRecords&metadataPrefix=jats'));
            fact('c1 ListRecords oai_dc (signed out)', await oai(page, 'c1-listrecords-dc', 'verb=ListRecords&metadataPrefix=oai_dc'));
            fact('c2 GetRecord jats article 1 (signed out)', await oai(page, 'c2-getrecord-jats-1', `verb=GetRecord&metadataPrefix=jats&identifier=${id(1)}`));
            fact(`c2 GetRecord jats article ${SUBMISSION} (signed out)`, await oai(page, `c2-getrecord-jats-${SUBMISSION}`, `verb=GetRecord&metadataPrefix=jats&identifier=${id(SUBMISSION)}`));
            fact('c3 ListIdentifiers jats (signed out)', await oai(page, 'c3-listidentifiers-jats', 'verb=ListIdentifiers&metadataPrefix=jats'));
        } finally { await close(); }
    }
    // ---------------------------------------------------------------- control 4: the journal manager's own browser
    {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'rvaca');
            fact('c4 ListRecords jats (rvaca signed in)', await oai(page, 'c4-listrecords-jats-rvaca', 'verb=ListRecords&metadataPrefix=jats'));
            await signOut(page);
        } finally { await close(); }
    }
    record('facts', facts);
});
