// Helpers of walk.js beside this file (issue report on spec U11 A5). Requiring this file runs
// nothing. Every helper drives the screens a person uses and never throws: a failure comes back in
// `error`, so a step records the state the code under test brings.
const {idle} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);

/**
 * Collect the highlights API answers (`/api/v1/highlights…`) from now on: method (the tunnelled
 * one for a Vue PUT), address, status and, for a status of 400 or more, the body.
 * Returns `{list(), clear()}`.
 */
function highlightAnswers(page) {
    const seen = [];
    const pending = new Set();
    page.on('response', (r) => {
        if (!/\/api\/v1\/highlights/.test(r.url())) return;
        const q = r.request();
        const row = {method: q.headers()['x-http-method-override'] || q.method(), url: rel(r.url()), status: r.status()};
        seen.push(row);
        if (r.status() >= 400) {
            const p = r.text().then((t) => { row.body = flat(t, 300); }).catch(() => {}).finally(() => pending.delete(p));
            pending.add(p);
        }
    });
    return {
        list: async () => { await Promise.all([...pending]); return seen.slice(); },
        clear: () => { seen.length = 0; },
    };
}

const panel = (page) => page.locator('.highlightsListPanel').first();

/** The list's state: row titles, the "No items found." line, and the header buttons shown. */
async function readList(page) {
    const p = panel(page);
    const vis = (name) => p.getByRole('button', {name, exact: true}).isVisible().catch(() => false);
    return {
        rows: (await p.locator('.listPanel__itemTitle').allInnerTexts().catch(() => [])).map((x) => flat(x, 120)),
        empty: await p.getByText('No items found.', {exact: true}).isVisible().catch(() => false),
        order: await vis('Order'),
        saveOrder: await vis('Save Order'),
        addHighlight: await vis('Add Highlight'),
    };
}

/** Administration › "Site Settings" › "Site Setup" › "Highlights": the side tabs and the list. */
async function openSiteHighlights(page) {
    const {SiteSettingsPage} = require('../../../pages/SiteSettingsPages.js');
    const site = new SiteSettingsPage(page);
    const out = {};
    try {
        await site.gotoFromAdministration();
        await site.openTop('Site Setup');
        out.sideTabs = (await site.sideTabs('Site Setup').allInnerTexts()).map((x) => flat(x, 40));
        await site.open('Site Setup', 'Highlights');
        await panel(page).waitFor({timeout: T});
        await idle(page);
        out.list = await readList(page);
    } catch (e) {
        out.error = flat(e.message);
    }
    return out;
}

/** A journal's Settings › "Website" › "Setup" › "Highlights" (path `ctx`). */
async function openContextHighlights(page, app, ctx) {
    const out = {};
    try {
        await page.goto(app.url(`/index.php/${ctx}/en/management/settings/website`));
        await idle(page);
        const setupTab = page.locator('#setup-button').first();
        await setupTab.waitFor({timeout: T});
        if ((await setupTab.getAttribute('aria-selected')) !== 'true') await setupTab.click();
        await page.locator('#setup').first().getByRole('tab', {name: 'Highlights', exact: true}).click();
        await panel(page).waitFor({timeout: T});
        await idle(page);
        out.list = await readList(page);
    } catch (e) {
        out.error = flat(e.message);
    }
    return out;
}

/** Type into a TinyMCE box of the dialog (`iframeSel`), once its body is editable. */
async function setRich(page, d, iframeSel, text) {
    const frame = d.locator(iframeSel).first();
    await frame.waitFor({timeout: T});
    const body = frame.contentFrame().locator('body');
    for (let i = 0; i < 40; i++) {
        if ((await body.getAttribute('contenteditable').catch(() => null)) === 'true') break;
        await pause(250);
    }
    await body.click();
    await page.keyboard.type(text, {delay: 20});
    await pause(300);
}

/**
 * "Add Highlight", fill Title, URL and Button Label, "Save". Returns the save's answer status,
 * whether the panel is still open 3 s later, and its visible text then (an error, a status).
 */
