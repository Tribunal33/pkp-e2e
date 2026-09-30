// Issue report walk: docs/issues/U63-A8-native-import-other-context-resets-contributor-roles.md
// (spec U63 register A8, the contributor-role line). Takes the report's Steps
// through the screens on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"), as the dataset's site administrator `admin`.
// The kit builds nothing; everything goes through the screens:
//   1    sign in as admin
//   2    Administration › Hosted Journals (Presses, Servers) › "Create Journal"
//        ("Create Press", "Create Server"): a second context, path u63a8
//   3    publicknowledge › Tools › "Native XML Plugin", export tab: tick the
//        submission, export, "Download Exported File"
//   4    u63a8 › Tools › "Native XML Plugin", "Import" tab, "Upload File", "Import";
//        the results tab is read
//   5    the imported submission's workflow in u63a8 › "Contributors": each row read
// Besides the screens it reads, from the database, each contributor's role
// identifier in both contexts.
// FILE=<path, {app} and {sub} for the app's name and submission> with SAME_CONTEXT=1: step 3 skipped, that
// file (exported from a 3.5 install) imported into publicknowledge instead.
// SAME_CONTEXT=1 (the neighbour check for the fix): steps 3–5 with the import
// into publicknowledge itself; the roles must stay as they were (step 2 skipped).
//
// Reset first:  flock -s .reports/issues/main-code.lock npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
// Run (main):   flock -s .reports/issues/main-code.lock env PROBE_FEATURE=issues-ir1 PROBE_AGENT=u63a8 node bin/probe.js all shared/playwright/checks/issues/native-import-other-context-resets-contributor-roles/walk.js
// Fix trial:    trial.sh beside this file.
const fs = require('fs');
const {forEachApp, launch, signIn, screen, shot, record, idle, sql, outFile} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const L = {
    ojs: {exportTab: 'Export Articles', exportBtn: 'Export Articles', results: 'Import Results', hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal',
        sub: 8, title: 'Traditions and Trends in the Study of the Commons'},
    omp: {exportTab: 'Export', exportBtn: 'Export Submissions', results: 'Results', hosted: 'Hosted Presses', table: 'Presses', create: 'Create Press',
        sub: 2, title: 'The West and Beyond: New Perspectives on an Imagined Region'},
    ops: {exportTab: 'Export Preprints', exportBtn: 'Export Preprints', results: 'Import Results', hosted: 'Hosted Servers', table: 'Servers', create: 'Create Server',
        sub: 1, title: 'The influence of lactation on the quantity and quality of cashmere production'},
};
const IMPORT_RE = /NativeImportExportPlugin\/import\?/;
const TARGET = 'u63a8';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const same = !!process.env.SAME_CONTEXT;
    const target = same ? app.contextPath : TARGET;
    const A = L[app.name];
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const facts = {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null, target};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${flat(JSON.stringify(v), 1500)}`); };
    const cu = (ctx, p) => app.url(`/index.php/${ctx}/en${p}`);
    const T_ = app.contextTables;
    const ctxId = (p) => sql(app, `select ${T_.id} from ${T_.table} where path = '${p}'`);
    const hasRoles = () => sql(app, "select count(*) from information_schema.tables where table_name = 'contributor_roles'") === '1';
    // 3.5 and older keep a contributor's role as its user group (authors.user_group_id).
    const roles = (subId) => hasRoles() ? rolesMain(subId) : sql(app, `select a.seq, coalesce((select setting_value from author_settings where author_id = a.author_id and setting_name = 'givenName' and locale = 'en'), '') || ' ' || coalesce((select setting_value from author_settings where author_id = a.author_id and setting_name = 'familyName' and locale = 'en'), ''), (select setting_value from user_group_settings where user_group_id = a.user_group_id and setting_name = 'name' and locale = 'en') || '#' || a.user_group_id || '@ctx' || (select context_id from user_groups where user_group_id = a.user_group_id) from submissions s join authors a on a.publication_id = s.current_publication_id where s.submission_id = ${subId} order by a.seq`).split('\n').filter(Boolean);
    const rolesMain = (subId) => sql(app, `select a.seq, coalesce((select setting_value from author_settings where author_id = a.author_id and setting_name = 'givenName' and locale = 'en'), '') || ' ' || coalesce((select setting_value from author_settings where author_id = a.author_id and setting_name = 'familyName' and locale = 'en'), ''), string_agg(cr.contributor_role_identifier || '#' || cr.contributor_role_id || '@ctx' || cr.context_id, ',') from submissions s join authors a on a.publication_id = s.current_publication_id left join credit_contributor_roles c on c.contributor_id = a.author_id left join contributor_roles cr on cr.contributor_role_id = c.contributor_role_id where s.submission_id = ${subId} group by a.author_id, a.seq order by a.seq`).split('\n').filter(Boolean);
    const {page, close} = await launch(app);
    page.setDefaultTimeout(T);
    let step = 'start';
    const errors = [];
    page.on('pageerror', (e) => errors.push({step, kind: 'pageerror', text: flat(e.message, 300)}));
    page.on('response', (r) => {
        if (r.status() >= 400) errors.push({step, kind: 'http', text: `${r.status()} ${r.request().method()} ${rel(r.url()).replace(/csrfToken=[^&]+/, 'csrf').slice(0, 200)}`});
    });
    let n = 0;
    const snap = async (name) => {
        const s = await screen(page);
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(page, `${String(n).padStart(2, '0')}-${name}`).catch(() => {});
        return s;
    };
    const tabNames = () => page.locator('#importExportTabs > ul > li a.ui-tabs-anchor').evaluateAll((as) => as.map((a) => a.innerText.trim()));
    const panel = () => page.locator('#importExportTabs > [role="tabpanel"]:visible').first();
    const openPlugin = async (ctx) => {
        await page.goto(cu(ctx, '/management/tools'));
        await idle(page);
        await page.getByRole('link', {name: 'Native XML Plugin', exact: true}).first().click();
        await page.locator('#importExportTabs').waitFor({timeout: T});
        await idle(page);
    };
    const chooseTab = async (name) => {
        await page.locator('#importExportTabs > ul > li a.ui-tabs-anchor').filter({hasText: new RegExp(`^${name}$`)}).first().click();
        await idle(page); await pause(1000); await idle(page);
    };
    try {
        fact('source roles', {contextId: ctxId(app.contextPath), roles: roles(A.sub)});

        step = '1 sign in';
        await signIn(page, 'admin');

        if (!same) {
            step = '2 create context';
            await page.goto(app.url('/index.php/index/en/admin/contexts'));
            const hosted = new HostedJournalsPage(page, {hosted: A.hosted, table: A.table, create: A.create});
            await hosted.expectOpen();
            const win = await hosted.openCreate();
            await win.type(win.title('en'), `${TARGET} Second`);
            await win.type(win.initials('en'), 'U63A8');
            await win.type(win.contactName, `${TARGET} Contact`);
            await win.type(win.contactEmail, `${TARGET}@mailinator.com`);
            await win.country.selectOption({label: 'Canada'});
            await win.type(win.path, TARGET);
            if (await win.languageBoxes.count()) {
                await win.setBox(win.languageBox('en'), true);
                await win.primaryChoice('en').check();
            }
            await snap('create-context-filled');
            const saved = await win.pressSave();
            await pause(1500); await idle(page);
            const saveBody = saved.status() >= 400 ? flat(await saved.text().catch(() => null), 600) : null;
            fact('step 2', {saveStatus: saved.status(), saveBody, fieldErrors: await win.errorMap().catch(() => null), contextId: ctxId(TARGET),
                targetRoles: hasRoles() ? sql(app, `select contributor_role_id, contributor_role_identifier from contributor_roles where context_id = (select ${T_.id} from ${T_.table} where path = '${TARGET}') order by 1`).split('\n') : null});
        }

        const maxBefore = Number(sql(app, 'select max(submission_id) from submissions'));
        let file;
        if (process.env.FILE) {
            // FILE=<path with {app}>: a file exported elsewhere (a 3.5 install), imported as it is.
            file = process.env.FILE.replace('{app}', app.name).replace('{sub}', String(A.sub));
            const xml = fs.readFileSync(file, 'utf8');
            fact('file', {given: file, userGroupRefs: [...new Set([...xml.matchAll(/user_group_ref="([^"]*)"/g)].map((m) => m[1]))], contributorRoleElements: (xml.match(/<contributor_role/g) || []).length});
        } else {
        step = '3 export';
        await openPlugin(app.contextPath);
        await chooseTab(A.exportTab);
        await page.locator('#exportSubmissions-tab .listPanel__item').first().waitFor({timeout: T});
        await page.locator('#exportSubmissions-tab .listPanel__item').filter({hasText: A.title}).first().locator('input[type=checkbox]').check();
        await page.locator('#exportSubmissions-tab').getByRole('button', {name: A.exportBtn, exact: true}).click();
        const dlBtn = panel().getByRole('button', {name: 'Download Exported File'});
        await dlBtn.waitFor({timeout: 60_000});
        const dl = page.waitForEvent('download', {timeout: T});
        await dlBtn.click();
        const d = await dl;
        file = outFile(`u63a8-roles-sub${A.sub}.xml`);
        fs.writeFileSync(file, fs.readFileSync(await d.path(), 'utf8'));
        const xml = fs.readFileSync(file, 'utf8');
        fact('file', {downloaded: d.suggestedFilename(), bytes: xml.length, userGroupRefs: [...new Set([...xml.matchAll(/user_group_ref="([^"]*)"/g)].map((m) => m[1]))], contributorRoles: [...xml.matchAll(/<contributor_roles>([\s\S]*?)<\/contributor_roles>/g)].map((m) => flat(m[1], 200)).slice(0, 10)});
        }

        step = '4 import';
        await openPlugin(target);
        await chooseTab('Import');
        const up = page.waitForResponse((r) => r.url().includes('uploadImportXML'), {timeout: T}).catch(() => null);
        await page.locator('#importXmlForm input[type=file]').first().setInputFiles(file);
        await up; await idle(page);
        const before = (await tabNames()).length;
        const answered = page.waitForResponse((r) => IMPORT_RE.test(r.url()), {timeout: 60_000}).catch(() => null);
        await page.locator('#importXmlForm').getByRole('button', {name: 'Import', exact: true}).click();
        const r = await answered;
        for (let i = 0; i < 20 && (await tabNames()).length === before; i++) await pause(300);
        await idle(page); await pause(800);
        const resultsText = await panel().innerText().catch(() => null);
        const newId = Number(sql(app, `select max(submission_id) from submissions where submission_id > ${maxBefore}`)) || null;
        fact('step 4', {importStatus: r ? r.status() : 'no request', resultsLines: String(resultsText || '').split('\n').map((l) => l.trim()).filter(Boolean), newSubmission: newId});
        await snap('import-results');

        step = '5 contributors';
        if (newId) {
            fact('imported roles', roles(newId));
            await page.goto(cu(target, `/dashboard/editorial?workflowSubmissionId=${newId}`));
            await idle(page); await pause(1500);
            const dialog = page.getByRole('dialog').last();
            await dialog.getByRole('link', {name: 'Contributors', exact: true}).or(dialog.getByRole('button', {name: 'Contributors', exact: true})).first().click();
            await idle(page); await pause(2000);
            const list = dialog.locator('.listPanel, table').first();
            await list.waitFor({timeout: T}).catch(() => {});
            await pause(1000);
            const s = await snap('contributors');
            fact('step 5', {dialog: flat(s.text && s.text.dialog, 1500)});
        }
    } catch (e) {
        fact('walk error', {step, error: flat(e.message, 500)});
        await snap('error').catch(() => {});
    } finally {
        fact('errors', errors);
        record('facts', facts);
        await close();
    }
});
