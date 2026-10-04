// Helpers for walk.js (U63 A24): paging the Native XML export list and the
// submissions dashboard, reading which submissions each page shows.
// The plugin page and export-list helpers come from the sibling issue walks' lib.js.
// Requiring this file runs nothing.
const {idle} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');

const {sleep, flat} = native;

/** Ids that appear more than once, and the ids of `all` that appear nowhere in `seen`. */
function tally(seen, all = null) {
    const count = new Map();
    seen.forEach((id) => count.set(id, (count.get(id) || 0) + 1));
    const repeated = [...count].filter(([, n]) => n > 1).map(([id, n]) => ({id, n}));
    const missing = all ? all.filter((id) => !count.has(id)) : null;
    return {lines: seen.length, distinct: count.size, repeated, missing};
}

/** Open the editorial dashboard and the named view from its side menu; returns the view's state. */
async function openDashboardView(app, page, name) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
    await page.locator('nav, [role=navigation]').first().waitFor({timeout: 30_000});
    await idle(page).catch(() => {});
    const link = page.locator('a[href*="dashboard/editorial"]').filter({has: page.getByText(name, {exact: true})}).first();
    await link.click();
    await idle(page).catch(() => {});
    await waitRows(page);
    return dashboardState(page);
}

async function waitRows(page) {
    for (let i = 0; i < 60; i++) {
        if (await page.locator('[id^="submission-title-"]').count()) break;
        await sleep(250);
    }
    await idle(page).catch(() => {});
}

/** What the dashboard table shows: the IDs of its rows, the "Showing x to y of n" line, the current page. */
async function dashboardState(page) {
    return page.evaluate(() => {
        const ids = [...document.querySelectorAll('[id^="submission-title-"]')].map((e) => Number(e.id.replace('submission-title-', '')));
        const showing = [...document.querySelectorAll('span')].map((s) => s.innerText.replace(/\s+/g, ' ').trim()).find((t) => /^Showing \d+ to \d+ of \d+$/.test(t)) || null;
        const cur = document.querySelector('.pkpPagination [aria-current="true"]');
        const heading = document.querySelector('h1');
        return {ids, showing, currentPage: cur ? cur.innerText.trim() : null, heading: heading ? heading.innerText.replace(/\s+/g, ' ').trim() : null};
    });
}

/** Press "Next" under the dashboard table and wait for the next page's rows; null when there is no next page. */
async function dashboardNext(page) {
    const before = await dashboardState(page);
    const next = page.locator('.pkpPagination').getByRole('button', {name: /Next/}).first();
    if (!(await next.count()) || !(await next.isEnabled().catch(() => false))) return null;
    await next.click();
    for (let i = 0; i < 80; i++) {
        await sleep(250);
        const s = await dashboardState(page);
        if (s.currentPage !== before.currentPage && s.ids.length && s.ids.join() !== before.ids.join()) break;
    }
    await idle(page).catch(() => {});
    return dashboardState(page);
}

module.exports = {tally, openDashboardView, dashboardState, dashboardNext, flat};
