// Reach check for docs/issues/U44-OJS3-issue-publisher-id-not-kept.md (spec U44 register OJS3):
// an issue DOI made from a custom suffix pattern with "%x" (Custom Identifier), which reads the
// issue's Publisher ID. Through the screens on a dataset fleet, as `dbarnes`:
//   1. Settings › Workflow › Submission › Metadata › Publisher ID › "Enable for Issues", Save.
//   2. Settings › Distribution › DOIs › Setup: "Items with DOIs" + "Issues", "DOI Prefix" 10.1234,
//      "DOI Format" "Custom pattern", "Issues" pattern `iss%i.%x` ("Submissions" `art%a`, required while "Articles" is ticked), Save.
//   3. Issues › Future Issues › "Vol. 2 No. 1 (2015)" › Edit › "Identifiers": `u44r8-issue`, Save.
//   4. DOIs › "Issues": tick "Vol. 2 No. 1 (2015)", Bulk Actions › "Assign DOIs".
//   5. Read the DOI the issue got (the list's expanded row; the dois table as evidence).
// Reset the fleet before the walk. OJS only.
//   PROBE_FEATURE=issues-r8b PROBE_AGENT=r8 node bin/probe.js ojs shared/playwright/checks/issues/issue-publisher-id-not-kept/doi.js
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const PID = 'u44r8-issue';
const PATTERN = 'iss%i.%x';
const ISSUE = {title: 'Vol. 2 No. 1 (2015)', id: 2};

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('doi.js drives a dataset fleet (fleet-prep --dataset)');
    const {DoiSettings} = require('../../../pages/DoisPages.js');
    const facts = {line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const doiRow = () => sql(app, `SELECT d.doi, d.status FROM issues i LEFT JOIN dois d ON d.doi_id = i.doi_id WHERE i.issue_id = ${ISSUE.id}`);
    const {page, close} = await launch(app);
    let n = 0;
    async function snap(name) {
        const s = await screen(page);
        const file = `doi-${String(++n).padStart(2, '0')}-${name}`;
        record(file, s);
        await shot(page, file).catch(() => {});
        return s;
    }
    const top = () => page.locator('[role="dialog"]:visible').last();
    try {
        await signIn(page, 'dbarnes');
        await idle(page);
        // 1
        await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/workflow`));
        await idle(page);
        await page.locator('#metadata-button').click();
        await idle(page);
        const group = page.getByRole('group', {name: 'Publisher ID'});
        const box = group.getByRole('checkbox', {name: 'Enable for Issues', exact: true});
        if (!(await box.isChecked())) await box.click();
        await page.locator('form').filter({has: group}).getByRole('button', {name: 'Save', exact: true}).click();
        fact('1 Enable for Issues saved', await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: T}).then(() => true).catch(() => false));
        await idle(page);
        // 2
        const s = new DoiSettings(page, app.contextPath);
        await page.goto('about:blank');
        await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/distribution#dois`));
        await idle(page);
        await s.openSideTab('Setup');
        const before = {kinds: await s.kinds(), prefix: await s.prefixBox?.().inputValue().catch(() => null)};
        await s.kindBox('Issues').check();
        await s.setup.getByRole('textbox', {name: 'DOI Prefix', exact: true}).fill('10.1234');
        await s.formatRadio('Custom pattern').check();
        await pause(300);
        await s.patternBox('Issues').fill(PATTERN);
        await s.patternBox('Submissions').fill('art%a'); // required while "Articles" is ticked
        const resp = await s.pressSave(s.setup);
        await idle(page); await pause(500);
        fact('2 DOI setup saved', {before, status: resp.status(), saved: await s.savedStatus(s.setup).count(), kinds: await s.kinds(),
            pattern: await s.patternBox('Issues').inputValue().catch(() => null)});
        await snap('doi-setup-saved');
        // 3
        await page.goto(app.url(`/index.php/${app.contextPath}/manageIssues`));
        await idle(page);
        const ft = page.getByRole('tab', {name: 'Future Issues'});
        if (await ft.count()) { await ft.first().click(); await idle(page); }
        const row = page.locator('tr.gridRow').filter({hasText: ISSUE.title}).filter({visible: true}).first();
        await row.locator('a.show_extras').click();
        await pause(300);
        await page.getByRole('link', {name: 'Edit', exact: true}).filter({visible: true}).first().click();
        await idle(page);
        await top().getByRole('tab', {name: 'Identifiers', exact: true}).click();
        await idle(page);
        const form = page.locator('form#publicIdentifiersForm');
        await form.waitFor({timeout: T});
        await form.locator('input[name="publisherId"]').fill(PID);
        const pw = page.waitForResponse((r) => /update-identifiers/.test(r.url()), {timeout: T}).catch(() => null);
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        const pr = await pw;
        await idle(page); await pause(1000);
        fact('3 Publisher ID saved', {status: pr ? pr.status() : null, stored: sql(app, `SELECT setting_value FROM issue_settings WHERE issue_id = ${ISSUE.id} AND setting_name = 'pub-id::publisher-id'`) || null});
        // 4
        await page.goto(app.url(`/index.php/${app.contextPath}/dois`));
        await idle(page);
        await page.getByRole('tab', {name: 'Issues', exact: true}).click();
        await idle(page); await pause(800);
        const panel = page.locator('.doiListPanel:visible').first();
        const irow = panel.locator('.listPanel__item--doi:visible').filter({hasText: ISSUE.title}).first();
        await irow.waitFor({timeout: T});
        fact('4 row before', (await irow.innerText()).replace(/\s+/g, ' ').trim());
        await irow.locator('input[type="checkbox"]').first().check();
        await panel.getByRole('button', {name: 'Bulk Actions'}).click();
        await pause(300);
        await page.locator('.pkpDropdown__action:visible', {hasText: 'Assign DOIs'}).first().click();
        const dlg = page.getByRole('dialog').filter({hasText: 'Assign DOIs'}).last();
        await dlg.waitFor({timeout: T});
        const question = (await dlg.innerText()).replace(/\s+/g, ' ').trim();
        const w = page.waitForResponse((r) => r.url().includes('/dois/') && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await dlg.getByRole('button', {name: 'Assign DOIs', exact: true}).click();
        const ar = await w;
        await idle(page); await pause(1200);
        const after = await snap('assign-after');
        fact('4 Assign DOIs', {question, status: ar ? ar.status() : null, url: ar ? ar.url().replace(/^https?:\/\/[^/]+/, '') : null,
            dialogs: after.aria && after.aria.dialogs, notices: after.notices});
        const ok = page.getByRole('dialog').getByRole('button', {name: /^(OK|Ok|Close)$/}).first();
        if (await ok.count()) { await ok.click().catch(() => {}); await pause(500); }
        // 5
        await page.reload(); await idle(page);
        await page.getByRole('tab', {name: 'Issues', exact: true}).click();
        await idle(page); await pause(800);
        const r2 = page.locator('.doiListPanel:visible .listPanel__item--doi:visible').filter({hasText: ISSUE.title}).first();
        const more = r2.getByRole('button', {name: /^Show more details/});
        if (await more.count()) { await more.click(); await pause(500); }
        fact('5 DOI shown', {row: (await r2.innerText()).replace(/\s+/g, ' ').trim(),
            inputs: await r2.locator('input[type="text"], input:not([type])').evaluateAll((els) => els.map((e) => e.value)).catch(() => [])});
        await snap('issue-doi');
        fact('5 DOI stored', doiRow());
    } finally {
        record('doi', facts);
        await close();
    }
});
