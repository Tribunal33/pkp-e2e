// Issue report walk: docs/issues/U63-OJS1-doaj-issue-window-headed-doi-plugin-settings.md
// (spec U63 register OJS1). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"):
// its journal `publicknowledge`, its manager `rvaca`, its published issue
// "Vol. 1 No. 2 (2014)" and its article "Signalling Theory Dividends".
// OJS only: OMP and OPS have no DOAJ tool. The kit builds nothing.
//
//   1. Sign in as rvaca.  2. Tools › "DOAJ Export Plugin".  3. "Articles".
//   4. The row "Signalling Theory Dividends": press "Vol. 1 No. 2 (2014)".
//   Read: the window's heading and its tabs.
// The neighbour check (the Issues page's own window) is neighbour.js beside it.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir2 PROBE_AGENT=u63ojs1 node bin/probe.js ojs shared/playwright/checks/issues/doaj-issue-window-headed-doi-plugin-settings/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=u63ojs1 node bin/probe.js ojs shared/playwright/checks/issues/doaj-issue-window-headed-doi-plugin-settings/walk.js
// Fix trial:    trial.sh beside this file.
// Facts: .reports/<feature>/u63ojs1/walk-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');

const T = 30_000;
const ARTICLE = 'Signalling Theory Dividends';
const ISSUE = 'Vol. 1 No. 2 (2014)';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // the DOAJ tool is OJS's only
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {line: app.line || 'main', dataset: app.dataset};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v)}`); };
    const ctx = app.contextPath;
    const {page, close} = await launch(app);
    try {
        // 1. Sign in as rvaca.
        await signIn(page, 'rvaca', {contextPath: ctx});
        await idle(page);
        // 2. Side menu "Tools", then "DOAJ Export Plugin".
        const tools = page.getByRole('link', {name: 'Tools', exact: true}).first();
        await Promise.all([page.waitForURL(/management\/tools/, {timeout: T}), tools.click()]);
        await idle(page);
        const link = page.getByRole('link', {name: 'DOAJ Export Plugin', exact: true}).first();
        await link.waitFor({timeout: T});
        await Promise.all([page.waitForURL(/importexport\/plugin/, {timeout: T}), link.click()]);
        await idle(page);
        fact('2 tabs', (await page.locator('#importExportTabs .ui-tabs-nav li').allInnerTexts()).map((t) => t.trim()));
        // 3. "Articles".
        await page.locator('#importExportTabs .ui-tabs-nav li').filter({hasText: /^\s*Articles\s*$/}).first().click();
        const grid = page.locator('#submissionsListGridContainer .pkp_controllers_grid').first();
        const row = grid.locator('tr.gridRow').filter({hasText: ARTICLE}).first();
        await row.waitFor({timeout: T});
        await idle(page);
        fact('3 row', (await row.innerText()).replace(/\s+/g, ' ').trim());
        record('03-articles', await screen(page));
        // 4. Press the issue's name in the row.
        const issueLink = row.getByRole('link', {name: ISSUE, exact: true});
        fact('4 issue link count', await issueLink.count());
        await issueLink.click();
        // The window: the visible dialog holding the side window's header.
        const modal = page.getByRole('dialog').filter({visible: true}).filter({has: page.locator('[data-cy="sidemodal-header"]')}).last();
        await modal.waitFor({timeout: T});
        await modal.getByRole('tab', {name: 'Issue Data'}).first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        fact('4 window heading', (await modal.locator('[data-cy="sidemodal-header"] h1').first().innerText()).trim());
        fact('4 window tabs', (await modal.getByRole('tab').allInnerTexts()).map((t) => t.trim()).filter(Boolean));
        const s = await screen(page);
        record('04-issue-window', s);
        await shot(page, '04-issue-window');
    } finally {
        record('walk-facts', facts);
        await close();
    }
});
