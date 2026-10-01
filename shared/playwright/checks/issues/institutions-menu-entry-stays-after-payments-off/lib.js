// Helpers of walk.js and neighbour.js (issue report docs/issues/U52-A12-institutions-menu-entry-stays-after-payments-off.md).
// Requiring this file runs nothing. Every helper presses what a person presses.
const {idle} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const rel = (u) => u.replace(/^https?:\/\/[^/]+/, '');
const STATS_LABEL = 'Enable institutional statistics';

/** The side menu's entries by their labels, and the two the report is about. */
async function menu(page) {
    const labels = await page
        .locator('nav#app-nav')
        .locator('[role="button"][aria-label], [role="treeitem"][aria-label], a[aria-label]')
        .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')).filter((x, i, a) => x && a.indexOf(x) === i));
    return {institutions: labels.includes('Institutions'), payments: labels.includes('Payments'), labels};
}

/** Press a settings page's tab and wait for its form. */
async function showTab(page, tab) {
    await page.locator(`#${tab}-button`).click();
    await page.locator(`#${tab}`).getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
    await idle(page);
}

/** Settings › Distribution, freshly loaded, on a tab when one is named. */
async function openDistribution(page, app, tab) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/distribution`));
    await idle(page);
    if (tab) await showTab(page, tab);
}

/** Tick or untick a tab's box and press its "Save": the answer, the "Saved" notice and the side menu right after. */
async function saveBox(page, tab, box, on, urlRe) {
    const panel = page.locator(`#${tab}`);
    await box.setChecked(on);
    const answer = page.waitForResponse((r) => urlRe.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answer;
    const saved = await panel.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).then(() => true, () => false);
    await pause(500);
    return {box: on ? 'ticked' : 'unticked', request: `${r.request().method()} ${rel(r.url())}`, status: r.status(), saved, menu: await menu(page)};
}

/** The "Payments" tab's "Enable", ticked or unticked, then "Save". */
function savePayments(page, on) {
    return saveBox(page, 'payments', page.locator('#payments input[name="paymentsEnabled"]'), on, /\/_payments/);
}

/** The "Statistics" tab's "Enable institutional statistics" (the site's or the journal's), then "Save". */
function saveInstitutionStats(page, on, urlRe) {
    return saveBox(page, 'statistics', page.locator('#statistics').getByLabel(STATS_LABEL, {exact: true}), on, urlRe);
}

/** Record every server error and page script error the page meets. */
function watchFailures(page) {
    const failures = [];
    page.on('response', (r) => r.status() >= 500 && failures.push(`${r.status()} ${rel(r.url())}`));
    page.on('pageerror', (e) => failures.push(`pageerror ${String(e).slice(0, 200)}`));
    return failures;
}

module.exports = {T, pause, rel, menu, showTab, openDistribution, saveBox, savePayments, saveInstitutionStats, watchFailures};
