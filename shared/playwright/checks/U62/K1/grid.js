// U62 K1 helpers: the legacy plugin grids (Installed Plugins on a journal, the site and the Settings Wizard) read as data.
const {screen, shot, record, idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (t, n = 400) => (t == null ? t : String(t).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);
const DENIED = /does not have access to this operation/i;

// The installed-plugins grid: the journal's (settingsplugingrid) or the site's (adminplugingrid), whichever is visible.
const GRID = '.pkp_controllers_grid[id^="component-grid-settings-plugins-settingsplugingrid-"]:visible, .pkp_controllers_grid[id^="component-grid-admin-plugins-adminplugingrid-"]:visible';

async function snap(page, name, extra = {}) {
    const s = await screen(page).catch((e) => ({url: page.url(), screenError: flat(e.message, 300)}));
    record(name, {...s, ...extra});
    await shot(page, name).catch(() => {});
    return s;
}

/** The visible installed-plugins grid as data: title, header links, columns, filter, categories with rows. */
async function readGrid(page) {
    const g = page.locator(GRID).first();
    if (!(await g.count())) return {found: false};
    return g.evaluate((grid) => {
        const txt = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
        const vis = (el) => !!(el && el.offsetParent !== null && getComputedStyle(el).display !== 'none');
        const form = grid.querySelector('form');
        const cats = [...grid.querySelectorAll('tbody.category_grid_body')].map((tb) => {
            const trs = [...tb.querySelectorAll('tr.gridRow')];
            const head = trs[0];
            const ph = tb.nextElementSibling && tb.nextElementSibling.classList.contains('category_placeholder') ? tb.nextElementSibling : null;
            return {
                id: tb.id.replace(/^.*-category-/, ''),
                heading: txt(head),
                headingVisible: vis(head),
                bodyVisible: vis(tb),
                empty: ph ? (vis(ph) ? txt(ph) : null) : null,
                rows: trs.slice(1).map((tr) => {
                    const box = tr.querySelector('input[type=checkbox]');
                    const name = tr.querySelector('td .label');
                    return {id: tr.id.replace(/^.*-row-/, ''), name: txt(name), checked: box ? box.checked : null, disabled: box ? box.disabled : null, arrow: !!tr.querySelector('a.show_extras, a.hide_extras'), visible: vis(tr)};
                }),
            };
        });
        return {
            found: true,
            gridId: grid.id.replace(/-[0-9a-f]+$/, ''),
            title: txt(grid.querySelector('.header h4')),
            headerLinks: [...grid.querySelectorAll('.header .actions a')].filter(vis).map(txt),
            cols: [...grid.querySelectorAll('thead th')].filter(vis).map(txt),
            filterVisible: form ? vis(form) : null,
            filter: form ? {
                selects: [...form.querySelectorAll('select')].map((s) => ({name: s.name, selected: s.options[s.selectedIndex] && s.options[s.selectedIndex].text.trim(), options: [...s.options].map((o) => o.text.trim())})),
                inputs: [...form.querySelectorAll('input[type=text]')].map((i) => ({name: i.name, value: i.value, label: txt(i.closest('div') && i.closest('div').querySelector('label'))})),
                buttons: [...form.querySelectorAll('button')].map((b) => txt(b)),
            } : null,
            cats,
        };
    });
}

/** Short view of a grid read: "heading: row[x]L> ..." per category, only visible rows. */
function brief(g) {
    if (!g || !g.found) return g;
    return g.cats.map((c) => `${c.heading}${c.headingVisible ? '' : '(hidden)'}${c.empty ? ' {' + c.empty + '}' : ''}: ` + c.rows.filter((r) => r.visible).map((r) => `${r.name}${r.checked ? '[x]' : '[ ]'}${r.disabled ? 'L' : ''}${r.arrow ? '>' : ''}`).join('; '));
}

function findRow(g, id) {
    if (!g || !g.found) return null;
    for (const c of g.cats) for (const r of c.rows) if (r.id === id) return {cat: c.heading, ...r};
    return null;
}

const rowLoc = (page, id) => page.locator(GRID).first().locator(`tr.gridRow[id$="-row-${id}"]`).first();

/** Open Settings › Website › Plugins of ctx; returns what the page answered. */
async function openWebsitePlugins(page, app, ctx) {
    const o = {};
    const reqs = [];
    const onReq = (r) => { if (/fetch-grid/.test(r.url())) reqs.push(rel(r.url()).replace(/\?.*$/, '')); };
    page.on('request', onReq);
    try { const r = await page.goto(app.url(`/index.php/${ctx}/management/settings/website`)); o.status = r && r.status(); } catch (e) { o.status = flat(e.message, 100); }
    await idle(page).catch(() => {});
    o.url = rel(page.url());
    const body = await page.locator('body').innerText().catch(() => '');
    o.denied = DENIED.test(body);
    o.errorWindow = flat(await page.locator('[role="dialog"]:visible').allInnerTexts().catch(() => []).then((a) => a.join(' | ')), 200) || null;
    o.h1 = flat(await page.locator('h1').first().innerText().catch(() => null), 80);
    o.gridRequestsBeforeTab = [...reqs];
    const tab = page.locator('#plugins-button').first();
    o.pluginsTab = await tab.count() > 0;
    if (o.pluginsTab) {
        await tab.click(); await idle(page).catch(() => {});
        await page.locator(GRID).first().locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
        await sleep(400);
        o.innerTabs = await page.locator('#plugins [role="tab"]').evaluateAll((ts) => ts.map((t) => `${t.innerText.trim()}${t.getAttribute('aria-selected') === 'true' ? '*' : ''}`)).catch(() => []);
    }
    page.off('request', onReq);
    o.gridRequests = reqs;
    return o;
}

/** The toast(s) that show within ms after an action: text and where. */
async function readToast(page, ms = 4000) {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
        const t = await page.locator('.app__notifications, .pkp_notification, #pkpNotificationsContainer, .pkpNotification').evaluateAll((els) => els.map((e) => {
            const r = e.getBoundingClientRect();
            return {cls: e.className && String(e.className).slice(0, 60), text: e.innerText.replace(/\s+/g, ' ').trim(), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width)};
        }).filter((x) => x.text)).catch(() => []);
        if (t.length) return t;
        await sleep(150);
    }
    return [];
}

