// Issue report walk: docs/issues/U19-A23-oai-driver-set-lists-articles-without-galley.md
// (spec U19 register A23). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// OJS only (DRIVER is an OJS plugin): its `dbarnes`, `publicknowledge`, issue
// "Vol. 1 No. 2 (2014)" (articles 1 and 17, each with a PDF galley) and
// submission 5 (Production, no galley). Nothing is created beyond what the
// steps say; the kit builds nothing. Step numbers are the report's:
//   1  dbarnes: Settings › Website › Plugins › tick "DRIVER"
//   2  signed out: ListIdentifiers set=driver
//   3  dbarnes: submission 5 › "Schedule For Publication" into
//      "Vol. 1 No. 2 (2014)" › "Publish" (no galley added)
//      [3.5: "Select an issue to schedule for publication" › "Save" › "Publish"]
//   4  signed out: the article page of 5 (no galley link)
//   5  signed out: set=driver; GetRecord article/5
//   6  dbarnes: submission 5 › "Unpublish"
//   7  signed out: GetRecord article/5 (its deleted record)
// Neighbour (the fix must leave these alone): after step 5, GetRecord of
// article/1 still names `driver`, and the journal's whole list still holds
// article/5. Beside it (Evidence only) the tombstones' stored `driver` settings.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w19 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-w19 PROBE_AGENT=w19 node bin/probe.js ojs shared/playwright/checks/issues/oai-driver-set-lists-articles-without-galley/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w19-3_5 PROBE_AGENT=w19 node bin/probe.js ojs <this file>
// Facts: .reports/<feature>/w19/facts[-<run>]-ojs.json
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const REPO = path.resolve(__dirname, '../../../../..');
const ISSUE = 'Vol. 1 No. 2 (2014)';

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
    fact('fleet', {line, dataset: app.dataset, port: app.port, run: process.env.PROBE_RUN || null, repoId});
    let n = 0;
    const rec = async (page, label) => {
        const name = `${String(++n).padStart(2, '0')}-${label}`;
        try { record(name, await screen(page)); } catch (e) { record(name, {error: String(e).slice(0, 300), url: page.url()}); }
    };
    const logMark = () => { try { return fs.statSync(LOG).size; } catch { return 0; } };
    const logSince = (mark) => {
        try {
            return fs.readFileSync(LOG).subarray(mark).toString('utf8').split('\n')
                .filter((l) => /DRIVERPlugin|TypeError|PHP (Fatal|Warning)/.test(l)).slice(0, 6).map((l) => l.slice(0, 400));
        } catch (e) { return [`(log unreadable: ${e.message})`]; }
    };
    const tombs = () => (sql(app, "select t.oai_identifier||' driver='||coalesce(s.setting_value,'(none)') from data_object_tombstones t left join data_object_tombstone_settings s on s.tombstone_id=t.tombstone_id and s.setting_name='driver' order by t.tombstone_id") || '').trim().split('\n').filter(Boolean);
    const galleyRows = (id) => (sql(app, `select count(*) from publication_galleys g join publications p on p.publication_id=g.publication_id where p.submission_id=${id}`) || '').trim();

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

    // ---- workflow helpers (from the U19 A11 walk) ----
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
    const pickIssue = async (scope) => {
        const select = scope.locator('select[name="issueId"]');
        await select.waitFor({timeout: T});
        const option = select.locator('option').filter({hasText: ISSUE});
        for (let i = 0; i < 60 && (await option.count()) !== 1; i++) await pause(500);
        await select.selectOption((await option.first().getAttribute('value')) || '');
    };
    // main: "Review Publishing Details" › "Assign To Current/Back Issue" › the issue › "Confirm" › "Publish".
    // 3.5: "Select an issue to schedule for publication" › the issue › "Save" › "Publish".
    const publishIntoIssue = async (page) => {
        const button = right(page).getByRole('button', {name: /^(Schedule For Publication|Publish)$/});
        await button.first().waitFor({timeout: T});
        const out = {pressed: flat(await button.first().innerText())};
        const done = page.waitForResponse((r) => /\/publish(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: 2 * T});
        await button.first().click();
        if (line === 'main') {
            const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
            await panel.getByRole('button', {name: 'Confirm', exact: true}).waitFor({timeout: T});
            const stage = panel.locator('select[name="versionStage"]');
            if ((await stage.isVisible().catch(() => false)) && !(await stage.inputValue())) await stage.selectOption('VoR');
            const minor = panel.locator('select[name="versionIsMinor"]');
            if ((await minor.isVisible().catch(() => false)) && !(await minor.inputValue())) await minor.selectOption('false');
            const back = panel.getByRole('radio', {name: 'Assign To Current/Back Issue'});
            await back.waitFor({timeout: T});
            for (let i = 0; i < 60 && (await panel.locator('input[name="assignment"]:checked').count()) !== 1; i++) await pause(500);
            await back.check();
            await pickIssue(panel);
            await rec(page, 'publish-panel');
            await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
            const confirm = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Publish', exact: true})}).last();
            await confirm.waitFor({timeout: T});
            await rec(page, 'publish-confirm');
            out.question = flat(await confirm.innerText()).slice(0, 300);
            await confirm.getByRole('button', {name: 'Publish', exact: true}).last().click();
        } else {
            const assign = page.getByRole('dialog').filter({hasText: 'Select an issue to schedule for publication'}).last();
            await assign.waitFor({timeout: T});
            await pickIssue(assign);
            await rec(page, 'assign-issue');
            await assign.getByRole('button', {name: 'Save', exact: true}).click();
            const confirm = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Publish', exact: true})}).last();
            await confirm.waitFor({timeout: T});
            await idle(page); await pause(500);
            await rec(page, 'publish-confirm');
            out.question = flat(await confirm.innerText()).slice(0, 300);
            await confirm.getByRole('button', {name: 'Publish', exact: true}).last().click();
        }
        out.answer = (await done).status();
        await idle(page); await pause(800);
        out.status = await status(page);
        await rec(page, 'published');
        return out;
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

    fact('galley rows of 5 before', galleyRows(5));

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

    // Step 3: submission 5 published into the current issue, as it stands (no galley).
    await asEditor('step 3 publish 5 into the issue', async (page) => { await openTitleAbstract(page, 5); return publishIntoIssue(page); });
    fact('galley rows of 5 after', galleyRows(5));

    // Step 4: the article page, signed out.
    {
        const {page, close} = await launch(app);
        try {
            const res = await page.goto(app.url(`/index.php/${ctx}/article/view/5`));
            await idle(page);
            await rec(page, 's4-article-5');
            fact('step 4 article page 5', {
                status: res ? res.status() : null,
                title: flat(await page.locator('h1').first().innerText().catch(() => '')),
                galleyLinks: await page.locator('a.obj_galley_link').allInnerTexts().catch(() => []),
            });
        } finally { await close(); }
    }

    // Step 5
    fact('step 5 set=driver', await driverSet('s5-set'));
    fact('step 5 GetRecord 5', await getRecord('s5-get5', 5));
    // Neighbour: article/1 keeps its mark; the journal's whole list keeps article/5.
    fact('neighbour GetRecord 1', await getRecord('nb-get1', 1));
    fact('neighbour whole list', await oai('nb-all', 'verb=ListIdentifiers&metadataPrefix=oai_dc'));

    // Step 6
    await asEditor('step 6 unpublish 5', async (page) => { await openTitleAbstract(page, 5); return unpublish(page); });
    // Step 7
    fact('step 7 GetRecord 5 (deleted)', await getRecord('s7-get5', 5));

    fact('tombstones (stored driver setting)', tombs());
    record('facts', facts);
});
