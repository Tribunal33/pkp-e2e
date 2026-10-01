// Issue report walk: docs/issues/U13-A11-permissions-reset-reverses-book-keywords.md
// (spec U13 register A11). Takes the report's Steps on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"), through the screens, on OJS, OMP and OPS.
// Precondition (every mode): `ANALYZE controlled_vocabs, controlled_vocab_entries`, as autovacuum
// does on an install in use; the plan of the batch query over all publications is recorded.
// Modes (the script's argument):
//   reset    (default) the Steps:
//              1  the item's public page: "Keywords:".
//              2  sign in as dbarnes.
//              3  "Tools" › "Permissions" › "Reset … Permissions", OK in the confirm box.
//              4  the public page again: "Keywords:".
//              5  the workflow's "Publication" › "Metadata": the "Keywords" chips.
//            Items: OJS submission 1, OMP submission 5, OPS submission 11 (published, several keywords).
//   issue    OJS control: dbarnes assigns submissions 4, 8, 11 and 14 to "Vol. 2 No. 1 (2015)"
//            ("Publication Settings", "Assign To Future Issue and Schedule Only", "Save"),
//            "Schedule For Publication" (Version of Record, Major Revision, "Confirm"), then
//            Issues › "Future Issues" › "Publish Issue", "OK"; each article page's "Keywords:".
//   typed    control: dbarnes types "tide", "current" on the Metadata page of OJS 17 / OMP 14 / OPS 17,
//            "Save", the public page, "Save" twice more, "Title & Abstract" › "Save", the chips and the
//            public page again (plain saves).
//   reorder  fix check: the reset steps, then on the same item's "Metadata" the editor removes the
//            first keyword and types it again, "Save"; the public page must show it last.
// Database reads (seq, the rows' place on disk, the plan) are evidence only.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir3 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-ir3 PROBE_AGENT=u13a11 node bin/probe.js all shared/playwright/checks/issues/keywords-lose-typed-order/walk.js [reset|issue|typed|reorder]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir3-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir3-3_5 PROBE_AGENT=u13a11 node bin/probe.js all <this file> [mode]
// Fix trial:    trial.sh beside this file.
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const MODE = ['typed', 'reorder', 'issue'].find((m) => process.argv.slice(2).includes(m)) || 'reset';
const RESET_ITEM = {ojs: {id: 1, page: 'article/view/1'}, omp: {id: 5, page: 'catalog/book/5'}, ops: {id: 11, page: 'preprint/view/11'}};
const TYPED_ITEM = {ojs: {id: 17, page: 'article/view/17'}, omp: {id: 14, page: 'catalog/book/14'}, ops: {id: 17, page: 'preprint/view/17'}};
// OJS "Publish Issue": submissions with two or more keywords, scheduled into "Vol. 2 No. 1 (2015)".
const ISSUE_SUBS = [4, 8, 11, 14];
const ISSUE = 'Vol. 2 No. 1 (2015)';
const RESET_LABEL = {ojs: 'Reset Article Permissions', omp: 'Reset Monograph Permissions', ops: 'Reset Preprint Permissions'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    if (MODE === 'issue' && app.name !== 'ojs') return;
    const item = (MODE === 'typed' ? TYPED_ITEM : MODE === 'issue' ? {id: ISSUE_SUBS[0], page: `article/view/${ISSUE_SUBS[0]}`} : RESET_ITEM)[app.name] || {id: ISSUE_SUBS[0], page: `article/view/${ISSUE_SUBS[0]}`};
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const q = (s) => (sql(app, s) || '').trim();
    const pubId = q(`select current_publication_id from submissions where submission_id=${item.id}`);
    const kwRows = `from controlled_vocabs cv join controlled_vocab_entries e on e.controlled_vocab_id=cv.controlled_vocab_id join controlled_vocab_entry_settings s on s.controlled_vocab_entry_id=e.controlled_vocab_entry_id and s.setting_name='name' and s.locale='en' where cv.symbolic='submissionKeyword' and cv.assoc_type=1048588 and cv.assoc_id=${pubId}`;
    const db = () => ({bySeq: q(`select string_agg(s.setting_value||'#'||e.seq, ', ' order by e.seq) ${kwRows}`),
        onDisk: q(`select string_agg(s.setting_value||'@'||e.ctid::text, ', ' order by e.ctid) ${kwRows}`)});
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null, mode: MODE, submission: item.id, publication: pubId, db: db()});

    // Precondition (the Steps): ANALYZE the two vocabulary tables, as autovacuum does on an install
    // in use (on a fresh load it never analyzes controlled_vocab_entries: too few rows), so the
    // batch read gets the plan a team install gets. Then the batch query's plan, read only.
    q('ANALYZE controlled_vocabs, controlled_vocab_entries');
    const allPubs = q(`select string_agg(publication_id::text, ',') from publications`);
    fact('plan-all-publications', q(`explain select * from controlled_vocab_entries where exists (select * from controlled_vocabs where controlled_vocab_entries.controlled_vocab_id = controlled_vocabs.controlled_vocab_id and symbolic in ('submissionKeyword','submissionSubject','submissionDiscipline','submissionAgency') and assoc_type = 1048588 and assoc_id in (${allPubs}))`).split('\n').filter((l) => /Hash  |Seq Scan|Index/.test(l)).map((l) => l.replace(/\(cost.*$/, '').trim()));

    const {page, close} = await launch(app);
    const wf = () => page.locator('[role="dialog"]:visible').first();
    const menuKey = (key) => (app.line === 'stable-3_5_0' ? `publication_${key}` : `publication_${pubId}_${key}`);
    const wfUrl = (key) => app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${item.id}&workflowMenuKey=${menuKey(key)}`);
    const tag = (name) => `${MODE === 'reset' ? '' : MODE + '-'}${name}`;
    const snap = async (name) => { const s = await screen(page); record(tag(name), s); await shot(page, tag(name)); return s; };
    const kw = () => page.locator('[id="metadata-keywords-control-en"]');

    async function openForm(key, linkName, ready) {
        await page.goto(wfUrl(key)); await idle(page);
        const ok = await ready().waitFor({state: 'visible', timeout: 15_000}).then(() => true).catch(() => false);
        if (!ok) {
            await wf().getByRole('link', {name: linkName, exact: true}).first().click();
            await idle(page);
            await ready().waitFor({state: 'visible', timeout: T});
        }
        await pause(800);
    }
    const openMetadata = () => openForm('metadata', 'Metadata', kw);
    const chips = async () => {
        const field = kw().locator('xpath=ancestor::*[contains(@class,"pkpFormField")][1]');
        const names = await field.getByRole('button', {name: /^Remove /}).evaluateAll((els) => els.map((e) => (e.getAttribute('aria-label') || e.textContent || '').trim()));
        return names.map((n) => n.replace(/^Remove\s+/, ''));
    };
    async function save(label) {
        const sr = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && ['POST', 'PUT'].includes(r.request().method()), {timeout: T}).catch(() => null);
        await wf().getByRole('button', {name: 'Save', exact: true}).last().click();
        const r = await sr;
        await page.locator('[role="status"]:has-text("Saved")').first().waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
        await idle(page); await pause(500);
        await snap(label);
        return r ? r.status() : null;
    }
    async function addKeyword(word) {
        await kw().click();
        await kw().pressSequentially(word, {delay: 20});
        await pause(900);
        await kw().press('Enter');
        await page.getByRole('button', {name: `Remove ${word}`}).first().waitFor({state: 'visible', timeout: 10_000}).catch(() => {});
        await pause(300);
    }
    async function publicPage(label) {
        await page.goto(app.url(`/index.php/${app.contextPath}/${item.page}`)); await idle(page);
        await snap(label);
        return flat(await page.locator('.item.keywords').first().innerText({timeout: 10_000}).catch(() => null));
    }
    async function resetPermissions(label) {
        await page.goto(app.url(`/index.php/${app.contextPath}/management/tools`)); await idle(page);
        await page.getByRole('link', {name: 'Permissions', exact: true}).first().click();
        const button = page.getByRole('button', {name: RESET_LABEL[app.name]}).first();
        await button.waitFor({state: 'visible', timeout: T});
        await snap(`${label}-tool`);
        let confirmText = null;
        const onDialog = (d) => { confirmText = d.message(); d.accept().catch(() => {}); };
        page.on('dialog', onDialog);
        const done = page.waitForResponse((r) => /resetPermissions/.test(r.url()) && r.request().method() === 'POST', {timeout: 120_000}).catch(() => null);
        await button.click();
        const r = await done;
        await idle(page); await pause(800);
        page.off('dialog', onDialog);
        await snap(`${label}-done`);
        return {confirm: confirmText, status: r ? r.status() : null};
    }

    try {
        if (MODE === 'issue') {
            const kwOf = (sid) => q(`select string_agg(s.setting_value, ', ' order by e.seq) from submissions sub join controlled_vocabs cv on cv.assoc_id=sub.current_publication_id and cv.assoc_type=1048588 and cv.symbolic='submissionKeyword' join controlled_vocab_entries e on e.controlled_vocab_id=cv.controlled_vocab_id join controlled_vocab_entry_settings s on s.controlled_vocab_entry_id=e.controlled_vocab_entry_id and s.setting_name='name' and s.locale='en' where sub.submission_id=${sid}`);
            fact('i-before', Object.fromEntries(ISSUE_SUBS.map((sid) => [sid, kwOf(sid)])));
            await signIn(page, 'dbarnes');
            for (const sid of ISSUE_SUBS) {
                const pid = q(`select current_publication_id from submissions where submission_id=${sid}`);
                const url = (key) => app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${sid}&workflowMenuKey=publication_${pid}_${key}`);
                // Publication › "Issue": assign to the issue, Save.
                await page.goto(url('issue')); await idle(page);
                const sel = page.locator('select[name="issueId"]:visible');
                const assign = page.getByRole('radio', {name: 'Assign To Future Issue and Schedule Only', exact: true});
                await assign.waitFor({state: 'visible', timeout: T});
                await pause(800);
                await assign.check();
                await pause(600);
                await sel.selectOption({label: ISSUE});
                const sv = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await page.locator('[role="dialog"]:visible').getByRole('button', {name: 'Save', exact: true}).last().click();
                const svr = await sv;
                await idle(page); await pause(600);
                await snap(`i-${sid}-issue-saved`);
                // "Schedule For Publication": the review panel (Confirm) and the window's button.
                const pbName = /^(Schedule For Publication|Publish)$/;
                const right = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: pbName}).filter({visible: true});
                const pb = (await right.count()) ? right.first() : wf().getByRole('button', {name: pbName}).filter({visible: true}).last();
                await pb.waitFor({state: 'visible', timeout: T});
                await pb.click();
                const panel = page.getByRole('dialog').filter({hasText: 'Review Publishing Details'}).filter({visible: true}).last();
                const win = page.getByRole('dialog').filter({hasText: /Are you sure you want to (publish|schedule)|requirements have been met|scheduled for publication/}).filter({visible: true}).last();
                await panel.or(win).first().waitFor({state: 'visible', timeout: T});
                await idle(page); await pause(1000);
                let panelText = null;
                if (await panel.isVisible().catch(() => false)) {
                    // "Review Publishing Details": the two required lists, "Confirm".
                    await panel.locator('select').filter({has: page.locator('option[value="VoR"]')}).first().selectOption({label: 'Version of Record (VoR)'});
                    await panel.locator('select').filter({has: page.getByText('Major Revision', {exact: true})}).first().selectOption({label: 'Major Revision'});
                    panelText = flat(await panel.innerText().catch(() => null), 300);
                    await snap(`i-${sid}-panel`);
                    await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
                    await win.waitFor({timeout: T});
                    await idle(page); await pause(800);
                }
                const winText = flat(await win.innerText().catch(() => null), 500);
                await snap(`i-${sid}-window`);
                const pr = page.waitForResponse((r) => /\/publish(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await win.getByRole('button', {name: /^(Publish|Schedule For Publication|Schedule)$/}).last().click();
                const p = await pr;
                await idle(page); await pause(800);
                await snap(`i-${sid}-scheduled`);
                fact(`i-${sid}-schedule`, {issueSave: svr ? svr.status() : null, panel: panelText, window: winText, status: p ? p.status() : null,
                    pubStatus: q(`select status from publications where publication_id=${pid}`), keywords: kwOf(sid)});
            }
            // Issues › "Future Issues" › the issue › "Publish Issue", OK.
            await page.goto(app.url(`/index.php/${app.contextPath}/manageIssues`)); await idle(page);
            await page.getByRole('tab', {name: 'Future Issues', exact: true}).click(); await idle(page);
            const fp = page.getByRole('tabpanel', {name: 'Future Issues'});
            await fp.locator('table').first().waitFor({timeout: T});
            const frow = fp.locator('tr.gridRow').filter({has: page.getByRole('link', {name: ISSUE, exact: true})}).first();
            await frow.locator('a.show_extras').click();
            const fctl = frow.locator('xpath=following-sibling::tr[contains(@class,"row_controls")][1]');
            await fctl.getByRole('link', {name: 'Publish Issue', exact: true}).click();
            const pd = page.getByRole('dialog', {name: 'Publish Issue', exact: true});
            await pd.getByRole('button', {name: 'OK', exact: true}).waitFor({timeout: T});
            await idle(page); await pause(500);
            const pdText = flat(await pd.innerText().catch(() => null), 500);
            await snap('i-publish-issue');
            const ir = page.waitForResponse((r) => /publish-issue|publishIssue/.test(r.url()) && r.request().method() === 'POST', {timeout: 120_000}).catch(() => null);
            await pd.getByRole('button', {name: 'OK', exact: true}).click();
            const irr = await ir;
            await pd.waitFor({state: 'detached', timeout: T}).catch(() => {});
            await idle(page); await pause(800);
            await snap('i-issue-published');
            fact('i-publish-issue', {dialog: pdText, status: irr ? irr.status() : null});
            const after = {};
            for (const sid of ISSUE_SUBS) {
                await page.goto(app.url(`/index.php/${app.contextPath}/article/view/${sid}`)); await idle(page);
                await snap(`i-${sid}-public`);
                after[sid] = {page: flat(await page.locator('.item.keywords').first().innerText({timeout: 10_000}).catch(() => null)), stored: kwOf(sid)};
            }
            fact('i-after', after);
        } else if (MODE === 'typed') {
            await signIn(page, 'dbarnes');
            await openMetadata();
            fact('t-metadata', {chips: await chips()});
            await addKeyword('tide');
            await addKeyword('current');
            fact('t-typed', {chips: await chips()});
            fact('t-save', {status: await save('t-saved'), db: db()});
            fact('t-public', await publicPage('t-public'));
            await openMetadata();
            fact('t-save-a', {status: await save('t-save-a'), db: db()});
            fact('t-save-b', {status: await save('t-save-b'), db: db()});
            await openForm('titleAbstract', 'Title & Abstract', () => wf().getByRole('button', {name: 'Save', exact: true}).last());
            fact('t-title-save', {status: await save('t-title-saved'), db: db()});
            await openMetadata();
            fact('t-chips', await chips());
            fact('t-public-end', await publicPage('t-public-end'));
        } else {
            // 1. Public page before.
            fact('1-public', await publicPage('01-public'));
            // 2. dbarnes.
            await signIn(page, 'dbarnes');
            // 3. Tools › Permissions › Reset.
            fact('3-reset', {...(await resetPermissions('03-reset')), db: db()});
            // 4. Public page after.
            fact('4-public', await publicPage('04-public'));
            // 5. Metadata chips.
            await openMetadata();
            await snap('05-metadata');
            fact('5-chips', await chips());

            if (MODE === 'reorder') {
                const first = (await chips())[0];
                await page.getByRole('button', {name: `Remove ${first}`}).first().click();
                await pause(300);
                await addKeyword(first);
                fact('nb-typed', {moved: first, chips: await chips()});
                fact('nb-save', {status: await save('nb-saved'), db: db()});
                fact('nb-public', await publicPage('nb-public'));
            }
        }
        fact('end', db());
    } finally {
        record(tag('facts'), facts);
        await close();
    }
});
