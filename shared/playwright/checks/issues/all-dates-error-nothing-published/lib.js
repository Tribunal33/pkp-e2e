// Helpers of walk.js (issue report docs/issues/U64-A1-all-dates-error-nothing-published.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);

/** Per-app screen words of Administration's context list. */
const WORDS = {
    ojs: {noun: 'Journal', hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal'},
    omp: {noun: 'Press', hosted: 'Hosted Presses', table: 'Presses', create: 'Create Press'},
    ops: {noun: 'Server', hosted: 'Hosted Servers', table: 'Servers', create: 'Create Server'},
};

/**
 * Administration › Hosted Journals (Presses, Servers) › "Create Journal" (…), filled and saved:
 * name, initials, contact, country Canada, path, English, enabled. Returns the save's status.
 */
async function createContext(page, app, {name, initials, path: urlPath, email}) {
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const hosted = new HostedJournalsPage(page, WORDS[app.name]);
    await page.goto(app.url('/index.php/index/en/admin/contexts'));
    await hosted.expectOpen();
    const win = await hosted.openCreate();
    await win.type(win.title('en'), name);
    await win.type(win.initials('en'), initials);
    await win.type(win.contactName, name);
    await win.type(win.contactEmail, email);
    await win.country.selectOption({label: 'Canada'});
    await win.type(win.path, urlPath);
    if (await win.languageBox('en').count()) {
        await win.setBox(win.languageBox('en'), true);
        await win.setBox(win.primaryChoice('en'), true);
    }
    await win.setBox(win.enableBox, true);
    const r = await win.pressSave();
    await page.waitForURL(/\/admin\/wizard\/\d+/, {timeout: T}).catch(() => {});
    return r.status();
}

/**
 * Collect the statistics API answers (`/api/v1/stats/…`) from now on, each with its status and,
 * for a refusal, its body: `{list(), clear(), stop()}`.
 */
function statsAnswers(page) {
    const seen = [];
    const pending = new Set();
    const on = (r) => {
        if (!/\/api\/v1\/stats\//.test(r.url())) return;
        const row = {method: r.request().method(), url: rel(r.url()).replace(/^.*\/api\/v1/, '/api/v1'), status: r.status()};
        seen.push(row);
        if (r.status() >= 400) {
            const p = r.text().then((t) => { row.body = flat(t, 300); }).catch(() => {}).finally(() => pending.delete(p));
            pending.add(p);
        }
    };
    page.on('response', on);
    return {
        list: async () => { await Promise.all([...pending]); return seen.slice(); },
        clear: () => { seen.length = 0; },
        stop: () => page.off('response', on),
    };
}

/** Open a Statistics page of a context by its address (`publications`, `context`, `issues`, `series`). */
async function openStats(page, app, ctx, route) {
    const r = await page.goto(app.url(`/index.php/${ctx}/en/stats/${route}/${route}`));
    await idle(page).catch(() => {});
    await page.locator('.pkpDateRange__current').first().waitFor({timeout: T}).catch(() => {});
    await sleep(800);
    return r ? r.status() : null;
}

/** The calendar button, then a preset of its list ("All dates", "Last 90 days"). */
async function choosePreset(page, label) {
    const list = page.locator('.pkpDateRange__options').first();
    if (!(await list.isVisible().catch(() => false))) await page.locator('.pkpDateRange__button').first().click();
    await list.waitFor({state: 'visible', timeout: T});
    const offered = (await page.locator('.pkpDateRange__option').allInnerTexts()).map((s) => flat(s, 60));
    await page.locator('.pkpDateRange__option').filter({hasText: new RegExp(`^\\s*${label}\\s*$`)}).click();
    await idle(page).catch(() => {});
    await sleep(1500);
    return offered;
}

/**
 * What the Statistics page shows now: its heading, the range, the chart buttons with their pressed
 * and disabled state, the chart's points (count, first and last), the table's title, count line and
 * rows, and any window open over it (heading, text, buttons).
 */
async function readStats(page) {
    return page.evaluate(() => {
        const txt = (e) => (e ? (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim() : null);
        const vis = (e) => !!e && !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
        const points = [...document.querySelectorAll('.pkpStats__graph table tbody tr')].map((tr) => [txt(tr.querySelector('th')), txt(tr.querySelector('td'))]);
        const panel = document.querySelector('.pkpStats__panel');
        const table = panel && panel.querySelector('table');
        const dialogs = [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].filter(vis).map((d) => ({
            heading: txt(d.querySelector('h1, h2, h3')),
            text: txt(d).slice(0, 400),
            buttons: [...d.querySelectorAll('button')].filter(vis).map(txt),
        }));
        return {
            heading: txt(document.querySelector('main h1')),
            range: txt(document.querySelector('.pkpDateRange__current')),
            chartButtons: [...document.querySelectorAll('.pkpStats__graphSelectors button')].map((b) => ({
                label: txt(b), pressed: b.getAttribute('aria-pressed'), disabled: b.disabled || b.getAttribute('aria-disabled') === 'true',
            })),
            points: {count: points.length, first: points[0] || null, last: points[points.length - 1] || null, total: points.reduce((n, p) => n + (parseInt(p[1], 10) || 0), 0)},
            tableTitle: txt(panel && panel.querySelector('h2')),
            countLine: txt(panel && panel.querySelector('.pkpStats__itemsOfTotal')),
            rows: table ? [...table.querySelectorAll('tbody tr')].map((tr) => txt(tr).slice(0, 160)).slice(0, 5) : [],
            rowCount: table ? table.querySelectorAll('tbody tr a.pkpStats__itemLink').length : 0,
            dialogs,
        };
    });
}

/** Press "OK" on the open "Error" window, when one is open. Returns whether one was. */
async function dismissError(page) {
    const ok = page.getByRole('dialog').getByRole('button', {name: 'OK', exact: true}).last();
    if (!(await ok.isVisible().catch(() => false))) return false;
    await ok.click();
    await sleep(800);
    return true;
}

/**
 * On an open workflow: the publication's "Publication Settings" entry (3.5: "Issue"), its
 * "Publication Date" (3.5: "Date Published") box typed, "Save". Returns the label, the save's
 * status and the date the answer carries.
 */
async function setPublicationDate(page, app, date) {
    const entry = app.line === 'stable-3_5_0' ? /^Issue$/ : /^Publication Settings$/;
    await page.getByRole('dialog').getByText(entry).last().click();
    await idle(page).catch(() => {});
    const box = page.locator('input[name="datePublished"]').last();
    await box.waitFor({state: 'visible', timeout: T});
    await sleep(600);
    const form = page.locator('form').filter({has: box}).last();
    const label = flat(await form.locator(`label[for="${await box.getAttribute('id')}"]`).first().innerText().catch(() => null), 80);
    const before = await box.inputValue();
    await box.fill(date);
    const saved = page.waitForResponse((r) => /\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: T});
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    const body = await r.json().catch(() => ({}));
    await idle(page).catch(() => {});
    await sleep(800);
    return {label, before, typed: date, save: r.status(), stored: body.datePublished, error: r.ok() ? undefined : flat(JSON.stringify(body), 300)};
}

module.exports = {setPublicationDate, T, sleep, flat, rel, WORDS, createContext, statsAnswers, openStats, choosePreset, readStats, dismissError};
