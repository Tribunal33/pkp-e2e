// Helpers of walk.js (U62 A1, the Plugin Gallery offline). Requiring this file runs nothing.
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 600) =>
    String(s == null ? '' : s)
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Per-app words of the dataset's one context and the Administration link to it. */
const WORDS = {
    ojs: {context: 'Journal of Public Knowledge', hosted: 'Hosted Journals'},
    omp: {context: 'Public Knowledge Press', hosted: 'Hosted Presses'},
    ops: {
        context: 'Public Knowledge Preprint Server',
        hosted: 'Hosted Servers',
    },
};

/** Every answer of the gallery's list (`plugin-gallery-grid/fetch-grid`), status and body length. */
function watchGallery(page) {
    const seen = [];
    page.on('response', async (r) => {
        if (!/plugin-gallery-grid\/fetch-grid/.test(r.url())) return;
        const body = await r.text().catch(() => '');
        seen.push({
            status: r.status(),
            bodyLength: body.length,
            query: flat(r.url().replace(/^.*fetch-grid\??/, ''), 200),
        });
    });
    return seen;
}

/** Side menu › "Settings" › "Website" (the group opened first when it is closed). */
async function sideMenuWebsite(page) {
    const nav = page.getByRole('navigation', {name: 'Site Navigation'});
    const website = nav.getByRole('link', {name: 'Website', exact: true}).first();
    if (!(await website.isVisible())) {
        await nav.getByRole('button', {name: 'Settings', exact: true}).first().click();
        await website.waitFor({state: 'visible', timeout: T});
    }
    await website.click();
    await page.waitForURL(/\/management\/settings\/website/, {timeout: T});
    await idle(page).catch(() => {});
}

/** A tab by its words inside main (first match), pressed. */
async function pressTab(page, name) {
    const tab = page.getByRole('main').getByRole('tab', {name, exact: true}).first();
    await tab.click({timeout: T});
    await idle(page).catch(() => {});
    return tab.getAttribute('aria-selected');
}

/** The "Plugin Gallery" panel as data, `waitMs` after the press. */
async function readGallery(page, waitMs = 10_000) {
    await sleep(waitMs);
    return page.evaluate(() => {
        const t = (s) =>
            String(s == null ? '' : s)
                .replace(/\s+/g, ' ')
                .trim();
        const tab = [...document.querySelectorAll('[role="tab"]')].find((e) => t(e.innerText) === 'Plugin Gallery');
        const panel = tab && document.getElementById(tab.getAttribute('aria-controls'));
        if (!panel) return {panel: false};
        const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
        return {
            panel: true,
            selected: tab.getAttribute('aria-selected'),
            text: t(panel.innerText).slice(0, 600),
            spinnerVisible: [...panel.querySelectorAll('.pkp_spinner')].some(vis),
            grid: !!panel.querySelector('.pkp_controllers_grid'),
            rows: panel.querySelectorAll('tr.gridRow').length,
            emptyRow: t(panel.querySelector('tr.empty')?.innerText) || null,
            categoryChoice: !!panel.querySelector('select[name="category"]'),
        };
    });
}

/** The installed list: its category headings and plugin rows. */
async function readInstalled(page) {
    return page.evaluate(() => {
        const t = (s) =>
            String(s == null ? '' : s)
                .replace(/\s+/g, ' ')
                .trim();
        const grid = [
            ...document.querySelectorAll(
                '.pkp_controllers_grid[id^="component-grid-settings-plugins-settingsplugingrid-"]',
            ),
        ][0];
        if (!grid) return {grid: false};
        return {
            grid: true,
            headings: [...grid.querySelectorAll('tbody.category_grid_body > tr.gridRow:first-child')].map((r) =>
                t(r.innerText),
            ),
            rows: grid.querySelectorAll('tbody.category_grid_body tr.gridRow').length,
        };
    });
}

/** Administration › "Hosted …" › the context's arrow › "Settings wizard". */
async function openWizard(app, page) {
    const words = WORDS[app.name];
    await page.goto(app.url('/index.php/index/en/admin'));
    await idle(page).catch(() => {});
    await page.getByRole('link', {name: words.hosted, exact: true}).click();
    await page.waitForURL(/\/admin\/contexts/, {timeout: T});
    await idle(page).catch(() => {});
    const row = page.locator('tr.gridRow').filter({hasText: words.context}).first();
    await row.locator('a.show_extras').click();
    await row
        .locator('xpath=following-sibling::tr[1]')
        .getByRole('link', {name: 'Settings wizard', exact: true})
        .click();
    await page.waitForURL(/\/admin\/wizard\/\d+/, {timeout: T});
    await idle(page).catch(() => {});
}

module.exports = {
    T,
    flat,
    sleep,
    WORDS,
    watchGallery,
    sideMenuWebsite,
    pressTab,
    readGallery,
    readInstalled,
    openWizard,
};
