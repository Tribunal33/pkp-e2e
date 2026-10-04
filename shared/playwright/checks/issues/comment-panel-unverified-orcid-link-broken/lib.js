// Helpers for the comment-panel-unverified-orcid-link-broken walk. Requiring
// this file runs nothing.
const {sql} = require('../../../probe');

/**
 * The precondition only ORCID's service creates: a user whose ORCID iD is
 * stored but not verified. A person who registers with "Create or Connect
 * your ORCID iD" gets the iD ORCID returns written into the registration
 * form (PKP\orcid\actions\AuthorizeUserData::execute(), targetOp
 * 'register'), and PKP\user\form\RegistrationForm::execute() stores it as
 * the one user setting `orcid` (the full URI), with no `orcidIsVerified`.
 * This writes that one row, nothing else.
 *
 * @param {object} app the probe bag
 * @param {string} username a dataset user
 * @param {string} [orcid] the iD's full URI
 * @returns {string} the SQL that was run, for the record
 */
function setUnverifiedOrcid(app, username, orcid = 'https://orcid.org/0000-0001-5109-3700') {
    const q =
        `INSERT INTO user_settings (user_id, locale, setting_name, setting_value) ` +
        `SELECT user_id, '', 'orcid', '${orcid}' FROM users WHERE username = '${username}';`;
    clearOrcid(app, username);
    sql(app, q);
    return q;
}

/** Remove every ORCID setting of a user (so a mode can run twice). */
function clearOrcid(app, username) {
    sql(app, `DELETE FROM user_settings WHERE setting_name LIKE 'orcid%' AND user_id = (SELECT user_id FROM users WHERE username = '${username}');`);
}

/**
 * Press an ORCID link that opens in a new tab and return the address the
 * browser opened. orcid.org is answered by a stand-in page (the install has
 * no outside network), so the address is read, never ORCID's answer.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} link
 * @returns {Promise<string>} the new tab's address
 */
async function pressOrcidLink(page, link) {
    const context = page.context();
    if (!context.__orcidStandIn) {
        await context.route(/^https:\/\/(sandbox\.)?orcid\.org\//, (route) =>
            route.fulfill({status: 200, contentType: 'text/html', body: '<title>orcid stand-in</title>'})
        );
        context.__orcidStandIn = true;
    }
    const opened = context.waitForEvent('page', {timeout: 30_000});
    await link.click();
    const tab = await opened;
    await tab.waitForLoadState('domcontentloaded').catch(() => {});
    const url = tab.url();
    await tab.close();
    return url;
}

/** What the panel's ORCID line shows: text, address and icon of each link. */
async function readOrcidLine(panel) {
    const links = panel.locator('a[href*="orcid"]');
    return links.evaluateAll((els) =>
        els.map((a) => ({
            text: a.textContent.replace(/\s+/g, ' ').trim(),
            href: a.getAttribute('href'),
            // the icon beside the link (Orcid solid or OrcidUnauthenticated
            // hollow), told apart by its drawing: the paths' total length
            iconPaths: [...a.parentElement.querySelectorAll('svg path')].map((p) => (p.getAttribute('d') || '').length),
        }))
    );
}

module.exports = {setUnverifiedOrcid, clearOrcid, pressOrcidLink, readOrcidLine};
