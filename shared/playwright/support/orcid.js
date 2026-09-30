/**
 * @file shared/playwright/support/orcid.js
 *
 * ORCID's own site, as the browser meets it, answered by the test.
 *
 * The profile's (and the registration page's) ORCID button runs the page's
 * `openORCID()` (lib/pkp templates/form/orcidProfile.tpl): a JSONP call to
 * `<orcid>/userStatus.json?logUserOut=true` and a `window.open` on
 * `<orcid>/oauth/authorize?client_id=…&redirect_uri=…/orcid/authorizeOrcid…`.
 * Both go from the browser straight to ORCID (the dead-port `[proxy]` only
 * covers the app server's own outbound calls). Playwright's `popup` event
 * fires only once the popup's first response has started loading, so a slow
 * or stalled ORCID sandbox left `waitForEvent('popup')` hanging to the test
 * timeout (U04 S2 on CI, 2026-09-25 and 2026-09-29;
 * `.reports/flake-0930/u04s2/diagnosis.md`).
 *
 * `stubOrcidSite(context)` answers every request to orcid.org and
 * sandbox.orcid.org in that context locally: the JSONP call gets a
 * "not signed in" answer under its own callback name, anything else a small
 * HTML page. The popup keeps the address the app built, which is all a
 * test reads of it; what ORCID itself shows is not the app's behaviour.
 *
 * Armed per context, right before the press, never for every context: any
 * `route()` sends every later request of the context through the runner
 * and switches the browser cache off for it.
 */

/** ORCID's public and sandbox sites (orcidProfile.tpl's `$orcidUrl`). */
const ORCID_SITE = /^https:\/\/(sandbox\.)?orcid\.org\//;

/** Contexts already armed (a second route would only stack a duplicate). */
const armed = new WeakSet();

/**
 * Answer the browser's requests to ORCID's site in this context locally.
 * Idempotent per context.
 *
 * @param {import('@playwright/test').BrowserContext} context
 */
async function stubOrcidSite(context) {
    if (armed.has(context)) {
        return;
    }
    armed.add(context);
    await context.route(ORCID_SITE, (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith('/userStatus.json')) {
            const callback = url.searchParams.get('callback') || '';
            const body = /^[\w$.]+$/.test(callback) ? `${callback}({"loggedIn":false});` : '';
            return route.fulfill({status: 200, contentType: 'application/javascript', body});
        }
        return route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: '<!doctype html><title>ORCID (test stand-in)</title><p>ORCID sign-in (test stand-in)</p>',
        });
    });
}

/**
 * Press a control that runs `openORCID()` and return the popup it opens,
 * with ORCID's site stubbed in the page's context first.
 *
 * @param {import('@playwright/test').Page} page the page holding the control
 * @param {import('@playwright/test').Locator} control the connect button (or a link running openORCID)
 * @returns {Promise<import('@playwright/test').Page>}
 */
async function pressOrcidConnect(page, control) {
    await stubOrcidSite(page.context());
    const [popup] = await Promise.all([page.waitForEvent('popup'), control.click()]);
    return popup;
}

module.exports = {stubOrcidSite, pressOrcidConnect, ORCID_SITE};
