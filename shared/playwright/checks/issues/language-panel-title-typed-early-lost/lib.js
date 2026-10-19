// Helpers for walk.js (U40 A22). Requiring this file runs nothing.
// openTitleAbstract, readout, panel and throttle are copied from the U40 A15 report's lib.js, so this
// folder stands alone.
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The dataset submission each app's walk uses (unpublished, one version, no French title). */
const SUBMISSIONS = {
    ojs: {id: 4, title: 'Computer Skill Requirements for New and Existing Teachers: Implications for Policy and Practice'},
    omp: {id: 3, title: 'The Political Economy of Workplace Injury in Canada'},
    ops: {id: 1, title: 'The influence of lactation on the quantity and quality of cashmere production'},
};

/** Open a submission's workflow by address (the dashboard's "View") and its side menu's "Title & Abstract". */
async function openTitleAbstract(page, app, id) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    await idle(page);
    const entry = page.getByRole('link', {name: 'Title & Abstract', exact: true}).first();
    await entry.waitFor({state: 'attached', timeout: T}).catch(() => {});
    if (!(await entry.isVisible().catch(() => false))) {
        await page.getByRole('link', {name: /^(Publication|Preprint)$/}).first().click();
    }
    await entry.click();
    await page.getByText('Current Submission Language:', {exact: false}).first().waitFor({state: 'visible', timeout: T});
    await idle(page);
}

/** The "Current Submission Language: …" line's text on the page behind (null when absent). */
async function readout(page) {
    const line = page.getByText('Current Submission Language:', {exact: false}).first();
    if (!(await line.isVisible().catch(() => false))) return null;
    return flat(await line.locator('xpath=..').innerText(), 200);
}

/** The "Change Submission Language For" side panel. */
const panel = (page) => page.getByRole('dialog', {name: /Change Submission Language/i});

/**
 * DevTools-style network throttling through the Chrome DevTools protocol, the same call DevTools'
 * throttling menu makes: `kbitDown`/`kbitUp` as in a custom profile, or null for "No throttling".
 */
async function throttle(cdp, profile) {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', profile
        ? {offline: false, latency: profile.latency || 0, downloadThroughput: (profile.kbitDown * 1000) / 8, uploadThroughput: (profile.kbitUp * 1000) / 8}
        : {offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1});
}

/** Wait until the open panel's line under its heading names `title` (its loading has ended). */
function subtitleShows(page, title, timeout = 60_000) {
    return page.waitForFunction((t) => {
        const d = [...document.querySelectorAll('[role="dialog"]')].find((x) => /Change Submission Language/i.test((document.getElementById(x.getAttribute('aria-labelledby')) || {}).textContent || ''));
        return !!d && !!(document.getElementById(d.getAttribute('aria-describedby')) || {}).textContent?.includes(t);
    }, title, {timeout}).then(() => true).catch(() => false);
}

/**
 * Every TinyMCE editor whose element sits inside `scope` ('panel': the language panel; 'page': the
 * rest of the page): id, initialized, what its editable body shows (innerText, read before and
 * after initialization alike), whether that body takes keys (contentEditable), the `disabled`
 * option, and whether the editor's busy indicator is showing.
 */
async function editors(page, scope = 'panel') {
    return page.evaluate((sc) => {
        const d = [...document.querySelectorAll('[role="dialog"]')].find((x) => /Change Submission Language/i.test((document.getElementById(x.getAttribute('aria-labelledby')) || {}).textContent || ''));
        return (window.tinymce?.get() || [])
            .filter((e) => e.getElement() && e.getElement().isConnected && (sc === 'panel' ? !!d && d.contains(e.getElement()) : !(d && d.contains(e.getElement()))))
            .map((e) => {
                const ifr = document.getElementById(`${e.id}_ifr`);
                const body = ifr && ifr.contentDocument ? ifr.contentDocument.body : null;
                const container = e.getContainer && e.getContainer();
                const throbber = container ? container.querySelector('.tox-throbber') : null;
                return {
                    id: e.id,
                    initialized: !!e.initialized,
                    shows: body ? body.innerText.replace(/\s+/g, ' ').trim() : null,
                    contentEditable: body ? body.contentEditable : null,
                    disabledOption: e.options && e.options.isRegistered && e.options.isRegistered('disabled') ? e.options.get('disabled') : null,
                    busy: !!throbber && getComputedStyle(throbber).display !== 'none',
                    content: e.initialized ? e.getContent({format: 'text'}) : null,
                };
            });
    }, scope);
}

/** The open panel's text (descriptions, errors) and the line under its heading. */
async function panelText(page) {
    return page.evaluate(() => {
        const d = [...document.querySelectorAll('[role="dialog"]')].find((x) => /Change Submission Language/i.test((document.getElementById(x.getAttribute('aria-labelledby')) || {}).textContent || ''));
        if (!d) return {open: false};
        const desc = document.getElementById(d.getAttribute('aria-describedby'));
        return {open: true, subtitle: desc ? desc.textContent.replace(/\s+/g, ' ').trim() : null, text: d.innerText.replace(/\s+/g, ' ').trim().slice(0, 2500)};
    });
}

module.exports = {T, flat, SUBMISSIONS, openTitleAbstract, readout, panel, throttle, subtitleShows, editors, panelText};
