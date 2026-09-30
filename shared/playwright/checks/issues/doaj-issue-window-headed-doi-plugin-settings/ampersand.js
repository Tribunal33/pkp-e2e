// Escaping check for docs/issues/U63-OJS1-doaj-issue-window-headed-doi-plugin-settings.md:
// how an issue whose identification holds "&" is headed, on the Issues page
// and from the DOAJ "Articles" list. PKP's default test dataset, OJS only;
// the kit builds nothing.
//
//   1. Sign in as rvaca.  2. Side menu "Issues" (main: under "Content"), tab "Back Issues".
//   3. Press "Vol. 1 No. 2 (2014)"; in its window's "Issue Data", type
//      "u63ojs1 Arts & Letters" into "Title", tick "Title" under the
//      identification boxes, press "Save".
//   4. Reload; "Back Issues"; press the issue (its name now ends with the title).
//      Read: the window's heading.
//   5. Tools › "DOAJ Export Plugin" › "Articles"; in the row "Signalling Theory
//      Dividends" press the issue's name. Read: the window's heading.
//
// Reset first, then (main):
//   flock -s .reports/issues/main-code.lock env PROBE_FEATURE=issues-ir4 PROBE_AGENT=u63ojs1 node bin/probe.js ojs shared/playwright/checks/issues/doaj-issue-window-headed-doi-plugin-settings/ampersand.js
// Facts: .reports/<feature>/u63ojs1/ampersand-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');

const T = 30_000;
const ISSUE = 'Vol. 1 No. 2 (2014)';
const TITLE = 'u63ojs1 Arts & Letters';
const ARTICLE = 'Signalling Theory Dividends';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('ampersand.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {line: app.line || 'main', dataset: app.dataset};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v)}`); };
    const {page, close} = await launch(app);
    const sideModal = () => page.getByRole('dialog').filter({visible: true}).filter({has: page.locator('[data-cy="sidemodal-header"]')}).last();
    const heading = async (m) => (await m.locator('[data-cy="sidemodal-header"] h1').first().innerText()).trim();
    async function openBackIssues() {
        const nav = page.getByRole('navigation', {name: 'Site Navigation'});
        const issues = nav.getByRole('link', {name: 'Issues', exact: true}).first();
        if (!(await issues.isVisible())) await nav.getByText('Content', {exact: true}).first().click();
        await Promise.all([page.waitForURL(/manageIssues/, {timeout: T}), issues.click()]);
        await idle(page);
        await page.getByRole('tab', {name: 'Back Issues'}).first().click();
        await page.locator('[id^="component-grid-issues-backissuegrid"] tr.gridRow').first().waitFor({timeout: T});
        await idle(page);
    }
    try {
        await signIn(page, 'rvaca', {contextPath: app.contextPath});
        await idle(page);
        // 2-3. Give the issue a title holding "&" and show it.
        await openBackIssues();
        await page.locator('[id^="component-grid-issues-backissuegrid"]').getByRole('link', {name: ISSUE, exact: true}).first().click();
        let m = sideModal();
        await m.waitFor({timeout: T});
        await m.getByRole('tab', {name: 'Issue Data'}).first().click();
        const form = m.locator('#issueForm');
        await form.waitFor({timeout: T});
        await idle(page);
        await form.locator('input[name="title[en]"]').fill(TITLE);
        await form.locator('input[name="showTitle"]').check();
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        await idle(page).catch(() => {});
        await pause(1500);
        record('a3-saved', await screen(page));
        // 4. The Issues page's own window.
        await page.reload();
        await idle(page);
        await openBackIssues();
        const gridLinks = await page.locator('[id^="component-grid-issues-backissuegrid"] tr.gridRow a').allInnerTexts();
        fact('4 back issues links', gridLinks.map((t) => t.trim()).filter(Boolean));
        await page.locator('[id^="component-grid-issues-backissuegrid"]').getByRole('link', {name: /Arts/}).first().click();
        m = sideModal();
        await m.waitFor({timeout: T});
        await idle(page);
        fact('4 Issues page window heading', await heading(m));
        record('a4-issues-window', await screen(page));
        // 5. The DOAJ "Articles" list's window.
        await page.goto(app.url(`/index.php/${app.contextPath}/en/management/importexport/plugin/DOAJExportPlugin`));
        await idle(page);
        await page.locator('#importExportTabs .ui-tabs-nav li').filter({hasText: /^\s*Articles\s*$/}).first().click();
        const row = page.locator('#submissionsListGridContainer tr.gridRow').filter({hasText: ARTICLE}).first();
        await row.waitFor({timeout: T});
        await idle(page);
        fact('5 DOAJ row', (await row.innerText()).replace(/\s+/g, ' ').trim());
        await row.getByRole('link', {name: /Arts/}).first().click();
        m = sideModal();
        await m.waitFor({timeout: T});
        await idle(page);
        fact('5 DOAJ list window heading', await heading(m));
        record('a5-doaj-window', await screen(page));
    } finally {
        record('ampersand-facts', facts);
        await close();
    }
});