/**
 * Press a row's box. answer: 'OK' | 'Cancel' for the window that may open.
 * Returns what asked, the requests, the notice, and the box right after.
 */
async function pressBox(page, id, {answer = 'OK'} = {}) {
    const o = {};
    const row = rowLoc(page, id);
    await row.waitFor({timeout: T});
    const box = row.locator('input[type=checkbox]').first();
    o.before = await box.isChecked();
    o.disabled = await box.isDisabled();
    if (o.disabled) return o;
    const traffic = [];
    const bodies = [];
    const onResp = (r) => {
        if (/\$\$\$call\$\$\$|\/api\//.test(r.url()) && !/fetchNotification|notification\/fetch/.test(r.url())) traffic.push(`${r.request().method()} ${rel(r.url()).replace(/\?.*$/, '')} ${r.status()}`);
        if (r.request().method() === 'POST' && /\/(enable|disable)(\?|$)/.test(r.url())) bodies.push(r.text().then((t) => flat(t, 400)).catch(() => null));
    };
    page.on('response', onResp);
    await box.click({noWaitAfter: true});
    await sleep(700);
    const dlg = page.locator('[role="dialog"]:visible').last();
    if (await dlg.count()) {
        o.window = {text: flat(await dlg.innerText().catch(() => ''), 300), buttons: (await dlg.locator('button').allInnerTexts().catch(() => [])).map((b) => flat(b, 30)).filter(Boolean)};
        o.boxWhileAsking = await box.isChecked().catch(() => null);
        const b = dlg.getByRole('button', {name: answer, exact: true}).first();
        if (await b.count()) { await b.click(); o.answered = answer; } else o.answered = `no ${answer} button`;
    }
    o.toast = await readToast(page);
    await idle(page).catch(() => {});
    await sleep(500);
    o.after = await rowLoc(page, id).locator('input[type=checkbox]').first().isChecked().catch(() => null);
    o.errorWindow = flat(await page.locator('[role="dialog"]:visible').allInnerTexts().catch(() => []).then((a) => a.join(' | ')), 300) || null;
    if (o.errorWindow) { await sleep(3000); o.windowAfter3s = flat(await page.locator('[role="dialog"]:visible').allInnerTexts().catch(() => []).then((a) => a.join(' | ')), 300) || null; }
    page.off('response', onResp);
    o.traffic = traffic;
    o.bodies = await Promise.all(bodies);
    return o;
}

/** Press a row's arrow; the links it shows; then press it again and record whether they closed. */
async function rowLinks(page, id, {close = true} = {}) {
    const o = {};
    const row = rowLoc(page, id);
    if (!(await row.count())) return {row: false};
    const arrow = row.locator('a.show_extras').first();
    o.arrow = await arrow.count() > 0;
    if (!o.arrow) return o;
    o.arrowLabel = flat(await arrow.innerText().catch(() => ''), 40);
    await arrow.click(); await sleep(400);
    const ctl = row.locator('xpath=following-sibling::tr[1]');
    o.controlsRow = await ctl.getAttribute('class').catch(() => null);
    o.links = (await ctl.locator('a:visible').allInnerTexts().catch(() => [])).map((a) => flat(a, 40)).filter(Boolean);
    if (close) {
        const hide = row.locator('a.hide_extras').first();
        try { await hide.click({timeout: 5000}); await sleep(400); o.closed = !(await ctl.locator('a:visible').count()); } catch (e) { o.closed = `click failed: ${flat(e.message, 80)}`; }
    }
    return o;
}

async function tabStrips(page) {
    return page.evaluate(() => [...document.querySelectorAll('[role="tablist"]')].map((l) => [...l.querySelectorAll('[role="tab"]')].filter((t) => t.closest('[role="tablist"]') === l).map((t) => `${t.innerText.trim()}${t.getAttribute('aria-selected') === 'true' ? '*' : ''}${t.offsetParent === null ? '(hidden)' : ''}`))).catch(() => []);
}

module.exports = {T, sleep, flat, rel, DENIED, GRID, snap, readGrid, brief, findRow, rowLoc, openWebsitePlugins, readToast, pressBox, rowLinks, tabStrips};