async function addHighlight(page, {title, url, label}) {
    const out = {};
    try {
        await panel(page).getByRole('button', {name: 'Add Highlight', exact: true}).click();
        const d = page.getByRole('dialog', {name: 'Add Highlight'});
        await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        await idle(page);
        await setRich(page, d, 'iframe[id^="highlight-title-control-en"]', title);
        await d.locator('#highlight-url-control').fill(url);
        await d.locator('#highlight-urlText-control-en').fill(label);
        const resp = page.waitForResponse((r) => /\/api\/v1\/highlights/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15_000}).catch(() => null);
        await d.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await resp;
        out.status = r ? r.status() : null;
        await d.waitFor({state: 'hidden', timeout: 3000}).catch(() => {});
        await idle(page);
        out.panelOpen = await d.isVisible().catch(() => false);
        if (out.panelOpen) out.panelText = flat(await d.innerText().catch(() => ''), 600);
        out.list = await readList(page);
    } catch (e) {
        out.error = flat(e.message);
    }
    return out;
}

/** "Order", then "Save Order"; any dialog that opens is read and answered with its "OK". */
async function orderAndSave(page) {
    const out = {};
    try {
        const p = panel(page);
        const order = p.getByRole('button', {name: 'Order', exact: true});
        if (!(await order.isVisible().catch(() => false))) return {...out, order: 'no "Order" button'};
        await order.click();
        await idle(page);
        out.ordering = await readList(page);
        const resp = page.waitForResponse((r) => /\/api\/v1\/highlights\/order/.test(r.url()), {timeout: 15_000}).catch(() => null);
        await p.getByRole('button', {name: 'Save Order', exact: true}).click();
        const r = await resp;
        out.status = r ? r.status() : null;
        await idle(page);
        await pause(500);
        const dlg = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'OK', exact: true})});
        if (await dlg.first().isVisible().catch(() => false)) {
            out.dialog = flat(await dlg.first().innerText(), 300);
            await dlg.first().getByRole('button', {name: 'OK', exact: true}).click();
            await idle(page);
        }
        out.after = await readList(page);
    } catch (e) {
        out.error = flat(e.message);
    }
    return out;
}

/**
 * A visitor's view of the site's home page (`/index.php/index`), in a fresh browser context:
 * where it landed, the carousel's slide titles and the listed journals' names.
 */
async function siteHome(page, app) {
    const ctx = await page.context().browser().newContext();
    const p = await ctx.newPage();
    const out = {};
    try {
        const r = await p.goto(app.url('/index.php/index'));
        await p.waitForLoadState('load');
        out.status = r ? r.status() : null;
        out.landed = rel(p.url());
        out.carousel = await p.locator('.highlights').count();
        out.slides = (await p.locator('.highlights .swiper-slide:not(.swiper-slide-duplicate) .swiper-slide-title').allInnerTexts()).map((x) => flat(x, 120));
        out.buttons = await p.locator('.highlights .swiper-slide:not(.swiper-slide-duplicate) a.swiper-slide-button').evaluateAll((as) => as.map((a) => ({text: a.textContent.trim(), href: a.getAttribute('href')})));
        out.contexts = (await p.locator('.journals h3, .presses h3, .servers h3').allInnerTexts()).map((x) => flat(x, 80));
        out.blocks = await p.locator('.page_index_site > *').evaluateAll((els) => els.map((e) => e.className || e.tagName)).catch(() => []);
    } catch (e) {
        out.error = flat(e.message);
    } finally {
        await ctx.close();
    }
    return out;
}

/** Type an address into the browser and read the answer: status and the first 300 characters. */
async function typeAddress(page, app, path) {
    try {
        const r = await page.goto(app.url(path));
        return {path, status: r ? r.status() : null, body: flat(await page.locator('body').innerText().catch(() => ''), 300)};
    } catch (e) {
        return {path, error: flat(e.message)};
    }
}

module.exports = {T, pause, flat, rel, highlightAnswers, readList, openSiteHighlights, openContextHighlights, addHighlight, orderAndSave, siteHome, typeAddress};
