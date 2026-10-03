// Helpers of walk.js (issue report docs/issues/U41-A3-publication-lists-tick-ignored.md).
// Requiring this file runs nothing. Every helper presses what a person presses or opens an
// address a reader opens; the workflow's Unpublish and Publish come from
// ../category-order-of-articles-ignored/lib.js.
const {idle, screen, record, shot} = require('../../../probe');
const W = require('../category-order-of-articles-ignored/lib.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const TICK = 'Include this contributor when identifying authors in lists of publications.';

/**
 * The dataset item each app's steps open: `id`, `title` (the start the lists show), whether it
 * is published when the workflow opens (`published`: Unpublish first), the contributor the steps
 * untick, the reader list (`list`: its address and name), the search word and the landing page.
 */
const ITEMS = {
    ojs: {id: 1, title: 'Signalling Theory Dividends', published: false, untick: 'Nicolas Riouf',
        list: {path: 'issue/current', name: 'the current issue'}, word: 'Signalling', landing: 'article/view/1'},
    omp: {id: 14, title: 'From Bricks to Brains', published: true, untick: 'Michael Wilson',
        list: {path: 'catalog', name: 'Catalog'}, word: 'Bricks', landing: 'catalog/book/14'},
    ops: {id: 2, title: 'The Facets Of Job Satisfaction', published: true, untick: 'Urho Kekkonen',
        list: {path: 'preprints', name: 'Preprints'}, word: 'Facets', landing: 'preprint/view/2'},
};

/** The summary blocks of a reader list, the three apps' classes. */
const SUMMARY = '.obj_article_summary, .obj_preprint_summary, .obj_monograph_summary';

async function snap(page, name) {
    let s;
    try {
        s = await screen(page);
    } catch (e) {
        s = {url: page.url(), error: flat(e.message, 200)};
    }
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

/** Workflow › Publication › "Contributors": the list's rows. */
async function openContributors(page) {
    const nav = page.getByRole('dialog').getByRole('navigation');
    let link = nav.getByRole('link', {name: 'Contributors', exact: true}).last();
    if (!(await link.isVisible().catch(() => false))) {
        await nav.getByRole('link', {name: /^(Publication|Preprint)$/}).first().click().catch(() => {});
        await sleep(500);
        link = nav.getByRole('link', {name: 'Contributors', exact: true}).last();
    }
    await link.click();
    await page.locator('.listPanel--contributor li.listPanel__item').first().waitFor({timeout: T});
    await idle(page).catch(() => {});
    await sleep(600);
    return (await page.locator('.listPanel--contributor li.listPanel__item').allInnerTexts()).map((t) => flat(t, 200));
}

/**
 * The contributor's row "Edit", the "Publication Lists" box unticked, "Save". Returns the box
 * before and after, the save's answer and what the stored contributor says.
 */
async function untick(page, name) {
    const row = page.locator('.listPanel--contributor li.listPanel__item').filter({hasText: name}).first();
    await row.getByRole('button', {name: /^Edit/}).first().click();
    const box = page.getByRole('checkbox', {name: TICK, exact: true});
    await box.waitFor({state: 'visible', timeout: T});
    await idle(page).catch(() => {});
    await sleep(600);
    const dlg = page.getByRole('dialog').filter({has: box}).last();
    const out = {before: await box.isChecked()};
    out.fieldText = flat(await box.locator('xpath=ancestor::fieldset[1]').innerText().catch(() => null), 200);
    await box.uncheck();
    out.after = await box.isChecked();
    const answer = page.waitForResponse((r) => /\/contributors\/\d+/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await dlg.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answer;
    out.status = r ? r.status() : null;
    if (r) {
        const body = await r.json().catch(() => null);
        out.stored = body ? {includeInBrowse: body.includeInBrowse, name: flat(body.fullName || '', 80)} : null;
    }
    await box.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    await sleep(800);
    return out;
}

/** The Contributors list's "Preview": its rows (format and display), then the window's "Close". */
async function preview(page, label) {
    await page.locator('.listPanel--contributor').getByRole('button', {name: 'Preview', exact: true}).first().click();
    const dlg = page.getByRole('dialog').filter({hasText: 'Publication Lists'}).last();
    await dlg.waitFor({timeout: T});
    await sleep(600);
    const rows = {};
    for (const r of await dlg.locator('tr').all()) {
        const cells = (await r.locator('td, th').allInnerTexts()).map((c) => flat(c, 300));
        if (cells.length >= 2) rows[cells[0]] = cells[1];
    }
    await snap(page, `${label}-preview`);
    await dlg.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
    await sleep(1000);
    return rows;
}

/** A reader page (list, search or landing) opened by address: the answer and the item's author line. */
async function readerPage(page, app, path, title, label) {
    const res = await page.goto(app.url(`/index.php/${app.contextPath}/${path}`));
    await idle(page).catch(() => {});
    const s = await snap(page, label);
    const block = page.locator(SUMMARY).filter({hasText: title}).first();
    const found = (await block.count()) > 0;
    const authors = found ? flat(await block.locator('.authors, .author').first().innerText().catch(() => null), 400) : null;
    return {address: `/index.php/${app.contextPath}/${path}`, status: res ? res.status() : null, found, authors, error: s.error || null};
}

/** Every summary's title and author line on a reader page (the neighbour's read). */
async function allLines(page, app, path, label) {
    const res = await page.goto(app.url(`/index.php/${app.contextPath}/${path}`));
    await idle(page).catch(() => {});
    await snap(page, label);
    const lines = [];
    for (const b of await page.locator(SUMMARY).all()) {
        lines.push({
            title: flat(await b.locator('.title').first().innerText().catch(() => null), 100),
            authors: flat(await b.locator('.authors, .author').first().innerText().catch(() => null), 300),
        });
    }
    return {address: `/index.php/${app.contextPath}/${path}`, status: res ? res.status() : null, lines};
}

/** The landing page's credits: whether each contributor's name shows in the page's main text. */
async function landing(page, app, item, names, label) {
    const res = await page.goto(app.url(`/index.php/${app.contextPath}/${item.landing}`));
    await idle(page).catch(() => {});
    await snap(page, label);
    const text = await page.locator('.page_article, .page_preprint, .page_monograph, .obj_article_details, .obj_preprint_details, .obj_monograph_full, body').first().innerText().catch(() => '');
    const credited = {};
    for (const n of names) credited[n] = text.includes(n);
    return {address: `/index.php/${app.contextPath}/${item.landing}`, status: res ? res.status() : null, credited};
}

module.exports = {T, sleep, flat, TICK, ITEMS, W, snap, openContributors, untick, preview, readerPage, allLines, landing};
