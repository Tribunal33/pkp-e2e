// Helpers of walk.js here (issue report docs/issues/U56-A1-emails-tab-editorial-statistics-says-journal.md).
// Requiring this file runs nothing.
const {idle, settled} = require('../../../probe');

const T = 30_000;
const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();
/** The locale segment of a context address: none on 3.4 and 3.3. */
const L = (app, locale) => (app.line && /3_[34]/.test(app.line) ? '' : `/${locale}`);

/**
 * Settings › Workflow, then its "Emails" tab pressed as a person would. Returns the page's status
 * and the tab panel's text once it has settled (lines kept, blank lines dropped).
 */
async function openEmailsTab(page, app, locale = 'en') {
    await page.goto('about:blank');
    const r = await page.goto(app.url(`/index.php/${app.contextPath}${L(app, locale)}/management/settings/workflow`));
    await idle(page).catch(() => {});
    const tab = page.locator('#emails-button');
    await tab.waitFor({state: 'visible', timeout: T}).catch(() => {});
    if (await tab.count()) await tab.first().click();
    await idle(page).catch(() => {});
    const panel = page.locator('#emails');
    await panel.locator('form').first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    const text = await settled(page, panel);
    const lines = (text || '').split('\n').map(flat).filter(Boolean);
    return {status: r ? r.status() : null, url: page.url(), lines};
}

/**
 * The description printed under the "Editorial statistics" field (its label in `label`), read off the
 * tab's lines: the line right after the label. Also every line of the tab that names a context kind.
 */
function readStatistics(lines, label) {
    const i = lines.indexOf(label);
    const naming = lines.filter((l) => /\b(journal|press|preprint server|revue|presse|serveur)\b/i.test(l));
    return {label, description: i >= 0 ? lines[i + 1] || null : null, naming};
}

module.exports = {T, flat, L, openEmailsTab, readStatistics};
