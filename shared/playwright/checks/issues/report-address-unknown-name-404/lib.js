// Helpers of the U65 A8 walk (issue report
// docs/issues/U65-A8-report-address-unknown-name-404.md). Requiring this file runs nothing.
const {idle, screen} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/[\s ]+/g, ' ').trim().slice(0, n));
const rel = (u) => String(u).replace(/^https?:\/\/[^/]+/, '');

/** The context's address prefix: `/index.php/<path>/en` (3.4 and 3.3 have no locale segment). */
function prefix(app) {
    const noLocale = /stable-3_[34]_0/.test(app.line || '');
    return `/index.php/${app.contextPath}${noLocale ? '' : '/en'}`;
}

/** What a landed page shows: its address, status, title, heading and main text. */
async function readLanded(page, status) {
    const s = await screen(page);
    const h1 = await page.locator('h1').first().innerText({timeout: 3_000}).catch(() => null);
    return {url: rel(page.url()), status, title: s.title, h1: flat(h1, 120), text: flat(s.text.main || s.text.body || '', 300)};
}

/** Side menu "Statistics" › "Reports", pressed; the page it opens. */
async function openReportsFromMenu(page, app) {
    await page.goto(app.url(`${prefix(app)}/dashboard/editorial`));
    await idle(page).catch(() => {});
    const out = {};
    const reports = page.getByRole('link', {name: 'Reports', exact: true}).first();
    if (!(await reports.isVisible().catch(() => false))) {
        const stats = page.getByRole('button', {name: 'Statistics'}).or(page.getByRole('link', {name: 'Statistics', exact: true})).first();
        if (await stats.isVisible().catch(() => false)) await stats.click().catch((e) => { out.statisticsError = flat(e.message, 120); });
    }
    try {
        await reports.click({timeout: 10_000});
        await idle(page).catch(() => {});
        out.from = 'side menu';
    } catch (e) {
        out.from = `address (side menu link not pressed: ${flat(e.message, 120)})`;
        await page.goto(app.url(`${prefix(app)}/stats/reports`));
        await idle(page).catch(() => {});
    }
    Object.assign(out, await readLanded(page, null));
    out.links = await page.locator('main a').evaluateAll((as) => as.map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href')})).filter((l) => /pluginName=/.test(l.href || '')));
    out.links = out.links.map((l) => ({text: l.text, href: rel(l.href)}));
    return out;
}

/**
 * Type an address in the address bar (page.goto) and read where it lands. A download (the
 * report's file) settles it as well: the file's name is returned instead of a page.
 */
async function typeAddress(page, app, path) {
    const dl = page.waitForEvent('download', {timeout: 20_000}).catch(() => null);
    let status = null, gotoError = null;
    try {
        const r = await page.goto(app.url(path), {timeout: T});
        status = r ? r.status() : null;
    } catch (e) {
        gotoError = flat(e.message, 160);
    }
    if (gotoError && /Download is starting/i.test(gotoError)) {
        const d = await dl;
        return {typed: path, download: d ? d.suggestedFilename() : null};
    }
    await idle(page).catch(() => {});
    const out = {typed: path, ...(await readLanded(page, status))};
    if (gotoError) out.gotoError = gotoError;
    return out;
}

/** Press a report's link on the "Reports" page; the downloaded file's name, or where the page went. */
async function pressReport(page, name) {
    const dl = page.waitForEvent('download', {timeout: 30_000}).catch(() => null);
    await page.locator('main').getByRole('link', {name, exact: true}).click();
    const d = await dl;
    if (d) return {pressed: name, download: d.suggestedFilename()};
    return {pressed: name, download: null, url: rel(page.url())};
}

module.exports = {T, flat, rel, prefix, readLanded, openReportsFromMenu, typeAddress, pressReport};
