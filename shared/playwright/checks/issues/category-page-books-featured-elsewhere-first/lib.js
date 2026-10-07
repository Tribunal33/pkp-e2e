// Helpers of walk.js here and of ../category-page-no-new-releases-or-featured/walk.js (issue reports
// docs/issues/U70-A10-category-page-books-featured-elsewhere-first.md and
// docs/issues/U70-A10-U68-A7-category-page-no-new-releases-or-featured.md). Requiring this file runs
// nothing. Every helper presses what a person presses or opens an address: a published book's
// workflow (Unpublish, "Catalog Entry" › "Categories", Publish, through ../one-item-reads-1-items/lib.js),
// the press's Catalog page (its boxes, "Filters", "Order Features") and the public pages a reader opens.
const path = require('path');
const {idle, sql, shot} = require('../../../probe');
const W = require('../one-item-reads-1-items/lib.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The dataset's two published books the Steps place in "Social Sciences" (OMP, main and 3.5). */
const BOMB = {sid: 5, title: 'Bomb Canada and Other Unkind Remarks in the American Media', short: 'Bomb Canada'};
const BRICKS = {sid: 14, title: 'From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots', short: 'From Bricks to Brains'};
const CATEGORY = {typed: 'Social', name: 'Social Sciences', path: 'social-sciences'};
const SERIES = {name: 'Psychology', path: 'psy'};

/** The Catalog page object of the suite (required inside forEachApp, patterns.md "Probe kit"). */
function catalogPage(page, app) {
    const {CatalogPage} = require(path.join(app.suiteDir, 'pages', 'CatalogPages.js'));
    return new CatalogPage(page, app.contextPath);
}

/** Preconditions: the book unpublished, placed in "Social Sciences" under "Categories", published again. */
async function placeInCategory(page, app, book) {
    await W.openWorkflow(page, app, book.sid);
    const out = {unpublish: await W.unpublish(page)};
    out.page = await W.editableCategories(page, app, book.sid);
    out.categories = await W.placeInCategory(page, CATEGORY);
    out.publish = await W.publish(page);
    return out;
}

/** The Catalog page opened afresh, with `filter` (a category or series name) chosen when given. */
async function openCatalog(page, app, filter) {
    const c = catalogPage(page, app);
    await c.goto();
    await idle(page);
    if (filter) {
        await c.chooseFilter(filter);
        await idle(page);
    }
    return c;
}

/** A row's two boxes as a screen reader names them. */
async function boxes(c, title) {
    const name = async (b) => flat(await b.getAttribute('aria-label').catch(() => null)) || flat(await b.innerText().catch(() => null));
    return {featured: await name(c.featuredBox(title)), newRelease: await name(c.newReleaseBox(title))};
}

/** Press a book's "Featured…" (`which` 'featured') or "New release…" box; the save's status and the boxes after. */
async function press(page, c, book, which) {
    const r = which === 'featured' ? await c.pressFeatured(book.title) : await c.pressNewRelease(book.title);
    await idle(page);
    await sleep(300);
    return {book: book.short, which, status: r.status(), after: await boxes(c, book.title)};
}

/**
 * "Order Features" on the open Catalog page; while `book` is not the first featured row, its up
 * arrow; "Save Order". Returns the rows before and after.
 */
async function orderFirst(page, c, book) {
    await c.startOrdering();
    await sleep(500);
    const before = (await c.shownTitles().allInnerTexts()).map((t) => flat(t, 80));
    let presses = 0;
    for (let i = 0; i < 4; i++) {
        const shown = (await c.shownTitles().allInnerTexts()).map((t) => flat(t, 200));
        if (shown[0] === book.title) break;
        await c.upArrow(book.title).click();
        presses++;
        await sleep(400);
    }
    const ordered = (await c.shownTitles().allInnerTexts()).map((t) => flat(t, 80));
    const r = await c.saveOrder();
    await idle(page);
    return {before, presses, ordered, save: r.status()};
}

/** The rows of the Catalog page as listed (titles, top to bottom). */
async function catalogRows(c) {
    return (await c.shownTitles().allInnerTexts()).map((t) => flat(t, 80));
}

/**
 * A public page as a reader sees it: the answer, each list on it (its heading and its books, each
 * with whether it is drawn as featured, `.is_featured`, a row of its own), the count line.
 * A press's first category page after the Catalog page can end with no answer at all on these
 * PHP servers without pkp/pkp-lib#12915 (`main` before 2026-10-05; the stable lines; spec U16 OMP5,
 * php-src GH-20469); opened again, it loads, so a dropped answer is retried.
 */
async function readPublic(page, app, address, label) {
    const lang = app.line && /3_[34]/.test(app.line) ? '' : '/en';
    const url = app.url(`/index.php/${app.contextPath}${lang}${address}`);
    let response = null;
    const dropped = [];
    for (let attempt = 0; attempt < 4; attempt++) {
        try {
            response = await page.goto(url);
            break;
        } catch (e) {
            const m = flat(e.message, 160);
            if (!/ERR_EMPTY_RESPONSE|ERR_CONNECTION_RESET|ERR_CONNECTION_REFUSED/.test(m) || attempt === 3) throw e;
            dropped.push(m);
            await sleep(1500);
        }
    }
    await idle(page).catch(() => {});
    if (label) await shot(page, label).catch(() => {});
    const read = await page.evaluate(() => {
        const t = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
        const main = document.querySelector('.page') || document.body;
        return {
            h1: t(main.querySelector('h1')),
            count: t(main.querySelector('.monograph_count')),
            lists: [...main.querySelectorAll('.cmp_monographs_list')].map((l) => ({
                heading: t(l.querySelector(':scope > .title')),
                books: [...l.querySelectorAll('.obj_monograph_summary')].map((s) => ({
                    title: t(s.querySelector('.title')),
                    featured: s.classList.contains('is_featured'),
                    inPairRow: !!s.closest('.row'),
                })),
            })),
        };
    });
    return {address, status: response ? response.status() : null, dropped, ...read};
}

/** The titles of a read list, shortened to their first words (for the facts). */
function shortTitles(list) {
    return (list ? list.books : []).map((b) => `${flat(b.title, 30)}${b.featured ? ' [featured]' : ''}`);
}

/** The flags as stored (evidence beside the screen): every feature and new-release row of the two books. */
function flagRows(app) {
    return {
        features: sql(app, `select submission_id, assoc_type, assoc_id, seq from features where submission_id in (${BOMB.sid}, ${BRICKS.sid}) order by 2, 3, 4`),
        newReleases: sql(app, `select submission_id, assoc_type, assoc_id from new_releases where submission_id in (${BOMB.sid}, ${BRICKS.sid}) order by 2, 3, 1`),
    };
}

module.exports = {T, sleep, flat, BOMB, BRICKS, CATEGORY, SERIES, catalogPage, placeInCategory, openCatalog, boxes, press, orderFirst, catalogRows, readPublic, shortTitles, flagRows};
