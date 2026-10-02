// Helpers for the U18 A3 walk (the web feed's "Include identifiers (ISBN, …)" box). Requiring this runs nothing.
const {idle} = require('../../../probe');
const P = require('../plugin-delete-notice-misspelt/lib');

const T = 30_000;
const {sleep, flat} = P;
const FEEDS = ['atom', 'rss2', 'rss'];
const dialog = (page) => page.locator('[role="dialog"]:visible').last();

/** Settings › Website › "Plugins" › "Web Feed Plugin" › the row's arrow › "Settings"; returns the window's labels and boxes. */
async function openFeedWindow(page, app) {
    const o = await P.openWebsitePlugins(page, app, app.contextPath);
    const row = P.rowLoc(page, 'webfeedplugin');
    await row.waitFor({timeout: T});
    const exp = row.locator('a.show_extras').first();
    if (await exp.count()) { await exp.click(); await sleep(500); }
    const rowId = await row.getAttribute('id');
    await page.locator(`tr[id="${rowId}"] + tr`).getByRole('link', {name: 'Settings', exact: true}).first().click();
    await dialog(page).locator('input[name="recentItems"]').waitFor({timeout: T});
    await idle(page); await sleep(400);
    return {...o, ...(await windowState(page))};
}

/** The open window as data: every radio, text box and tick box with its label. */
async function windowState(page) {
    const d = dialog(page);
    if (!(await d.count())) return {open: false};
    return d.evaluate((root) => {
        const t = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
        const lab = (i) => (root.querySelector(`label[for="${i.id}"]`) || i.closest('label') || {}).innerText?.replace(/\s+/g, ' ').trim() ?? null;
        return {open: true,
            radios: [...root.querySelectorAll('input[type=radio]')].map((r) => ({name: r.name, value: r.value, checked: r.checked, label: lab(r)})),
            text: [...root.querySelectorAll('input[type=text]')].map((i) => ({name: i.name, value: i.value, label: lab(i)})),
            boxes: [...root.querySelectorAll('input[type=checkbox]')].map((i) => ({name: i.name, checked: i.checked, label: lab(i)}))};
    });
}

/** In the open window: set the "Include identifiers…" box and press "OK". */
async function saveIdentifiers(page, on) {
    const d = dialog(page);
    const b = d.locator('input[name="includeIdentifiers"]');
    if (on) await b.check(); else await b.uncheck();
    const w = page.waitForResponse((r) => r.request().method() === 'POST' && /manage/.test(r.url()), {timeout: T}).catch(() => null);
    await d.getByRole('button', {name: 'OK', exact: true}).click();
    const resp = await w;
    await sleep(1000); await idle(page).catch(() => {});
    return {post: resp ? resp.status() : null, stillOpen: (await page.locator('[role="dialog"]:visible').count()) > 0};
}

const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&');
const text = (s) => decode(decode(s)).replace(/<br\s*\/?>/g, ' ⏎ ').replace(/\s+/g, ' ').trim();

/** One feed read as a visitor's browser gets it: status, type, and per item its title and the opening of its summary. */
async function readFeed(page, app, type, {isbn} = {}) {
    const url = app.url(`/index.php/${app.contextPath}/en/gateway/plugin/WebFeedGatewayPlugin/${type}`);
    const r = await page.request.get(url);
    const body = await r.text();
    const blocks = body.split(type === 'atom' ? /<entry>/ : /<item[ >]/).slice(1);
    const items = blocks.map((b) => {
        const title = (b.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1];
        const sum = (b.match(type === 'atom' ? /<summary[^>]*>([\s\S]*?)<\/summary>/ : /<description[^>]*>([\s\S]*?)<\/description>/) || [])[1];
        return {title: title == null ? null : flat(text(title), 90), summary: sum == null ? null : flat(text(sum), 420)};
    });
    return {path: url.replace(/^https?:\/\/[^/]+/, ''), status: r.status(), type: r.headers()['content-type'], items: items.length,
        mentionsIsbn: /isbn/i.test(body), carriesValue: isbn ? body.replace(/-/g, '').includes(isbn) : null, list: items};
}

/** {OMP} The book's "Publication Formats" › the "PDF" row's arrow › "Edit" › "Metadata" › "Add Code": ISBN-13, the value, "Save". */
async function addIsbn(page, app, submissionId, value) {
    const o = {};
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${submissionId}`));
    await idle(page);
    const wf = page.locator('[role="dialog"]:visible').first();
    // the workflow's side menu, under "Publication" (the menu's address key differs between 3.5 and main)
    await wf.getByText('Publication Formats', {exact: true}).first().click();
    await idle(page);
    const row = wf.locator('[id^="component-grid-catalogentry-publicationformatgrid"] tr.gridRow').filter({hasText: 'PDF'}).first();
    await row.waitFor({timeout: T});
    await row.locator('a.show_extras').first().click();
    await sleep(600);
    const rowId = await row.getAttribute('id');
    await page.locator(`tr[id="${rowId}"] + tr`).getByRole('link', {name: /^\s*Edit/}).first().click();
    const d = () => page.locator('[role="dialog"]:visible').last();
    await d().getByRole('tab').first().waitFor({timeout: T});
    await idle(page); await sleep(800);
    o.tabs = (await d().getByRole('tab').allInnerTexts()).map((x) => x.trim());
    await d().getByRole('tab', {name: /^\s*Metadata\s*$/}).first().click();
    await idle(page); await sleep(900);
    const grid = d().locator('[id^="component-grid-catalogentry-identificationcodegrid"]').first();
    await grid.getByRole('link', {name: /Add Code/}).first().click();
    await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog] form input[name="value"]')].some((e) => e.getClientRects().length), null, {timeout: 20000});
    await idle(page); await sleep(400);
    const sel = d().locator('select[name="code"]').first();
    o.codeOptions = (await sel.locator('option').allInnerTexts()).map((x) => x.trim()).filter((x) => /ISBN/.test(x));
    await sel.selectOption({label: o.codeOptions.find((x) => /^ISBN-13/.test(x))});
    await d().locator('input[name="value"]').fill(value);
    const w = page.waitForResponse((x) => x.request().method() === 'POST' && /identification-code/i.test(x.url()), {timeout: T}).catch(() => null);
    await d().getByRole('button', {name: /^(Save|OK)$/}).last().click();
    const resp = await w;
    o.save = resp ? resp.status() : null;
    await sleep(1200); await idle(page);
    o.codesGrid = flat(await page.locator('[id^="component-grid-catalogentry-identificationcodegrid"]').first().innerText().catch(() => null), 200);
    return o;
}

module.exports = {T, sleep, flat, FEEDS, dialog, openFeedWindow, windowState, saveIdentifiers, readFeed, addIsbn};
