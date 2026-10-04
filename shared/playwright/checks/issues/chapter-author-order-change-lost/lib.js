// Helpers for the U72 chapter-list walks (A7 here, A6 in
// ../toc-article-dropped-other-section-snaps-back/chapters.js). Requiring this file runs nothing.
// The "Chapters" list of OMP is a legacy category grid: a chapter is a `tbody.category_grid_body`,
// its first `tr` the chapter row, then one `tr` per chapter author.
const path = require('path');
const {idle, screen, record, shot, sql} = require('../../../probe');

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

/** The list as the DOM holds it: each chapter block with its title, its row classes and its authors in order. */
async function blocks(list) {
    return list.grid().evaluate((root) =>
        [...root.querySelectorAll('tbody.category_grid_body')].map((tb) => {
            const rows = [...tb.querySelectorAll(':scope > tr.gridRow')].filter((tr) => tr.getClientRects().length);
            const text = (tr) => ((tr.querySelector('td .gridCellContainer') || {}).innerText || '').replace(/\s+/g, ' ').trim();
            const first = rows.find((tr) => tr.id && tr.id.match(/-category-(\d+)-row-\1$/));
            return {
                chapter: first ? text(first) : null,
                chapterRowClass: first ? first.className : null,
                rows: rows.map((tr) => (tr === first ? `# ${text(tr)}` : text(tr))),
            };
        })
    );
}

/** The chapter titles, top to bottom as drawn. */
async function chapterOrder(list) {
    return (await blocks(list)).map((b) => b.chapter);
}

/** One chapter's authors, top to bottom as drawn. */
async function authorOrder(list, title) {
    const b = (await blocks(list)).find((x) => x.chapter === title);
    return b ? b.rows.filter((r) => !r.startsWith('# ')) : null;
}

/** What the database holds for the book's current version: chapter seq, and each chapter author link's seq beside the author's place on the Contributors list. */
function stored(app, subId) {
    return sql(
        app,
        `select c.chapter_id, c.seq,
            (select string_agg(ca.author_id || ':' || ca.seq || '/a' || a.seq, ',' order by ca.seq, ca.author_id)
               from submission_chapter_authors ca join authors a on a.author_id = ca.author_id where ca.chapter_id = c.chapter_id)
         from submissions s join submission_chapters c on c.publication_id = s.current_publication_id
         where s.submission_id = ${subId} order by c.seq`
    ).split('\n');
}

/** Collect the `data` the browser posts with "Done" (save-sequence), decoded. */
function watchSaveSequence(page) {
    const posts = [];
    page.on('request', (req) => {
        if (/save-sequence/i.test(req.url()) && req.method() === 'POST') {
            const data = new URLSearchParams(req.postData() || '').get('data');
            try {
                posts.push(data ? JSON.parse(data) : null);
            } catch (e) {
                posts.push(data);
            }
        }
    });
    return posts;
}

/** Press "Done"; returns the save-sequence status and the answer's opening, never throws. */
async function done(list) {
    const page = list.page;
    const saved = page.waitForResponse((r) => /save-sequence/i.test(r.url()) && r.request().method() === 'POST', {timeout: 20_000}).catch(() => null);
    await list.doneLink().click();
    const r = await saved;
    await idle(page);
    await sleep(800);
    return {status: r ? r.status() : null, body: r ? ((await r.text().catch(() => '')) || '').slice(0, 160) : null};
}

/** Drag an author row above another author row of the same chapter (the page object's drag). */
async function dragAuthor(list, title, name, aboveName) {
    await list.dragAuthorAbove(title, name, aboveName);
    await idle(list.page);
    await sleep(500);
    return authorOrder(list, title);
}

/**
 * Drag a chapter row by its title cell up above another chapter's block, as a person would:
 * press on the title, move a little, then to the top edge of the target block, release.
 */
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
    const during = await blocks(list);
    await page.mouse.up();
    await idle(page);
    await sleep(600);
    return {during: during.map((x) => x.rows)};
}

module.exports = {sleep, snap, openChapters, blocks, chapterOrder, authorOrder, stored, watchSaveSequence, done, dragAuthor, dragChapterAbove};
