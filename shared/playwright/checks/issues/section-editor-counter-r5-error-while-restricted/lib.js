// Helpers of walk.js (issue report docs/issues/U64-A5-section-editor-counter-r5-error-while-restricted.md).
// Requiring this file runs nothing. Every helper presses what a person presses.
const {idle} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const PUBLIC_BOX = 'Make the COUNTER SUSHI statistics publicly available';
const LIST_API = /\/api\/v1\/stats\/sushi\/reports(\?|$)/;
const CONTEXT_API = /\/api\/v1\/contexts\/\d+/;

/** Settings › Distribution › "Statistics", freshly loaded. False when the page has no such tab. */
async function openContextStatistics(page, app, contextPath) {
    await page.goto(app.url(`/index.php/${contextPath}/en/management/settings/distribution`));
    await idle(page);
    const button = page.locator('#statistics-button');
    if (!(await button.count())) return false;
    await button.click();
    await page.locator('#statistics').getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
    await idle(page);
    return true;
}

/** The "Public API" box of the open "Statistics" tab: shown, ticked. */
async function readPublicBox(page) {
    const box = page.locator('#statistics').getByRole('checkbox', {name: PUBLIC_BOX, exact: true});
    if (!(await box.count())) return {shown: false, ticked: null};
    return {shown: true, ticked: await box.isChecked()};
}

/** Tick or untick the "Public API" box on the open tab and press "Save": the request, "Saved", the box right after. */
async function savePublicBox(page, ticked) {
    const panel = page.locator('#statistics');
    const box = panel.getByRole('checkbox', {name: PUBLIC_BOX, exact: true});
    const before = await box.isChecked();
    await box.setChecked(ticked);
    const answer = page.waitForResponse((r) => CONTEXT_API.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answer;
    const saved = await panel.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).then(() => true, () => false);
    await pause(300);
    return {before, request: `${r.request().method()} ${rel(r.url())}`, status: r.status(), saved, after: await readPublicBox(page)};
}

/**
 * The side menu's "Statistics" group, opened as a person opens it: the names of its entries,
 * and whether "Counter R5" is among them. `group` is false when the menu has no "Statistics".
 */
async function statisticsMenu(page) {
    const nav = page.getByRole('navigation').filter({has: page.getByText('Statistics', {exact: true})}).first();
    if (!(await nav.count())) return {group: false, entries: [], counterR5: false};
    const links = nav.locator('a[href*="/stats/"]');
    if (!(await links.first().isVisible().catch(() => false))) {
        await nav.getByText('Statistics', {exact: true}).first().click();
        await pause(400);
    }
    const entries = (await links.allInnerTexts()).map((s) => s.trim()).filter(Boolean);
    return {group: true, entries, counterR5: entries.includes('Counter R5')};
}

/** What the "Counter R5" page shows once landed: heading, the list's rows or its empty line, an open "Error" window. */
async function readCounterR5(page) {
    await idle(page);
    await pause(500);
    const panel = page.locator('.counterReportsListPanel').first();
    const dialog = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'OK', exact: true})}).last();
    const open = await dialog.isVisible().catch(() => false);
    return {
        address: rel(page.url()),
        title: await page.title(),
        heading: await page.locator('h1').first().innerText().then((s) => s.trim(), () => null),
        list: (await panel.count()) > 0,
        rows: (await panel.locator('.listPanel__item').allInnerTexts().catch(() => [])).map((s) => s.replace(/\s+/g, ' ').trim()),
        empty: await panel.getByText('No items found.', {exact: true}).isVisible().catch(() => false),
        errorWindow: open ? (await dialog.innerText()).replace(/\s*\n\s*/g, ' | ').trim() : null,
    };
}

/**
 * Statistics › "Counter R5" from the side menu when it is offered; when it is not, the page's address typed
 * instead (`typed: true`). Returns the menu, the list request's answer and what the page shows.
 */
async function openCounterR5(page, app, contextPath) {
    await page.goto(app.url(`/index.php/${contextPath}/en/dashboard/editorial`));
    await idle(page);
    const menu = await statisticsMenu(page);
    const listed = page.waitForResponse((r) => LIST_API.test(r.url()), {timeout: 12_000}).then(
        async (r) => ({request: `GET ${rel(r.url())}`, status: r.status(), body: r.status() >= 400 ? (await r.text().catch(() => '')).slice(0, 300) : undefined}),
        () => null,
    );
    let pageStatus = null;
    if (menu.counterR5) {
        await page.getByRole('navigation').locator('a[href*="/stats/counterR5"]').first().click();
        await page.waitForURL(/\/stats\/counterR5/, {timeout: T});
    } else {
        const r = await page.goto(app.url(`/index.php/${contextPath}/en/stats/counterR5/counterR5`));
        pageStatus = r ? r.status() : null;
    }
    const list = await listed;
    return {menu, typed: !menu.counterR5, pageStatus, listRequest: list, ...(await readCounterR5(page))};
}

/** Press "OK" on the open "Error" window, when one is open. Returns whether one was. */
async function dismissError(page) {
    const ok = page.getByRole('dialog').getByRole('button', {name: 'OK', exact: true}).last();
    if (!(await ok.isVisible().catch(() => false))) return false;
    await ok.click();
    await pause(500);
    return true;
}

/** Statistics › the group's first entry ("Articles", "Monographs", "Preprints") from the side menu: heading and any open window. */
async function openFirstStatistics(page, app, contextPath) {
    await page.goto(app.url(`/index.php/${contextPath}/en/dashboard/editorial`));
    await idle(page);
    const menu = await statisticsMenu(page);
    if (!menu.group) return {menu};
    await page.getByRole('navigation').locator('a[href*="/stats/publications"]').first().click();
    await page.waitForURL(/\/stats\/publications/, {timeout: T});
    await idle(page);
    const dialog = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'OK', exact: true})}).last();
    return {
        menu,
        address: rel(page.url()),
        heading: await page.locator('h1').first().innerText().then((s) => s.trim(), () => null),
        errorWindow: (await dialog.isVisible().catch(() => false)) ? (await dialog.innerText()).replace(/\s*\n\s*/g, ' | ').trim() : null,
    };
}

/** Record every server error and page script error the page meets. */
function watchFailures(page) {
    const failures = [];
    page.on('response', (r) => r.status() >= 500 && failures.push(`${r.status()} ${rel(r.url())}`));
    page.on('pageerror', (e) => failures.push(`pageerror ${String(e).slice(0, 200)}`));
    return failures;
}

module.exports = {T, pause, rel, PUBLIC_BOX, openContextStatistics, readPublicBox, savePublicBox, statisticsMenu, readCounterR5, openCounterR5, dismissError, openFirstStatistics, watchFailures};
