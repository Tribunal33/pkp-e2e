// Neighbour check for docs/issues/U63-OJS1-doaj-issue-window-headed-doi-plugin-settings.md
// (the report's Control): the Issues page's own window for the same issue
// keeps its heading, "Issue Management: Vol. 1 No. 2 (2014)", with the fix
// in and out. PKP's default test dataset, OJS only; the kit builds nothing.
//
//   1. Sign in as rvaca.  2. Side menu "Issues" (main: under "Content"), tab "Back Issues".
//   3. Press "Vol. 1 No. 2 (2014)".  Read: the window's heading and its tabs.
//
// Reset first, then (main):
//   PROBE_FEATURE=issues-ir2 PROBE_AGENT=u63ojs1 node bin/probe.js ojs shared/playwright/checks/issues/doaj-issue-window-headed-doi-plugin-settings/neighbour.js
// Facts: .reports/<feature>/u63ojs1/neighbour-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');

const T = 30_000;
const ISSUE = 'Vol. 1 No. 2 (2014)';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {line: app.line || 'main', dataset: app.dataset};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v)}`); };
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca', {contextPath: app.contextPath});
        await idle(page);
        // 2. Side menu "Issues" (on main under "Content": open that group first).
        const nav = page.getByRole('navigation', {name: 'Site Navigation'});
        const issues = nav.getByRole('link', {name: 'Issues', exact: true}).first();
        if (!(await issues.isVisible())) {
            await nav.getByText('Content', {exact: true}).first().click();
            fact('2 opened the "Content" group', true);
        }
        await Promise.all([page.waitForURL(/manageIssues/, {timeout: T}), issues.click()]);
        await idle(page);
        await page.getByRole('tab', {name: 'Back Issues'}).first().click();
        const link = page.locator('#backIssuesTab, [id^="component-grid-issues-backissuegrid"]').getByRole('link', {name: ISSUE, exact: true}).first();
        await link.waitFor({timeout: T});
        await idle(page);
        await link.click();
        // The window: the visible dialog holding the side window's header.
        const modal = page.getByRole('dialog').filter({visible: true}).filter({has: page.locator('[data-cy="sidemodal-header"]')}).last();
        await modal.waitFor({timeout: T});
        await modal.getByRole('tab', {name: 'Issue Data'}).first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        fact('3 window heading', (await modal.locator('[data-cy="sidemodal-header"] h1').first().innerText()).trim());
        fact('3 window tabs', (await modal.getByRole('tab').allInnerTexts()).map((t) => t.trim()).filter(Boolean));
        record('n3-issue-window', await screen(page));
        await shot(page, 'n3-issue-window');
    } finally {
        record('neighbour-facts', facts);
        await close();
    }
});
