// Helpers for the U72 A12 walk (a dragged chapter with no authors leaves its "No Items" line
// behind). Requiring this file runs nothing. Copied in part from the A7 walk's lib.js, so this
// folder stands alone.
// The "Chapters" list of OMP is a legacy category grid: a chapter is a `tbody.category_grid_body`
// (its chapter row, then one `tr` per chapter author), followed by its own
// `tbody.category_placeholder` holding the "No Items" line, shown when the chapter has no authors.
const path = require('path');
const {idle, screen, record, shot} = require('../../../probe');

const ROOT = path.resolve(__dirname, '../../../../..');
const omp = (file) => require(path.join(ROOT, 'apps/omp/playwright/pages', file));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function snap(page, name) {
    record(name, await screen(page));
    await shot(page, name).catch(() => {});
}

/** Open the book's "Chapters" (main: the side menu's "Chapters"; 3.5: "Publication" › "Chapters"). */
async function openChapters(page, app, subId) {
    const {WorkflowPage} = require(path.join(ROOT, 'shared/playwright/pages/WorkflowPage.js'));
    const {ChapterList} = omp('ChapterPages.js');
    const frame = new WorkflowPage(page, app.contextPath);
    if (app.line === 'stable-3_5_0') {
        await frame.gotoEditorial(subId, {menuKey: 'publication_chapters'});
    } else {
        await frame.gotoEditorial(subId);
        await frame.selectPage('Chapters');
    }
    const list = new ChapterList(page);
    await list.expectLoaded();
    await idle(page);
    return list;
}

/**
 * The list as drawn, top to bottom: `# <chapter>` for a chapter row, the author's name for an
 * author row, `(No Items)` for a visible "No Items" line; and, per visible "No Items" line, the
 * chapter it belongs to (by its id) and the chapter whose rows it stands under.
 */
async function layout(list) {
    return list.grid().evaluate((root) => {
        const vis = (e) => !!(e && e.getClientRects().length);
        const text = (e) => ((e && e.innerText) || '').replace(/\s+/g, ' ').trim();
        const titleOf = (tb) => {
            const tr = tb && tb.querySelector(':scope > tr.gridRow');
            return tr ? text(tr.querySelector('td .gridCellContainer')) : null;
        };
        const lines = [];
        const noItems = [];
        let last = null;
        for (const tb of root.querySelectorAll('table > tbody')) {
            if (tb.classList.contains('ui-sortable-placeholder') || tb.classList.contains('ui-sortable-helper')) continue;
            if (tb.classList.contains('category_grid_body') && !tb.classList.contains('empty')) {
                const rows = [...tb.querySelectorAll(':scope > tr.gridRow')].filter(vis);
                rows.forEach((tr, i) => lines.push(i === 0 ? `# ${text(tr.querySelector('td .gridCellContainer'))}` : text(tr.querySelector('td .gridCellContainer'))));
                last = tb;
            } else if (tb.classList.contains('category_placeholder') && vis(tb)) {
                lines.push('(No Items)');
                const owner = document.getElementById(tb.id.replace(/-emptyPlaceholder$/, ''));
                noItems.push({belongsTo: titleOf(owner), standsUnder: titleOf(last), text: text(tb)});
            }
        }
        return {lines, noItems};
    });
}

/** Drag a chapter by its title cell above another chapter's block, as a person would. */
async function dragChapterAbove(list, title, aboveTitle) {
    const page = list.page;
    const cell = list.chapterRow(title).locator('td').first();
    const target = list.chapterBlock(aboveTitle);
    await cell.scrollIntoViewIfNeeded();
    const a = await cell.boundingBox();
    const b = await target.boundingBox();
    if (!a || !b) return {noBox: true};
    const x = a.x + Math.min(a.width / 2, 200);
    await page.mouse.move(x, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(x, a.y + a.height / 2 - 5, {steps: 5});
    await page.mouse.move(x, b.y + 3, {steps: 30});
    await sleep(400);
    await page.mouse.up();
    await idle(page);
    await sleep(600);
    return {ok: true};
}

/** Press "Done"; the save-sequence status, never throws. */
async function done(list) {
    const page = list.page;
    const saved = page.waitForResponse((r) => /save-sequence/i.test(r.url()) && r.request().method() === 'POST', {timeout: 20_000}).catch(() => null);
    await list.doneLink().click();
    const r = await saved;
    await idle(page);
    await sleep(800);
    return {status: r ? r.status() : null, body: r ? ((await r.text().catch(() => '')) || '').slice(0, 160) : null};
}

/** Press "Cancel ordering"; whether ordering ended. */
async function cancel(list) {
    await list.cancelOrderingLink().click();
    await idle(list.page);
    await sleep(800);
    return {stillOrdering: await list.doneLink().count()};
}

module.exports = {sleep, snap, openChapters, layout, dragChapterAbove, done, cancel};
